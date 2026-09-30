# BREATHEBEAT

> **Sonified Diaphragmatic Breathing in Raga Bhupali for Cognitive Fatigue Restoration**  
> *Course:* Music Workshop (Semester 5)  
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

#### 1. Study Protocol (5-Stage Guided Session)
- **Stage 1 — Baseline Check (2 min):** Computerized Stroop test logging fresh reaction time (ms) and accuracy.
- **Stage 2 — Fatigue Inducer (3 min):** Rapid-fire arithmetic and working memory challenges under time pressure.
- **Stage 3 — Post-Fatigue Check (2 min):** Second Stroop check to record cognitive drop.
- **Stage 4 — Guided Rest Break (5 min):** 4-2-6 diaphragmatic breathing (4s Inhale, 2s Hold, 6s Exhale) under one of three randomly assigned arms with a synchronized sacred geometry breathing visualizer.
- **Stage 5 — Recovery Check (2 min):** Final Stroop test to measure cognitive restoration.
- **Stage 6 — NASA-TLX Survey & Results:** Post-session effort rating and instant computation of the **Cognitive Recovery Score**:
  $$\text{Recovery} = \frac{X_{\text{fatigue}} - X_{\text{recovery}}}{X_{\text{fatigue}} - X_{\text{baseline}}} \times 100\%$$
- *Modes:* Offers both **⚡ Fast Evaluation Mode** (~20–30s per stage for grading/testing) and **⏱ Full Research Protocol** (14 min official session).

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
