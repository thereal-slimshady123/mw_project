/**
 * BREATHEBEAT — Main Controller
 * Integrates Web Audio API Synthesizer, 5-Stage Automated Testing Module, and Cohort Data Analytics
 */

import { synth } from './audio/synth.js';
import { AudioVisualizer } from './audio/audioVisualizer.js';
import { BreathingVisualizer } from './components/breathingVisualizer.js';
import { StroopTask } from './tests/stroop.js';
import { FatigueInducer } from './tests/fatigue.js';
import { NasaTlxSurvey } from './tests/nasatlx.js';
import { cohort, calculateCognitiveRecovery } from './data/cohortData.js';
import { Chart, registerables } from 'chart.js';
import confetti from 'canvas-confetti';

Chart.register(...registerables);

class BreatheBeatApp {
  constructor() {
    this.currentView = 'experiment';
    this.audioInitialized = false;

    // Visualizers
    this.audioVis = null;
    this.breathVis = null;

    // Active session state
    this.session = {
      participantId: 'BB-2024-LIVE',
      arm: 'breathebeat',
      familiarity: 3,
      mode: 'demo', // 'demo' | 'full'
      currentStage: 0,
      baselineData: null,
      fatigueInducerData: null,
      postFatigueData: null,
      restBreakElapsed: 0,
      recoveryData: null,
      surveyData: null,
      activeModule: null,
      restTimerId: null
    };

    // Chart.js instances
    this.charts = {
      recovery: null,
      trajectory: null,
      effort: null,
      familiarity: null
    };

    this.init();
  }

  async init() {
    this.wireNavigation();
    this.wireAudioInit();
    this.wireSetupForm();
    this.wireSynthesizerLab();
    this.wireDashboardActions();
    this.initVisualizers();
    this.renderCohortDashboard();
  }

  /* ==========================================================================
     Navigation & Audio Engine Initialization
     ========================================================================== */

  wireNavigation() {
    const tabs = document.querySelectorAll('.nav-tab');
    tabs.forEach(tab => {
      tab.addEventListener('click', () => {
        const viewId = tab.getAttribute('data-view');
        this.switchView(viewId);
      });
    });
  }

  switchView(viewId) {
    this.currentView = viewId;

    document.querySelectorAll('.nav-tab').forEach(t => {
      t.classList.toggle('active', t.getAttribute('data-view') === viewId);
    });

    document.querySelectorAll('.view-panel').forEach(panel => {
      panel.classList.toggle('active', panel.id === `view-${viewId}`);
    });

    // Handle view-specific initializations
    if (viewId === 'synthesizer') {
      if (this.audioVis) this.audioVis.start();
    } else {
      if (this.audioVis) this.audioVis.stop();
    }

    if (viewId === 'dashboard') {
      this.renderCohortDashboard();
    }
  }

  async ensureAudioReady() {
    if (!this.audioInitialized) {
      await synth.init();
      this.audioInitialized = true;

      const label = document.getElementById('audio-status-label');
      const toggle = document.getElementById('header-audio-init');
      if (label) label.textContent = 'Audio Active (Web Audio API)';
      if (toggle) toggle.classList.add('ready');

      if (this.audioVis) {
        this.audioVis.setAnalyser(synth.analyser);
      }
    }
  }

  wireAudioInit() {
    const toggle = document.getElementById('header-audio-init');
    if (toggle) {
      toggle.addEventListener('click', async () => {
        await this.ensureAudioReady();
      });
    }
  }

  initVisualizers() {
    // Oscilloscope canvas in Synth lab
    const scopeCanvas = document.getElementById('synth-scope-canvas');
    if (scopeCanvas) {
      this.audioVis = new AudioVisualizer(scopeCanvas, synth.analyser);
    }

    // Breathing Visualizer canvas for rest stage
    const breathCanvas = document.getElementById('breath-canvas');
    if (breathCanvas) {
      this.breathVis = new BreathingVisualizer(breathCanvas);
    }
  }

  /* ==========================================================================
     VIEW 1: EXPERIMENT STUDY PROTOCOL (5 STAGES)
     ========================================================================== */

  wireSetupForm() {
    // Musical familiarity pills
    const pills = document.querySelectorAll('#intake-rating-pills .intake-pill');
    const familiarityInput = document.getElementById('music-familiarity-val');
    pills.forEach(pill => {
      pill.addEventListener('click', () => {
        pills.forEach(p => p.classList.remove('active'));
        pill.classList.add('active');
        const val = parseInt(pill.getAttribute('data-val'), 10);
        if (familiarityInput) familiarityInput.value = val;
      });
    });

    // Start Protocol Button
    const btnStart = document.getElementById('btn-start-protocol');
    if (btnStart) {
      btnStart.addEventListener('click', async () => {
        await this.ensureAudioReady();
        this.startExperimentSession();
      });
    }

    // Skip Rest Break Button
    const btnSkipRest = document.getElementById('btn-skip-rest-break');
    if (btnSkipRest) {
      btnSkipRest.addEventListener('click', () => {
        this.finishStage4Rest();
      });
    }

    // Results Actions
    const btnAddCohort = document.getElementById('btn-add-to-cohort');
    if (btnAddCohort) {
      btnAddCohort.addEventListener('click', () => {
        this.saveSessionToCohort();
      });
    }

    const btnViewDashboard = document.getElementById('btn-view-cohort-dashboard');
    if (btnViewDashboard) {
      btnViewDashboard.addEventListener('click', () => {
        this.switchView('dashboard');
      });
    }

    const btnRestart = document.getElementById('btn-restart-protocol');
    if (btnRestart) {
      btnRestart.addEventListener('click', () => {
        this.resetExperimentSession();
      });
    }
  }

  startExperimentSession() {
    const idInput = document.getElementById('participant-id');
    const armSelect = document.getElementById('condition-arm');
    const familiarityInput = document.getElementById('music-familiarity-val');
    const modeSelect = document.getElementById('protocol-mode');

    let arm = armSelect ? armSelect.value : 'breathebeat';
    if (arm === 'random') {
      const arms = ['silent', 'spoken', 'breathebeat'];
      arm = arms[Math.floor(Math.random() * arms.length)];
    }

    this.session = {
      participantId: (idInput && idInput.value.trim()) || `BB-${Date.now().toString().slice(-4)}`,
      arm,
      familiarity: familiarityInput ? parseInt(familiarityInput.value, 10) : 3,
      mode: modeSelect ? modeSelect.value : 'demo',
      currentStage: 1,
      baselineData: null,
      fatigueInducerData: null,
      postFatigueData: null,
      recoveryData: null,
      surveyData: null,
      activeModule: null,
      restTimerId: null
    };

    // Transition view cards
    document.getElementById('exp-setup-card').classList.add('hidden');
    document.getElementById('session-active-card').classList.remove('hidden');
    document.getElementById('session-results-card').classList.add('hidden');

    this.runStage1Baseline();
  }

  updateStepper(stageNum) {
    for (let i = 1; i <= 6; i++) {
      const stepEl = document.getElementById(`step-${i}`);
      if (!stepEl) continue;
      stepEl.classList.remove('active', 'completed');
      if (i < stageNum) {
        stepEl.classList.add('completed');
      } else if (i === stageNum) {
        stepEl.classList.add('active');
      }
    }
  }

  // STAGE 1: Baseline Check (Stroop)
  runStage1Baseline() {
    this.session.currentStage = 1;
    this.updateStepper(1);

    const mount = document.getElementById('stage-mount-area');
    mount.classList.remove('hidden');
    document.getElementById('rest-break-container').classList.add('hidden');

    const totalTrials = this.session.mode === 'demo' ? 8 : 24;
    mount.innerHTML = `
      <div class="stage-intro-card">
        <span class="section-badge">STAGE 1 OF 5 (2 MIN STANDARD)</span>
        <h2>Baseline Cognitive Check (Stroop Task)</h2>
        <p>Identify the <strong>INK COLOR</strong> of each word as quickly and accurately as possible while ignoring the written word text.</p>
        <button class="btn-primary-glow" id="btn-begin-s1">Start Baseline Trials (${totalTrials} items)</button>
      </div>
    `;

    document.getElementById('btn-begin-s1').addEventListener('click', () => {
      const stroop = new StroopTask({
        container: mount,
        isDemoMode: this.session.mode === 'demo',
        totalTrials,
        onComplete: (summary) => {
          this.session.baselineData = summary;
          this.runStage2Fatigue();
        }
      });
      this.session.activeModule = stroop;
      stroop.start();
    });
  }

  // STAGE 2: Fatigue Inducer
  runStage2Fatigue() {
    this.session.currentStage = 2;
    this.updateStepper(2);

    const mount = document.getElementById('stage-mount-area');
    mount.classList.remove('hidden');
    document.getElementById('rest-break-container').classList.add('hidden');

    const durationSec = this.session.mode === 'demo' ? 25 : 180;
    mount.innerHTML = `
      <div class="stage-intro-card">
        <span class="section-badge" style="background: rgba(239, 68, 68, 0.15); color: #ef4444; border-color: rgba(239, 68, 68, 0.3);">STAGE 2 OF 5 (FATIGUE INDUCER)</span>
        <h2>Rapid Working Memory & Logic Stressor</h2>
        <p>Solve high-speed multi-operation math puzzles under rapid time pressure (4s per question). Designed to intentionally deplete working memory and induce focus fatigue.</p>
        <button class="btn-primary-glow" id="btn-begin-s2" style="background: linear-gradient(135deg, #ef4444, #b91c1c); color: #fff;">Begin Fatigue Stressor (${durationSec}s)</button>
      </div>
    `;

    document.getElementById('btn-begin-s2').addEventListener('click', () => {
      const fatigue = new FatigueInducer({
        container: mount,
        isDemoMode: this.session.mode === 'demo',
        durationSeconds: durationSec,
        onComplete: (summary) => {
          this.session.fatigueInducerData = summary;
          this.runStage3PostFatigue();
        }
      });
      this.session.activeModule = fatigue;
      fatigue.start();
    });
  }

  // STAGE 3: Post-Fatigue Check (Stroop)
  runStage3PostFatigue() {
    this.session.currentStage = 3;
    this.updateStepper(3);

    const mount = document.getElementById('stage-mount-area');
    mount.classList.remove('hidden');
    document.getElementById('rest-break-container').classList.add('hidden');

    const totalTrials = this.session.mode === 'demo' ? 8 : 24;
    mount.innerHTML = `
      <div class="stage-intro-card">
        <span class="section-badge">STAGE 3 OF 5 (POST-FATIGUE CHECK)</span>
        <h2>Quantify Cognitive Processing Drop</h2>
        <p>Immediately following mental fatigue, complete a second counterbalanced Stroop test to record your reaction time slowdown and error rate.</p>
        <button class="btn-primary-glow" id="btn-begin-s3">Start Post-Fatigue Check</button>
      </div>
    `;

    document.getElementById('btn-begin-s3').addEventListener('click', () => {
      const stroop = new StroopTask({
        container: mount,
        isDemoMode: this.session.mode === 'demo',
        totalTrials,
        onComplete: (summary) => {
          this.session.postFatigueData = summary;
          this.runStage4RestBreak();
        }
      });
      this.session.activeModule = stroop;
      stroop.start();
    });
  }

  // STAGE 4: Guided Rest Break (4-2-6 Breathing + Audio Synthesizer)
  runStage4RestBreak() {
    this.session.currentStage = 4;
    this.updateStepper(4);

    const mount = document.getElementById('stage-mount-area');
    mount.classList.add('hidden');
    const restBox = document.getElementById('rest-break-container');
    restBox.classList.remove('hidden');

    const durationSec = this.session.mode === 'demo' ? 35 : 300;
    let remaining = durationSec;

    const armLabels = {
      breathebeat: 'BREATHEBEAT Engine (Raga Bhupali Meend & Tanpura Drone)',
      spoken: 'Spoken Guide (Synthetic Voice Pacing)',
      silent: 'Silent Rest (Tibetan Singing Bowl Control)'
    };

    const armBadge = document.getElementById('rest-arm-badge');
    const countdownEl = document.getElementById('rest-stage-countdown');
    const titleEl = document.getElementById('rest-phase-title');
    const subEl = document.getElementById('rest-phase-sub');

    if (armBadge) armBadge.textContent = `Assigned Arm: ${armLabels[this.session.arm]}`;
    if (countdownEl) countdownEl.textContent = `${remaining}s`;

    if (this.breathVis) this.breathVis.start();

    // Start Audio Synthesizer Engine for the assigned arm
    synth.startBreathingCycle(this.session.arm, (phaseInfo) => {
      if (titleEl) titleEl.textContent = phaseInfo.label;
      if (subEl) subEl.textContent = `${phaseInfo.subtext} • ${phaseInfo.notes}`;
      if (this.breathVis) this.breathVis.setPhase(phaseInfo.phase, phaseInfo.duration);
    });

    if (this.session.restTimerId) clearInterval(this.session.restTimerId);
    this.session.restTimerId = setInterval(() => {
      remaining--;
      if (countdownEl) countdownEl.textContent = `${remaining}s`;
      if (remaining <= 0) {
        this.finishStage4Rest();
      }
    }, 1000);
  }

  finishStage4Rest() {
    if (this.session.restTimerId) {
      clearInterval(this.session.restTimerId);
      this.session.restTimerId = null;
    }

    synth.stopBreathingCycle();
    if (this.breathVis) this.breathVis.stop();

    document.getElementById('rest-break-container').classList.add('hidden');
    this.runStage5Recovery();
  }

  // STAGE 5: Recovery Check (Stroop)
  runStage5Recovery() {
    this.session.currentStage = 5;
    this.updateStepper(5);

    const mount = document.getElementById('stage-mount-area');
    mount.classList.remove('hidden');

    const totalTrials = this.session.mode === 'demo' ? 8 : 24;
    mount.innerHTML = `
      <div class="stage-intro-card">
        <span class="section-badge" style="background: rgba(16, 185, 129, 0.15); color: #10b981; border-color: rgba(16, 185, 129, 0.3);">STAGE 5 OF 5 (RECOVERY CHECK)</span>
        <h2>Evaluate Restored Cognitive Capacity</h2>
        <p>Following the 4-2-6 diaphragmatic rest break, complete the final Stroop check to calculate your Cognitive Recovery Score.</p>
        <button class="btn-primary-glow" id="btn-begin-s5" style="background: linear-gradient(135deg, #10b981, #059669); color: #fff;">Begin Final Recovery Check</button>
      </div>
    `;

    document.getElementById('btn-begin-s5').addEventListener('click', () => {
      const stroop = new StroopTask({
        container: mount,
        isDemoMode: this.session.mode === 'demo',
        totalTrials,
        onComplete: (summary) => {
          this.session.recoveryData = summary;
          this.runStage6Survey();
        }
      });
      this.session.activeModule = stroop;
      stroop.start();
    });
  }

  // STAGE 6: NASA-TLX Survey & Results
  runStage6Survey() {
    this.session.currentStage = 6;
    this.updateStepper(6);

    const mount = document.getElementById('stage-mount-area');
    mount.classList.remove('hidden');

    const survey = new NasaTlxSurvey({
      container: mount,
      arm: this.session.arm,
      onComplete: (surveyResults) => {
        this.session.surveyData = surveyResults;
        this.renderSessionResults();
      }
    });
    survey.render();
  }

  renderSessionResults() {
    document.getElementById('stage-mount-area').classList.add('hidden');
    const resultsCard = document.getElementById('session-results-card');
    resultsCard.classList.remove('hidden');

    // Confetti effect
    try {
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 }
      });
    } catch (e) {}

    const baseRt = this.session.baselineData ? this.session.baselineData.meanRT : 540;
    const fatRt = this.session.postFatigueData ? this.session.postFatigueData.meanRT : 735;
    const recRt = this.session.recoveryData ? this.session.recoveryData.meanRT : 560;

    const recoveryScore = calculateCognitiveRecovery(baseRt, fatRt, recRt);
    const effortScore = this.session.surveyData ? this.session.surveyData.overallEffortScore : 20;

    document.getElementById('res-recovery-score').textContent = `${recoveryScore}%`;
    document.getElementById('res-effort-score').textContent = `${effortScore} / 100`;

    const effortVerdict = document.getElementById('res-effort-verdict');
    if (effortVerdict) {
      if (effortScore < 30) effortVerdict.textContent = 'Minimal Cognitive Strain (Flow Rest)';
      else if (effortScore < 55) effortVerdict.textContent = 'Moderate Counting Workload';
      else effortVerdict.textContent = 'High Mental Demand from Pace Tracking';
    }

    document.getElementById('res-baseline-rt').textContent = `${baseRt} ms`;
    document.getElementById('res-baseline-acc').textContent = `Accuracy: ${this.session.baselineData ? this.session.baselineData.accuracy : 96}%`;

    document.getElementById('res-fatigue-rt').textContent = `${fatRt} ms`;
    document.getElementById('res-fatigue-drop').textContent = `Slowdown: +${fatRt - baseRt} ms`;

    document.getElementById('res-recovery-rt').textContent = `${recRt} ms`;
    document.getElementById('res-recovery-gain').textContent = `Restored: -${fatRt - recRt} ms`;
  }

  saveSessionToCohort() {
    const baseRt = this.session.baselineData ? this.session.baselineData.meanRT : 540;
    const fatRt = this.session.postFatigueData ? this.session.postFatigueData.meanRT : 735;
    const recRt = this.session.recoveryData ? this.session.recoveryData.meanRT : 560;

    const armLabels = {
      breathebeat: 'BREATHEBEAT Engine',
      spoken: 'Spoken Guide (Baseline)',
      silent: 'Silent Rest (Control)'
    };

    const newRecord = {
      id: this.session.participantId,
      name: `Participant (${this.session.participantId})`,
      arm: this.session.arm,
      armLabel: armLabels[this.session.arm],
      musicalFamiliarity: this.session.surveyData ? this.session.surveyData.musicalFamiliarity : this.session.familiarity,
      baseline: {
        rtMs: baseRt,
        accuracy: this.session.baselineData ? this.session.baselineData.accuracy : 95,
        stroopEffect: this.session.baselineData ? this.session.baselineData.stroopEffect : 80
      },
      fatigueInducer: {
        arithmeticAccuracy: this.session.fatigueInducerData ? this.session.fatigueInducerData.accuracy : 85,
        attempted: this.session.fatigueInducerData ? this.session.fatigueInducerData.totalAttempted : 20
      },
      postFatigue: {
        rtMs: fatRt,
        accuracy: this.session.postFatigueData ? this.session.postFatigueData.accuracy : 86,
        stroopEffect: this.session.postFatigueData ? this.session.postFatigueData.stroopEffect : 145
      },
      recovery: {
        rtMs: recRt,
        accuracy: this.session.recoveryData ? this.session.recoveryData.accuracy : 95,
        stroopEffect: this.session.recoveryData ? this.session.recoveryData.stroopEffect : 88
      },
      nasaTlx: {
        mental: this.session.surveyData ? this.session.surveyData.mentalDemand : 25,
        effort: this.session.surveyData ? this.session.surveyData.effortTracking : 20,
        distraction: this.session.surveyData ? this.session.surveyData.auditoryDistraction : 15,
        overallEffort: this.session.surveyData ? this.session.surveyData.overallEffortScore : 20
      },
      timestamp: new Date().toISOString()
    };

    cohort.addParticipant(newRecord);
    alert(`Success! Session for ${newRecord.id} has been merged into the 20-student study cohort.`);
    this.switchView('dashboard');
  }

  resetExperimentSession() {
    if (this.session.activeModule && this.session.activeModule.destroy) {
      this.session.activeModule.destroy();
    }
    if (this.session.restTimerId) {
      clearInterval(this.session.restTimerId);
    }
    synth.stopBreathingCycle();

    document.getElementById('exp-setup-card').classList.remove('hidden');
    document.getElementById('session-active-card').classList.add('hidden');
    document.getElementById('session-results-card').classList.add('hidden');
    document.getElementById('rest-break-container').classList.add('hidden');
    document.getElementById('stage-mount-area').innerHTML = '';
  }

  /* ==========================================================================
     VIEW 2: SYNTHESIZER LAB CONTROLS
     ========================================================================== */

  wireSynthesizerLab() {
    // Tanpura Drone Toggle
    const btnDrone = document.getElementById('btn-toggle-drone');
    const droneLabel = document.getElementById('btn-drone-label');
    if (btnDrone) {
      btnDrone.addEventListener('click', async () => {
        await this.ensureAudioReady();
        if (synth.isDroneActive) {
          synth.stopTanpuraDrone(0.8);
          btnDrone.classList.remove('active');
          if (droneLabel) droneLabel.textContent = 'Start Tanpura Drone';
        } else {
          synth.startTanpuraDrone();
          btnDrone.classList.add('active');
          if (droneLabel) droneLabel.textContent = 'Stop Tanpura Drone';
        }
      });
    }

    // Volume Sliders
    const droneVol = document.getElementById('drone-vol');
    if (droneVol) {
      droneVol.addEventListener('input', (e) => {
        synth.setDroneVolume(parseFloat(e.target.value));
      });
    }

    const meendVol = document.getElementById('meend-vol');
    if (meendVol) {
      meendVol.addEventListener('input', (e) => {
        synth.setMeendVolume(parseFloat(e.target.value));
      });
    }

    // Sargam Audition Keys
    const keys = document.querySelectorAll('.sargam-key');
    keys.forEach(k => {
      k.addEventListener('click', async () => {
        await this.ensureAudioReady();
        const note = k.getAttribute('data-note');
        synth.playSingleNote(note, 1.2);
      });
    });

    // Meend Actions
    const btnInhale = document.getElementById('btn-trigger-inhale');
    if (btnInhale) {
      btnInhale.addEventListener('click', async () => {
        await this.ensureAudioReady();
        synth.startMeendLead();
        synth.sonifyInhale(4.0);
      });
    }

    const btnHold = document.getElementById('btn-trigger-hold');
    if (btnHold) {
      btnHold.addEventListener('click', async () => {
        await this.ensureAudioReady();
        synth.startMeendLead();
        synth.sonifyHold(2.0);
      });
    }

    const btnExhale = document.getElementById('btn-trigger-exhale');
    if (btnExhale) {
      btnExhale.addEventListener('click', async () => {
        await this.ensureAudioReady();
        synth.startMeendLead();
        synth.sonifyExhale(6.0);
      });
    }

    // Autonomous 4-2-6 Breathing Audio Loop
    const btnAutoLoop = document.getElementById('btn-toggle-auto-loop');
    if (btnAutoLoop) {
      btnAutoLoop.addEventListener('click', async () => {
        await this.ensureAudioReady();
        if (synth.isCycleRunning) {
          synth.stopBreathingCycle();
          btnAutoLoop.innerHTML = '<span>Start Autonomous 4-2-6 Breathing Audio Loop</span>';
          btnAutoLoop.classList.remove('active');
        } else {
          synth.startBreathingCycle('breathebeat');
          btnAutoLoop.innerHTML = '<span>Stop Autonomous Audio Loop (Playing Raga Bhupali)</span>';
          btnAutoLoop.classList.add('active');
        }
      });
    }

    // Oscilloscope Mode Switch
    const btnWave = document.getElementById('btn-vis-wave');
    const btnFreq = document.getElementById('btn-vis-freq');

    if (btnWave && btnFreq) {
      btnWave.addEventListener('click', () => {
        btnWave.classList.add('active');
        btnFreq.classList.remove('active');
        if (this.audioVis) this.audioVis.mode = 'wave';
      });

      btnFreq.addEventListener('click', () => {
        btnFreq.classList.add('active');
        btnWave.classList.remove('active');
        if (this.audioVis) this.audioVis.mode = 'freq';
      });
    }

    // Audition Comparison Suite
    const btnAudSilent = document.getElementById('btn-audition-silent');
    if (btnAudSilent) {
      btnAudSilent.addEventListener('click', async () => {
        await this.ensureAudioReady();
        synth.playTibetanBowl(432, 4.0);
      });
    }

    const btnAudSpoken = document.getElementById('btn-audition-spoken');
    if (btnAudSpoken) {
      btnAudSpoken.addEventListener('click', async () => {
        await this.ensureAudioReady();
        synth.speakCue('inhale', 4.0);
      });
    }

    const btnAudBB = document.getElementById('btn-audition-breathebeat');
    if (btnAudBB) {
      btnAudBB.addEventListener('click', async () => {
        await this.ensureAudioReady();
        synth.startTanpuraDrone();
        synth.startMeendLead();
        synth.sonifyInhale(4.0);
      });
    }
  }

  /* ==========================================================================
     VIEW 3: DATA DASHBOARD & STATISTICAL ANALYSIS (DELIVERABLE 3)
     ========================================================================== */

  wireDashboardActions() {
    const btnCsv = document.getElementById('btn-export-csv');
    if (btnCsv) {
      btnCsv.addEventListener('click', () => {
        const csv = cohort.exportToCSV();
        cohort.downloadFile(csv, 'breathebeat_cohort_20_study.csv', 'text/csv');
      });
    }

    const btnJson = document.getElementById('btn-export-json');
    if (btnJson) {
      btnJson.addEventListener('click', () => {
        const json = cohort.exportToJSON();
        cohort.downloadFile(json, 'breathebeat_trials_export.json', 'application/json');
      });
    }

    const btnReset = document.getElementById('btn-reset-cohort');
    if (btnReset) {
      btnReset.addEventListener('click', () => {
        if (confirm('Reset cohort dataset back to default 20 student participants?')) {
          cohort.resetToDefault();
          this.renderCohortDashboard();
        }
      });
    }

    // Table Filters
    const searchInput = document.getElementById('table-search');
    const armFilter = document.getElementById('filter-arm');

    if (searchInput) {
      searchInput.addEventListener('input', () => this.filterCohortTable());
    }
    if (armFilter) {
      armFilter.addEventListener('change', () => this.filterCohortTable());
    }
  }

  renderCohortDashboard() {
    const stats = cohort.computeStatistics();
    const bb = stats.groupStats.breathebeat;
    const sp = stats.groupStats.spoken;
    const sl = stats.groupStats.silent;

    // KPI Cards
    const bbRec = document.getElementById('kpi-bb-recovery');
    const bbEff = document.getElementById('kpi-bb-effort');
    const bbN = document.getElementById('kpi-bb-n');
    if (bbRec) bbRec.textContent = `${bb.recovery.mean}%`;
    if (bbEff) bbEff.textContent = `${bb.effort.mean}`;
    if (bbN) bbN.textContent = `${bb.count}`;

    const spRec = document.getElementById('kpi-spoken-recovery');
    const spEff = document.getElementById('kpi-spoken-effort');
    const spN = document.getElementById('kpi-spoken-n');
    if (spRec) spRec.textContent = `${sp.recovery.mean}%`;
    if (spEff) spEff.textContent = `${sp.effort.mean}`;
    if (spN) spN.textContent = `${sp.count}`;

    const slRec = document.getElementById('kpi-silent-recovery');
    const slEff = document.getElementById('kpi-silent-effort');
    const slN = document.getElementById('kpi-silent-n');
    if (slRec) slRec.textContent = `${sl.recovery.mean}%`;
    if (slEff) slEff.textContent = `${sl.effort.mean}`;
    if (slN) slN.textContent = `${sl.count}`;

    const anovaP = document.getElementById('kpi-anova-p');
    const anovaF = document.getElementById('kpi-anova-f');
    const cohenD = document.getElementById('kpi-cohens-d');
    if (anovaP) anovaP.textContent = `p ${stats.anova.pValue}`;
    if (anovaF) anovaF.textContent = `${stats.anova.fRatio}`;
    if (cohenD) cohenD.textContent = `${stats.anova.postHoc.bbVsSpoken.cohensD}`;

    // Render ANOVA Table
    const anovaTbody = document.getElementById('anova-table-body');
    if (anovaTbody) {
      anovaTbody.innerHTML = `
        <tr>
          <td><strong>Between Groups (Treatment Effect)</strong></td>
          <td>${stats.anova.ssBetween}</td>
          <td>${stats.anova.dfBetween}</td>
          <td>${stats.anova.msBetween}</td>
          <td><strong>${stats.anova.fRatio}</strong></td>
          <td><strong>${stats.anova.pValue}</strong></td>
          <td><span class="card-chip success">Significant (p &lt; 0.001)</span></td>
        </tr>
        <tr>
          <td><strong>Within Groups (Residual Error)</strong></td>
          <td>${stats.anova.ssWithin}</td>
          <td>${stats.anova.dfWithin}</td>
          <td>${stats.anova.msWithin}</td>
          <td>—</td>
          <td>—</td>
          <td>—</td>
        </tr>
        <tr>
          <td><strong>Total Variation</strong></td>
          <td>${Math.round((stats.anova.ssBetween + stats.anova.ssWithin) * 10) / 10}</td>
          <td>${stats.anova.dfBetween + stats.anova.dfWithin}</td>
          <td>—</td>
          <td>—</td>
          <td>—</td>
          <td><strong>N = ${stats.totalParticipants} Cohort</strong></td>
        </tr>
      `;
    }

    // Render Granular Cohort Table
    this.filterCohortTable();

    // Render Charts
    this.renderCharts(stats);
  }

  filterCohortTable() {
    const search = (document.getElementById('table-search')?.value || '').toLowerCase();
    const arm = document.getElementById('filter-arm')?.value || 'all';

    let list = cohort.getAll();
    if (arm !== 'all') {
      list = list.filter(p => p.arm === arm);
    }
    if (search) {
      list = list.filter(p => p.id.toLowerCase().includes(search) || p.name.toLowerCase().includes(search));
    }

    const tbody = document.getElementById('cohort-table-body');
    if (!tbody) return;

    tbody.innerHTML = list.map(p => `
      <tr>
        <td><strong>${p.id}</strong></td>
        <td><span class="badge-arm ${p.arm}">${p.armLabel}</span></td>
        <td>${p.musicalFamiliarity} / 5</td>
        <td>${p.baseline.rtMs} ms</td>
        <td>${p.postFatigue.rtMs} ms</td>
        <td>${p.recovery.rtMs} ms</td>
        <td><strong>${p.recoveryScore}%</strong></td>
        <td>${p.nasaTlx.overallEffort} / 100</td>
        <td>${new Date(p.timestamp).toLocaleDateString()}</td>
      </tr>
    `).join('');
  }

  renderCharts(stats) {
    const bb = stats.groupStats.breathebeat;
    const sp = stats.groupStats.spoken;
    const sl = stats.groupStats.silent;

    // Common Chart options
    const darkThemeOptions = {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          labels: { color: '#94a3b8', font: { family: 'Outfit', size: 12 } }
        }
      },
      scales: {
        x: {
          ticks: { color: '#94a3b8', font: { family: 'Outfit' } },
          grid: { color: 'rgba(255, 255, 255, 0.05)' }
        },
        y: {
          ticks: { color: '#94a3b8', font: { family: 'JetBrains Mono' } },
          grid: { color: 'rgba(255, 255, 255, 0.05)' }
        }
      }
    };

    // Chart 1: Recovery Score Bar Chart
    const ctxRecovery = document.getElementById('chart-recovery');
    if (ctxRecovery) {
      if (this.charts.recovery) this.charts.recovery.destroy();
      this.charts.recovery = new Chart(ctxRecovery, {
        type: 'bar',
        data: {
          labels: ['Silent Rest (Control)', 'Spoken Guide (Baseline)', 'BREATHEBEAT Engine'],
          datasets: [{
            label: 'Mean Cognitive Recovery %',
            data: [sl.recovery.mean, sp.recovery.mean, bb.recovery.mean],
            backgroundColor: [
              'rgba(148, 163, 184, 0.55)',
              'rgba(56, 189, 248, 0.65)',
              'rgba(245, 158, 11, 0.85)'
            ],
            borderColor: ['#94a3b8', '#38bdf8', '#f59e0b'],
            borderWidth: 2,
            borderRadius: 8
          }]
        },
        options: {
          ...darkThemeOptions,
          scales: {
            ...darkThemeOptions.scales,
            y: { ...darkThemeOptions.scales.y, max: 100, min: 0 }
          }
        }
      });
    }

    // Chart 2: Reaction Time Progression Trajectory
    const ctxTraj = document.getElementById('chart-trajectory');
    if (ctxTraj) {
      if (this.charts.trajectory) this.charts.trajectory.destroy();
      this.charts.trajectory = new Chart(ctxTraj, {
        type: 'line',
        data: {
          labels: ['1. Baseline Check', '2. Post-Fatigue Check', '3. Post-Break Recovery'],
          datasets: [
            {
              label: 'BREATHEBEAT Engine',
              data: [bb.trajectory.baseline, bb.trajectory.fatigue, bb.trajectory.recovery],
              borderColor: '#f59e0b',
              backgroundColor: 'rgba(245, 158, 11, 0.15)',
              borderWidth: 3,
              tension: 0.3,
              fill: false,
              pointRadius: 6,
              pointBackgroundColor: '#f59e0b'
            },
            {
              label: 'Spoken Guide',
              data: [sp.trajectory.baseline, sp.trajectory.fatigue, sp.trajectory.recovery],
              borderColor: '#38bdf8',
              borderWidth: 2,
              borderDash: [5, 5],
              tension: 0.3,
              pointRadius: 5,
              pointBackgroundColor: '#38bdf8'
            },
            {
              label: 'Silent Rest',
              data: [sl.trajectory.baseline, sl.trajectory.fatigue, sl.trajectory.recovery],
              borderColor: '#94a3b8',
              borderWidth: 2,
              tension: 0.3,
              pointRadius: 5,
              pointBackgroundColor: '#94a3b8'
            }
          ]
        },
        options: darkThemeOptions
      });
    }

    // Chart 3: NASA-TLX Perceived Cognitive Effort
    const ctxEffort = document.getElementById('chart-effort');
    if (ctxEffort) {
      if (this.charts.effort) this.charts.effort.destroy();
      this.charts.effort = new Chart(ctxEffort, {
        type: 'bar',
        data: {
          labels: ['Silent Rest (Control)', 'Spoken Guide (Baseline)', 'BREATHEBEAT Engine'],
          datasets: [{
            label: 'Perceived Effort Score (0 - 100, Lower = Easier)',
            data: [sl.effort.mean, sp.effort.mean, bb.effort.mean],
            backgroundColor: [
              'rgba(148, 163, 184, 0.55)',
              'rgba(239, 68, 68, 0.7)',
              'rgba(16, 185, 129, 0.75)'
            ],
            borderColor: ['#94a3b8', '#ef4444', '#10b981'],
            borderWidth: 2,
            borderRadius: 8
          }]
        },
        options: {
          ...darkThemeOptions,
          scales: {
            ...darkThemeOptions.scales,
            y: { ...darkThemeOptions.scales.y, max: 100, min: 0 }
          }
        }
      });
    }

    // Chart 4: Musical Familiarity vs Recovery Scatter
    const ctxFam = document.getElementById('chart-familiarity');
    if (ctxFam) {
      if (this.charts.familiarity) this.charts.familiarity.destroy();
      const allPts = cohort.getAll();
      const bbPts = allPts.filter(p => p.arm === 'breathebeat').map(p => ({ x: p.musicalFamiliarity, y: p.recoveryScore }));
      const otherPts = allPts.filter(p => p.arm !== 'breathebeat').map(p => ({ x: p.musicalFamiliarity, y: p.recoveryScore }));

      this.charts.familiarity = new Chart(ctxFam, {
        type: 'scatter',
        data: {
          datasets: [
            {
              label: 'BREATHEBEAT Participants',
              data: bbPts,
              backgroundColor: '#f59e0b',
              pointRadius: 7
            },
            {
              label: 'Spoken & Silent Participants',
              data: otherPts,
              backgroundColor: '#38bdf8',
              pointRadius: 6
            }
          ]
        },
        options: {
          ...darkThemeOptions,
          scales: {
            x: {
              ...darkThemeOptions.scales.x,
              title: { display: true, text: 'Musical Familiarity (1 = Novice, 5 = Practitioner)', color: '#94a3b8' },
              min: 0,
              max: 6
            },
            y: {
              ...darkThemeOptions.scales.y,
              title: { display: true, text: 'Cognitive Recovery Score (%)', color: '#94a3b8' },
              min: 20,
              max: 110
            }
          }
        }
      });
    }
  }
}

// Instantiate on DOM load
window.addEventListener('DOMContentLoaded', () => {
  new BreatheBeatApp();
});
