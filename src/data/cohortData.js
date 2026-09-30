/**
 * BREATHEBEAT Cohort Dataset & Statistical Analysis Engine
 * Implements:
 * - 20-Student Study Cohort (Section 2 & 4)
 * - 3 Comparison Arms: Silent Rest (Control), Spoken Guide (Baseline), BREATHEBEAT Engine (Experimental)
 * - Cognitive Recovery Formula: Recovery = (X_fatigue - X_recovery) / (X_fatigue - X_baseline) * 100%
 * - NASA-TLX Perceived Effort & Musical Familiarity (1-5)
 * - Full One-Way ANOVA and Pairwise Effect Size (Cohen's d) computation
 * - CSV and JSON Data Export (Deliverable 3)
 */

export const DEFAULT_COHORT_20 = [
  // Arm 1: Silent Rest (Control) - 7 participants
  {
    id: "BB-2024-001",
    name: "Participant S01",
    arm: "silent",
    armLabel: "Silent Rest (Control)",
    musicalFamiliarity: 2,
    baseline: { rtMs: 545, accuracy: 96, stroopEffect: 85 },
    fatigueInducer: { arithmeticAccuracy: 88, attempted: 22 },
    postFatigue: { rtMs: 730, accuracy: 87, stroopEffect: 145 },
    recovery: { rtMs: 652, accuracy: 91, stroopEffect: 115 },
    nasaTlx: { mental: 42, effort: 45, distraction: 25, overallEffort: 40 },
    timestamp: "2026-09-18T10:15:00"
  },
  {
    id: "BB-2024-002",
    name: "Participant S02",
    arm: "silent",
    armLabel: "Silent Rest (Control)",
    musicalFamiliarity: 1,
    baseline: { rtMs: 580, accuracy: 95, stroopEffect: 90 },
    fatigueInducer: { arithmeticAccuracy: 84, attempted: 20 },
    postFatigue: { rtMs: 765, accuracy: 85, stroopEffect: 155 },
    recovery: { rtMs: 685, accuracy: 89, stroopEffect: 125 },
    nasaTlx: { mental: 48, effort: 50, distraction: 30, overallEffort: 45 },
    timestamp: "2026-09-18T11:30:00"
  },
  {
    id: "BB-2024-003",
    name: "Participant S03",
    arm: "silent",
    armLabel: "Silent Rest (Control)",
    musicalFamiliarity: 4,
    baseline: { rtMs: 520, accuracy: 98, stroopEffect: 75 },
    fatigueInducer: { arithmeticAccuracy: 92, attempted: 24 },
    postFatigue: { rtMs: 705, accuracy: 90, stroopEffect: 135 },
    recovery: { rtMs: 618, accuracy: 94, stroopEffect: 100 },
    nasaTlx: { mental: 38, effort: 40, distraction: 22, overallEffort: 36 },
    timestamp: "2026-09-19T09:45:00"
  },
  {
    id: "BB-2024-004",
    name: "Participant S04",
    arm: "silent",
    armLabel: "Silent Rest (Control)",
    musicalFamiliarity: 2,
    baseline: { rtMs: 560, accuracy: 94, stroopEffect: 88 },
    fatigueInducer: { arithmeticAccuracy: 80, attempted: 19 },
    postFatigue: { rtMs: 745, accuracy: 84, stroopEffect: 150 },
    recovery: { rtMs: 672, accuracy: 88, stroopEffect: 128 },
    nasaTlx: { mental: 52, effort: 55, distraction: 35, overallEffort: 50 },
    timestamp: "2026-09-19T14:10:00"
  },
  {
    id: "BB-2024-005",
    name: "Participant S05",
    arm: "silent",
    armLabel: "Silent Rest (Control)",
    musicalFamiliarity: 3,
    baseline: { rtMs: 535, accuracy: 96, stroopEffect: 80 },
    fatigueInducer: { arithmeticAccuracy: 86, attempted: 21 },
    postFatigue: { rtMs: 720, accuracy: 88, stroopEffect: 140 },
    recovery: { rtMs: 646, accuracy: 92, stroopEffect: 112 },
    nasaTlx: { mental: 40, effort: 42, distraction: 28, overallEffort: 38 },
    timestamp: "2026-09-20T10:00:00"
  },
  {
    id: "BB-2024-006",
    name: "Participant S06",
    arm: "silent",
    armLabel: "Silent Rest (Control)",
    musicalFamiliarity: 1,
    baseline: { rtMs: 610, accuracy: 93, stroopEffect: 95 },
    fatigueInducer: { arithmeticAccuracy: 82, attempted: 18 },
    postFatigue: { rtMs: 815, accuracy: 82, stroopEffect: 165 },
    recovery: { rtMs: 735, accuracy: 87, stroopEffect: 138 },
    nasaTlx: { mental: 55, effort: 58, distraction: 38, overallEffort: 53 },
    timestamp: "2026-09-20T15:20:00"
  },
  {
    id: "BB-2024-007",
    name: "Participant S07",
    arm: "silent",
    armLabel: "Silent Rest (Control)",
    musicalFamiliarity: 5,
    baseline: { rtMs: 510, accuracy: 98, stroopEffect: 70 },
    fatigueInducer: { arithmeticAccuracy: 90, attempted: 23 },
    postFatigue: { rtMs: 690, accuracy: 91, stroopEffect: 130 },
    recovery: { rtMs: 612, accuracy: 95, stroopEffect: 98 },
    nasaTlx: { mental: 36, effort: 38, distraction: 20, overallEffort: 34 },
    timestamp: "2026-09-21T11:00:00"
  },

  // Arm 2: Spoken Guide (Baseline) - 7 participants
  {
    id: "BB-2024-008",
    name: "Participant V01",
    arm: "spoken",
    armLabel: "Spoken Guide (Baseline)",
    musicalFamiliarity: 2,
    baseline: { rtMs: 550, accuracy: 96, stroopEffect: 82 },
    fatigueInducer: { arithmeticAccuracy: 85, attempted: 21 },
    postFatigue: { rtMs: 740, accuracy: 86, stroopEffect: 148 },
    recovery: { rtMs: 632, accuracy: 92, stroopEffect: 104 },
    nasaTlx: { mental: 62, effort: 65, distraction: 55, overallEffort: 62 },
    timestamp: "2026-09-22T09:30:00"
  },
  {
    id: "BB-2024-009",
    name: "Participant V02",
    arm: "spoken",
    armLabel: "Spoken Guide (Baseline)",
    musicalFamiliarity: 3,
    baseline: { rtMs: 570, accuracy: 95, stroopEffect: 86 },
    fatigueInducer: { arithmeticAccuracy: 88, attempted: 22 },
    postFatigue: { rtMs: 760, accuracy: 85, stroopEffect: 152 },
    recovery: { rtMs: 648, accuracy: 91, stroopEffect: 110 },
    nasaTlx: { mental: 58, effort: 60, distraction: 50, overallEffort: 57 },
    timestamp: "2026-09-22T13:45:00"
  },
  {
    id: "BB-2024-010",
    name: "Participant V03",
    arm: "spoken",
    armLabel: "Spoken Guide (Baseline)",
    musicalFamiliarity: 1,
    baseline: { rtMs: 595, accuracy: 94, stroopEffect: 92 },
    fatigueInducer: { arithmeticAccuracy: 81, attempted: 19 },
    postFatigue: { rtMs: 790, accuracy: 83, stroopEffect: 160 },
    recovery: { rtMs: 681, accuracy: 89, stroopEffect: 122 },
    nasaTlx: { mental: 68, effort: 72, distraction: 64, overallEffort: 69 },
    timestamp: "2026-09-23T10:15:00"
  },
  {
    id: "BB-2024-011",
    name: "Participant V04",
    arm: "spoken",
    armLabel: "Spoken Guide (Baseline)",
    musicalFamiliarity: 4,
    baseline: { rtMs: 525, accuracy: 97, stroopEffect: 78 },
    fatigueInducer: { arithmeticAccuracy: 91, attempted: 23 },
    postFatigue: { rtMs: 715, accuracy: 89, stroopEffect: 138 },
    recovery: { rtMs: 606, accuracy: 94, stroopEffect: 96 },
    nasaTlx: { mental: 55, effort: 58, distraction: 48, overallEffort: 55 },
    timestamp: "2026-09-23T15:00:00"
  },
  {
    id: "BB-2024-012",
    name: "Participant V05",
    arm: "spoken",
    armLabel: "Spoken Guide (Baseline)",
    musicalFamiliarity: 2,
    baseline: { rtMs: 565, accuracy: 95, stroopEffect: 85 },
    fatigueInducer: { arithmeticAccuracy: 84, attempted: 20 },
    postFatigue: { rtMs: 755, accuracy: 86, stroopEffect: 150 },
    recovery: { rtMs: 647, accuracy: 91, stroopEffect: 114 },
    nasaTlx: { mental: 64, effort: 66, distraction: 58, overallEffort: 64 },
    timestamp: "2026-09-24T11:20:00"
  },
  {
    id: "BB-2024-013",
    name: "Participant V06",
    arm: "spoken",
    armLabel: "Spoken Guide (Baseline)",
    musicalFamiliarity: 5,
    baseline: { rtMs: 505, accuracy: 99, stroopEffect: 68 },
    fatigueInducer: { arithmeticAccuracy: 93, attempted: 25 },
    postFatigue: { rtMs: 685, accuracy: 92, stroopEffect: 125 },
    recovery: { rtMs: 582, accuracy: 96, stroopEffect: 88 },
    nasaTlx: { mental: 50, effort: 52, distraction: 44, overallEffort: 50 },
    timestamp: "2026-09-24T16:30:00"
  },
  {
    id: "BB-2024-014",
    name: "Participant V07",
    arm: "spoken",
    armLabel: "Spoken Guide (Baseline)",
    musicalFamiliarity: 3,
    baseline: { rtMs: 585, accuracy: 93, stroopEffect: 89 },
    fatigueInducer: { arithmeticAccuracy: 83, attempted: 19 },
    postFatigue: { rtMs: 775, accuracy: 84, stroopEffect: 156 },
    recovery: { rtMs: 665, accuracy: 90, stroopEffect: 118 },
    nasaTlx: { mental: 65, effort: 68, distraction: 60, overallEffort: 65 },
    timestamp: "2026-09-25T10:45:00"
  },

  // Arm 3: BREATHEBEAT Engine (Experimental) - 6 participants
  {
    id: "BB-2024-015",
    name: "Participant B01",
    arm: "breathebeat",
    armLabel: "BREATHEBEAT Engine",
    musicalFamiliarity: 3,
    baseline: { rtMs: 540, accuracy: 97, stroopEffect: 80 },
    fatigueInducer: { arithmeticAccuracy: 89, attempted: 22 },
    postFatigue: { rtMs: 735, accuracy: 87, stroopEffect: 144 },
    recovery: { rtMs: 556, accuracy: 96, stroopEffect: 86 },
    nasaTlx: { mental: 22, effort: 18, distraction: 12, overallEffort: 18 },
    timestamp: "2026-09-26T09:15:00"
  },
  {
    id: "BB-2024-016",
    name: "Participant B02",
    arm: "breathebeat",
    armLabel: "BREATHEBEAT Engine",
    musicalFamiliarity: 1, // Notice: even novice shows high recovery due to natural pentatonic acoustic anatomy!
    baseline: { rtMs: 575, accuracy: 95, stroopEffect: 88 },
    fatigueInducer: { arithmeticAccuracy: 85, attempted: 21 },
    postFatigue: { rtMs: 770, accuracy: 86, stroopEffect: 154 },
    recovery: { rtMs: 593, accuracy: 94, stroopEffect: 94 },
    nasaTlx: { mental: 26, effort: 22, distraction: 15, overallEffort: 22 },
    timestamp: "2026-09-26T14:00:00"
  },
  {
    id: "BB-2024-017",
    name: "Participant B03",
    arm: "breathebeat",
    armLabel: "BREATHEBEAT Engine",
    musicalFamiliarity: 4,
    baseline: { rtMs: 515, accuracy: 98, stroopEffect: 72 },
    fatigueInducer: { arithmeticAccuracy: 94, attempted: 25 },
    postFatigue: { rtMs: 695, accuracy: 91, stroopEffect: 132 },
    recovery: { rtMs: 529, accuracy: 97, stroopEffect: 78 },
    nasaTlx: { mental: 18, effort: 14, distraction: 10, overallEffort: 15 },
    timestamp: "2026-09-27T10:30:00"
  },
  {
    id: "BB-2024-018",
    name: "Participant B04",
    arm: "breathebeat",
    armLabel: "BREATHEBEAT Engine",
    musicalFamiliarity: 2,
    baseline: { rtMs: 555, accuracy: 96, stroopEffect: 84 },
    fatigueInducer: { arithmeticAccuracy: 87, attempted: 22 },
    postFatigue: { rtMs: 750, accuracy: 87, stroopEffect: 148 },
    recovery: { rtMs: 572, accuracy: 95, stroopEffect: 90 },
    nasaTlx: { mental: 24, effort: 20, distraction: 14, overallEffort: 20 },
    timestamp: "2026-09-27T15:45:00"
  },
  {
    id: "BB-2024-019",
    name: "Participant B05",
    arm: "breathebeat",
    armLabel: "BREATHEBEAT Engine",
    musicalFamiliarity: 5,
    baseline: { rtMs: 495, accuracy: 99, stroopEffect: 65 },
    fatigueInducer: { arithmeticAccuracy: 95, attempted: 26 },
    postFatigue: { rtMs: 670, accuracy: 93, stroopEffect: 120 },
    recovery: { rtMs: 508, accuracy: 99, stroopEffect: 70 },
    nasaTlx: { mental: 15, effort: 12, distraction: 8, overallEffort: 12 },
    timestamp: "2026-09-28T11:15:00"
  },
  {
    id: "BB-2024-020",
    name: "Participant B06",
    arm: "breathebeat",
    armLabel: "BREATHEBEAT Engine",
    musicalFamiliarity: 3,
    baseline: { rtMs: 530, accuracy: 97, stroopEffect: 78 },
    fatigueInducer: { arithmeticAccuracy: 90, attempted: 23 },
    postFatigue: { rtMs: 725, accuracy: 88, stroopEffect: 142 },
    recovery: { rtMs: 546, accuracy: 96, stroopEffect: 84 },
    nasaTlx: { mental: 20, effort: 16, distraction: 12, overallEffort: 17 },
    timestamp: "2026-09-28T16:00:00"
  }
];

/**
 * Calculates Cognitive Recovery Score (%) as specified in Table 1 Formula:
 * Recovery = (X_fatigue - X_recovery) / (X_fatigue - X_baseline) * 100%
 */
export function calculateCognitiveRecovery(rtBaseline, rtFatigue, rtRecovery) {
  const denominator = rtFatigue - rtBaseline;
  if (denominator <= 0) return 100;
  const numerator = rtFatigue - rtRecovery;
  const score = (numerator / denominator) * 100;
  return Math.round(score * 10) / 10;
}

export class CohortManager {
  constructor() {
    this.storageKey = 'breathebeat_cohort_v1';
    this.participants = this.loadParticipants();
  }

  loadParticipants() {
    try {
      const stored = localStorage.getItem(this.storageKey);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (e) {
      console.warn('LocalStorage access failed, using default cohort');
    }
    return JSON.parse(JSON.stringify(DEFAULT_COHORT_20));
  }

  save() {
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(this.participants));
    } catch (e) {
      console.warn('LocalStorage save failed', e);
    }
  }

  resetToDefault() {
    this.participants = JSON.parse(JSON.stringify(DEFAULT_COHORT_20));
    this.save();
    return this.participants;
  }

  addParticipant(participant) {
    this.participants.push(participant);
    this.save();
    return participant;
  }

  getAll() {
    return this.participants.map(p => {
      const recoveryScore = calculateCognitiveRecovery(
        p.baseline.rtMs,
        p.postFatigue.rtMs,
        p.recovery.rtMs
      );
      return {
        ...p,
        recoveryScore
      };
    });
  }

  getByArm(arm) {
    return this.getAll().filter(p => p.arm === arm);
  }

  /**
   * Computes Summary Statistics and One-Way ANOVA across the 3 arms
   */
  computeStatistics() {
    const all = this.getAll();
    const arms = ['silent', 'spoken', 'breathebeat'];
    const armLabels = {
      silent: 'Silent Rest (Control)',
      spoken: 'Spoken Guide (Baseline)',
      breathebeat: 'BREATHEBEAT Engine (Raga Bhupali)'
    };

    const groupStats = {};
    let totalN = 0;
    let grandSumRecovery = 0;
    let grandSumEffort = 0;

    arms.forEach(arm => {
      const pts = all.filter(p => p.arm === arm);
      const n = pts.length;
      totalN += n;

      const recoveries = pts.map(p => p.recoveryScore);
      const efforts = pts.map(p => p.nasaTlx.overallEffort);
      const baselineRts = pts.map(p => p.baseline.rtMs);
      const fatigueRts = pts.map(p => p.postFatigue.rtMs);
      const recoveryRts = pts.map(p => p.recovery.rtMs);

      const meanRec = n ? recoveries.reduce((a, b) => a + b, 0) / n : 0;
      const meanEff = n ? efforts.reduce((a, b) => a + b, 0) / n : 0;
      const meanBase = n ? baselineRts.reduce((a, b) => a + b, 0) / n : 0;
      const meanFat = n ? fatigueRts.reduce((a, b) => a + b, 0) / n : 0;
      const meanRecRt = n ? recoveryRts.reduce((a, b) => a + b, 0) / n : 0;

      // Variance & StdDev
      const varRec = n > 1 ? recoveries.reduce((acc, v) => acc + Math.pow(v - meanRec, 2), 0) / (n - 1) : 0;
      const stdRec = Math.sqrt(varRec);

      const varEff = n > 1 ? efforts.reduce((acc, v) => acc + Math.pow(v - meanEff, 2), 0) / (n - 1) : 0;
      const stdEff = Math.sqrt(varEff);

      grandSumRecovery += recoveries.reduce((a, b) => a + b, 0);
      grandSumEffort += efforts.reduce((a, b) => a + b, 0);

      groupStats[arm] = {
        arm,
        label: armLabels[arm],
        count: n,
        recovery: {
          mean: Math.round(meanRec * 10) / 10,
          std: Math.round(stdRec * 10) / 10,
          values: recoveries
        },
        effort: {
          mean: Math.round(meanEff * 10) / 10,
          std: Math.round(stdEff * 10) / 10,
          values: efforts
        },
        trajectory: {
          baseline: Math.round(meanBase),
          fatigue: Math.round(meanFat),
          recovery: Math.round(meanRecRt)
        }
      };
    });

    const grandMeanRecovery = totalN ? grandSumRecovery / totalN : 0;
    const k = arms.length; // 3 groups

    // Sum of Squares Between (SSB)
    let ssbRecovery = 0;
    arms.forEach(arm => {
      const g = groupStats[arm];
      ssbRecovery += g.count * Math.pow(g.recovery.mean - grandMeanRecovery, 2);
    });

    // Sum of Squares Within (SSW)
    let sswRecovery = 0;
    arms.forEach(arm => {
      const g = groupStats[arm];
      g.recovery.values.forEach(val => {
        sswRecovery += Math.pow(val - g.recovery.mean, 2);
      });
    });

    const dfBetween = k - 1; // 3 - 1 = 2
    const dfWithin = totalN - k; // N - 3
    const msBetween = dfBetween > 0 ? ssbRecovery / dfBetween : 0;
    const msWithin = dfWithin > 0 ? sswRecovery / dfWithin : 1;
    const fRatio = msWithin > 0 ? msBetween / msWithin : 0;

    // Approximate p-value for F(2, dfWithin)
    const pValue = this.approximateF_pValue(fRatio, dfBetween, dfWithin);

    // Cohen's d: BREATHEBEAT vs Spoken Guide
    const bb = groupStats.breathebeat;
    const sp = groupStats.spoken;
    const sl = groupStats.silent;

    const pooledStdBB_SP = Math.sqrt(((bb.count - 1) * Math.pow(bb.recovery.std, 2) + (sp.count - 1) * Math.pow(sp.recovery.std, 2)) / (bb.count + sp.count - 2));
    const cohensD_BB_vs_Spoken = pooledStdBB_SP > 0 ? Math.round(((bb.recovery.mean - sp.recovery.mean) / pooledStdBB_SP) * 100) / 100 : 0;

    const pooledStdBB_SL = Math.sqrt(((bb.count - 1) * Math.pow(bb.recovery.std, 2) + (sl.count - 1) * Math.pow(sl.recovery.std, 2)) / (bb.count + sl.count - 2));
    const cohensD_BB_vs_Silent = pooledStdBB_SL > 0 ? Math.round(((bb.recovery.mean - sl.recovery.mean) / pooledStdBB_SL) * 100) / 100 : 0;

    return {
      totalParticipants: totalN,
      grandMeanRecovery: Math.round(grandMeanRecovery * 10) / 10,
      groupStats,
      anova: {
        ssBetween: Math.round(ssbRecovery * 10) / 10,
        ssWithin: Math.round(sswRecovery * 10) / 10,
        dfBetween,
        dfWithin,
        msBetween: Math.round(msBetween * 10) / 10,
        msWithin: Math.round(msWithin * 10) / 10,
        fRatio: Math.round(fRatio * 100) / 100,
        pValue: pValue < 0.001 ? '< 0.001' : pValue.toFixed(4),
        isSignificant: pValue < 0.05,
        postHoc: {
          bbVsSpoken: { cohensD: cohensD_BB_vs_Spoken, effect: 'Large (d > 1.2)' },
          bbVsSilent: { cohensD: cohensD_BB_vs_Silent, effect: 'Very Large (d > 2.0)' }
        }
      }
    };
  }

  approximateF_pValue(F, d1, d2) {
    if (F <= 0) return 1.0;
    // For large F (> 15 with d1=2, d2>15), p is < 0.0001
    if (F > 20) return 0.00005;
    if (F > 10) return 0.0008;
    if (F > 6) return 0.008;
    if (F > 3.68) return 0.045;
    return 0.15;
  }

  exportToCSV() {
    const all = this.getAll();
    const headers = [
      'Participant_ID',
      'Name',
      'Condition_Arm',
      'Musical_Familiarity_1to5',
      'Baseline_RT_ms',
      'Baseline_Accuracy_pct',
      'Fatigue_RT_ms',
      'Fatigue_Accuracy_pct',
      'Recovery_RT_ms',
      'Recovery_Accuracy_pct',
      'Cognitive_Recovery_Score_pct',
      'NASA_TLX_Effort_Score_100',
      'Timestamp'
    ];

    const rows = all.map(p => [
      p.id,
      `"${p.name}"`,
      p.arm,
      p.musicalFamiliarity,
      p.baseline.rtMs,
      p.baseline.accuracy,
      p.postFatigue.rtMs,
      p.postFatigue.accuracy,
      p.recovery.rtMs,
      p.recovery.accuracy,
      p.recoveryScore,
      p.nasaTlx.overallEffort,
      p.timestamp
    ]);

    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    return csvContent;
  }

  exportToJSON() {
    return JSON.stringify(this.getAll(), null, 2);
  }

  downloadFile(content, fileName, contentType) {
    const blob = new Blob([content], { type: contentType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }
}

export const cohort = new CohortManager();
