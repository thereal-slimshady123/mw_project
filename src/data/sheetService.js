/**
 * BREATHEBEAT — Google Sheets & Excel Export Service
 * Submits strictly the calculation inputs and the resulting calculated metrics.
 */

// Replace this with your Google Apps Script Web App URL once deployed
export const GOOGLE_SHEET_WEBHOOK_URL = 'https://script.google.com/macros/s/AKfycbzxIY84it3vqwTjyubpKCNkkl4trzmrV-mtZrHi-L9_MazlciuSSQCl8q97MHHJtkXJ/exec';

/**
 * Submits strictly the inputs that calculate metrics, plus the metrics themselves.
 */
export async function recordStudySession(sessionData) {
  const payload = {
    // 1. Exact Column Headers matching Row 1 of Google Sheet
    Roll_No: String(sessionData.rollNumber || ''),
    Baseline_RT: Math.round(sessionData.baselineRT || 0),
    Recovery_RT: Math.round(sessionData.recoveryRT || 0),
    Speedup_ms: Math.round(sessionData.stroopSpeedup || 0),
    Pre_Math_Acc: Math.round(sessionData.preMathAcc ?? 0),
    Post_Math_Acc: Math.round(sessionData.postMathAcc ?? 0),
    Math_Delta: Math.round(sessionData.mathAccuracyDelta || 0),
    Pre_Stress: Number(sessionData.preFatigueScore) || 0,
    Post_Stress: Number(sessionData.postFatigueScore) || 0,
    Stress_Drop: Number(sessionData.subjectiveRelief) || 0,
    Recovery_Score: Math.round(sessionData.recoveryScore || 0),

    // 2. camelCase aliases for backward compatibility
    rollNumber: String(sessionData.rollNumber || ''),
    baselineRT: Math.round(sessionData.baselineRT || 0),
    recoveryRT: Math.round(sessionData.recoveryRT || 0),
    speedupMs: Math.round(sessionData.stroopSpeedup || 0),
    preMathAcc: Math.round(sessionData.preMathAcc ?? 0),
    postMathAcc: Math.round(sessionData.postMathAcc ?? 0),
    mathDelta: Math.round(sessionData.mathAccuracyDelta || 0),
    preStress: Number(sessionData.preFatigueScore) || 0,
    postStress: Number(sessionData.postFatigueScore) || 0,
    stressDrop: Number(sessionData.subjectiveRelief) || 0,
    recoveryScore: Math.round(sessionData.recoveryScore || 0)
  };

  // 1. Always save locally as resilient backup
  try {
    const existing = JSON.parse(localStorage.getItem('breathebeat_sessions') || '[]');
    existing.push(payload);
    localStorage.setItem('breathebeat_sessions', JSON.stringify(existing));
  } catch (err) {
    console.warn('LocalStorage save error:', err);
  }

  // 2. Dispatch to Google Sheet Webhook if configured
  if (GOOGLE_SHEET_WEBHOOK_URL && GOOGLE_SHEET_WEBHOOK_URL.trim() !== '') {
    try {
      await fetch(GOOGLE_SHEET_WEBHOOK_URL, {
        method: 'POST',
        mode: 'no-cors', // Standard for Google Apps Script Web Apps
        headers: {
          'Content-Type': 'text/plain;charset=utf-8'
        },
        body: JSON.stringify(payload)
      });
      console.log('Session data successfully transmitted to Google Sheet.');
    } catch (err) {
      console.error('Failed to transmit session to Google Sheet webhook:', err);
    }
  } else {
    console.info('Google Sheet Webhook URL not yet configured. Data saved locally in localStorage.');
  }

  return payload;
}

/**
 * Download all stored responses as an Excel-compatible CSV file
 */
export function exportStoredSessionsCSV() {
  const data = JSON.parse(localStorage.getItem('breathebeat_sessions') || '[]');
  if (!data.length) {
    alert('No sessions recorded yet.');
    return;
  }

  const headers = [
    'Roll_No',
    'Baseline_RT',
    'Recovery_RT',
    'Speedup_ms',
    'Pre_Math_Acc',
    'Post_Math_Acc',
    'Math_Delta',
    'Pre_Stress',
    'Post_Stress',
    'Stress_Drop',
    'Recovery_Score'
  ];
  const rows = data.map(row => headers.map(h => JSON.stringify(row[h] ?? '')).join(','));
  const csvContent = [headers.join(','), ...rows].join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `breathebeat_study_data_${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}
