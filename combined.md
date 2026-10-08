# BREATHEBEAT: Combined Project Progress Report
**Course:** Music Workshop (Semester 5)  
**Submission:** Sprint 3 Joint Progress & Sprint 4 Roadmap  
**Team Members:**  
- Sri Harshit K (Roll No: 2024102022)  
- Parth Dhodapkar (Roll No: 2024111009)  
- Atharva Kulkarni (Roll No: 2023101072)  
**Platform URL:** [BREATHEBEAT Live System](http://localhost:5173/)  

---

## 1. Project Overview & Research Hypothesis
BREATHEBEAT is an interactive, web-based experimental platform designed to evaluate whether sonifying diaphragmatic breathing through Indian classical music accelerates cognitive recovery from acute mental fatigue compared to conventional spoken voice pacing or unassisted silent rest.

Most digital meditation tools rely on verbal counting ("Inhale 2, 3, 4...") or metronomic pulses, which paradoxically engage language-processing centers and maintain cognitive vigilance. We hypothesize that embedding respiratory cadences into the continuous melodic glides (*Meend*) of Indian classical ragas over an acoustic **Tanpura drone** provides an intuitive, non-verbal auditory guide. The melodic ascent naturally guides inhalation, the sustained primary resting note (*Vadi*) anchors breath retention (*Kumbhaka*), and the melodic descent paces relaxed exhalation, stimulating parasympathetic recovery without conscious counting strain.

---

## 2. Sprint 3 Collective Progress

During Sprint 3, our team worked across three complementary domains to transition from theoretical concepts to an integrated, literature-grounded experimental system:

### Track A: Musicological Framework & Raga Evaluation (Sri Harshit K)
Rooted in traditional sound healing and *Nada Yoga*, modal melodic frameworks are designed to balance emotional states (*rasas*) and regulate autonomic arousal. Sri Harshit analyzed the technical structure of early-morning and morning ragas (the first and second *prahars*, 4:00 AM - 10:00 AM) to identify musical architectures that promote cognitive stabilization:
- **Raga Bhairav:** Utilizes flattened second (*Komal Rishabh*) and sixth (*Komal Dhaivat*) notes with slow, deliberate microtonal oscillations (*andolan*), providing an acoustic anchor that dampens cortical hyperarousal into stillness.
- **Raga Lalit:** Omits the stabilizing fifth (*Pancham*) while juxtaposing natural (*Shuddha*) and sharp (*Teevra*) fourths (*Madhyam*), creating subtle introspective tension that resolves cleanly to the tonic (*Shadja*) to clear mental inertia.
- **Raag Todi (Miyan ki Todi):** Employs lowered *Rishabh*, *Gandhar*, and *Dhaivat* with sharp *Madhyam*, generating a heavy melodic gravity (*gambhirya*) that tempers sympathetic nervous activity.
- **Raag Bilaskhani Todi:** Relies on unbroken descending glides (*meend*), eliminating percussive attacks to smooth auditory transitions and facilitate alpha-wave coherence.
- **Neuroendocrine Rationale:** Morning ragas align with the daily circadian shift marked by rising cortisol, sleep inertia, and morning mental strain. Their gentle microtonal oscillations and flattened intervals establish a standardized acoustic profile for restorative evaluation.

### Track B: Interactive Web Platform & Testing Pipeline (Parth Dhodapkar)
Parth engineered the full single-page web evaluation platform on which all experimental sessions, audio synthesis, and cohort data collection run:
- **Automated 5-Stage Clinical Protocol:** Built an end-to-end testing workflow:
  1. *Baseline Check:* Computerized Stroop task measuring fresh reaction time and accuracy.
  2. *Fatigue Inducer:* 3-minute rapid-fire mental arithmetic gauntlet designed to exhaust working memory.
  3. *Post-Fatigue Check:* Second Stroop test quantifying the exact cognitive performance drop.
  4. *Guided Rest Break:* 5-minute diaphragmatic breathing session under one of three randomly assigned arms (Silent Rest, Spoken Guide, or BREATHEBEAT Music).
  5. *Recovery Check:* Final Stroop test evaluating restored cognitive processing speed.
  6. *Post-Session Survey:* NASA-TLX workload survey rating perceived mental demand and effort.
- **Protocol Modes & Recovery Formula:** Implemented dual runtime modes (a 2-minute Fast Evaluation Mode for rapid validation and a 14-minute Full Clinical Protocol) and automated the standardized recovery score:  
  Recovery (%) = [(Fatigued Time - Recovered Time) / (Fatigued Time - Baseline Time)] * 100
- **Audio Synthesizer Engine (Functional Prototype):** Implemented programmatic sound generation using the Web Audio API, generating a 4-string Tanpura drone (*Sa-Pa*) with lowpass resonance filtering (*Jawari* buzz) and continuous *Meend* pitch glides across Raga Bhupali synchronized to a sacred geometry breath visualizer.
- **Cohort Analytics Dashboard:** Created a 20-participant sample dataset, programmed an automated one-way ANOVA calculator (Sum of Squares, degrees of freedom, F-statistic, p-value, and Cohen's d), and integrated Chart.js telemetry with one-click CSV and JSON data export.

### Track C: Audio Design Grounding & Literature Review (Atharva Kulkarni)
Testing of our early Sprint 2 prototype revealed critical design friction: discrete musical note changes sounded abrupt and predictable scale traversals made breathing feel like a complex mental sequence requiring active listening effort. Atharva grounded our audio redesign in established psychoacoustic and music therapy literature:
- **Continuous Amplitude Envelopes (Gummidela et al., 2021):** Demonstrated that continuous volume dynamics (swelling on inhale, tapering on exhale) guide respiration effectively without discrete notes, producing immediate self-reported relaxation.
- **Purpose-Built Composition (Burns et al., 2013):** Confirmed that composing music specifically around paced respiration is significantly more restorative than forcing a breathing cadence onto existing static recordings.
- **Raga Bhupali & Tanpura Efficacy (Nagarajan et al., 2015; Ubrangala et al., 2022):** Validated that instrumental Raga Bhupali significantly enhances digit-span working memory while reducing anxiety, and that Tanpura drones paired with Bansuri (flute) *alaap* without percussive rhythm produce sustained parasympathetic activation.
- **Audio Testing & Feature Isolation Framework:** Defined a pre-trial micro-pilot evaluation to isolate three core acoustic variables before main participant trials:
  - *Tempo & Pacing:* Comparing equal 5s inhale / 5s exhale cycles against extended 4s inhale / 2s hold / 6s exhale patterns.
  - *Melodic Movement:* Evaluating continuous pitch glides (*meend*) versus discrete notes to minimize active listening demand.
  - *Acoustic Timbre:* Testing pure synthetic oscillators against organic acoustic profiles (Bansuri flute and real Tanpura).

---

## 3. Synthesis of Current Progress
By combining musicological raga analysis (Track A), software implementation (Track B), and psychoacoustic literature validation (Track C), the project has transitioned from a conceptual prototype to an operational, evidence-based research platform. 

The web platform is functional and mathematically verified, our theoretical framework demonstrates why Raga Bhupali and morning modal structures facilitate cognitive restoration, and our audio redesign plan directly resolves early prototype listener fatigue.

---

## 4. Specific Targets for Sprint 4

To prepare the system for official empirical study execution, the team will focus on the following consolidated milestones during Sprint 4:

1. **Acoustic Audio Sourcing & Bansuri Production:**
   - Replace the current synthetic Web Audio oscillator placeholder with high-fidelity, studio-recorded acoustic audio stems.
   - Record or source an authentic acoustic Tanpura drone and fluid Bansuri (bamboo flute) *alaap* glides structured specifically around continuous amplitude envelopes and unbroken *meend*.

2. **Micro-Pilot Audio Feature Evaluation:**
   - Execute internal A/B testing across the team to evaluate the three acoustic parameters identified in Track C (equal 5s-5s vs 4-2-6 pacing, continuous glides vs discrete steps, and synthetic vs acoustic timbre).
   - Finalize the primary experimental audio condition based on minimal subjective cognitive load and maximum self-reported relaxation.

3. **Production Deployment & Mobile Optimization:**
   - Deploy the web application to a public cloud hosting platform (e.g., Vercel / GitHub Pages) to allow participants to run trials on their own devices.
   - Optimize touch targets for mobile Stroop administration and integrate the HTML5 Screen Wake Lock API to prevent mobile displays from dimming during the 5-minute breathing break.

4. **Controlled In-Person Experimental Trials (N >= 20):**
   - Administer the full 14-minute experimental protocol to 20 or more student participants in the controlled acoustic environment of the Music Workshop studio.
   - Replace the current synthetic validation dataset with empirical participant telemetry across all three study arms (Silent Rest, Spoken Guide, and BREATHEBEAT Music).
   - Run inferential ANOVA and effect size analyses on live participant data to formally evaluate the research hypothesis.

---

## 5. Consolidated References
1. V. N. C. Gummidela, D. R. da Cunha Silva, and R. Gutierrez-Osuna, "Evaluating the Role of Breathing Guidance on Game-Based Interventions for Relaxation Training," *Frontiers in Digital Health*, vol. 3, 760268, 2021.
2. D. S. Burns, M. R. Drews, and J. S. Carpenter, "Description of an Audio-Based Paced Respiration Intervention for Vasomotor Symptoms," *Music and Medicine*, vol. 5, no. 1, pp. 8-14, 2013.
3. K. Nagarajan, T. M. Srinivasan, and N. H. Ramarao, "Immediate effect of listening to Indian raga on attention and concentration in healthy college students: A comparative study," *Journal of Health Research and Reviews*, vol. 2, no. 3, p. 103, 2015.
4. K. Nagarajan, T. M. Srinivasan, and N. H. Ramarao, "Immediate Effect of Indian Music on Cardiac Autonomic Control and Anxiety: A Comparative Study," *Heart India*, vol. 3, no. 4, pp. 93-100, 2015.
5. K. K. Ubrangala et al., "Effect of Indian Music as an Auditory Stimulus on Physiological Measures of Stress, Anxiety, Cardiovascular and Autonomic Responses in Humans," *European Journal of Investigation in Health, Psychology and Education*, vol. 12, no. 10, pp. 1535-1558, 2022.
6. D. Tiwari et al., "Importance Of Music And Ragas In Human Life," *Educational Administration: Theory and Practice*, vol. 30, no. 1, pp. 3670-3676, 2024.
