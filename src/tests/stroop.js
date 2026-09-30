/**
 * Automated Stroop Task Module
 * Requirements:
 * - Deliver randomized Stroop tasks while recording millisecond-accurate timing and error logs
 * - Measures cognitive speed and selective attention (congruent vs incongruent interference)
 */

export class StroopTask {
  constructor(options = {}) {
    this.container = options.container;
    this.onComplete = options.onComplete || (() => {});
    this.isDemoMode = options.isDemoMode || false;
    this.totalTrials = options.totalTrials || (this.isDemoMode ? 8 : 24);

    this.colors = [
      { name: 'RED', hex: '#ef4444', key: 'R' },
      { name: 'GREEN', hex: '#10b981', key: 'G' },
      { name: 'BLUE', hex: '#3b82f6', key: 'B' },
      { name: 'YELLOW', hex: '#f59e0b', key: 'Y' }
    ];

    this.currentTrialIndex = 0;
    this.trials = [];
    this.logs = [];
    this.stimulusTimestamp = 0;
    this.awaitingResponse = false;
    this.active = false;
    this.boundKeyDown = this.handleKeyDown.bind(this);
  }

  generateTrialSequence() {
    const trials = [];
    for (let i = 0; i < this.totalTrials; i++) {
      const isCongruent = Math.random() < 0.5;
      const colorObj = this.colors[Math.floor(Math.random() * this.colors.length)];
      let wordName = colorObj.name;

      if (!isCongruent) {
        const otherColors = this.colors.filter(c => c.name !== colorObj.name);
        wordName = otherColors[Math.floor(Math.random() * otherColors.length)].name;
      }

      trials.push({
        word: wordName,
        inkColor: colorObj.name,
        inkHex: colorObj.hex,
        isCongruent
      });
    }
    return trials;
  }

  start() {
    this.active = true;
    this.currentTrialIndex = 0;
    this.logs = [];
    this.trials = this.generateTrialSequence();

    window.addEventListener('keydown', this.boundKeyDown);
    this.renderContainer();
    this.nextTrial();
  }

  renderContainer() {
    if (!this.container) return;
    this.container.innerHTML = `
      <div class="stroop-wrapper">
        <div class="stroop-header">
          <div class="stroop-progress-bar-wrap">
            <div class="stroop-progress-bar" id="stroop-progress" style="width: 0%"></div>
          </div>
          <div class="stroop-stats-row">
            <span class="stroop-trial-count" id="stroop-trial-display">Trial 1 / ${this.totalTrials}</span>
            <span class="stroop-badge">Target: INK COLOR (Not Word)</span>
          </div>
        </div>

        <div class="stroop-stimulus-box" id="stroop-box">
          <div class="stroop-fixation" id="stroop-stimulus">+</div>
        </div>

        <div class="stroop-keypad">
          ${this.colors.map(c => `
            <button class="stroop-btn stroop-btn-${c.name.toLowerCase()}" data-color="${c.name}" id="btn-${c.name.toLowerCase()}">
              <span class="stroop-btn-label">${c.name}</span>
              <kbd class="stroop-kbd">[${c.key}]</kbd>
            </button>
          `).join('')}
        </div>

        <div class="stroop-hint">
          <span>Press <strong>R</strong> (Red), <strong>G</strong> (Green), <strong>B</strong> (Blue), <strong>Y</strong> (Yellow) or click the buttons</span>
        </div>
      </div>
    `;

    // Attach click handlers
    this.colors.forEach(c => {
      const btn = this.container.querySelector(`#btn-${c.name.toLowerCase()}`);
      if (btn) {
        btn.addEventListener('click', () => this.recordResponse(c.name));
      }
    });
  }

  nextTrial() {
    if (!this.active) return;

    if (this.currentTrialIndex >= this.totalTrials) {
      this.finish();
      return;
    }

    const trialDisplay = document.getElementById('stroop-trial-display');
    const progressBar = document.getElementById('stroop-progress');
    const stimulus = document.getElementById('stroop-stimulus');

    if (trialDisplay) trialDisplay.textContent = `Trial ${this.currentTrialIndex + 1} / ${this.totalTrials}`;
    if (progressBar) progressBar.style.width = `${((this.currentTrialIndex) / this.totalTrials) * 100}%`;

    // Show fixation cross
    this.awaitingResponse = false;
    if (stimulus) {
      stimulus.textContent = '+';
      stimulus.style.color = 'rgba(255, 255, 255, 0.4)';
      stimulus.style.fontSize = '3.5rem';
    }

    setTimeout(() => {
      if (!this.active) return;
      const trial = this.trials[this.currentTrialIndex];
      if (stimulus) {
        stimulus.textContent = trial.word;
        stimulus.style.color = trial.inkHex;
        stimulus.style.fontSize = '4.2rem';
        stimulus.style.fontWeight = '800';
      }
      this.stimulusTimestamp = performance.now();
      this.awaitingResponse = true;
    }, 380);
  }

  handleKeyDown(e) {
    if (!this.active || !this.awaitingResponse) return;
    const key = e.key.toUpperCase();
    const match = this.colors.find(c => c.key === key);
    if (match) {
      e.preventDefault();
      this.recordResponse(match.name);
    }
  }

  recordResponse(selectedColor) {
    if (!this.active || !this.awaitingResponse) return;

    const rt = Math.round(performance.now() - this.stimulusTimestamp);
    this.awaitingResponse = false;
    const trial = this.trials[this.currentTrialIndex];
    const isCorrect = selectedColor === trial.inkColor;

    this.logs.push({
      trialIndex: this.currentTrialIndex + 1,
      word: trial.word,
      inkColor: trial.inkColor,
      isCongruent: trial.isCongruent,
      responseColor: selectedColor,
      isCorrect,
      rtMs: rt,
      timestamp: Date.now()
    });

    // Visual feedback
    const stimulus = document.getElementById('stroop-stimulus');
    if (stimulus) {
      stimulus.style.transform = isCorrect ? 'scale(1.08)' : 'scale(0.92)';
      setTimeout(() => {
        if (stimulus) stimulus.style.transform = 'scale(1)';
      }, 100);
    }

    this.currentTrialIndex++;
    this.nextTrial();
  }

  finish() {
    this.active = false;
    window.removeEventListener('keydown', this.boundKeyDown);

    // Compute summary statistics
    const correctTrials = this.logs.filter(l => l.isCorrect);
    const congruentTrials = correctTrials.filter(l => l.isCongruent);
    const incongruentTrials = correctTrials.filter(l => !l.isCongruent);

    const calcMean = arr => arr.length ? Math.round(arr.reduce((acc, c) => acc + c.rtMs, 0) / arr.length) : 0;

    const meanRT = calcMean(correctTrials);
    const meanCongruentRT = calcMean(congruentTrials);
    const meanIncongruentRT = calcMean(incongruentTrials);
    const accuracy = Math.round((correctTrials.length / this.logs.length) * 100) || 0;
    const stroopEffect = meanIncongruentRT - meanCongruentRT;

    const summary = {
      totalTrials: this.logs.length,
      correctCount: correctTrials.length,
      accuracy,
      meanRT,
      meanCongruentRT,
      meanIncongruentRT,
      stroopEffect,
      logs: this.logs
    };

    if (this.onComplete) {
      this.onComplete(summary);
    }
  }

  destroy() {
    this.active = false;
    window.removeEventListener('keydown', this.boundKeyDown);
    if (this.container) this.container.innerHTML = '';
  }
}
