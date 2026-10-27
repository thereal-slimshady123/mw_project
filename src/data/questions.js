/**
 * BREATHEBEAT — Questionnaire Definitions
 *
 * Kept deliberately short. Every item is a single-select list designed for analysis:
 *  - Options are concrete descriptions (what the student actually feels or did), not vague
 *    intensity words, so different students interpret them the same way.
 *  - Within an item, options sit on ONE ordered dimension and carry a numeric code, so answers
 *    can be averaged and before/after change scores computed. Direction is noted per item.
 *  - No "neutral / no difference" escape options: each option is a real, distinct state.
 *  - State items are identical before and after each break; shared items use the same id in both
 *    conditions so Silence and BreatheBeat rows line up column-for-column.
 */

/* ==========================================================================
   Intake — participant background (asked once)
   ========================================================================== */
export const INTAKE_QUESTIONS = [
  {
    id: 'musicListening',
    text: 'On a typical day, how much time do you spend listening to music?',
    hint: 'Include all listening: while travelling, studying, working out, or relaxing.',
    // higher = more daily listening
    options: [
      { value: 1, label: 'Less than 30 minutes' },
      { value: 2, label: '30 minutes to 2 hours' },
      { value: 3, label: 'More than 2 hours' }
    ]
  },
  {
    id: 'breathingPractice',
    text: 'How familiar are you with breathing exercises, yoga, or meditation?',
    // higher = more familiar
    options: [
      { value: 0, label: 'I have never tried them' },
      { value: 1, label: 'I have tried them a few times' },
      { value: 2, label: 'I do them regularly' }
    ]
  }
];

/* ==========================================================================
   State check — asked after the stress task (before the break) AND after the break
   ========================================================================== */
export const STATE_QUESTIONS = [
  {
    id: 'stress',
    text: 'Which best describes how you feel right now?',
    // higher = more stressed
    options: [
      { value: 1, label: 'Relaxed: no tension at all' },
      { value: 2, label: 'Calm, with a little tension' },
      { value: 3, label: 'Tense: I can feel some pressure' },
      { value: 4, label: 'Stressed: I feel rushed or on edge' }
    ]
  },
  {
    id: 'fatigue',
    text: 'Which best describes how your brain feels right now?',
    // higher = more mentally tired
    options: [
      { value: 1, label: 'Fresh: I could start a hard task right now' },
      { value: 2, label: 'Alert: a bit used, but still focused' },
      { value: 3, label: 'Tired: focusing takes effort' },
      { value: 4, label: 'Drained: my mind feels heavy or foggy' }
    ]
  }
];

/* ==========================================================================
   Break experience — asked after each break (sync item only for the audio break)
   ========================================================================== */
export function getRestExperienceQuestions(condition) {
  const questions = [
    {
      id: 'attentionOnBreath',
      text: 'During the break, what was your mind doing most of the time?',
      // higher = more attention on the breath (less mind-wandering)
      options: [
        { value: 4, label: 'Stayed on my breathing almost the whole time' },
        { value: 3, label: 'Mostly on my breathing, drifted off a few times' },
        { value: 2, label: 'Kept drifting to other thoughts (assignments, plans, etc.)' },
        { value: 1, label: 'Mostly elsewhere: other thoughts or waiting for it to end' }
      ]
    }
  ];

  if (condition === 'breathebeat') {
    questions.push({
      id: 'syncEase',
      text: 'Were you able to breathe in sync with the audio?',
      // higher = better synchronisation
      options: [
        { value: 4, label: 'Yes, almost every breath' },
        { value: 3, label: 'Most of the breaths' },
        { value: 2, label: 'Only some of the breaths' },
        { value: 1, label: 'Hardly at all' }
      ]
    });
  }

  questions.push({
    id: 'relaxation',
    text: 'How did this break feel?',
    // higher = more relaxing
    options: [
      { value: 4, label: 'Very relaxing: my mind and body settled' },
      { value: 3, label: 'A little relaxing' },
      { value: 2, label: 'Not relaxing: it felt like just waiting' },
      { value: 1, label: 'Unpleasant: irritating or uncomfortable' }
    ]
  });

  return questions;
}

/* ==========================================================================
   Final comparison — asked once, after both breaks (forced choice, no neutral option)
   ========================================================================== */
export const FINAL_QUESTIONS = [
  {
    id: 'moreRefreshed',
    text: 'Which break left you feeling more refreshed?',
    hint: 'Even if they felt similar, pick the one that was slightly better.',
    options: [
      { value: 'silence', label: 'The Silent break' },
      { value: 'breathebeat', label: 'The Audio break' }
    ]
  },
  {
    id: 'calmPreference',
    text: 'When you are stressed and want to calm down, which do you usually prefer?',
    hint: 'Pick the one closer to what you normally do.',
    options: [
      { value: 'sound', label: 'Listening to music or some sound' },
      { value: 'silence', label: 'Silence or a quiet place' }
    ]
  }
];

/* ==========================================================================
   Rendering & collection helpers
   ========================================================================== */
export function renderQuestions(container, questions, startNumber = 1) {
  container.innerHTML = questions.map((q, i) => `
    <div class="survey-item" data-qid="${q.id}">
      <label class="survey-q">${startNumber + i}. ${q.text} <span class="req">*</span></label>
      ${q.hint ? `<p class="survey-sub">${q.hint}</p>` : ''}
      <div class="choice-options">
        ${q.options.map(opt => `
          <button type="button" class="btn-choice" data-val="${opt.value}">${opt.label}</button>
        `).join('')}
      </div>
    </div>
  `).join('');

  container.querySelectorAll('.survey-item').forEach(item => {
    const buttons = item.querySelectorAll('.btn-choice');
    buttons.forEach(btn => {
      btn.addEventListener('click', () => {
        buttons.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        item.classList.remove('unanswered');
        container.dispatchEvent(new CustomEvent('answer', { bubbles: true }));
      });
    });
  });
}

/**
 * Returns { answers, missing } where answers maps question id -> stored value
 * (numbers for ordered items, strings for categorical items).
 */
export function collectAnswers(container, questions) {
  const answers = {};
  const missing = [];
  questions.forEach(q => {
    const item = container.querySelector(`.survey-item[data-qid="${q.id}"]`);
    const active = item ? item.querySelector('.btn-choice.active') : null;
    if (!active) {
      missing.push(q.id);
      if (item) item.classList.add('unanswered');
      return;
    }
    const raw = active.getAttribute('data-val');
    const opt = q.options.find(o => String(o.value) === raw);
    answers[q.id] = opt ? opt.value : raw;
  });
  return { answers, missing };
}
