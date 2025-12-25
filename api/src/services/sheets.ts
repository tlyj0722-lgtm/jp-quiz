// api/src/services/sheets.ts
import { google } from 'googleapis';

const SHEET_ID = process.env.GOOGLE_SHEET_ID!;
const QUESTION_SHEET_NAME = process.env.QUESTION_SHEET_NAME || 'Questions';

// ====== 系統用 Sheet（嚴格型別） ======
type SystemSheetName =
  | 'Users'
  | 'Progress'
  | 'WrongBank'
  | 'Resets';

// ====== Google Sheets client ======
const auth = new google.auth.GoogleAuth({
  credentials: JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON!),
  scopes: ['https://www.googleapis.com/auth/spreadsheets'],
});

const sheets = google.sheets({
  version: 'v4',
  auth,
});

// ====== 取得「系統用 sheet」 ======
async function getSystemSheet(sheetName: SystemSheetName) {
  return sheets.spreadsheets.values.get({
    spreadsheetId: SHEET_ID,
    range: sheetName,
  });
}

// ====== 取得「題庫 sheet」（重點！string，不受 union 限制） ======
async function getQuestionSheet() {
  return sheets.spreadsheets.values.get({
    spreadsheetId: SHEET_ID,
    range: QUESTION_SHEET_NAME,
  });
}

// ===============================
// 🔽 以下是實際對外使用的 function
// ===============================

// 👉 題庫：只從 Google Sheet 讀
export async function loadQuestionsFromSheet() {
  const res = await getQuestionSheet();
  const rows = res.data.values || [];

  // TODO: 這裡保持你原本的 parse 邏輯
  // 第一欄：答案
  // 第二欄：中文
  // 第三欄：挖空句
  // 第四欄：句子翻譯
  // 第五欄：單字原貌
  return rows;
}

// 👉 系統資料（用戶、進度、錯題）
export async function loadUsers() {
  return getSystemSheet('Users');
}

export async function loadProgress() {
  return getSystemSheet('Progress');
}

export async function loadWrongBank() {
  return getSystemSheet('WrongBank');
}

export async function loadResets() {
  return getSystemSheet('Resets');
}
