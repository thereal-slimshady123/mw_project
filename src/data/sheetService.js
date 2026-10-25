/**
 * Google Sheets Data Integration Service
 *
 * Long format: every participant produces TWO rows, one per rest condition
 * (Silence, BreatheBeat). Participant-level fields repeat on both rows so each row
 * is self-contained. Pivot on Session_ID + Condition for paired comparisons.
 *
 * The receiving Apps Script (docs/google_apps_script.gs) maps payload keys to the
 * sheet's header row and adds any missing columns automatically.
 */

// Replace this with your Google Apps Script Web App URL once deployed
export const GOOGLE_SHEET_WEBHOOK_URL = 'https://script.google.com/macros/s/AKfycbzxIY84it3vqwTjyubpKCNkkl4trzmrV-mtZrHi-L9_MazlciuSSQCl8q97MHHJtkXJ/exec';

const STORAGE_KEY = 'breathebeat_sessions_v2';

// Column order for the sheet / CSV export
export const COLUMNS = [
  'Session_ID', 'Timestamp', 'Is_Demo', 'Protocol_Version',
  'Roll_No', 'Age', 'MW_Course',
  'Music_Training', 'Breathing_Practice',
  'Condition_Order', 'Condition', 'Block_Position',
  'Baseline_Stroop_RT', 'Baseline_Stroop_Acc', 'Baseline_Stroop_Interference',
  'Stressor_Math_Acc', 'Stressor_Math_Total', 'Stressor_Math_RT',
  'PreRest_Stroop_RT', 'PreRest_Stroop_Acc', 'PreRest_Stroop_Interference',
  'PostRest_Stroop_RT', 'PostRest_Stroop_Acc', 'PostRest_Stroop_Interference',
  'Stroop_RT_Gain_ms', 'Stroop_Acc_Gain', 'Stroop_Interference_Gain_ms',
  'Pre_Stress', 'Pre_Fatigue', 'Post_Stress', 'Post_Fatigue',
  'Stress_Drop', 'Fatigue_Drop',
  'Attention_On_Breath', 'Sync_Ease', 'Relaxation',
  'Rest_Seconds', 'Rest_Completed', 'Audio_Muted',
  'Final_More_Refreshed', 'Calm_Preference', 'Comments'
];

const num = (v) => (typeof v === 'number' && Number.isFinite(v) ? v : '');
const diff = (a, b) => (typeof a === 'number' && typeof b === 'number' ? a - b : '');

/**
 * Builds the row for one condition block.
 * Gains are oriented so that POSITIVE always means "better after the rest".
 */
export function buildConditionRow(session, block) {
  const pre = block.preState || {};
  const post = block.postState || {};
  const exp = block.experience || {};
  const fin = session.final || {};
  const intake = session.intake || {};

  return {
    Session_ID: session.sessionId,
    Timestamp: session.completedAt || new Date().toISOString(),
    Is_Demo: session.isDemo ? 'TRUE' : 'FALSE',
    Protocol_Version: session.protocolVersion,

    Roll_No: String(session.rollNumber || ''),
    Age: num(session.age),
    MW_Course: session.isMusicWorkshop || '',
    Music_Training: num(intake.musicTraining),
    Breathing_Practice: num(intake.breathingPractice),

    Condition_Order: session.conditionOrder.join('>'),
    Condition: block.condition,
    Block_Position: block.position,

    Baseline_Stroop_RT: num(session.baselineStroop?.meanRT),
    Baseline_Stroop_Acc: num(session.baselineStroop?.accuracy),
    Baseline_Stroop_Interference: num(session.baselineStroop?.stroopEffect),

    Stressor_Math_Acc: num(block.stressorMath?.accuracy),
    Stressor_Math_Total: num(block.stressorMath?.totalQuestions),
    Stressor_Math_RT: num(block.stressorMath?.meanRt),

    PreRest_Stroop_RT: num(block.preStroop?.meanRT),
    PreRest_Stroop_Acc: num(block.preStroop?.accuracy),
    PreRest_Stroop_Interference: num(block.preStroop?.stroopEffect),
    PostRest_Stroop_RT: num(block.postStroop?.meanRT),
    PostRest_Stroop_Acc: num(block.postStroop?.accuracy),
    PostRest_Stroop_Interference: num(block.postStroop?.stroopEffect),

    Stroop_RT_Gain_ms: diff(block.preStroop?.meanRT, block.postStroop?.meanRT),
    Stroop_Acc_Gain: diff(block.postStroop?.accuracy, block.preStroop?.accuracy),
    Stroop_Interference_Gain_ms: diff(block.preStroop?.stroopEffect, block.postStroop?.stroopEffect),

    Pre_Stress: num(pre.stress),
    Pre_Fatigue: num(pre.fatigue),
    Post_Stress: num(post.stress),
    Post_Fatigue: num(post.fatigue),
    Stress_Drop: diff(pre.stress, post.stress),
    Fatigue_Drop: diff(pre.fatigue, post.fatigue),

    Attention_On_Breath: num(exp.attentionOnBreath),
    Sync_Ease: num(exp.syncEase),
    Relaxation: num(exp.relaxation),

    Rest_Seconds: num(block.restSeconds),
    Rest_Completed: block.restCompleted ? 'TRUE' : 'FALSE',
    Audio_Muted: block.condition === 'breathebeat' ? (block.audioMuted ? 'TRUE' : 'FALSE') : '',

    Final_More_Refreshed: fin.moreRefreshed || '',
    Calm_Preference: fin.calmPreference || '',
    Comments: session.comments || ''
  };
}

/**
 * Saves both condition rows locally and transmits them to the Google Sheet.
 */
export async function recordStudySession(session) {
  const rows = session.blocks.map(block => buildConditionRow(session, block));

  // 1. Always save locally as resilient backup
  try {
    const existing = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    existing.push(...rows);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(existing));
  } catch (err) {
    console.warn('LocalStorage save error:', err);
  }

  // 2. Dispatch to Google Sheet Webhook if configured (one POST per row)
  if (GOOGLE_SHEET_WEBHOOK_URL && GOOGLE_SHEET_WEBHOOK_URL.trim() !== '') {
    for (const row of rows) {
      try {
        await fetch(GOOGLE_SHEET_WEBHOOK_URL, {
          method: 'POST',
          mode: 'no-cors', // Standard for Google Apps Script Web Apps
          headers: {
            'Content-Type': 'text/plain;charset=utf-8'
          },
          body: JSON.stringify(row)
        });
      } catch (err) {
        console.error('Failed to transmit session row to Google Sheet webhook:', err);
      }
    }
    console.log('Session data transmitted to Google Sheet.');
  } else {
    console.info('Google Sheet Webhook URL not yet configured. Data saved locally in localStorage.');
  }

  return rows;
}

/**
 * Download all stored responses as an Excel-compatible CSV file
 */
export function exportStoredSessionsCSV() {
  const data = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
  if (!data.length) {
    alert('No sessions recorded yet.');
    return;
  }

  const rows = data.map(row => COLUMNS.map(h => JSON.stringify(row[h] ?? '')).join(','));
  const csvContent = [COLUMNS.join(','), ...rows].join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `breathebeat_study_data_${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}
