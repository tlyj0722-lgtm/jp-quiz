// api/src/services/sheets.ts
import { google } from "googleapis";

type SheetName = "Users" | "Progress" | "WrongBank" | "Resets" | "Questions";

export const SHEETS: Readonly<Record<SheetName, string>> = {
  Users: "Users",
  Progress: "Progress",
  WrongBank: "WrongBank",
  Resets: "Resets",
  Questions: "工作表1", // 你的題庫 tab
} as const;

function getSheetsClient() {
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const key = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, "\n");
  const spreadsheetId = process.env.GOOGLE_SHEET_ID;

  if (!email || !key || !spreadsheetId) {
    throw new Error("Missing GOOGLE_SERVICE_ACCOUNT_EMAIL / GOOGLE_PRIVATE_KEY / GOOGLE_SHEET_ID");
  }

  const auth = new google.auth.JWT({
    email,
    key,
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });

  const sheets = google.sheets({ version: "v4", auth });
  return { sheets, spreadsheetId };
}

export async function readRange(rangeA1: string): Promise<any[][]> {
  const { sheets, spreadsheetId } = getSheetsClient();
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: rangeA1,
    majorDimension: "ROWS",
  });

  return (res.data.values as any[][]) || [];
}

export async function appendRow(sheetTitle: string, row: any[]) {
  const { sheets, spreadsheetId } = getSheetsClient();
  await sheets.spreadsheets.values.append({
    spreadsheetId,
    range: `${sheetTitle}!A:A`,
    valueInputOption: "RAW",
    insertDataOption: "INSERT_ROWS",
    requestBody: {
      values: [row],
    },
  });
}

export async function updateRow(sheetTitle: string, rowNumber: number, row: any[]) {
  const { sheets, spreadsheetId } = getSheetsClient();
  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: `${sheetTitle}!A${rowNumber}:Z${rowNumber}`,
    valueInputOption: "RAW",
    requestBody: {
      values: [row],
    },
  });
}

// 若你其他檔案有用到這個（你 log 出現過 ensureDataSheetsExist）
// 先提供一個「不會炸」的版本：存在就略過，不存在就建立。
export async function ensureDataSheetsExist() {
  const { sheets, spreadsheetId } = getSheetsClient();
  const meta = await sheets.spreadsheets.get({ spreadsheetId });
  const existingTitles = new Set(
    (meta.data.sheets || [])
      .map((s) => s.properties?.title)
      .filter((t): t is string => !!t)
  );

  const need = [SHEETS.Users, SHEETS.Progress, SHEETS.WrongBank, SHEETS.Resets, SHEETS.Questions];

  const requests: any[] = [];
  for (const title of need) {
    if (!existingTitles.has(title)) {
      requests.push({ addSheet: { properties: { title } } });
    }
  }

  if (requests.length > 0) {
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId,
      requestBody: { requests },
    });
  }
}

export function getQuestionSheetTitle() {
  return SHEETS.Questions;
}
