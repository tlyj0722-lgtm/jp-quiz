import { readRange, SHEETS } from './sheets.js';

export async function getUserProfile(userKey: string): Promise<{ name: string; studentId: string } | null> {
  const rows = await readRange(`${SHEETS.Users}!A2:D`);
  for (const r of rows) {
    if ((r[0] || '') === userKey) {
      return { name: r[1] || '', studentId: r[2] || '' };
    }
  }
  return null;
}
