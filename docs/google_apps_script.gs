/**
 * BREATHEBEAT — Google Apps Script receiver (protocol 2.0, long format)
 *
 * Setup:
 *  1. Open the Google Sheet → Extensions → Apps Script, replace the code with this file.
 *  2. Deploy → New deployment → Web app. Execute as: Me. Who has access: Anyone.
 *  3. Paste the Web App URL into GOOGLE_SHEET_WEBHOOK_URL in src/data/sheetService.js
 *     (or keep the existing URL if you redeploy the same deployment as a new version).
 *
 * Rows go to a fresh tab named SHEET_NAME so old 1.x data (different columns) stays untouched.
 * Each POST body is one JSON row. Columns are matched by header name; unknown keys become new columns.
 */

const SHEET_NAME = 'Responses_v2';

function doPost(e) {
  const lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    const row = JSON.parse(e.postData.contents);
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName(SHEET_NAME) || ss.insertSheet(SHEET_NAME);

    let headers = sheet.getLastColumn() > 0
      ? sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0]
      : [];

    const missing = Object.keys(row).filter(k => headers.indexOf(k) === -1);
    if (missing.length) {
      sheet.getRange(1, headers.length + 1, 1, missing.length).setValues([missing]);
      headers = headers.concat(missing);
      sheet.setFrozenRows(1);
    }

    sheet.appendRow(headers.map(h => (h in row ? row[h] : '')));
    return ContentService.createTextOutput('ok');
  } finally {
    lock.releaseLock();
  }
}
