/**
 * Fatigue Inducer Module (Stage 2)
 * Rapid, timed arithmetic and logic puzzles designed to drain working memory and induce focus fatigue
 */

export class FatigueInducer {
  constructor(options = {}) {
    this.container = options.container;
    this.onComplete = options.onComplete || (() => {});
    this.isDemoMode = options.isDemoMode || false;
    this.durationSeconds = options.durationSeconds || (this.isDemoMode ? 25 : 180);

    this.active = false;
    this.timerId = null;
    this.questionTimerId = null;
    this.timeRemaining = this.durationSeconds;
    this.questionTimeLimit = 4.0; // 4s per problem
    this.questionTimeRemaining = 4.0;

    this.currentProblem = null;
    this.questionStartTime = 0;
    this.streak = 0;
    this.logs = [];
  }

  generateProblem() {
    const types = ['dual_op', 'multiply_sub', 'divide_add', 'modular'];
    const type = types[Math.floor(Math.random() * types.length)];
    let expr = '';
    let answer = 0;

    if (type === 'dual_op') {
      const a = Math.floor(Math.random() * 80) + 20;
      const b = Math.floor(Math.random() * 40) + 10;
      const c = Math.floor(Math.random() * 50) + 15;
      const op = Math.random() > 0.5 ? '+' : '-';
      if (op === '+') {
        expr = `${a} + ${b} - ${c}`;
        answer = a + b - c;
      } else {
        expr = `${a} - ${b} + ${c}`;
        answer = a - b + c;
      }
    } else if (type === 'multiply_sub') {
      const m1 = Math.floor(Math.random() * 12) + 6;
      const m2 = Math.floor(Math.random() * 9) + 4;
      const sub = Math.floor(Math.random() * 25) + 8;
      expr = `(${m1} × ${m2}) - ${sub}`;
      answer = (m1 * m2) - sub;
    } else if (type === 'divide_add') {
      const divisor = Math.floor(Math.random() * 6) + 3;
      const quotient = Math.floor(Math.random() * 12) + 5;
      const dividend = divisor * quotient;
      const add = Math.floor(Math.random() * 45) + 15;
      expr = `(${dividend} ÷ ${divisor}) + ${add}`;
      answer = quotient + add;
    } else {
      const a = Math.floor(Math.random() * 9) + 4;
      const b = Math.floor(Math.random() * 8) + 3;
      const c = Math.floor(Math.random() * 7) + 3;
      const d = Math.floor(Math.random() * 5) + 2;
      expr = `(${a} × ${b}) - (${c} × ${d})`;
      answer = (a * b) - (c * d);
    }

    // Generate 4 plausible choices
    const choices = new Set([answer]);
    while (choices.size < 4) {
      const delta = (Math.random() > 0.5 ? 1 : -1) * (Math.floor(Math.random() * 12) + 1);
      choices.add(answer + delta);
    }

    const shuffledChoices = Array.from(choices).sort(() => Math.random() - 0.5);

    return {
      expression: expr,
      correctAnswer: answer,
      choices: shuffledChoices
    };
  }

  start() {
    this.active = true;
    this.logs = [];
    this.streak = 0;
    this.timeRemaining = this.durationSeconds;

    this.renderContainer();
    this.startGlobalTimer();
    this.nextQuestion();
  }

  renderContainer() {
    if (!this.container) return;
    this.container.innerHTML = `
      <div class="fatigue-wrapper">
        <div class="fatigue-header">
          <div class="fatigue-timer-box">
            <span class="fatigue-timer-label">SESSION TIME LEFT</span>
            <span class="fatigue-timer-value" id="fatigue-overall-timer">${this.timeRemaining}s</span>
          </div>
          <div class="fatigue-load-indicator">
            <div class="fatigue-load-bar-wrap">
              <div class="fatigue-load-bar" id="fatigue-load-bar" style="width: 25%"></div>
            </div>
            <span class="fatigue-load-text" id="fatigue-load-text">Cognitive Strain: Escalating</span>
          </div>
          <div class="fatigue-streak-box">
            <span class="fatigue-streak-count" id="fatigue-streak">🔥 Streak: 0</span>
          </div>
        </div>

        <div class="fatigue-question-card">
          <div class="fatigue-rush-bar-wrap">
            <div class="fatigue-rush-bar" id="fatigue-question-bar" style="width: 100%"></div>
          </div>
          <div class="fatigue-expr" id="fatigue-expr">Ready...</div>
        </div>

        <div class="fatigue-choices-grid" id="fatigue-choices">
          <!-- Populated per question -->
        </div>

        <div class="fatigue-feedback-badge" id="fatigue-feedback">SPEED & PRECISION ARE TESTED</div>
      </div>
    `;
  }

  startGlobalTimer() {
    this.timerId = setInterval(() => {
      if (!this.active) return;
      this.timeRemaining--;

      const timerEl = document.getElementById('fatigue-overall-timer');
      if (timerEl) timerEl.textContent = `${this.timeRemaining}s`;

      // Update cognitive load bar as time progresses
      const loadPercent = Math.min(100, Math.round(25 + ((this.durationSeconds - this.timeRemaining) / this.durationSeconds) * 75));
      const loadBar = document.getElementById('fatigue-load-bar');
      const loadText = document.getElementById('fatigue-load-text');
      if (loadBar) loadBar.style.width = `${loadPercent}%`;
      if (loadText) {
        if (loadPercent > 80) loadText.textContent = 'Cognitive Strain: SEVERE PEAK';
        else if (loadPercent > 50) loadText.textContent = 'Cognitive Strain: HIGH FATIGUE';
      }

      if (this.timeRemaining <= 0) {
        this.finish();
      }
    }, 1000);
  }

  nextQuestion() {
    if (!this.active) return;

    if (this.questionTimerId) clearInterval(this.questionTimerId);

    this.currentProblem = this.generateProblem();
    this.questionStartTime = performance.now();
    this.questionTimeRemaining = this.questionTimeLimit;

    const exprEl = document.getElementById('fatigue-expr');
    const choicesEl = document.getElementById('fatigue-choices');
    const questionBar = document.getElementById('fatigue-question-bar');

    if (exprEl) exprEl.textContent = `${this.currentProblem.expression} = ?`;

    if (choicesEl) {
      choicesEl.innerHTML = this.currentProblem.choices.map((choice, idx) => `
        <button class="fatigue-choice-btn" data-val="${choice}" id="fatigue-choice-${idx}">
          ${choice}
        </button>
      `).join('');

      this.currentProblem.choices.forEach((choice, idx) => {
        const btn = document.getElementById(`fatigue-choice-${idx}`);
        if (btn) {
          btn.addEventListener('click', () => this.recordAnswer(choice));
        }
      });
    }

    // Question countdown animation
    const stepInterval = 50;
    const totalSteps = (this.questionTimeLimit * 1000) / stepInterval;
    let step = 0;

    this.questionTimerId = setInterval(() => {
      if (!this.active) return;
      step++;
      const pct = Math.max(0, 100 - (step / totalSteps) * 100);
      if (questionBar) {
        questionBar.style.width = `${pct}%`;
        questionBar.style.backgroundColor = pct < 30 ? '#ef4444' : pct < 60 ? '#f59e0b' : '#38bdf8';
      }

      if (step >= totalSteps) {
        clearInterval(this.questionTimerId);
        this.recordAnswer(null); // Timeout error
      }
    }, stepInterval);
  }

  recordAnswer(chosenVal) {
    if (!this.active) return;
    if (this.questionTimerId) clearInterval(this.questionTimerId);

    const rt = Math.round(performance.now() - this.questionStartTime);
    const isCorrect = chosenVal === this.currentProblem.correctAnswer;

    if (isCorrect) {
      this.streak++;
    } else {
      this.streak = 0;
    }

    this.logs.push({
      expression: this.currentProblem.expression,
      correctAnswer: this.currentProblem.correctAnswer,
      chosenAnswer: chosenVal,
      isCorrect,
      rtMs: rt,
      timestamp: Date.now()
    });

    const streakEl = document.getElementById('fatigue-streak');
    const feedbackEl = document.getElementById('fatigue-feedback');

    if (streakEl) streakEl.textContent = `🔥 Streak: ${this.streak}`;
    if (feedbackEl) {
      if (isCorrect) {
        feedbackEl.textContent = `✓ Correct! (${rt}ms)`;
        feedbackEl.style.color = '#10b981';
      } else if (chosenVal === null) {
        feedbackEl.textContent = `⏱ Time Out! (Working Memory Depleted)`;
        feedbackEl.style.color = '#ef4444';
      } else {
        feedbackEl.textContent = `✗ Missed! Expected ${this.currentProblem.correctAnswer}`;
        feedbackEl.style.color = '#ef4444';
      }
    }

    setTimeout(() => {
      if (this.active) this.nextQuestion();
    }, 200);
  }

  finish() {
    this.active = false;
    if (this.timerId) clearInterval(this.timerId);
    if (this.questionTimerId) clearInterval(this.questionTimerId);

    const correctCount = this.logs.filter(l => l.isCorrect).length;
    const accuracy = this.logs.length ? Math.round((correctCount / this.logs.length) * 100) : 0;
    const avgRt = this.logs.length ? Math.round(this.logs.reduce((acc, c) => acc + c.rtMs, 0) / this.logs.length) : 0;

    const summary = {
      durationSeconds: this.durationSeconds,
      totalAttempted: this.logs.length,
      correctCount,
      accuracy,
      avgRt,
      logs: this.logs
    };

    if (this.onComplete) {
      this.onComplete(summary);
    }
  }

  destroy() {
    this.active = false;
    if (this.timerId) clearInterval(this.timerId);
    if (this.questionTimerId) clearInterval(this.questionTimerId);
    if (this.container) this.container.innerHTML = '';
  }
}
