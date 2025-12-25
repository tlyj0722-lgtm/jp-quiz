import type { Question } from '../types/domain.js';
import { loadQuestionBank } from './questionBank.js';

let cached: { at: number; data: Question[] } | null = null;

export async function getQuestionBankCached(ttlMs = 5 * 60 * 1000): Promise<Question[]> {
  const now = Date.now();
  if (cached && now - cached.at < ttlMs) return cached.data;
  const data = await loadQuestionBank();
  cached = { at: now, data };
  return data;
}
