# BREATHEBEAT

> **Sonified Diaphragmatic Breathing in Raga Bhupali for Cognitive Fatigue Restoration**  
> *Course:* Music Workshop  
> *Team:* Sri Harshit K (2024102022) • Parth Dhodapkar (2024111009) • Atharva Kulkarni (2023101072)

---

## Quickstart

### Prerequisites
- Node.js (v18+) & npm

### Install & Run
```bash
# 1. Install dependencies
npm install

# 2. Launch development server
npm run dev
```

Open your browser to: **`http://localhost:5173/`**

### Production Build (Optional)
```bash
npm run build
npm run preview
```

---

## About The Website

BREATHEBEAT is a self-contained web platform designed to evaluate whether sonifying diaphragmatic 4-2-6 breathing into the melodic glides (*Meend*) of **Raga Bhupali** over a continuous **Tanpura drone** restores cognitive capacity faster and with less mental effort than voice counts or silent rest.

### Core Modules

#### 1. Study Protocol (Within-Subject: Silence vs BreatheBeat)
Every participant takes **both** 2-minute eyes-closed breaks. The order is randomised per participant (`Condition_Order`) to balance practice and fatigue effects. Total time is about 15 minutes.

| Step | What happens |
|---|---|
| Overview | Explains the study, both breaks, and what the participant will do |
| Intake | Roll no., age, Music Workshop enrolment, daily music listening, familiarity with breathing/meditation |
| **Part 1** and **Part 2** (one per condition) | Stress task (45 s arithmetic) → Stroop → 2 state ratings → **2-min break** → arithmetic (45 s) → Stroop → 2 state ratings + 2–3 break ratings |
| Final | Which break felt more refreshing (forced choice), music vs silence preference when stressed (forced choice), optional comment |

**Conditions**
- **Silent Break:** eyes closed, silence, breathe slowly at your own pace.
- **Audio Break (BreatheBeat):** eyes closed, breathe in sync with `src/audio/breathebeat_4-6.mp3` (4 s inhale / 6 s exhale, 12 breaths, loudness-boosted). The breathing guide is clocked from the track's playback position, so it cannot drift.
- Both breaks last exactly 120 s, cannot be skipped by participants, and end with the same soft chime.

#### Data (Google Sheet tab `Responses_v2`, see `docs/google_apps_script.gs`)
Long format: **two rows per participant** (one per condition), joined by `Session_ID`.
- Math metrics are stored before and after each break: accuracy, total questions, correct answers, and mean response time (`Stressor_Math_*` and `PostRest_Math_*`).
- Every answer is a concrete description on one ordered dimension, stored as a number (codes are documented in `src/data/questions.js`). State items: `Stress` 1 = Relaxed … 4 = Stressed; `Fatigue` 1 = Fresh … 4 = Drained. Break items (`Attention_On_Breath`, `Sync_Ease`, `Relaxation`): 1–4, higher = better. `Music_Listening` 1–3 (daily listening: < 30 min / 30 min–2 h / > 2 h); `Breathing_Practice` 0–2.
- No neutral/"no difference" options. The final comparison is a forced choice, so it can be tested directly (binomial / sign test), and `Calm_Preference` (sound vs silence) can be cross-tabulated against it.
- Change scores are oriented so that **positive = better after the break**: `Stroop_RT_Gain_ms`, `Stroop_Acc_Gain`, `Stroop_Interference_Gain_ms`, `Stress_Drop`, `Fatigue_Drop`.
- `Sync_Ease` is only asked after the Audio break (the Silent break is unpaced).
- Quality flags: `Is_Demo` (presentation-mode skips were used; exclude these rows), `Rest_Completed`, `Audio_Muted`.
- Primary analysis: paired comparison of each gain score, Silence vs BreatheBeat (paired t-test / Wilcoxon). Use `Block_Position` to check order effects, and the intake answers as moderators.

#### 2. Real-Time Web Audio Synthesizer (Deliverable 2)
- **Continuous Tanpura Drone (*Sa–Pa*):** Synthesizes 4 acoustic strings (*Pa*, *Sa'*, detuned *Sa'*, low *Kharaj Sa*) with jawari bridge harmonics and wooden resonance filtering.
- **Raga Bhupali Meend Lead:** Implements the pure Audava pentatonic scale (*Sa, Re, Ga, Pa, Dha, Sa'*) skipping tension notes *Ma* and *Ni*:
  - **Inhale (4s – Arohana):** Ascending pitch glide ($\text{Sa} \to \text{Sa}'$) with volume swell.
  - **Hold (2s – Kumbhaka):** Steady sustain on dominant resting root note **Ga** (Vadi) over drone.
  - **Exhale (6s – Avarohana):** Gentle descending glide ($\text{Sa}' \to \text{Sa}$) with tapering volume.
- **3 Comparison Arms:**
  - *Arm 1 (Silent Rest):* Tibetan singing bowl chime marking start and end.
  - *Arm 2 (Spoken Guide):* Synthetic voice pacing (`"Inhale 2 3 4... Hold 2... Exhale 2 3 4 5 6"`).
  - *Arm 3 (BREATHEBEAT Engine):* Melodic Bhupali glides + Tanpura drone.
- **Live Oscilloscope & Frequency Spectrum:** Web Audio `AnalyserNode` canvas.

#### 3. Cohort Dashboard & Statistics (Deliverable 3)
- **Cohort Dataset ($N = 20$):** Pre-populated with representative placeholder study data across all 3 arms (7 Silent Rest, 7 Spoken Guide, 6 BREATHEBEAT Engine).
- **One-Way ANOVA Engine:** Computes Sum of Squares, degrees of freedom ($df_1 = 2, df_2 = 17$), Mean Squares, $F$-statistic, $p$-value ($p < 0.001$), and Cohen's $d$ effect sizes.
- **Interactive Visualizations (Chart.js):**
  - Mean Cognitive Recovery Score (%) by Arm
  - Reaction Time Progression Trajectory (Baseline $\to$ Fatigue $\to$ Recovery)
  - NASA-TLX Perceived Effort by Arm
  - Musical Familiarity (1–5) vs Recovery Scatter Plot
- **Data Export:** Single-click export to **CSV** (`breathebeat_cohort_20_study.csv`) and **JSON**.
- **Live Session Integration:** Any new live test completed on the site can be merged directly into the cohort.

#### 4. Theory & Research
- Full academic background, acoustic anatomy of Raga Bhupali, diaphragmatic breathing physiology, and team credits.

---

## Tech Stack

- **Runtime & Bundler:** Vite (v8.3+)
- **Frontend Core:** Vanilla HTML5, Vanilla JavaScript (ES Modules)
- **Styling:** Vanilla CSS3 (Custom design system, glassmorphism, responsive)
- **Audio:** Web Audio API (Native multi-oscillator synthesis, biquad filters, LFO modulation, `AnalyserNode`)
- **Speech:** Web Speech Synthesis API
- **Charts & Effects:** Chart.js, canvas-confetti

---

## File Structure

```
├── index.html                   # Main single-page application layout
├── package.json                 # Scripts and dependencies
├── .gitignore                   # Ignored files
├── README.md                    # Documentation
├── project_proposal.pdf         # Original proposal document
└── src/
    ├── style.css                # Global design system & theme
    ├── main.js                  # App orchestrator & navigation
    ├── audio/
    │   ├── synth.js             # Web Audio API synthesizer engine
    │   └── audioVisualizer.js   # Real-time oscilloscope & FFT spectrum
    ├── components/
    │   └── breathingVisualizer.js # Dynamic 4-2-6 lotus breath visualizer
    ├── tests/
    │   ├── stroop.js            # Automated Stroop testing module
    │   ├── fatigue.js           # Arithmetic fatigue inducer
    │   └── nasatlx.js           # NASA-TLX survey module
    └── data/
        └── cohortData.js        # 20-student cohort dataset, ANOVA math, CSV export
```
