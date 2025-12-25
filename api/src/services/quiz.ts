import type { Question } from '../types/domain.js';
import { loadQuestionBank } from './questionBank.js';
import { tokenizeClozeToTokens } from './tokenize.js';
import { getProgressMap } from './progress.js';

function shuffle<T>(arr: T[]) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export async function getNextQuestions(userKey: string, count: number): Promise<Question[]> {
  const bank = await loadQuestionBank();
  const progressMap = await getProgressMap(userKey);

  const remaining = bank.filter((q) => !progressMap.has(q.qid));
  const selected = shuffle(remaining).slice(0, Math.max(0, count));

  // add tokens for sentence questions (助詞藍字)
  for (const q of selected) {
    if (q.type === 'sentence' && q.cloze) {
      q.clozeTokens = await tokenizeClozeToTokens(q.cloze);
    }
  }

  return selected;
}

export async function getBankStats(userKey: string) {
  const bank = await loadQuestionBank();
  const progressMap = await getProgressMap(userKey);
  const done = progressMap.size;
  return {
    total: bank.length,
    done,
    remaining: Math.max(0, bank.length - done)
  };
}

export function checkAnswer(q: Question, userAnswerRaw: string) {
  const normalize = (s: string) => s.trim().replace(/\s+/g, '');
  const userAnswer = normalize(userAnswerRaw);
  const correct = normalize(q.answerKana);
  return userAnswer === correct;
}
