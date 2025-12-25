import { google } from 'googleapis';

const SPREADSHEET_ID = process.env.SPREADSHEET_ID || '1dIa6Js-ggyEBXXbh8xzc5It2UsganBaI5X8SZve-2hE';

const QUESTION_SHEET_NAME = process.env.QUESTION_SHEET_NAME; // optional; if empty, uses first sheet.

export const SHEETS = {
  USERS: 'Users',
  PROGRESS: 'Progress',
  WRONG: 'WrongBank',
  RESETS: 'Resets'
} as const;

let cachedSheetNames: string[] | null = null;
let cacheExpiresAt = 0;

function getServiceAccount() {
  const raw = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
  if (!raw) throw new Error('GOOGLE_SERVICE_ACCOUNT_JSON not set');
  try {
    return JSON.parse(raw) as {
      client_email: string;
      private_key: string;
    };
  } catch (e) {
    throw new Error('GOOGLE_SERVICE_ACCOUNT_JSON is not valid JSON');
  }
}

export function getSheetsClient() {
  const sa = getServiceAccount();
  const auth = new google.auth.JWT({
    email: sa.client_email,
    key: sa.private_key,
    scopes: ['https://www.googleapis.com/auth/spreadsheets']
  });
  return google.sheets({ version: 'v4', auth });
}

export function getSpreadsheetId() {
  return SPREADSHEET_ID;
}

export async function listSheetTitles() {
  const now = Date.now();
  if (cachedSheetNames && now < cacheExpiresAt) return cachedSheetNames;

  const sheets = getSheetsClient();
  const res = await sheets.spreadsheets.get({ spreadsheetId: SPREADSHEET_ID });
  const titles = (res.data.sheets || [])
    .map((s) => s.properties?.title)
    .filter((t): t is string => Boolean(t));

  cachedSheetNames = titles;
  cacheExpiresAt = now + 5 * 60 * 1000;
  return titles;
}

export async function getQuestionSheetTitle(): Promise<string> {
  if (QUESTION_SHEET_NAME) return QUESTION_SHEET_NAME;
  const titles = await listSheetTitles();
  if (titles.length === 0) throw new Error('No sheets found in spreadsheet');
  return titles[0];
}

export async function ensureDataSheetsExist() {
  const sheets = getSheetsClient();
  const titles = await listSheetTitles();
  const toCreate = Object.values(SHEETS).filter((name) => !titles.includes(name));
  if (toCreate.length === 0) return;

  await sheets.spreadsheets.batchUpdate({
    spreadsheetId: SPREADSHEET_ID,
    requestBody: {
      requests: toCreate.map((title) => ({
        addSheet: { properties: { title } }
      }))
    }
  });

  // Add headers
  const headerUpdates = [] as { range: string; values: string[][] }[];
  if (toCreate.includes(SHEETS.USERS)) {
    headerUpdates.push({
      range: `${SHEETS.USERS}!A1:D1`,
      values: [[
        'userKey',
        'name',
        'studentId',
        'createdAt'
      ]]
    });
  }
  if (toCreate.includes(SHEETS.PROGRESS)) {
    headerUpdates.push({
      range: `${SHEETS.PROGRESS}!A1:F1`,
      values: [[
        'userKey',
        'qid',
        'status',
        'attempts',
        'lastAnswer',
        'updatedAt'
      ]]
    });
  }
  if (toCreate.includes(SHEETS.WRONG)) {
    headerUpdates.push({
      range: `${SHEETS.WRONG}!A1:F1`,
      values: [[
        'userKey',
        'qid',
        'lastWrongAnswer',
        'resolved',
        'addedAt',
        'resolvedAt'
      ]]
    });
  }

  if (toCreate.includes(SHEETS.RESETS)) {
    headerUpdates.push({
      range: `${SHEETS.RESETS}!A1:B1`,
      values: [[
        'userKey',
        'resetAt'
      ]]
    });
  }

  for (const u of headerUpdates) {
    await sheets.spreadsheets.values.update({
      spreadsheetId: SPREADSHEET_ID,
      range: u.range,
      valueInputOption: 'RAW',
      requestBody: { values: u.values }
    });
  }

  // refresh cache
  cachedSheetNames = null;
}

export async function readRange(range: string) {
  const sheets = getSheetsClient();
  const res = await sheets.spreadsheets.values.get({ spreadsheetId: SPREADSHEET_ID, range });
  return (res.data.values || []) as string[][];
}

export async function appendRow(sheetName: string, values: (string | number | boolean)[]) {
  const sheets = getSheetsClient();
  await sheets.spreadsheets.values.append({
    spreadsheetId: SPREADSHEET_ID,
    range: `${sheetName}!A1`,
    valueInputOption: 'RAW',
    insertDataOption: 'INSERT_ROWS',
    requestBody: { values: [values.map(String)] }
  });
}

export async function updateRow(sheetName: string, rowNumber1Based: number, values: (string | number | boolean)[]) {
  const sheets = getSheetsClient();
  const range = `${sheetName}!A${rowNumber1Based}:Z${rowNumber1Based}`;
  await sheets.spreadsheets.values.update({
    spreadsheetId: SPREADSHEET_ID,
    range,
    valueInputOption: 'RAW',
    requestBody: { values: [values.map(String)] }
  });
}

export async function clearSheetExceptHeader(sheetName: string) {
  const sheets = getSheetsClient();
  await sheets.spreadsheets.values.clear({
    spreadsheetId: SPREADSHEET_ID,
    range: `${sheetName}!A2:Z`
  });
}
