/**
 * NASA-TLX Effort & Distraction Survey Module
 * Table 1 Metric 2 & 3:
 * - Measures mental demand, effort to track pacing, and distraction
 * - Records musical familiarity rating (1-5)
 */

export class NasaTlxSurvey {
  constructor(options = {}) {
    this.container = options.container;
    this.onComplete = options.onComplete || (() => {});
    this.defaultArm = options.arm || 'breathebeat';
  }

  render() {
    if (!this.container) return;
    this.container.innerHTML = `
      <div class="nasatlx-card">
        <div class="nasatlx-header">
          <span class="nasatlx-badge">POST-SESSION EVALUATION (TABLE 1 METRICS)</span>
          <h2>Cognitive Ease & Perceived Effort Survey</h2>
          <p class="nasatlx-sub">Rate your subjective cognitive workload during the guided breathing rest phase.</p>
        </div>

        <form id="nasatlx-form" class="nasatlx-form">
          <div class="survey-group">
            <div class="survey-label-row">
              <label for="tlx-mental">1. Mental Demand</label>
              <span class="survey-val" id="val-mental">35</span>
            </div>
            <p class="survey-desc">How much mental and perceptual activity was required to follow the breathing pace?</p>
            <div class="slider-row">
              <span class="slider-anchor">Very Low (Effortless)</span>
              <input type="range" id="tlx-mental" name="mental" min="0" max="100" value="35" class="survey-slider">
              <span class="slider-anchor">Very High (Exhausting)</span>
            </div>
          </div>

          <div class="survey-group">
            <div class="survey-label-row">
              <label for="tlx-effort">2. Effort & Counting Strain</label>
              <span class="survey-val" id="val-effort">30</span>
            </div>
            <p class="survey-desc">Did you have to exert hard mental effort to track breath counts (4s, 2s, 6s) or did audio carry you naturally?</p>
            <div class="slider-row">
              <span class="slider-anchor">Natural & Guided</span>
              <input type="range" id="tlx-effort" name="effort" min="0" max="100" value="30" class="survey-slider">
              <span class="slider-anchor">Hard Constant Tracking</span>
            </div>
          </div>

          <div class="survey-group">
            <div class="survey-label-row">
              <label for="tlx-distraction">3. Auditory Distraction / Robotic Irritation</label>
              <span class="survey-val" id="val-distraction">20</span>
            </div>
            <p class="survey-desc">Did the audio background feel intrusive/synthetic, or soothing and restorative?</p>
            <div class="slider-row">
              <span class="slider-anchor">Deeply Soothing</span>
              <input type="range" id="tlx-distraction" name="distraction" min="0" max="100" value="20" class="survey-slider">
              <span class="slider-anchor">Distracting / Robotic</span>
            </div>
          </div>

          <div class="survey-group">
            <div class="survey-label-row">
              <label for="tlx-restoration">4. Perceived Focus Reset & Clarity</label>
              <span class="survey-val" id="val-restoration">85</span>
            </div>
            <p class="survey-desc">How refreshed and cognitively restored do you feel right now?</p>
            <div class="slider-row">
              <span class="slider-anchor">Still Drained</span>
              <input type="range" id="tlx-restoration" name="restoration" min="0" max="100" value="85" class="survey-slider">
              <span class="slider-anchor">Completely Clear & Reset</span>
            </div>
          </div>

          <div class="survey-group">
            <div class="survey-label-row">
              <label for="tlx-familiarity">5. Indian Classical Musical Familiarity (Table 1: Metric 3)</label>
              <span class="survey-val" id="val-familiarity">3 / 5</span>
            </div>
            <p class="survey-desc">Prior exposure to Indian classical music (Ragas, Tanpura, vocal/instrumental traditions):</p>
            <div class="star-rating-row" id="familiarity-buttons">
              <button type="button" class="star-chip" data-rating="1">1 - None / Novice</button>
              <button type="button" class="star-chip" data-rating="2">2 - Occasional</button>
              <button type="button" class="star-chip active" data-rating="3">3 - Moderate</button>
              <button type="button" class="star-chip" data-rating="4">4 - High (Regular listener)</button>
              <button type="button" class="star-chip" data-rating="5">5 - Practitioner / Trained</button>
            </div>
            <input type="hidden" id="tlx-familiarity" name="familiarity" value="3">
          </div>

          <div class="survey-actions">
            <button type="submit" class="survey-submit-btn">
              <span>Submit & View Cognitive Recovery Analysis</span>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
            </button>
          </div>
        </form>
      </div>
    `;

    this.wireListeners();
  }

  wireListeners() {
    const form = document.getElementById('nasatlx-form');
    if (!form) return;

    ['mental', 'effort', 'distraction', 'restoration'].forEach(field => {
      const slider = document.getElementById(`tlx-${field}`);
      const valDisplay = document.getElementById(`val-${field}`);
      if (slider && valDisplay) {
        slider.addEventListener('input', (e) => {
          valDisplay.textContent = e.target.value;
        });
      }
    });

    const starChips = document.querySelectorAll('.star-chip');
    const familiarityInput = document.getElementById('tlx-familiarity');
    const valFamiliarity = document.getElementById('val-familiarity');

    starChips.forEach(chip => {
      chip.addEventListener('click', () => {
        starChips.forEach(c => c.classList.remove('active'));
        chip.classList.add('active');
        const rating = chip.getAttribute('data-rating');
        if (familiarityInput) familiarityInput.value = rating;
        if (valFamiliarity) valFamiliarity.textContent = `${rating} / 5`;
      });
    });

    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const mental = parseInt(document.getElementById('tlx-mental').value, 10);
      const effort = parseInt(document.getElementById('tlx-effort').value, 10);
      const distraction = parseInt(document.getElementById('tlx-distraction').value, 10);
      const restoration = parseInt(document.getElementById('tlx-restoration').value, 10);
      const familiarity = parseInt(document.getElementById('tlx-familiarity').value, 10);

      // Composite Perceived Effort score (0-100, where lower is better/less taxing)
      const overallEffortScore = Math.round((mental * 0.4) + (effort * 0.4) + (distraction * 0.2));

      const surveyResults = {
        mentalDemand: mental,
        effortTracking: effort,
        auditoryDistraction: distraction,
        perceivedRestoration: restoration,
        overallEffortScore,
        musicalFamiliarity: familiarity
      };

      if (this.onComplete) {
        this.onComplete(surveyResults);
      }
    });
  }

  destroy() {
    if (this.container) this.container.innerHTML = '';
  }
}
