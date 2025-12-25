// api/src/services/sheets.ts
import { google } from "googleapis";

type SheetName = "Users" | "Progress" | "WrongBank" | "Resets" | "Questions";

export const SHEETS: Readonly<Record<SheetName, string>> = {
  Users: "Users",
  Progress: "Progress",
  WrongBank: "WrongBank",
  Resets: "Resets",
  Questions: process.env.QUESTION_SHEET_NAME || "工作表1", // 題庫 tab（可用 env 覆蓋）
} as const;

function parseServiceAccountJson() {
  const raw = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
  if (!raw) return null;

  try {
    const obj = JSON.parse(raw);
    const email = obj.client_email as string | undefined;
    const key = (obj.private_key as string | undefined)?.replace(/\\n/g, "\n");
    if (!email || !key) return null;
    return { email, key };
  } catch {
    throw new Error("Invalid GOOGLE_SERVICE_ACCOUNT_JSON (must be valid JSON)");
  }
}

function getSheetsClient() {
  // Prefer the new env format (what your Render currently has)
  const sa = parseServiceAccountJson();

  const email =
    sa?.email ||
    process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;

  const key =
    sa?.key ||
    process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, "\n");

  // Prefer SPREADSHEET_ID, fallback to GOOGLE_SHEET_ID
  const spreadsheetId =
    process.env.SPREADSHEET_ID ||
    process.env.GOOGLE_SHEET_ID;

  if (!email || !key || !spreadsheetId) {
    throw new Error(
      "Missing GOOGLE_SERVICE_ACCOUNT_JSON(or GOOGLE_SERVICE_ACCOUNT_EMAIL/GOOGLE_PRIVATE_KEY) / SPREADSHEET_ID(or GOOGLE_SHEET_ID)"
    );
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
    requestBody: { values: [row] },
  });
}

export async function updateRow(sheetTitle: string, rowNumber: number, row: any[]) {
  const { sheets, spreadsheetId } = getSheetsClient();
  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: `${sheetTitle}!A${rowNumber}:Z${rowNumber}`,
    valueInputOption: "RAW",
    requestBody: { values: [row] },
  });
}

// Ensure required tabs exist; create missing ones (safe / idempotent)
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

  if (requests.length) {
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId,
      requestBody: { requests },
    });
  }
}

export function getQuestionSheetTitle() {
  return SHEETS.Questions;
}
