import { google, sheets_v4 } from 'googleapis';

const SPREADSHEET_ID = process.env.GOOGLE_SHEET_ID!;
const QUESTION_SHEET_NAME = process.env.QUESTION_SHEET_NAME || 'Questions';

// === 舊程式會用到的常數：SHEETS ===
export const SHEETS = {
  Users: 'Users',
  Progress: 'Progress',
  WrongBank: 'WrongBank',
  Resets: 'Resets',
  // 題庫 sheet 也放這裡，但「題庫只讀」由 questionBank 控制
  Questions: QUESTION_SHEET_NAME,
} as const;

// === 建立 Google Sheets client ===
function getSheetsClient(): sheets_v4.Sheets {
  const raw = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
  if (!raw) throw new Error('Missing GOOGLE_SERVICE_ACCOUNT_JSON');

  const credentials = JSON.parse(raw);
  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });

  return google.sheets({ version: 'v4', auth });
}

function a1(sheetName: string, range: string) {
  // range 可能是 "A1:D" 或 "A:D" 或 "A1"
  // 若 range 本身已包含 "Sheet!A1" 就不要再加
  if (range.includes('!')) return range;
  return `${sheetName}!${range}`;
}

// ======================================================
// ✅ 下面這些 export 是「舊程式」會 import 的：
// ensureDataSheetsExist / readRange / appendRow / updateRow / getQuestionSheetTitle
// ======================================================

// 1) 確保四張系統表存在（沒有就建立）
// 你現在要「徹底刪掉所有非 Sheet 出題來源」不影響這四張系統表，因為它們是存使用者/進度/錯題用的。
export async function ensureDataSheetsExist() {
  const sheets = getSheetsClient();

  const meta = await sheets.spreadsheets.get({
    spreadsheetId: SPREADSHEET_ID,
  });

  const existingTitles = new Set(
    (meta.data.sheets || [])
      .map((s) => s.properties?.title)
      .filter(Boolean) as string[]
  );

  const needed = [SHEETS.Users, SHEETS.Progress, SHEETS.WrongBank, SHEETS.Resets, SHEETS.Questions];

  const requests: sheets_v4.Schema$Request[] = [];
  for (const title of needed) {
    if (!existingTitles.has(title)) {
      requests.push({ addSheet: { properties: { title } } });
    }
  }

  if (requests.length > 0) {
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId: SPREADSHEET_ID,
      requestBody: { requests },
    });
  }
}

// 2) 讀取資料：舊程式會用 readRange()
// 支援兩種呼叫：
// - readRange("Users!A2:C")
// - readRange("Users", "A2:C")
export async function readRange(rangeOrSheet: string, maybeRange?: string): Promise<string[][]> {
  const sheets = getSheetsClient();
  const range = maybeRange ? a1(rangeOrSheet, maybeRange) : rangeOrSheet;

  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range,
  });

  return (res.data.values || []) as string[][];
}

// 3) 追加一列：appendRow(sheetName, values)
export async function appendRow(sheetName: string, values: (string | number | boolean | null)[]) {
  const sheets = getSheetsClient();

  await sheets.spreadsheets.values.append({
    spreadsheetId: SPREADSHEET_ID,
    range: sheetName, // append 用 sheetName 就可
    valueInputOption: 'RAW',
    insertDataOption: 'INSERT_ROWS',
    requestBody: {
      values: [values.map((v) => (v === null ? '' : v))],
    },
  });
}

// 4) 更新某一列：updateRow(sheetName, rowNumber, values)
// rowNumber = 1-based（第 1 列是 1）
// 會從 A 欄開始覆蓋到 values 長度
export async function updateRow(
  sheetName: string,
  rowNumber: number,
  values: (string | number | boolean | null)[]
) {
  const sheets = getSheetsClient();

  const cleaned = values.map((v) => (v === null ? '' : v));

  // 例如：Users!A5
  const start = `${sheetName}!A${rowNumber}`;

  await sheets.spreadsheets.values.update({
    spreadsheetId: SPREADSHEET_ID,
    range: start,
    valueInputOption: 'RAW',
    requestBody: { values: [cleaned] },
  });
}

// 5) 題庫 sheet 名稱：舊程式會用 getQuestionSheetTitle()
export function getQuestionSheetTitle() {
  return QUESTION_SHEET_NAME;
}
