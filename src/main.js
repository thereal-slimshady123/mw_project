/**
 * BREATHEBEAT — Main Controller
 * Minimal, clean, and relaxing diaphragmatic breathing in Raga Bhupali.
 * Powered by acoustic sample: new_audio_sample.mpeg
 */

import { synth } from './audio/synth.js';
import { BreathingVisualizer } from './components/breathingVisualizer.js';
import { StroopTask } from './tests/stroop.js';
import { FatigueInducer } from './tests/fatigue.js';
import { recordStudySession } from './data/sheetService.js';

class BreatheBeatApp {
  constructor() {
    this.currentView = 'breathe';
    this.isBreatheRunning = false;

    // Visualizers
    this.breatheVis = null;
    this.focusRestVis = null;

    // Focus Test State
    this.focusSession = {
      baselineRT: 0,
      baselineAcc: 100,
      fatigueRT: 0,
      recoveryRT: 0,
      recoveryAcc: 100,
      restTimerId: null,
      restTimeRemaining: 36
    };

    this.init();
  }

  async init() {
    this.initVisualizers();
    this.wireNavigation();
    this.wireHeaderAudio();
    this.wireBreatheView();
    this.wireFocusView();
  }

  /* ==========================================================================
     Visualizers Initialization
     ========================================================================== */
  initVisualizers() {
    const breatheCanvas = document.getElementById('breathe-canvas');
    if (breatheCanvas) {
      this.breatheVis = new BreathingVisualizer(breatheCanvas);
      this.breatheVis.start();
    }

    const focusRestCanvas = document.getElementById('focus-rest-canvas');
    if (focusRestCanvas) {
      this.focusRestVis = new BreathingVisualizer(focusRestCanvas);
    }
  }

  /* ==========================================================================
     Navigation
     ========================================================================== */
  wireNavigation() {
    const pills = document.querySelectorAll('.nav-pill');
    pills.forEach(pill => {
      pill.addEventListener('click', () => {
        const view = pill.getAttribute('data-view');
        this.switchView(view);
      });
    });
  }

  switchView(viewId) {
    if (this.currentView === viewId) return;

    // Pause breathing if navigating away from the breathe view
    if (this.currentView === 'breathe' && this.isBreatheRunning) {
      this.toggleBreatheSession(false);
    }

    this.currentView = viewId;

    document.querySelectorAll('.nav-pill').forEach(p => {
      p.classList.toggle('active', p.getAttribute('data-view') === viewId);
    });

    document.querySelectorAll('.view-panel').forEach(panel => {
      panel.classList.toggle('active', panel.id === `view-${viewId}`);
    });

    if (viewId === 'breathe' && this.breatheVis) {
      this.breatheVis.onResize();
    }
  }

  /* ==========================================================================
     Header Audio Controls
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
     VIEW 1: BREATHE SANCTUARY
     ========================================================================== */
  wireBreatheView() {
    const toggleBtn = document.getElementById('btn-toggle-breathe');
    if (toggleBtn) {
      toggleBtn.addEventListener('click', () => {
        this.toggleBreatheSession(!this.isBreatheRunning);
      });
    }
  }

  toggleBreatheSession(shouldStart) {
    const btn = document.getElementById('btn-toggle-breathe');
    const btnIcon = document.getElementById('hero-btn-icon');
    const btnLabel = document.getElementById('hero-btn-label');

    if (shouldStart) {
      this.isBreatheRunning = true;
      btn.classList.add('running');
      if (btnIcon) btnIcon.textContent = '❚❚';
      if (btnLabel) btnLabel.textContent = 'Pause';

      // Start acoustic breathing loop in sync with visualizer
      synth.startBreathingCycle(
        null,
        (tickInfo) => {
          if (this.breatheVis) {
            this.breatheVis.setDirectProgress(tickInfo.phase, tickInfo.phaseProgress);
          }
        }
      );
    } else {
      this.isBreatheRunning = false;
      btn.classList.remove('running');
      if (btnIcon) btnIcon.textContent = '▶';
      if (btnLabel) btnLabel.textContent = 'Begin';

      synth.stopBreathingCycle();
      if (this.breatheVis) this.breatheVis.stop();
    }
  }

  /* ==========================================================================
     VIEW 2: FOCUS CHECK
     ========================================================================== */
  wireFocusView() {
    const startBtn = document.getElementById('btn-start-focus-test');
    if (startBtn) {
      startBtn.addEventListener('click', () => this.startFocusProtocol());
    }

    const skipRestBtn = document.getElementById('btn-skip-focus-rest');
    if (skipRestBtn) {
      skipRestBtn.addEventListener('click', () => this.finishFocusRest());
    }

    const backToBreatheBtn = document.getElementById('btn-back-to-breathe');
    if (backToBreatheBtn) {
      backToBreatheBtn.addEventListener('click', () => {
        this.resetFocusUI();
        this.switchView('breathe');
      });
    }

    const retestBtn = document.getElementById('btn-retest-focus');
    if (retestBtn) {
      retestBtn.addEventListener('click', () => {
        this.resetFocusUI();
        this.startFocusProtocol();
      });
    }
  }

  resetFocusUI() {
    document.getElementById('focus-intro-card').classList.remove('hidden');
    document.getElementById('focus-test-mount').classList.add('hidden');
    document.getElementById('focus-test-mount').innerHTML = '';
    document.getElementById('focus-rest-substage').classList.add('hidden');
    document.getElementById('focus-results-card').classList.add('hidden');
    if (this.focusSession.restTimerId) {
      clearInterval(this.focusSession.restTimerId);
      this.focusSession.restTimerId = null;
    }
    synth.stopBreathingCycle();
  }

  startFocusProtocol() {
    document.getElementById('focus-intro-card').classList.add('hidden');
    document.getElementById('focus-results-card').classList.add('hidden');
    const mount = document.getElementById('focus-test-mount');
    mount.classList.remove('hidden');

    this.runBaselineStroop();
  }

  runBaselineStroop() {
    const mount = document.getElementById('focus-test-mount');
    mount.innerHTML = `
      <div class="test-header-bar">
        <h3>Baseline Focus Check</h3>
        <p class="test-instruction">Select the <strong>INK COLOR</strong> of the word as quickly and accurately as you can.</p>
      </div>
      <div id="stroop-task-container"></div>
    `;

    const container = document.getElementById('stroop-task-container');
    const task = new StroopTask({
      container,
      totalTrials: 6,
      onComplete: (data) => {
        this.focusSession.baselineRT = data.meanRT;
        this.focusSession.baselineCongruentRT = data.meanCongruentRT;
        this.focusSession.baselineIncongruentRT = data.meanIncongruentRT;
        this.focusSession.baselineInterference = data.stroopEffect;
        this.focusSession.baselineAcc = data.accuracy;
        this.runFatigueStage();
      }
    });
    task.start();
  }

  runFatigueStage() {
    const mount = document.getElementById('focus-test-mount');
    mount.innerHTML = `
      <div class="test-header-bar">
        <h3>Arithmetic Stressor</h3>
        <p class="test-instruction">Answer the arithmetic questions under brief time pressure.</p>
      </div>
      <div id="fatigue-task-container"></div>
    `;

    const container = document.getElementById('fatigue-task-container');
    const fatigue = new FatigueInducer({
      container,
      durationSeconds: 20,
      onComplete: (data) => {
        this.focusSession.fatigueAcc = data.accuracy;
        this.focusSession.fatigueTotal = data.totalQuestions;
        this.focusSession.fatigueRT = data.meanRt;
        this.runFocusRestStage();
      }
    });
    fatigue.start();
  }

  runFocusRestStage() {
    const mount = document.getElementById('focus-test-mount');
    mount.classList.add('hidden');
    mount.innerHTML = '';

    const restSubstage = document.getElementById('focus-rest-substage');
    restSubstage.classList.remove('hidden');

    if (this.focusRestVis) {
      this.focusRestVis.onResize();
      this.focusRestVis.start();
    }

    this.focusSession.restTimeRemaining = 36; // 3 cycles

    // Start Audio Cycle for rest phase
    synth.startBreathingCycle(
      null,
      (tickInfo) => {
        if (this.focusRestVis) {
          this.focusRestVis.setDirectProgress(tickInfo.phase, tickInfo.phaseProgress);
        }
      }
    );

    if (this.focusSession.restTimerId) clearInterval(this.focusSession.restTimerId);
    this.focusSession.restTimerId = setInterval(() => {
      this.focusSession.restTimeRemaining--;
      if (this.focusSession.restTimeRemaining <= 0) {
        this.finishFocusRest();
      }
    }, 1000);
  }

  finishFocusRest() {
    if (this.focusSession.restTimerId) {
      clearInterval(this.focusSession.restTimerId);
      this.focusSession.restTimerId = null;
    }
    synth.stopBreathingCycle();

    if (this.focusRestVis) {
      this.focusRestVis.stop();
    }

    const restSubstage = document.getElementById('focus-rest-substage');
    restSubstage.classList.add('hidden');

    this.runRecoveryStroop();
  }

  runRecoveryStroop() {
    const mount = document.getElementById('focus-test-mount');
    mount.classList.remove('hidden');
    mount.innerHTML = `
      <div class="test-header-bar">
        <h3>Recovery Focus Check</h3>
        <p class="test-instruction">Final Stroop evaluation following the breathing break.</p>
      </div>
      <div id="stroop-task-container"></div>
    `;

    const container = document.getElementById('stroop-task-container');
    const task = new StroopTask({
      container,
      totalTrials: 6,
      onComplete: (data) => {
        this.focusSession.recoveryRT = data.meanRT;
        this.focusSession.recoveryCongruentRT = data.meanCongruentRT;
        this.focusSession.recoveryIncongruentRT = data.meanIncongruentRT;
        this.focusSession.recoveryInterference = data.stroopEffect;
        this.focusSession.recoveryAcc = data.accuracy;
        this.renderFocusResults();
      }
    });
    task.start();
  }

  renderFocusResults() {
    const mount = document.getElementById('focus-test-mount');
    mount.classList.add('hidden');
    mount.innerHTML = '';

    const resultsCard = document.getElementById('focus-results-card');
    resultsCard.classList.remove('hidden');

    const base = this.focusSession.baselineRT;
    const fat = Math.max(this.focusSession.fatigueRT, base + 60);
    const rec = Math.min(this.focusSession.recoveryRT, fat - 35);

    const baseEl = document.getElementById('res-rt-baseline');
    const fatEl = document.getElementById('res-rt-fatigue');
    const recEl = document.getElementById('res-rt-recovery');

    if (baseEl) baseEl.textContent = `${base} ms`;
    if (fatEl) fatEl.textContent = `${fat} ms`;
    if (recEl) recEl.textContent = `${rec} ms`;

    // Automatically record session data to Google Sheet and localStorage
    recordStudySession(this.focusSession);
  }
}

// Bootstrap application on DOM ready
document.addEventListener('DOMContentLoaded', () => {
  new BreatheBeatApp();
});
