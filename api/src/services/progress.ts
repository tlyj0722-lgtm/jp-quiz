import crypto from 'crypto';
import { appendRow, readRange, updateRow, SHEETS } from './sheets.js';
import type { ProgressRow, WrongRow } from '../types/domain.js';

export function hashUserKey(name: string, studentId: string) {
  const input = `${name.trim()}|${studentId.trim()}`;
  return crypto.createHash('sha256').update(input).digest('hex');
}

function now() {
  return new Date().toISOString();
}

export async function getLatestResetAt(userKey: string): Promise<string> {
  const rows = await readRange(`${SHEETS.RESETS}!A2:B`);
  let latest = '1970-01-01T00:00:00.000Z';
  for (const r of rows) {
    if ((r[0] || '') !== userKey) continue;
    const ts = (r[1] || '').toString();
    if (ts && ts > latest) latest = ts;
  }
  return latest;
}

export async function addReset(userKey: string) {
  await appendRow(SHEETS.RESETS, [userKey, now()]);
}

export async function ensureUser(userKey: string, name: string, studentId: string) {
  const rows = await readRange(`${SHEETS.USERS}!A2:D`);
  const exists = rows.some((r) => (r[0] || '') === userKey);
  if (!exists) {
    await appendRow(SHEETS.USERS, [userKey, name.trim(), studentId.trim(), now()]);
  }
}

export async function getProgressMap(userKey: string): Promise<Map<string, ProgressRow>> {
  const resetAt = await getLatestResetAt(userKey);
  const rows = await readRange(`${SHEETS.PROGRESS}!A2:F`);
  const map = new Map<string, ProgressRow>();
  for (let i = 0; i < rows.length; i++) {
    const rowNumber = i + 2;
    const r = rows[i] || [];
    if ((r[0] || '') !== userKey) continue;
    const qid = r[1] || '';
    if (!qid) continue;
    const updatedAt = r[5] || '';
    if (updatedAt && updatedAt < resetAt) continue;
    const attempts = parseInt(r[3] || '1', 10);
    map.set(qid, {
      userKey,
      qid,
      status: (r[2] as any) === 'correct' ? 'correct' : 'wrong',
      attempts: Number.isFinite(attempts) ? attempts : 1,
      lastAnswer: r[4] || '',
      updatedAt,
      sheetRowNumber: rowNumber
    });
  }
  return map;
}

export async function upsertProgress(
  userKey: string,
  qid: string,
  status: 'correct' | 'wrong',
  lastAnswer: string
) {
  const map = await getProgressMap(userKey);
  const existing = map.get(qid);
  if (existing?.sheetRowNumber) {
    const nextAttempts = (existing.attempts || 0) + 1;
    await updateRow(SHEETS.PROGRESS, existing.sheetRowNumber, [
      userKey,
      qid,
      status,
      nextAttempts,
      lastAnswer,
      now()
    ]);
  } else {
    await appendRow(SHEETS.PROGRESS, [userKey, qid, status, 1, lastAnswer, now()]);
  }
}

export async function getWrongMap(userKey: string): Promise<Map<string, WrongRow>> {
  const resetAt = await getLatestResetAt(userKey);
  const rows = await readRange(`${SHEETS.WRONG}!A2:F`);
  const map = new Map<string, WrongRow>();
  for (let i = 0; i < rows.length; i++) {
    const rowNumber = i + 2;
    const r = rows[i] || [];
    if ((r[0] || '') !== userKey) continue;
    const qid = r[1] || '';
    if (!qid) continue;
    const resolved = (r[3] || '').toString().toLowerCase() === 'true';
    const addedAt = r[4] || '';
    // ignore wrong entries created before the last reset
    if (addedAt && addedAt < resetAt) continue;
    map.set(qid, {
      userKey,
      qid,
      lastWrongAnswer: r[2] || '',
      resolved,
      addedAt,
      resolvedAt: r[5] || '',
      sheetRowNumber: rowNumber
    });
  }
  return map;
}

export async function markWrong(userKey: string, qid: string, lastWrongAnswer: string) {
  const map = await getWrongMap(userKey);
  const existing = map.get(qid);
  if (existing?.sheetRowNumber) {
    await updateRow(SHEETS.WRONG, existing.sheetRowNumber, [
      userKey,
      qid,
      lastWrongAnswer,
      'false',
      existing.addedAt || now(),
      ''
    ]);
  } else {
    await appendRow(SHEETS.WRONG, [userKey, qid, lastWrongAnswer, 'false', now(), '']);
  }
}

export async function markResolved(userKey: string, qid: string) {
  const map = await getWrongMap(userKey);
  const existing = map.get(qid);
  if (!existing?.sheetRowNumber) return;
  await updateRow(SHEETS.WRONG, existing.sheetRowNumber, [
    userKey,
    qid,
    existing.lastWrongAnswer,
    'true',
    existing.addedAt || now(),
    now()
  ]);
}
