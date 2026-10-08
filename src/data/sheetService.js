/**
 * BREATHEBEAT — Google Sheets & Excel Export Service
 * Automatically sends test results to a connected Google Sheet (Excel) webhook,
 * and maintains a resilient local storage database of all participant runs.
 */

// Replace this with your Google Apps Script Web App URL once deployed
export const GOOGLE_SHEET_WEBHOOK_URL = 'https://script.google.com/macros/s/AKfycbzxIY84it3vqwTjyubpKCNkkl4trzmrV-mtZrHi-L9_MazlciuSSQCl8q97MHHJtkXJ/exec';

/**
 * Submits session data to Google Sheet webhook and local storage
 */
export async function recordStudySession(sessionData) {
  const timestamp = new Date().toISOString();
  const participantId = sessionData.participantId || ('BB-' + Math.floor(1000 + Math.random() * 9000));

  const payload = {
    timestamp,
    participantId,
    baselineMeanRT: sessionData.baselineRT || 0,
    baselineCongruentRT: sessionData.baselineCongruentRT || 0,
    baselineIncongruentRT: sessionData.baselineIncongruentRT || 0,
    baselineInterference: sessionData.baselineInterference || 0,
    baselineAccuracy: sessionData.baselineAcc || 100,

    fatigueMathAccuracy: sessionData.fatigueAcc || 0,
    fatigueQuestionsSolved: sessionData.fatigueTotal || 0,
    fatigueEstimatedRT: sessionData.fatigueRT || 0,

    recoveryMeanRT: sessionData.recoveryRT || 0,
    recoveryCongruentRT: sessionData.recoveryCongruentRT || 0,
    recoveryIncongruentRT: sessionData.recoveryIncongruentRT || 0,
    recoveryInterference: sessionData.recoveryInterference || 0,
    recoveryAccuracy: sessionData.recoveryAcc || 100
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

  const headers = Object.keys(data[0]);
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
