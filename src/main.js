/**
 * BREATHEBEAT — Main Study Orchestrator
 * Fully automated, sequential participant evaluation protocol in Raga Bhupali.
 * 
 * Features:
 * - No default answers / placeholders; requires genuine participant choices
 * - Inter-stage transition window with 10s countdown, explanation of next stage, and "Continue to Next Round" button
 * - Extended 12-trial Stroop tests and 45-second arithmetic sections
 * - 5 complete rounds (60s) of diaphragmatic breathing with no skip button
 * - Streamlined, noise-resistant metrics logged silently to Google Sheets & localStorage
 */

import { synth } from './audio/synth.js';
import { BreathingVisualizer } from './components/breathingVisualizer.js';
import { StroopTask } from './tests/stroop.js';
import { FatigueInducer } from './tests/fatigue.js';
import { recordStudySession } from './data/sheetService.js';

class BreatheBeatApp {
  constructor() {
    this.wizardBreathVis = null;
    this.transitionTimerId = null;
    this.transitionSecondsLeft = 10;
    this.onTransitionProceed = null;

    this.breathingTimerId = null;
    this.currentActiveTask = null;

    // Presentation Mode & Stage Tracking
    this.isPresentationMode = false;
    this.currentStageId = 'stage-intake';
    this.currentStepLabel = '1. Participant Intake';
    this.currentStageIndex = 0; // 0: Intake, 1: Base Stroop, 2: Pre Math, 3: Pre Survey, 4: Breathing, 5: Rec Stroop, 6: Rec Math, 7: Post Survey, 8: Complete
    this.currentTaskType = null; // 'baseline-stroop' | 'pre-math' | 'recovery-stroop' | 'recovery-math'

    // Fresh Participant Session State (No pre-filled defaults)
    this.session = this.getFreshSessionState();

    this.init();
  }

  getFreshSessionState() {
    return {
      // Intake
      name: '',
      rollNumber: '',
      isMusicWorkshop: '',
      musicalTraining: '',
      age: '',

      // Pre-Breathing Focus & Fatigue
      baselineRT: 0,
      baselineCongruentRT: 0,
      baselineIncongruentRT: 0,
      baselineInterference: 0,
      baselineAcc: 100,

      preMathAcc: 0,
      preMathTotal: 0,
      preMathRT: 0,

      preFatigue: '',
      preStress: '',
      preFocus: '',
      preFatigueScore: 0,

      // Post-Breathing Focus & Fatigue
      recoveryRT: 0,
      recoveryCongruentRT: 0,
      recoveryIncongruentRT: 0,
      recoveryInterference: 0,
      recoveryAcc: 100,

      postMathAcc: 0,
      postMathTotal: 0,
      postMathRT: 0,

      postFatigue: '',
      postStress: '',
      postFocus: '',
      postFatigueScore: 0,

      // Experience & Feedback
      breathingEase: '',
      audioPleasantness: '',
      qualitativeFeedback: '',

      // Computed Deltas & Recovery
      stroopSpeedup: 0,
      interferenceReduction: 0,
      mathAccuracyDelta: 0,
      subjectiveRelief: 0,
      recoveryScore: 100
    };
  }

  init() {
    this.wireHeaderAudio();
    this.wirePresentationMode();
    this.wireIntakeForm();
    this.wireTransitionButton();
    this.wirePreSurvey();
    this.wireBreathingStage();
    this.wirePostSurvey();
    this.wireRestartButton();

    // Start on Stage 1 (Intake)
    this.showStage('stage-intake', '1. Participant Intake');
  }

  /* ==========================================================================
     Stage Navigation Utility
     ========================================================================== */
  showStage(stageId, stepLabel) {
    this.currentStageId = stageId;
    this.currentStepLabel = stepLabel || stageId;

    if (stageId === 'stage-intake') this.currentStageIndex = 0;
    else if (stageId === 'stage-pre-survey') this.currentStageIndex = 3;
    else if (stageId === 'stage-breathing') this.currentStageIndex = 4;
    else if (stageId === 'stage-post-survey') this.currentStageIndex = 7;
    else if (stageId === 'stage-complete') this.currentStageIndex = 8;

    document.querySelectorAll('.wizard-stage').forEach(el => {
      el.classList.add('hidden');
    });

    const target = document.getElementById(stageId);
    if (target) {
      target.classList.remove('hidden');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    const badgeText = document.getElementById('step-badge-text');
    if (badgeText && stepLabel) {
      badgeText.textContent = stepLabel;
    }

    this.updatePresenterBar();
  }

  /* ==========================================================================
     Universal Inter-Stage Transition (10-second countdown + next section info)
     ========================================================================== */
  wireTransitionButton() {
    const continueBtn = document.getElementById('btn-continue-round');
    if (continueBtn) {
      continueBtn.addEventListener('click', () => {
        this.clearTransitionTimer();
        if (this.onTransitionProceed) {
          const fn = this.onTransitionProceed;
          this.onTransitionProceed = null;
          fn();
        }
      });
    }
  }

  showTransition({ badge, title, desc, onProceed }) {
    this.clearTransitionTimer();
    this.onTransitionProceed = onProceed;

    const badgeEl = document.getElementById('trans-badge');
    const titleEl = document.getElementById('trans-title');
    const descEl = document.getElementById('trans-desc');
    const digitsEl = document.getElementById('trans-timer-val');
    const noteSecEl = document.getElementById('trans-note-sec');
    const progressCircle = document.getElementById('trans-ring-progress');

    if (badgeEl) badgeEl.textContent = badge || 'UPCOMING STAGE';
    if (titleEl) titleEl.textContent = title || 'Next Round';
    if (descEl) descEl.textContent = desc || 'Prepare for the upcoming section.';

    this.transitionSecondsLeft = 10;
    const totalCircumference = 339.292; // 2 * PI * 54

    const updateRing = () => {
      if (digitsEl) digitsEl.textContent = `${this.transitionSecondsLeft}s`;
      if (noteSecEl) noteSecEl.textContent = `${this.transitionSecondsLeft}`;
      if (progressCircle) {
        const offset = totalCircumference * (1 - (this.transitionSecondsLeft / 10));
        progressCircle.style.strokeDashoffset = offset;
      }
    };

    updateRing();
    this.showStage('stage-transition', badge || 'Upcoming Stage');

    this.transitionTimerId = setInterval(() => {
      this.transitionSecondsLeft--;
      updateRing();

      if (this.transitionSecondsLeft <= 0) {
        this.clearTransitionTimer();
        if (this.onTransitionProceed) {
          const fn = this.onTransitionProceed;
          this.onTransitionProceed = null;
          fn();
        }
      }
    }, 1000);
  }

  clearTransitionTimer() {
    if (this.transitionTimerId) {
      clearInterval(this.transitionTimerId);
      this.transitionTimerId = null;
    }
  }

  /* ==========================================================================
     Header Audio & Volume Controls
     ========================================================================== */
  wireHeaderAudio() {
    const volumeSlider = document.getElementById('global-volume');
    const muteBtn = document.getElementById('btn-audio-mute');
    let previousVolume = 0.8;

    if (volumeSlider) {
      volumeSlider.addEventListener('input', (e) => {
        const val = parseFloat(e.target.value);
        synth.setVolume(val);
        if (val > 0) previousVolume = val;
        this.updateMuteIcon(val === 0);
      });
    }

    if (muteBtn) {
      muteBtn.addEventListener('click', () => {
        const current = synth.getVolume();
        if (current > 0) {
          previousVolume = current;
          synth.setVolume(0);
          if (volumeSlider) volumeSlider.value = 0;
          this.updateMuteIcon(true);
        } else {
          const restored = previousVolume || 0.8;
          synth.setVolume(restored);
          if (volumeSlider) volumeSlider.value = restored;
          this.updateMuteIcon(false);
        }
      });
    }
  }

  updateMuteIcon(isMuted) {
    const muteBtn = document.getElementById('btn-audio-mute');
    if (!muteBtn) return;
    if (isMuted) {
      muteBtn.innerHTML = `
        <svg class="icon-sound" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon>
          <line x1="23" y1="9" x2="17" y2="15"></line>
          <line x1="17" y1="9" x2="23" y2="15"></line>
        </svg>
      `;
    } else {
      muteBtn.innerHTML = `
        <svg class="icon-sound" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon>
          <path d="M15.54 8.46a5 5 0 0 1 0 7.07"></path>
          <path d="M19.07 4.93a10 10 0 0 1 0 14.14"></path>
        </svg>
      `;
    }
  }

  /* ==========================================================================
     STAGE 1: Participant Intake Form (No Pre-filled Defaults)
     ========================================================================== */
  wireIntakeForm() {
    const form = document.getElementById('form-intake');
    if (!form) return;

    const errorMsg = document.getElementById('intake-error');

    // Toggle Music Workshop Course (Yes/No)
    const mwButtons = form.querySelectorAll('.pill-choice');
    const mwInput = document.getElementById('intake-mw');
    mwButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        mwButtons.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        if (mwInput) mwInput.value = btn.getAttribute('data-val');
        if (errorMsg) errorMsg.classList.add('hidden');
      });
    });

    // Musical Training Scale Chips (1-5)
    const trainingChips = form.querySelectorAll('.scale-chip');
    const trainingInput = document.getElementById('intake-training');
    trainingChips.forEach(chip => {
      chip.addEventListener('click', () => {
        trainingChips.forEach(c => c.classList.remove('active'));
        chip.classList.add('active');
        if (trainingInput) trainingInput.value = chip.getAttribute('data-val');
        if (errorMsg) errorMsg.classList.add('hidden');
      });
    });

    // Submit Intake
    form.addEventListener('submit', (e) => {
      e.preventDefault();

      const nameInput = document.getElementById('intake-name');
      const rollInput = document.getElementById('intake-roll');
      const ageInput = document.getElementById('intake-age');

      const name = nameInput ? nameInput.value.trim() : '';
      const roll = rollInput ? rollInput.value.trim() : '';
      const age = ageInput ? parseInt(ageInput.value, 10) : NaN;
      const mw = mwInput ? mwInput.value : '';
      const training = trainingInput ? trainingInput.value : '';

      // Validation: Enforce all inputs
      if (!name || !roll || isNaN(age) || age < 10 || !mw || !training) {
        if (errorMsg) {
          errorMsg.textContent = 'Please fill out all fields and select both your course enrollment and training level.';
          errorMsg.classList.remove('hidden');
        }
        return;
      }

      if (errorMsg) errorMsg.classList.add('hidden');

      this.session.name = name;
      this.session.rollNumber = roll;
      this.session.age = age;
      this.session.isMusicWorkshop = mw;
      this.session.musicalTraining = parseInt(training, 10);

      // Transition to Stage 2: Baseline Stroop Task
      this.showTransition({
        badge: 'STAGE 1 OF 7 · BASELINE FOCUS',
        title: 'Baseline Focus Check (Stroop Task)',
        desc: 'In this section, you will see color words (RED, GREEN, BLUE, YELLOW) printed in colored ink. Your goal is to identify the INK COLOR of each word, not the word itself. Tap the matching color button as quickly and accurately as possible.',
        onProceed: () => this.startBaselineStroop()
      });
    });
  }

  /* ==========================================================================
     STAGE 2: Baseline Stroop Task (12 Trials)
     ========================================================================== */
  startBaselineStroop() {
    this.currentStageIndex = 1;
    this.currentTaskType = 'baseline-stroop';
    this.showStage('stage-task-mount', 'Stage 1 · Baseline Focus Check');

    const mount = document.getElementById('stage-task-mount');
    mount.innerHTML = `
      <div class="wizard-card">
        <div class="card-header">
          <span class="section-tag">BASELINE EVALUATION</span>
          <h2>Color Focus Check</h2>
          <p class="card-sub">Select the <strong>INK COLOR</strong> of the word as quickly and accurately as possible.</p>
        </div>
        <div id="stroop-mount-point"></div>
      </div>
    `;

    const container = document.getElementById('stroop-mount-point');
    this.currentActiveTask = new StroopTask({
      container,
      totalTrials: 12, // Increased questions for robust data
      onComplete: (data) => {
        this.session.baselineRT = data.meanRT;
        this.session.baselineCongruentRT = data.meanCongruentRT;
        this.session.baselineIncongruentRT = data.meanIncongruentRT;
        this.session.baselineInterference = data.stroopEffect;
        this.session.baselineAcc = data.accuracy;

        // Transition to Pre-Breathing Math Task
        this.showTransition({
          badge: 'STAGE 2 OF 7 · FATIGUE INDUCER',
          title: 'Arithmetic Challenge',
          desc: 'In this section, you will solve rapid mental arithmetic questions (addition, subtraction, multiplication, and clean division) under time pressure. Solve as many questions correctly as you can.',
          onProceed: () => this.startPreMath()
        });
      }
    });
    this.currentActiveTask.start();
  }

  /* ==========================================================================
     STAGE 3: Pre-Breathing Arithmetic Task (45 Seconds Timed)
     ========================================================================== */
  startPreMath() {
    this.currentStageIndex = 2;
    this.currentTaskType = 'pre-math';
    this.showStage('stage-task-mount', 'Stage 2 · Working Memory Challenge');

    const mount = document.getElementById('stage-task-mount');
    mount.innerHTML = `
      <div class="wizard-card">
        <div class="card-header">
          <span class="section-tag" style="color: #ef4444; background: rgba(239, 68, 68, 0.1);">FATIGUE INDUCER</span>
          <h2>Rapid Arithmetic Challenge</h2>
          <p class="card-sub">Answer arithmetic questions under brief time pressure (45 seconds total).</p>
        </div>
        <div id="math-mount-point"></div>
      </div>
    `;

    const container = document.getElementById('math-mount-point');
    this.currentActiveTask = new FatigueInducer({
      container,
      durationSeconds: 45, // Increased overall duration
      questionTimeLimit: 7.0, // Comfortable 7s per question
      onComplete: (data) => {
        this.session.preMathAcc = data.accuracy;
        this.session.preMathTotal = data.totalQuestions;
        this.session.preMathRT = data.meanRt;

        // Transition to Pre-Breathing Survey
        this.showTransition({
          badge: 'STAGE 3 OF 7 · STATE CHECK',
          title: 'Mid-Session State Check',
          desc: 'Rate your current mental fatigue, stress, and concentration effort on a 1–5 scale before starting the guided breathing exercise.',
          onProceed: () => this.startPreSurvey()
        });
      }
    });
    this.currentActiveTask.start();
  }

  /* ==========================================================================
     STAGE 4: Pre-Breathing Subjective Survey (1-5 scales, No Defaults)
     ========================================================================== */
  wirePreSurvey() {
    const form = document.getElementById('form-pre-survey');
    if (!form) return;

    const errorMsg = document.getElementById('pre-survey-error');
    this.wireScaleButtonRows(form, errorMsg);

    form.addEventListener('submit', (e) => {
      e.preventDefault();

      const fatigueVal = document.getElementById('val-pre-fatigue').value;
      const stressVal = document.getElementById('val-pre-stress').value;
      const focusVal = document.getElementById('val-pre-focus').value;

      if (!fatigueVal || !stressVal || !focusVal) {
        if (errorMsg) {
          errorMsg.textContent = 'Please select a rating for all 3 questions before proceeding.';
          errorMsg.classList.remove('hidden');
        }
        return;
      }

      if (errorMsg) errorMsg.classList.add('hidden');

      const f = parseInt(fatigueVal, 10);
      const s = parseInt(stressVal, 10);
      const fc = parseInt(focusVal, 10);

      this.session.preFatigue = f;
      this.session.preStress = s;
      this.session.preFocus = fc;
      this.session.preFatigueScore = parseFloat(((f + s + fc) / 3).toFixed(2));

      // Transition to Stage 4: Breathing (10 Rounds, option to skip after 8)
      this.showTransition({
        badge: 'STAGE 4 OF 7 · GUIDED BREATHING',
        title: 'Diaphragmatic Breathing in Raga Bhupali (10 Rounds)',
        desc: 'You will now practice diaphragmatic 4-2-6 breathing (4s Inhale, 2s Hold, 6s Exhale) for up to 10 rounds (2 minutes), with an option to proceed after 8 rounds are completed. Close your eyes, listen to the acoustic Bansuri flute and Tanpura drone, and let the music guide your breath naturally.',
        onProceed: () => this.startBreathingStage()
      });
    });
  }

  startPreSurvey() {
    this.currentStageIndex = 3;
    this.showStage('stage-pre-survey', 'Stage 3 · State Check');
  }

  /* Helper to wire 1-5 scale button rows */
  wireScaleButtonRows(container, errorEl = null) {
    const rows = container.querySelectorAll('.scale-buttons-row');
    rows.forEach(row => {
      const fieldName = row.getAttribute('data-field');
      const hiddenInput = document.getElementById(`val-${fieldName}`);
      const buttons = row.querySelectorAll('.btn-scale');

      buttons.forEach(btn => {
        btn.addEventListener('click', () => {
          buttons.forEach(b => b.classList.remove('active'));
          btn.classList.add('active');
          const val = btn.getAttribute('data-val');
          if (hiddenInput) hiddenInput.value = val;
          if (errorEl) errorEl.classList.add('hidden');
        });
      });
    });
  }

  /* ==========================================================================
     STAGE 5: Breathing Sanctuary (10 Rounds = 120s, Skip Available after 8)
     ========================================================================== */
  wireBreathingStage() {
    const skipBtn = document.getElementById('btn-skip-breathing');
    if (skipBtn) {
      skipBtn.addEventListener('click', () => {
        this.finishBreathingStage();
      });
    }
  }

  startBreathingStage() {
    this.currentStageIndex = 4;
    this.showStage('stage-breathing', 'Stage 4 · Guided Breathing Break');

    const canvas = document.getElementById('wizard-breath-canvas');
    if (canvas && !this.wizardBreathVis) {
      this.wizardBreathVis = new BreathingVisualizer(canvas);
    }
    if (this.wizardBreathVis) {
      this.wizardBreathVis.onResize();
      this.wizardBreathVis.start();
    }

    const badgeEl = document.getElementById('breath-cycle-badge');
    const roundLabel = document.getElementById('breath-round-label');
    const timerLabel = document.getElementById('breath-total-time');
    const skipBtn = document.getElementById('btn-skip-breathing');

    // Initial state: Round 1, 120s remaining, skip button strictly hidden
    if (badgeEl) badgeEl.textContent = 'ROUND 1 OF 10';
    if (roundLabel) roundLabel.textContent = 'Round 1 / 10 · Inhale';
    if (timerLabel) timerLabel.textContent = '120s remaining';
    if (skipBtn) skipBtn.classList.add('hidden');

    // Clean up any stale interval
    if (this.breathingTimerId) {
      clearInterval(this.breathingTimerId);
      this.breathingTimerId = null;
    }

    // Start 10 synchronized rounds driven by the unified audio engine
    synth.startBreathingCycle({
      totalRounds: 10,
      onPhaseChange: (phaseInfo) => {
        const roundNum = phaseInfo.cycle;
        if (badgeEl) badgeEl.textContent = `ROUND ${roundNum} OF 10`;
        if (roundLabel) roundLabel.textContent = `Round ${roundNum} / 10 · ${phaseInfo.label}`;

        // Skip button: strictly hidden during rounds 1 to 8.
        // Appears AFTER 8 rounds are completed (so when round 9 or 10 is happening).
        if (roundNum >= 9) {
          if (skipBtn) skipBtn.classList.remove('hidden');
        } else {
          if (skipBtn) skipBtn.classList.add('hidden');
        }
      },
      onTick: (tickInfo) => {
        if (this.wizardBreathVis) {
          this.wizardBreathVis.setDirectProgress(tickInfo.phase, tickInfo.phaseProgress);
        }

        // Remaining timer is 100% mathematically synchronized with round progress
        if (timerLabel) {
          timerLabel.textContent = `${tickInfo.totalSecondsLeft}s remaining`;
        }

        if (tickInfo.cycle >= 9) {
          if (skipBtn) skipBtn.classList.remove('hidden');
        } else {
          if (skipBtn) skipBtn.classList.add('hidden');
        }
      },
      onComplete: () => {
        // Automatically proceed after all 10 rounds are finished
        this.finishBreathingStage();
      }
    });
  }

  finishBreathingStage() {
    if (this.breathingTimerId) {
      clearInterval(this.breathingTimerId);
      this.breathingTimerId = null;
    }

    synth.stopBreathingCycle();
    if (this.wizardBreathVis) {
      this.wizardBreathVis.stop();
    }

    // Transition to Stage 5: Recovery Stroop
    this.showTransition({
      badge: 'STAGE 5 OF 7 · RECOVERY FOCUS',
      title: 'Recovery Focus Check (Stroop Task)',
      desc: 'Following your breathing break, we will re-evaluate your reaction speed and selective attention. Once again, select the INK COLOR of the word as quickly and accurately as possible.',
      onProceed: () => this.startRecoveryStroop()
    });
  }

  /* ==========================================================================
     STAGE 6: Recovery Stroop Task (12 Trials)
     ========================================================================== */
  startRecoveryStroop() {
    this.currentStageIndex = 5;
    this.currentTaskType = 'recovery-stroop';
    this.showStage('stage-task-mount', 'Stage 5 · Recovery Focus Check');

    const mount = document.getElementById('stage-task-mount');
    mount.innerHTML = `
      <div class="wizard-card">
        <div class="card-header">
          <span class="section-tag" style="color: #10b981; background: rgba(16, 185, 129, 0.1);">POST-BREATHING</span>
          <h2>Recovery Color Focus</h2>
          <p class="card-sub">Final color task to evaluate cognitive recovery after the breathing exercise.</p>
        </div>
        <div id="stroop-mount-point"></div>
      </div>
    `;

    const container = document.getElementById('stroop-mount-point');
    this.currentActiveTask = new StroopTask({
      container,
      totalTrials: 12, // Increased questions
      onComplete: (data) => {
        this.session.recoveryRT = data.meanRT;
        this.session.recoveryCongruentRT = data.meanCongruentRT;
        this.session.recoveryIncongruentRT = data.meanIncongruentRT;
        this.session.recoveryInterference = data.stroopEffect;
        this.session.recoveryAcc = data.accuracy;

        // Transition to Post-Breathing Math Task
        this.showTransition({
          badge: 'STAGE 6 OF 7 · RECOVERY STAMINA',
          title: 'Recovery Arithmetic Challenge',
          desc: 'A final round of rapid mental arithmetic to evaluate restored working memory stamina post-breathing. Solve as many questions correctly as you can.',
          onProceed: () => this.startPostMath()
        });
      }
    });
    this.currentActiveTask.start();
  }

  /* ==========================================================================
     STAGE 7: Post-Breathing Arithmetic Task (45 Seconds Timed)
     ========================================================================== */
  startPostMath() {
    this.currentStageIndex = 6;
    this.currentTaskType = 'recovery-math';
    this.showStage('stage-task-mount', 'Stage 6 · Recovery Stamina Check');

    const mount = document.getElementById('stage-task-mount');
    mount.innerHTML = `
      <div class="wizard-card">
        <div class="card-header">
          <span class="section-tag" style="color: #10b981; background: rgba(16, 185, 129, 0.1);">POST-BREATHING</span>
          <h2>Recovery Arithmetic Check</h2>
          <p class="card-sub">Final math round to measure working memory stamina post-breathing (45 seconds total).</p>
        </div>
        <div id="math-mount-point"></div>
      </div>
    `;

    const container = document.getElementById('math-mount-point');
    this.currentActiveTask = new FatigueInducer({
      container,
      durationSeconds: 45, // Increased overall duration
      questionTimeLimit: 7.0, // Comfortable 7s per question
      onComplete: (data) => {
        this.session.postMathAcc = data.accuracy;
        this.session.postMathTotal = data.totalQuestions;
        this.session.postMathRT = data.meanRt;

        // Transition to Final Evaluation Survey
        this.showTransition({
          badge: 'STAGE 7 OF 7 · FINAL EVALUATION',
          title: 'Final Evaluation & Audio Feedback',
          desc: 'Almost finished! Rate your current mental clarity after the breathing exercise, evaluate the audio experience, and share any thoughts or observations.',
          onProceed: () => this.startPostSurvey()
        });
      }
    });
    this.currentActiveTask.start();
  }

  /* ==========================================================================
     STAGE 8: Post-Breathing Subjective Evaluation & Feedback (No Defaults)
     ========================================================================== */
  wirePostSurvey() {
    const form = document.getElementById('form-post-survey');
    if (!form) return;

    const errorMsg = document.getElementById('post-survey-error');
    this.wireScaleButtonRows(form, errorMsg);

    form.addEventListener('submit', (e) => {
      e.preventDefault();

      const fatigueVal = document.getElementById('val-post-fatigue').value;
      const stressVal = document.getElementById('val-post-stress').value;
      const focusVal = document.getElementById('val-post-focus').value;
      const easeVal = document.getElementById('val-post-ease').value;
      const pleasantVal = document.getElementById('val-post-pleasant').value;
      const feedbackText = (document.getElementById('post-feedback')?.value || '').trim();

      if (!fatigueVal || !stressVal || !focusVal || !easeVal || !pleasantVal) {
        if (errorMsg) {
          errorMsg.textContent = 'Please answer all 5 rating scale questions before submitting.';
          errorMsg.classList.remove('hidden');
        }
        return;
      }

      if (errorMsg) errorMsg.classList.add('hidden');

      const f = parseInt(fatigueVal, 10);
      const s = parseInt(stressVal, 10);
      const fc = parseInt(focusVal, 10);
      const ease = parseInt(easeVal, 10);
      const pleasant = parseInt(pleasantVal, 10);

      this.session.postFatigue = f;
      this.session.postStress = s;
      this.session.postFocus = fc;
      this.session.postFatigueScore = parseFloat(((f + s + fc) / 3).toFixed(2));
      this.session.breathingEase = ease;
      this.session.audioPleasantness = pleasant;
      this.session.qualitativeFeedback = feedbackText;

      // Compute Measurable Deltas & Recovery Metrics
      this.computeFinalMetrics();

      // Transmit to Google Sheet webhook and save locally
      recordStudySession(this.session);

      // Transition to Stage 9 (Completion)
      this.showStage('stage-complete', 'Complete');
      this.renderCompletionSummary();
    });
  }

  startPostSurvey() {
    this.currentStageIndex = 7;
    this.showStage('stage-post-survey', 'Stage 7 · Final Evaluation');
  }

  computeFinalMetrics() {
    const base = this.session.baselineRT || 1000;
    const rec = this.session.recoveryRT || 1000;

    // Stroop Speedup (ms faster)
    this.session.stroopSpeedup = Math.round(base - rec);

    // Stroop Interference Reduction (ms reduction in mental confusion)
    this.session.interferenceReduction = Math.round(
      (this.session.baselineInterference || 0) - (this.session.recoveryInterference || 0)
    );

    // Math Accuracy Delta (%)
    this.session.mathAccuracyDelta = Math.round(
      (this.session.postMathAcc || 0) - (this.session.preMathAcc || 0)
    );

    // Subjective Stress/Fatigue Relief (Positive number = stress dropped)
    this.session.subjectiveRelief = parseFloat(
      (this.session.preFatigueScore - this.session.postFatigueScore).toFixed(2)
    );

    // Cognitive Recovery Score (Standardized 0-100% metric)
    if (rec <= base) {
      this.session.recoveryScore = 100;
    } else {
      const dropRatio = base / rec;
      this.session.recoveryScore = Math.round(Math.min(100, Math.max(0, dropRatio * 100)));
    }
  }

  /* ==========================================================================
     STAGE 9: Restart for Next Participant
     ========================================================================== */
  wireRestartButton() {
    const restartBtn = document.getElementById('btn-restart-study');
    if (restartBtn) {
      restartBtn.addEventListener('click', () => {
        this.session = this.getFreshSessionState();

        // Reset form fields
        const intakeForm = document.getElementById('form-intake');
        if (intakeForm) intakeForm.reset();

        const postFeedback = document.getElementById('post-feedback');
        if (postFeedback) postFeedback.value = '';

        // Clear active states on buttons
        document.querySelectorAll('.pill-choice').forEach(b => b.classList.remove('active'));
        document.querySelectorAll('.scale-chip').forEach(c => c.classList.remove('active'));
        document.querySelectorAll('.btn-scale').forEach(s => s.classList.remove('active'));

        // Reset hidden values
        const hiddenIds = [
          'intake-mw', 'intake-training',
          'val-pre-fatigue', 'val-pre-stress', 'val-pre-focus',
          'val-post-fatigue', 'val-post-stress', 'val-post-focus',
          'val-post-ease', 'val-post-pleasant'
        ];
        hiddenIds.forEach(id => {
          const el = document.getElementById(id);
          if (el) el.value = '';
        });

        // Hide errors
        document.querySelectorAll('.form-error-msg').forEach(el => el.classList.add('hidden'));

        this.showStage('stage-intake', '1. Participant Intake');
      });
    }
  }

  /* ==========================================================================
     PRESENTATION MODE & QUICK SECTION SKIPPING
     ========================================================================== */
  wirePresentationMode() {
    const toggleBtn = document.getElementById('btn-toggle-presentation');
    const presenterBar = document.getElementById('presenter-bar');
    const barPrevBtn = document.getElementById('btn-presenter-prev-stage');
    const barSkipBtn = document.getElementById('btn-presenter-skip-stage');
    const intakeSkipBtn = document.getElementById('btn-skip-intake-pres');
    const preSurveySkipBtn = document.getElementById('btn-skip-pre-survey-pres');
    const postSurveySkipBtn = document.getElementById('btn-skip-post-survey-pres');

    const setPresentationMode = (active) => {
      this.isPresentationMode = active;
      if (active) {
        document.body.classList.add('presentation-mode-active');
        if (toggleBtn) {
          toggleBtn.classList.add('active');
          const lbl = toggleBtn.querySelector('.pres-toggle-label');
          if (lbl) lbl.textContent = 'Presentation: ON';
        }
        if (presenterBar) presenterBar.classList.remove('hidden');
        document.querySelectorAll('.pres-only-btn').forEach(btn => btn.classList.remove('hidden'));
      } else {
        document.body.classList.remove('presentation-mode-active');
        if (toggleBtn) {
          toggleBtn.classList.remove('active');
          const lbl = toggleBtn.querySelector('.pres-toggle-label');
          if (lbl) lbl.textContent = 'Presentation Mode';
        }
        if (presenterBar) presenterBar.classList.add('hidden');
        document.querySelectorAll('.pres-only-btn').forEach(btn => btn.classList.add('hidden'));
      }
      this.updatePresenterBar();
    };

    if (toggleBtn) {
      toggleBtn.addEventListener('click', () => {
        setPresentationMode(!this.isPresentationMode);
      });
    }

    if (barPrevBtn) {
      barPrevBtn.addEventListener('click', () => {
        this.previousStage();
      });
    }

    if (barSkipBtn) {
      barSkipBtn.addEventListener('click', () => {
        this.skipCurrentStage();
      });
    }

    if (intakeSkipBtn) {
      intakeSkipBtn.addEventListener('click', () => {
        this.skipCurrentStage();
      });
    }

    if (preSurveySkipBtn) {
      preSurveySkipBtn.addEventListener('click', () => {
        this.skipCurrentStage();
      });
    }

    if (postSurveySkipBtn) {
      postSurveySkipBtn.addEventListener('click', () => {
        this.skipCurrentStage();
      });
    }

    // Keyboard Shortcuts:
    // 'P' or 'Alt+P' toggles Presentation Mode (when not typing in an input)
    // 'Shift+ArrowRight' or 'Shift+N' skips to the next stage
    // 'Shift+ArrowLeft' or 'Shift+B' goes back to previous stage
    window.addEventListener('keydown', (e) => {
      const activeTag = document.activeElement ? document.activeElement.tagName.toLowerCase() : '';
      const isInput = activeTag === 'input' || activeTag === 'textarea';

      if (!isInput && (e.key === 'p' || e.key === 'P') && !e.metaKey && !e.ctrlKey) {
        setPresentationMode(!this.isPresentationMode);
        return;
      }

      if (this.isPresentationMode) {
        if (e.shiftKey && (e.key === 'ArrowRight' || e.key === 'N' || e.key === 'n')) {
          e.preventDefault();
          this.skipCurrentStage();
        } else if (e.shiftKey && (e.key === 'ArrowLeft' || e.key === 'B' || e.key === 'b')) {
          e.preventDefault();
          this.previousStage();
        }
      }
    });
  }

  updatePresenterBar() {
    const stageTitle = document.getElementById('presenter-stage-title');
    if (stageTitle) {
      stageTitle.textContent = this.currentStepLabel || 'Section in progress';
    }

    const prevBtn = document.getElementById('btn-presenter-prev-stage');
    if (prevBtn) {
      prevBtn.disabled = this.currentStageIndex <= 0;
    }

    const nextBtn = document.getElementById('btn-presenter-skip-stage');
    if (nextBtn) {
      nextBtn.disabled = this.currentStageIndex >= 8;
    }
  }

  cleanupActiveProcesses() {
    this.clearTransitionTimer();
    this.onTransitionProceed = null;

    if (this.currentActiveTask && typeof this.currentActiveTask.destroy === 'function') {
      try {
        this.currentActiveTask.destroy();
      } catch (e) {}
    }
    this.currentActiveTask = null;

    try {
      synth.stopBreathingCycle();
    } catch (e) {}
    if (this.wizardBreathVis) {
      try {
        this.wizardBreathVis.stop();
      } catch (e) {}
    }
  }

  ensureIntakeData() {
    if (!this.session.rollNumber) {
      const nameInput = document.getElementById('intake-name');
      const rollInput = document.getElementById('intake-roll');
      const ageInput = document.getElementById('intake-age');
      const mwInput = document.getElementById('intake-mw');
      const trainingInput = document.getElementById('intake-training');

      this.session.name = nameInput?.value.trim() || 'Demo Presenter';
      this.session.rollNumber = rollInput?.value.trim() || '2024111009';
      this.session.age = parseInt(ageInput?.value, 10) || 21;
      this.session.isMusicWorkshop = mwInput?.value || 'Yes';
      this.session.musicalTraining = parseInt(trainingInput?.value, 10) || 3;
    }
  }

  ensureBaselineData() {
    if (!this.session.baselineRT) {
      this.session.baselineRT = 840;
      this.session.baselineCongruentRT = 780;
      this.session.baselineIncongruentRT = 900;
      this.session.baselineInterference = 120;
      this.session.baselineAcc = 95;
    }
  }

  ensurePreMathData() {
    if (!this.session.preMathAcc) {
      this.session.preMathAcc = 86;
      this.session.preMathTotal = 7;
      this.session.preMathRT = 3100;
    }
  }

  ensurePreSurveyData() {
    if (!this.session.preFatigueScore) {
      this.session.preFatigue = 4;
      this.session.preStress = 4;
      this.session.preFocus = 3;
      this.session.preFatigueScore = 3.67;
    }
  }

  ensureRecoveryStroopData() {
    if (!this.session.recoveryRT) {
      this.session.recoveryRT = 730;
      this.session.recoveryCongruentRT = 690;
      this.session.recoveryIncongruentRT = 770;
      this.session.recoveryInterference = 80;
      this.session.recoveryAcc = 100;
    }
  }

  ensurePostMathData() {
    if (!this.session.postMathAcc) {
      this.session.postMathAcc = 94;
      this.session.postMathTotal = 7;
      this.session.postMathRT = 2700;
    }
  }

  ensureAllDemoMetrics() {
    this.ensureIntakeData();
    this.ensureBaselineData();
    this.ensurePreMathData();
    this.ensurePreSurveyData();
    this.ensureRecoveryStroopData();
    this.ensurePostMathData();
    if (!this.session.postFatigueScore) {
      this.session.postFatigue = 2;
      this.session.postStress = 1;
      this.session.postFocus = 2;
      this.session.postFatigueScore = 1.67;
      this.session.breathingEase = 5;
      this.session.audioPleasantness = 5;
      this.session.qualitativeFeedback = 'Presentation Demo: Diaphragmatic 4-2-6 breathing in Raga Bhupali restored clarity.';
    }
  }

  goToStageByIndex(targetIndex) {
    if (targetIndex < 0 || targetIndex > 8) return;

    this.cleanupActiveProcesses();

    switch (targetIndex) {
      case 0:
        this.currentStageIndex = 0;
        this.showStage('stage-intake', '1. Participant Intake');
        break;
      case 1:
        this.ensureIntakeData();
        this.startBaselineStroop();
        break;
      case 2:
        this.ensureIntakeData();
        this.ensureBaselineData();
        this.startPreMath();
        break;
      case 3:
        this.ensureIntakeData();
        this.ensurePreMathData();
        this.startPreSurvey();
        break;
      case 4:
        this.ensureIntakeData();
        this.ensurePreSurveyData();
        this.startBreathingStage();
        break;
      case 5:
        this.ensureIntakeData();
        this.startRecoveryStroop();
        break;
      case 6:
        this.ensureIntakeData();
        this.ensureRecoveryStroopData();
        this.startPostMath();
        break;
      case 7:
        this.ensureIntakeData();
        this.ensurePostMathData();
        this.startPostSurvey();
        break;
      case 8:
        this.currentStageIndex = 8;
        this.ensureAllDemoMetrics();
        this.computeFinalMetrics();
        recordStudySession(this.session);
        this.showStage('stage-complete', 'Complete');
        this.renderCompletionSummary();
        break;
    }

    this.updatePresenterBar();
  }

  previousStage() {
    if (this.currentStageId === 'stage-transition') {
      this.clearTransitionTimer();
      this.onTransitionProceed = null;
      this.goToStageByIndex(Math.max(0, this.currentStageIndex));
      return;
    }
    this.goToStageByIndex(this.currentStageIndex - 1);
  }

  skipCurrentStage() {
    if (this.currentStageId === 'stage-transition') {
      this.clearTransitionTimer();
      if (this.onTransitionProceed) {
        const fn = this.onTransitionProceed;
        this.onTransitionProceed = null;
        fn();
      }
      return;
    }
    this.goToStageByIndex(this.currentStageIndex + 1);
  }

  renderCompletionSummary() {
    const summaryContainer = document.getElementById('complete-metrics-summary');
    if (!summaryContainer) return;

    summaryContainer.innerHTML = `
      <div class="complete-metric-card">
        <span class="complete-metric-lbl">Participant Roll</span>
        <span class="complete-metric-val" style="font-size: 1.05rem;">${this.session.rollNumber || 'DEMO'}</span>
      </div>
      <div class="complete-metric-card">
        <span class="complete-metric-lbl">Stroop Speedup</span>
        <span class="complete-metric-val ${this.session.stroopSpeedup >= 0 ? 'pos' : ''}">
          ${this.session.stroopSpeedup >= 0 ? '+' : ''}${this.session.stroopSpeedup} ms
        </span>
      </div>
      <div class="complete-metric-card">
        <span class="complete-metric-lbl">Math Accuracy Δ</span>
        <span class="complete-metric-val ${this.session.mathAccuracyDelta >= 0 ? 'pos' : ''}">
          ${this.session.mathAccuracyDelta >= 0 ? '+' : ''}${this.session.mathAccuracyDelta}%
        </span>
      </div>
      <div class="complete-metric-card">
        <span class="complete-metric-lbl">Stress Relief</span>
        <span class="complete-metric-val pos">-${Math.abs(this.session.subjectiveRelief)} pts</span>
      </div>
      <div class="complete-metric-card">
        <span class="complete-metric-lbl">Recovery Score</span>
        <span class="complete-metric-val pos">${this.session.recoveryScore}%</span>
      </div>
    `;
    summaryContainer.classList.remove('hidden');
  }
}

// Bootstrap application on DOM ready
document.addEventListener('DOMContentLoaded', () => {
  new BreatheBeatApp();
});
