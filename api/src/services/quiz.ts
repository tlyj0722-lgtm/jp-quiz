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

/**
 * Adapt tokens returned by tokenizeClozeToTokens (ClozeToken[])
 * into the type expected by Question.clozeTokens (TokenSegment[]).
 * We keep it flexible because the exact field names may differ between implementations.
 */
function toTokenSegments(tokens: unknown): any[] {
  const arr = Array.isArray(tokens) ? tokens : [];
  return arr.map((x: any) => {
    const t = (x?.t ?? x?.text ?? '').toString();
    const particle = Boolean(x?.particle ?? x?.isParticle ?? false);
    const blank = Boolean(x?.blank ?? x?.isBlank ?? false);

    // TokenSegment 通常至少需要文字欄位；其餘欄位有就帶上
    const seg: any = { t };
    if (particle) seg.particle = true;
    if (blank) seg.blank = true;

    // 如果你的 TokenSegment 用的是 text / isParticle / isBlank 這套命名，也一併帶上（更穩）
    if ('text' in (x || {})) seg.text = t;
    if ('isParticle' in (x || {})) seg.isParticle = particle;
    if ('isBlank' in (x || {})) seg.isBlank = blank;

    return seg;
  });
}

export async function getNextQuestions(userKey: string, count: number): Promise<Question[]> {
  const bank = await loadQuestionBank();
  const progressMap = await getProgressMap(userKey);

  const remaining = bank.filter((q) => !progressMap.has(q.qid));
  const selected = shuffle(remaining).slice(0, Math.max(0, count));

  // add tokens for sentence questions (助詞藍字)
  for (const q of selected) {
    if (q.type === 'sentence' && q.cloze) {
      const clozeTokens = await tokenizeClozeToTokens(q.cloze);
      // ✅ Convert ClozeToken[] -> TokenSegment[]
      q.clozeTokens = toTokenSegments(clozeTokens) as any;
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
