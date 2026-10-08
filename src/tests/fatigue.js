/**
 * Fatigue Inducer Module
 * Timed arithmetic questions to induce brief cognitive load.
 * Clean, calm presentation with properly proportioned buttons.
 */

export class FatigueInducer {
  constructor(options = {}) {
    this.container = options.container;
    this.onComplete = options.onComplete || (() => {});
    this.durationSeconds = options.durationSeconds || 20;

    this.active = false;
    this.timerId = null;
    this.questionTimerId = null;
    this.timeRemaining = this.durationSeconds;
    this.questionTimeLimit = 6.0;

    this.currentProblem = null;
    this.questionStartTime = 0;
    this.logs = [];
  }

  generateProblem() {
    const types = ['add', 'sub', 'mult', 'div'];
    const type = types[Math.floor(Math.random() * types.length)];
    let expr = '';
    let answer = 0;

    if (type === 'add') {
      const a = Math.floor(Math.random() * 20) + 6;
      const b = Math.floor(Math.random() * 15) + 4;
      expr = `${a} + ${b}`;
      answer = a + b;
    } else if (type === 'sub') {
      const b = Math.floor(Math.random() * 12) + 3;
      const answerVal = Math.floor(Math.random() * 15) + 4;
      const a = answerVal + b;
      expr = `${a} - ${b}`;
      answer = answerVal;
    } else if (type === 'mult') {
      const a = Math.floor(Math.random() * 7) + 3;
      const b = Math.floor(Math.random() * 7) + 3;
      expr = `${a} × ${b}`;
      answer = a * b;
    } else {
      const b = Math.floor(Math.random() * 6) + 2;
      const answerVal = Math.floor(Math.random() * 8) + 2;
      const a = answerVal * b;
      expr = `${a} ÷ ${b}`;
      answer = answerVal;
    }

    const choices = new Set();
    choices.add(answer);
    const offsets = [-2, 2, -1, 1, -3, 3, -10, 10];
    offsets.sort(() => Math.random() - 0.5);

    for (const offset of offsets) {
      const candidate = answer + offset;
      if (candidate >= 0 && candidate !== answer) {
        choices.add(candidate);
      }
      if (choices.size >= 4) break;
    }

    let fallback = 1;
    while (choices.size < 4) {
      choices.add(answer + fallback);
      fallback++;
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
    this.timeRemaining = this.durationSeconds;

    this.renderContainer();
    this.startGlobalTimer();
    this.nextQuestion();
  }

  renderContainer() {
    if (!this.container) return;
    this.container.innerHTML = `
      <div class="fatigue-wrapper">
        <div class="fatigue-meta-bar">
          <span class="fatigue-timer-txt">Time Remaining: <strong id="fatigue-overall-timer">${this.timeRemaining}s</strong></span>
        </div>

        <div class="fatigue-card">
          <div class="fatigue-expr" id="fatigue-expr">Ready...</div>
          <div class="fatigue-choices-grid" id="fatigue-choices"></div>
        </div>
      </div>
    `;
  }

  startGlobalTimer() {
    this.timerId = setInterval(() => {
      if (!this.active) return;
      this.timeRemaining--;

      const timerEl = document.getElementById('fatigue-overall-timer');
      if (timerEl) timerEl.textContent = `${this.timeRemaining}s`;

      if (this.timeRemaining <= 0) {
        this.finish();
      }
    }, 1000);
  }

  nextQuestion() {
    if (!this.active) return;

    if (this.questionTimerId) clearTimeout(this.questionTimerId);

    this.currentProblem = this.generateProblem();
    this.questionStartTime = performance.now();

    const exprEl = document.getElementById('fatigue-expr');
    const choicesEl = document.getElementById('fatigue-choices');

    if (exprEl) exprEl.textContent = `${this.currentProblem.expression}`;

    if (choicesEl) {
      choicesEl.innerHTML = this.currentProblem.choices.map((choice, idx) => `
        <button type="button" class="fatigue-choice-btn" data-val="${choice}" id="fatigue-choice-${idx}">
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

    // Advance if no answer after questionTimeLimit
    this.questionTimerId = setTimeout(() => {
      if (this.active) {
        this.recordAnswer(null);
      }
    }, this.questionTimeLimit * 1000);
  }

  recordAnswer(chosenVal) {
    if (!this.active) return;
    if (this.questionTimerId) clearTimeout(this.questionTimerId);

    const rt = Math.round(performance.now() - this.questionStartTime);
    const isCorrect = chosenVal === this.currentProblem.correctAnswer;

    this.logs.push({
      expression: this.currentProblem.expression,
      correctAnswer: this.currentProblem.correctAnswer,
      chosenAnswer: chosenVal,
      isCorrect,
      rtMs: rt
    });

    if (this.active) {
      this.nextQuestion();
    }
  }

  finish() {
    this.active = false;
    if (this.timerId) clearInterval(this.timerId);
    if (this.questionTimerId) clearTimeout(this.questionTimerId);

    const correctCount = this.logs.filter(l => l.isCorrect).length;
    const totalCount = this.logs.length;
    const accuracy = totalCount > 0 ? Math.round((correctCount / totalCount) * 100) : 0;
    const totalRt = this.logs.reduce((acc, curr) => acc + curr.rtMs, 0);
    const meanRt = totalCount > 0 ? Math.round(totalRt / totalCount) : 0;

    this.onComplete({
      totalQuestions: totalCount,
      correctQuestions: correctCount,
      accuracy,
      meanRt,
      logs: this.logs
    });
  }
}
