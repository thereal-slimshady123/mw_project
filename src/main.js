/**
 * BREATHEBEAT — Main Study Orchestrator
 * Within-subject comparison of two 3-minute eyes-closed rests after a cognitive stressor:
 *   - Silence: rest in silence, breathing slowly at one's own pace
 *   - BreatheBeat: breathe in sync with the 4-6 (4s inhale / 6s exhale) BreatheBeat audio
 *
 * Every participant completes BOTH conditions. Condition order is randomised per participant
 * (counterbalancing order / practice effects) and recorded with the data.
 *
 * Protocol:
 *   Study Overview → Intake
 *   → Part 1 [ Stressor Math → Pre-Rest Stroop → State Check → Rest → Math → Post-Rest Stroop → State & Experience Check ]
 *   → Part 2 [ same, other condition ]
 *   → Final Comparison → Complete
 *
 * Each condition uses the same Math → Stroop sequence before and after the rest.
 */

import { synth } from './audio/synth.js';
import { BreathingVisualizer } from './components/breathingVisualizer.js';
import { StroopTask } from './tests/stroop.js';
import { FatigueInducer } from './tests/fatigue.js';
import { recordStudySession } from './data/sheetService.js';
import {
  INTAKE_QUESTIONS,
  STATE_QUESTIONS,
  FINAL_QUESTIONS,
  getRestExperienceQuestions,
  renderQuestions,
  collectAnswers
} from './data/questions.js';

const PROTOCOL_VERSION = '2.3-symmetrical-math-no-warmup';
const STROOP_TRIALS = 12;
const MATH_SECONDS = 45;
const REST_ROUNDS = 18; // 18 x 10s = 3 minutes (full BreatheBeat track)

const CONDITION_INFO = {
  silence: {
    name: 'Silent Break',
    lowerName: 'silent break',
    tag: 'SILENT BREAK',
    color: '#a78bfa',
    restInstruction: 'Close your eyes and rest in silence. Breathe slowly and comfortably at your own pace. There is nothing to count or follow. Keep your eyes closed for the full 3 minutes. A soft chime will tell you when the break is over.',
    restScreen: 'Keep your eyes closed and breathe slowly at your own pace. A soft chime will mark the end.'
  },
  breathebeat: {
    name: 'Audio Break (BreatheBeat)',
    lowerName: 'audio break',
    tag: 'AUDIO BREAK',
    color: '#34d399',
    restInstruction: 'Put on your headphones if you have them. When you press Start, the audio begins. Please close your eyes and breathe in sync with the audio: INHALE through your nose during the first, shorter sound (4 seconds), then EXHALE slowly during the second, longer sound (6 seconds). Keep your eyes closed and stay in sync for the full 3 minutes. A soft chime will tell you when the break is over.',
    restScreen: 'Please close your eyes and breathe in sync with the audio: inhale on the short sound, exhale on the long sound.'
  }
};

const NO_DEVICES_NOTE = 'Please put your phone aside and do not use other apps during the break.';

class BreatheBeatApp {
  constructor() {
    this.wizardBreathVis = null;
    this.transitionTimerId = null;
    this.transitionSecondsLeft = 10;
    this.onTransitionProceed = null;
    this.currentActiveTask = null;
    this.activeSurvey = null;

    // Presentation Mode & Step Tracking
    this.isPresentationMode = false;
    this.currentStageId = 'stage-overview';
    this.currentStepLabel = 'Welcome';
    this.currentStepIndex = 0;

    this.session = this.getFreshSessionState();
    this.steps = this.buildSteps();

    this.init();
  }

  getFreshSessionState() {
    const conditionOrder = Math.random() < 0.5 ? ['silence', 'breathebeat'] : ['breathebeat', 'silence'];
    const sessionId = (window.crypto && crypto.randomUUID)
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

    return {
      sessionId,
      protocolVersion: PROTOCOL_VERSION,
      isDemo: false,
      completedAt: '',

      // Intake
      name: '',
      rollNumber: '',
      age: '',
      isMusicWorkshop: '',
      intake: {},

      conditionOrder,

      blocks: conditionOrder.map((condition, i) => ({
        condition,
        position: i + 1,
        stressorMath: null,
        postRestMath: null,
        preStroop: null,
        preState: null,
        restSeconds: 0,
        restCompleted: false,
        audioMuted: false,
        postStroop: null,
        postState: null,
        experience: null
      })),

      final: {},
      comments: ''
    };
  }

  /**
   * Linear list of every step in the session (drives navigation and presentation-mode skipping)
   */
  buildSteps() {
    const steps = [{ type: 'overview' }, { type: 'intake' }];
    [0, 1].forEach(b => {
      ['math', 'pre-stroop', 'pre-survey', 'rest', 'post-math', 'post-stroop', 'post-survey']
        .forEach(type => steps.push({ type, b }));
    });
    steps.push({ type: 'final-survey' }, { type: 'complete' });
    return steps;
  }

  init() {
    this.wireHeaderAudio();
    this.wirePresentationMode();
    this.wireIntakeForm();
    this.wireTransitionButton();
    this.wireOverview();
    this.wireSurveyForm();
    this.wireRestartButton();

    this.showStage('stage-overview', 'Welcome');
  }

  /* ==========================================================================
     Labels
     ========================================================================== */
  blockLabel(b) {
    const block = this.session.blocks[b];
    return `Part ${b + 1} of 2 · ${CONDITION_INFO[block.condition].name}`;
  }

  blockTag(b) {
    const block = this.session.blocks[b];
    return `PART ${b + 1} OF 2 · ${CONDITION_INFO[block.condition].tag}`;
  }

  /* ==========================================================================
     Stage Navigation Utility
     ========================================================================== */
  showStage(stageId, stepLabel) {
    this.currentStageId = stageId;
    this.currentStepLabel = stepLabel || stageId;

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

  /**
   * Runs a step directly (no transition screen)
   */
  runStep(index) {
    this.currentStepIndex = index;
    const step = this.steps[index];

    switch (step.type) {
      case 'overview': return this.showStage('stage-overview', 'Welcome');
      case 'intake': return this.showStage('stage-intake', '1. Participant Intake');
      case 'math': return this.startStressorMath(step.b);
      case 'post-math': return this.startStressorMath(step.b, 'post');
      case 'pre-stroop': return this.startBlockStroop(step.b, 'pre');
      case 'pre-survey': return this.startPreSurvey(step.b);
      case 'rest': return this.startRest(step.b);
      case 'post-stroop': return this.startBlockStroop(step.b, 'post');
      case 'post-survey': return this.startPostSurvey(step.b);
      case 'final-survey': return this.startFinalSurvey();
      case 'complete': return this.completeSession();
    }
  }

  /**
   * Advances to the next step, via an explanatory transition screen where one is useful
   */
  advance() {
    const nextIndex = this.currentStepIndex + 1;
    const next = this.steps[nextIndex];
    if (!next) return;

    const intro = this.getTransitionInfo(next);
    if (intro) {
      this.currentStepIndex = nextIndex;
      const color = next.b !== undefined ? CONDITION_INFO[this.session.blocks[next.b].condition].color : '';
      this.showTransition({ ...intro, color, onProceed: () => this.runStep(nextIndex) });
    } else {
      this.runStep(nextIndex);
    }
  }

  getTransitionInfo(step) {
    const stroopDesc = 'You will see color words (RED, GREEN, BLUE, YELLOW) printed in colored ink. Tap the INK COLOR of each word, not the word itself, as quickly and accurately as possible.';

    switch (step.type) {
      case 'math': {
        const info = CONDITION_INFO[this.session.blocks[step.b].condition];
        return {
          badge: `${this.blockTag(step.b)} · STRESS TASK`,
          title: `Part ${step.b + 1} of 2: ${info.name}`,
          desc: `This part ends with a 3-minute ${info.lowerName}. First, solve rapid mental arithmetic questions under time pressure for ${MATH_SECONDS} seconds. Answer as many as you can correctly.`,
          autoAdvance: false,
          buttonText: `Start Part ${step.b + 1}`
        };
      }
      case 'pre-stroop':
        return {
          badge: `${this.blockTag(step.b)} · FOCUS CHECK`,
          title: 'Focus Check (Before the Break)',
          desc: stroopDesc
        };
      case 'post-math':
        return {
          badge: `${this.blockTag(step.b)} · AFTER-BREAK MATH`,
          title: 'After-Break Arithmetic Check',
          desc: `Repeat the rapid mental arithmetic task for ${MATH_SECONDS} seconds. Answer as many questions correctly as you can.`
        };
      case 'rest': {
        const info = CONDITION_INFO[this.session.blocks[step.b].condition];
        return {
          badge: `${this.blockTag(step.b)} · 3-MINUTE BREAK`,
          title: `${info.name}: Instructions`,
          desc: `${info.restInstruction} ${NO_DEVICES_NOTE}`,
          autoAdvance: false,
          buttonText: 'Start the 3-Minute Break'
        };
      }
      case 'post-stroop':
        return {
          badge: `${this.blockTag(step.b)} · FOCUS CHECK`,
          title: 'The break is over. Please open your eyes.',
          desc: `Next is a short focus check. ${stroopDesc} Press the button when you are ready.`,
          autoAdvance: false,
          buttonText: 'I am ready'
        };
      default:
        return null;
    }
  }

  /* ==========================================================================
     Universal Inter-Stage Transition (optional 10-second countdown)
     ========================================================================== */
  wireTransitionButton() {
    const continueBtn = document.getElementById('btn-continue-round');
    if (continueBtn) {
      continueBtn.addEventListener('click', () => {
        this.clearTransitionTimer();
        this.fireTransitionProceed();
      });
    }
  }

  fireTransitionProceed() {
    if (this.onTransitionProceed) {
      const fn = this.onTransitionProceed;
      this.onTransitionProceed = null;
      fn();
    }
  }

  showTransition({ badge, title, desc, onProceed, color = '', autoAdvance = true, buttonText = 'Continue to Next Round' }) {
    this.clearTransitionTimer();
    this.onTransitionProceed = onProceed;

    const badgeEl = document.getElementById('trans-badge');
    const titleEl = document.getElementById('trans-title');
    const descEl = document.getElementById('trans-desc');
    const digitsEl = document.getElementById('trans-timer-val');
    const noteSecEl = document.getElementById('trans-note-sec');
    const progressCircle = document.getElementById('trans-ring-progress');
    const countdownWrap = document.querySelector('#stage-transition .relax-countdown-wrap');
    const continueBtn = document.getElementById('btn-continue-round');

    if (badgeEl) {
      badgeEl.textContent = badge || 'UPCOMING STAGE';
      badgeEl.style.color = color;
      badgeEl.style.background = color ? `${color}1a` : '';
    }
    if (titleEl) titleEl.textContent = title || 'Next Round';
    if (descEl) descEl.textContent = desc || 'Prepare for the upcoming section.';
    if (continueBtn) continueBtn.textContent = buttonText;
    if (countdownWrap) countdownWrap.classList.toggle('hidden', !autoAdvance);

    this.showStage('stage-transition', badge || 'Upcoming Stage');
    if (!autoAdvance) return;

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

    this.transitionTimerId = setInterval(() => {
      this.transitionSecondsLeft--;
      updateRing();

      if (this.transitionSecondsLeft <= 0) {
        this.clearTransitionTimer();
        this.fireTransitionProceed();
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
    let previousVolume = 1.0;

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
          const restored = previousVolume || 1.0;
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
     Participant Intake
     ========================================================================== */
  wireIntakeForm() {
    const form = document.getElementById('form-intake');
    if (!form) return;

    const errorMsg = document.getElementById('intake-error');
    const extra = document.getElementById('intake-extra');
    if (extra) {
      renderQuestions(extra, INTAKE_QUESTIONS);
      extra.addEventListener('answer', () => errorMsg && errorMsg.classList.add('hidden'));
    }

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

    form.addEventListener('submit', (e) => {
      e.preventDefault();

      const name = document.getElementById('intake-name')?.value.trim() || '';
      const roll = document.getElementById('intake-roll')?.value.trim() || '';
      const age = parseInt(document.getElementById('intake-age')?.value, 10);
      const mw = mwInput ? mwInput.value : '';
      const { answers, missing } = collectAnswers(extra, INTAKE_QUESTIONS);

      if (!name || !roll || isNaN(age) || age < 10 || !mw || missing.length) {
        if (errorMsg) {
          errorMsg.textContent = 'Please fill out all fields and answer every background question.';
          errorMsg.classList.remove('hidden');
        }
        return;
      }

      if (errorMsg) errorMsg.classList.add('hidden');

      this.session.name = name;
      this.session.rollNumber = roll;
      this.session.age = age;
      this.session.isMusicWorkshop = mw;
      this.session.intake = answers;

      this.advance();
    });
  }

  /* ==========================================================================
     Stroop Tasks (baseline, and pre/post rest in each part)
     ========================================================================== */
  mountStroop({ tag, tagStyle = '', title, sub, label, onComplete }) {
    this.showStage('stage-task-mount', label);

    const mount = document.getElementById('stage-task-mount');
    mount.innerHTML = `
      <div class="wizard-card">
        <div class="card-header">
          <span class="section-tag" style="${tagStyle}">${tag}</span>
          <h2>${title}</h2>
          <p class="card-sub">${sub}</p>
        </div>
        <div id="stroop-mount-point"></div>
      </div>
    `;

    this.currentActiveTask = new StroopTask({
      container: document.getElementById('stroop-mount-point'),
      totalTrials: STROOP_TRIALS,
      onComplete: (data) => {
        const { logs, ...summary } = data;
        onComplete(summary);
        this.advance();
      }
    });
    this.currentActiveTask.start();
  }

  startBlockStroop(b, when) {
    const block = this.session.blocks[b];
    const color = CONDITION_INFO[block.condition].color;
    this.mountStroop({
      tag: `${this.blockTag(b)} · ${when === 'pre' ? 'BEFORE BREAK' : 'AFTER BREAK'}`,
      tagStyle: `color: ${color}; background: ${color}1a;`,
      title: 'Color Focus Check',
      sub: 'Select the <strong>INK COLOR</strong> of the word as quickly and accurately as possible.',
      label: `${this.blockLabel(b)} · Focus Check`,
      onComplete: (summary) => {
        if (when === 'pre') block.preStroop = summary;
        else block.postStroop = summary;
      }
    });
  }

  /* ==========================================================================
     Study Overview (explains both conditions up front)
     ========================================================================== */
  wireOverview() {
    const btn = document.getElementById('btn-start-study');
    if (btn) btn.addEventListener('click', () => this.advance());
  }

  /* ==========================================================================
     Stressor: Timed Arithmetic
     ========================================================================== */
  startStressorMath(b, when = 'pre') {
    const isPostRest = when === 'post';
    this.showStage(
      'stage-task-mount',
      `${this.blockLabel(b)} · ${isPostRest ? 'After-Break Math' : 'Stress Task'}`
    );

    const mount = document.getElementById('stage-task-mount');
    mount.innerHTML = `
      <div class="wizard-card">
        <div class="card-header">
          <span class="section-tag" style="color: #ef4444; background: rgba(239, 68, 68, 0.1);">${this.blockTag(b)} · ${isPostRest ? 'AFTER-BREAK MATH' : 'STRESS TASK'}</span>
          <h2>${isPostRest ? 'After-Break Arithmetic Check' : 'Rapid Arithmetic Challenge'}</h2>
          <p class="card-sub">Answer arithmetic questions under time pressure (${MATH_SECONDS} seconds total).</p>
        </div>
        <div id="math-mount-point"></div>
      </div>
    `;

    this.currentActiveTask = new FatigueInducer({
      container: document.getElementById('math-mount-point'),
      durationSeconds: MATH_SECONDS,
      questionTimeLimit: 7.0,
      onComplete: (data) => {
        const metrics = {
          accuracy: data.accuracy,
          totalQuestions: data.totalQuestions,
          correctQuestions: data.correctQuestions,
          meanRt: data.meanRt
        };
        this.session.blocks[b][isPostRest ? 'postRestMath' : 'stressorMath'] = metrics;
        this.advance();
      }
    });
    this.currentActiveTask.start();
  }

  /* ==========================================================================
     Generic Survey Stage
     ========================================================================== */
  wireSurveyForm() {
    const form = document.getElementById('form-survey');
    if (!form) return;

    const errorMsg = document.getElementById('survey-error');
    const container = document.getElementById('survey-questions');
    container.addEventListener('answer', () => errorMsg && errorMsg.classList.add('hidden'));

    form.addEventListener('submit', (e) => {
      e.preventDefault();
      if (!this.activeSurvey) return;

      const { answers, missing } = collectAnswers(container, this.activeSurvey.questions);
      if (missing.length) {
        if (errorMsg) {
          errorMsg.textContent = `Please answer every question before continuing (${missing.length} left).`;
          errorMsg.classList.remove('hidden');
        }
        return;
      }

      if (errorMsg) errorMsg.classList.add('hidden');
      const comments = document.getElementById('survey-comments')?.value.trim() || '';
      const survey = this.activeSurvey;
      this.activeSurvey = null;
      survey.onSubmit(answers, comments);
      this.advance();
    });

    const skipBtn = document.getElementById('btn-skip-survey-pres');
    if (skipBtn) skipBtn.addEventListener('click', () => this.skipCurrentStage());
  }

  showSurvey({ tag, tagColor, title, desc, label, questions, showComments = false, onSubmit }) {
    this.activeSurvey = { questions, onSubmit };

    const tagEl = document.getElementById('survey-tag');
    if (tagEl) {
      tagEl.textContent = tag;
      tagEl.style.color = tagColor || '';
      tagEl.style.background = tagColor ? `${tagColor}1a` : '';
    }
    document.getElementById('survey-title').textContent = title;
    document.getElementById('survey-desc').textContent = desc;
    document.getElementById('survey-error')?.classList.add('hidden');

    const commentsWrap = document.getElementById('survey-comments-wrap');
    const commentsInput = document.getElementById('survey-comments');
    if (commentsWrap) commentsWrap.classList.toggle('hidden', !showComments);
    if (commentsInput) commentsInput.value = '';

    renderQuestions(document.getElementById('survey-questions'), questions);
    this.showStage('stage-survey', label);
  }

  startPreSurvey(b) {
    const block = this.session.blocks[b];
    this.showSurvey({
      tag: `${this.blockTag(b)} · CHECK-IN`,
      tagColor: CONDITION_INFO[block.condition].color,
      title: 'How are you feeling right now?',
      desc: 'Answer based on how you feel at this moment, after the arithmetic task.',
      label: `${this.blockLabel(b)} · Check-in`,
      questions: STATE_QUESTIONS,
      onSubmit: (answers) => { block.preState = answers; }
    });
  }

  startPostSurvey(b) {
    const block = this.session.blocks[b];
    const info = CONDITION_INFO[block.condition];
    const experienceQs = getRestExperienceQuestions(block.condition);
    const questions = [...STATE_QUESTIONS, ...experienceQs];

    this.showSurvey({
      tag: `${this.blockTag(b)} · AFTER THE BREAK`,
      tagColor: info.color,
      title: `How are you feeling after the ${info.lowerName}?`,
      desc: `Questions 1–2 are about how you feel right now. The rest are about the ${info.lowerName} you just took.`,
      label: `${this.blockLabel(b)} · Check-in`,
      questions,
      onSubmit: (answers) => {
        block.postState = {};
        block.experience = {};
        STATE_QUESTIONS.forEach(q => { block.postState[q.id] = answers[q.id]; });
        experienceQs.forEach(q => { block.experience[q.id] = answers[q.id]; });
      }
    });
  }

  startFinalSurvey() {
    this.showSurvey({
      tag: 'FINAL · COMPARE THE TWO BREAKS',
      title: 'Comparing the two breaks',
      desc: 'You have now taken both a Silent break and an Audio (BreatheBeat) break. Please compare them.',
      label: 'Final Comparison',
      questions: FINAL_QUESTIONS,
      showComments: true,
      onSubmit: (answers, comments) => {
        this.session.final = answers;
        this.session.comments = comments;
      }
    });
  }

  /* ==========================================================================
     5-Minute Eyes-Closed Rest (Silence or BreatheBeat)
     ========================================================================== */
  startRest(b) {
    const block = this.session.blocks[b];
    const info = CONDITION_INFO[block.condition];
    const isAudio = block.condition === 'breathebeat';

    this.showStage('stage-breathing', `${this.blockLabel(b)} · Break`);

    const badgeEl = document.getElementById('breath-cycle-badge');
    const titleEl = document.getElementById('breath-title');
    const instrEl = document.getElementById('breath-instruction');
    const roundLabel = document.getElementById('breath-round-label');
    const timerLabel = document.getElementById('breath-total-time');

    if (badgeEl) {
      badgeEl.textContent = this.blockTag(b);
      badgeEl.style.color = info.color;
      badgeEl.style.background = `${info.color}1a`;
    }
    if (titleEl) titleEl.textContent = info.name;
    if (instrEl) instrEl.textContent = info.restScreen;
    if (roundLabel) roundLabel.textContent = '';
    if (timerLabel) timerLabel.textContent = `${REST_ROUNDS * 10}s remaining`;

    const canvas = document.getElementById('wizard-breath-canvas');
    if (canvas && !this.wizardBreathVis) {
      this.wizardBreathVis = new BreathingVisualizer(canvas);
    }
    if (this.wizardBreathVis) {
      this.wizardBreathVis.onResize();
      this.wizardBreathVis.start();
    }

    synth.startBreathingCycle({
      mode: block.condition,
      totalRounds: REST_ROUNDS,
      onPhaseChange: (phaseInfo) => {
        if (roundLabel && isAudio) {
          roundLabel.textContent = `Breath ${phaseInfo.cycle} / ${REST_ROUNDS} · ${phaseInfo.label}`;
        }
      },
      onTick: (tickInfo) => {
        if (this.wizardBreathVis) {
          this.wizardBreathVis.setDirectProgress(tickInfo.phase, tickInfo.phaseProgress);
        }
        if (timerLabel) {
          timerLabel.textContent = `${tickInfo.totalSecondsLeft}s remaining`;
        }
      },
      onComplete: () => this.finishRest(b, true)
    });
  }

  finishRest(b, completed) {
    const block = this.session.blocks[b];
    block.restSeconds = synth.getElapsedSeconds();
    block.restCompleted = completed;
    block.audioMuted = block.condition === 'breathebeat' && synth.wasMuted;

    synth.stopBreathingCycle();
    if (this.wizardBreathVis) this.wizardBreathVis.stop();

    if (completed) {
      synth.playChime();
      this.advance();
    }
  }

  /* ==========================================================================
     Completion
     ========================================================================== */
  completeSession() {
    this.session.completedAt = new Date().toISOString();
    recordStudySession(this.session);
    this.showStage('stage-complete', 'Complete');
    this.renderCompletionSummary();
  }

  renderCompletionSummary() {
    const summaryContainer = document.getElementById('complete-metrics-summary');
    if (!summaryContainer) return;

    summaryContainer.innerHTML = `
      <div class="complete-metric-card">
        <span class="complete-metric-lbl">Participant Roll</span>
        <span class="complete-metric-val" style="font-size: 1.15rem;">${this.session.rollNumber || 'DEMO'}</span>
      </div>
    `;
    summaryContainer.classList.remove('hidden');
  }

  wireRestartButton() {
    const restartBtn = document.getElementById('btn-restart-study');
    if (restartBtn) {
      restartBtn.addEventListener('click', () => this.resetForNextParticipant());
    }
  }

  resetForNextParticipant() {
    this.cleanupActiveProcesses();
    this.session = this.getFreshSessionState();
    this.steps = this.buildSteps();
    this.currentStepIndex = 0;

    const intakeForm = document.getElementById('form-intake');
    if (intakeForm) intakeForm.reset();
    const mwInput = document.getElementById('intake-mw');
    if (mwInput) mwInput.value = '';

    document.querySelectorAll('.pill-choice, .btn-choice').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.survey-item.unanswered').forEach(el => el.classList.remove('unanswered'));
    document.querySelectorAll('.form-error-msg').forEach(el => el.classList.add('hidden'));

    this.showStage('stage-overview', 'Welcome');
  }

  /* ==========================================================================
     PRESENTATION MODE & QUICK SECTION SKIPPING
     Any skip marks the session Is_Demo = TRUE so it can be excluded from analysis.
     ========================================================================== */
  wirePresentationMode() {
    const toggleBtn = document.getElementById('btn-toggle-presentation');
    const presenterBar = document.getElementById('presenter-bar');
    const barPrevBtn = document.getElementById('btn-presenter-prev-stage');
    const barSkipBtn = document.getElementById('btn-presenter-skip-stage');
    const intakeSkipBtn = document.getElementById('btn-skip-intake-pres');

    const setPresentationMode = (active) => {
      this.isPresentationMode = active;
      document.body.classList.toggle('presentation-mode-active', active);
      if (toggleBtn) {
        toggleBtn.classList.toggle('active', active);
        const lbl = toggleBtn.querySelector('.pres-toggle-label');
        if (lbl) lbl.textContent = active ? 'Presentation: ON' : 'Presentation Mode';
      }
      if (presenterBar) presenterBar.classList.toggle('hidden', !active);
      document.querySelectorAll('.pres-only-btn').forEach(btn => btn.classList.toggle('hidden', !active));
      this.updatePresenterBar();
    };

    if (toggleBtn) toggleBtn.addEventListener('click', () => setPresentationMode(!this.isPresentationMode));
    if (barPrevBtn) barPrevBtn.addEventListener('click', () => this.previousStage());
    if (barSkipBtn) barSkipBtn.addEventListener('click', () => this.skipCurrentStage());
    if (intakeSkipBtn) intakeSkipBtn.addEventListener('click', () => this.skipCurrentStage());

    // Keyboard Shortcuts:
    // 'P' toggles Presentation Mode (when not typing in an input)
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
    if (prevBtn) prevBtn.disabled = this.currentStepIndex <= 0;

    const nextBtn = document.getElementById('btn-presenter-skip-stage');
    if (nextBtn) nextBtn.disabled = this.currentStepIndex >= this.steps.length - 1;
  }

  cleanupActiveProcesses() {
    this.clearTransitionTimer();
    this.onTransitionProceed = null;
    this.activeSurvey = null;

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

  /**
   * Fills any data a skipped step would have produced, so later steps and the export stay valid
   */
  fillDemoData(step) {
    const midAnswers = (questions) => Object.fromEntries(
      questions.map(q => [q.id, q.options[Math.floor(q.options.length / 2)].value])
    );
    const demoStroop = (rt) => ({ totalTrials: STROOP_TRIALS, correctCount: 11, accuracy: 92, meanRT: rt, meanCongruentRT: rt - 60, meanIncongruentRT: rt + 60, stroopEffect: 120 });
    const block = step.b !== undefined ? this.session.blocks[step.b] : null;

    switch (step.type) {
      case 'intake':
        if (!this.session.rollNumber) {
          this.session.name = 'Demo Presenter';
          this.session.rollNumber = 'DEMO';
          this.session.age = 21;
          this.session.isMusicWorkshop = 'Yes';
          this.session.intake = midAnswers(INTAKE_QUESTIONS);
        }
        break;
      case 'math':
        if (!block.stressorMath) {
          block.stressorMath = { accuracy: 80, totalQuestions: 9, correctQuestions: 7, meanRt: 3100 };
        }
        break;
      case 'post-math':
        if (!block.postRestMath) {
          block.postRestMath = { accuracy: 80, totalQuestions: 9, correctQuestions: 7, meanRt: 3100 };
        }
        break;
      case 'pre-stroop':
        if (!block.preStroop) block.preStroop = demoStroop(900);
        break;
      case 'pre-survey':
        if (!block.preState) block.preState = midAnswers(STATE_QUESTIONS);
        break;
      case 'post-stroop':
        if (!block.postStroop) block.postStroop = demoStroop(820);
        break;
      case 'post-survey':
        if (!block.postState) block.postState = midAnswers(STATE_QUESTIONS);
        if (!block.experience) block.experience = midAnswers(getRestExperienceQuestions(block.condition));
        break;
      case 'final-survey':
        if (!Object.keys(this.session.final).length) this.session.final = midAnswers(FINAL_QUESTIONS);
        break;
    }
  }

  goToStep(targetIndex) {
    if (targetIndex < 0 || targetIndex >= this.steps.length) return;

    this.session.isDemo = true;
    if (this.steps[this.currentStepIndex]?.type === 'rest' && this.currentStageId === 'stage-breathing') {
      this.finishRest(this.steps[this.currentStepIndex].b, false);
    }
    this.cleanupActiveProcesses();

    for (let i = 0; i < targetIndex; i++) {
      this.fillDemoData(this.steps[i]);
    }

    this.runStep(targetIndex);
    this.updatePresenterBar();
  }

  previousStage() {
    if (this.currentStageId === 'stage-transition') {
      // The transition belongs to the step it introduces; go back to the step before it
      this.goToStep(Math.max(0, this.currentStepIndex - 1));
      return;
    }
    this.goToStep(this.currentStepIndex - 1);
  }

  skipCurrentStage() {
    if (this.currentStageId === 'stage-transition') {
      this.clearTransitionTimer();
      this.fireTransitionProceed();
      return;
    }
    this.goToStep(this.currentStepIndex + 1);
  }
}

// Bootstrap application on DOM ready
document.addEventListener('DOMContentLoaded', () => {
  new BreatheBeatApp();
});
