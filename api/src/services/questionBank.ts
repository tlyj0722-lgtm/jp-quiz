// api/src/services/questionBank.ts
import { readRange, getQuestionSheetTitle } from './sheets.js';
import type { Question } from '../types/domain.js';

function norm(s?: unknown) {
  return (s ?? '').toString().trim();
}

export async function loadQuestionBank(): Promise<Question[]> {
  const sheetTitle = await getQuestionSheetTitle();
  // A: 平假名, B: 中文, C: 例句(挖空), D: 例句中文, E: 單字原貌
  const rows = await readRange(`${sheetTitle}!A2:E`);

  // 「目前單字區塊」的主檔（允許下面例句列沿用）
  let curKana = '';
  let curZh = '';
  let curWord = '';

  const questions: Question[] = [];

  for (let i = 0; i < rows.length; i++) {
    const rowNumber = i + 2; // A2 is first data row
    const r = rows[i] || [];

    const aKanaRaw = norm(r[0]);
    const bZhRaw = norm(r[1]);
    const cClozeRaw = norm(r[2]);
    const dClozeZhRaw = norm(r[3]);
    const eWordRaw = norm(r[4]);

    const hasABCorE = Boolean(aKanaRaw || bZhRaw || eWordRaw);
    const hasSentence = Boolean(cClozeRaw || dClozeZhRaw);

    // ✅ 分隔列：整列都空白 → 切斷沿用，避免後面殘留例句被綁到前一題
    const hasABCOrE = Boolean(aKanaRaw || bZhRaw || eWordRaw);

if (!hasABCOrE && !hasSentence) {
  curKana = '';
  curZh = '';
  curWord = '';
  continue;
}

    // ✅ 若這列有 A/B/E，更新「目前單字主檔」
    // （允許只改其中一格，但至少要讓三者最後都齊）
    if (aKanaRaw) curKana = aKanaRaw;
    if (bZhRaw) curZh = bZhRaw;
    if (eWordRaw) curWord = eWordRaw;

    // ✅ 這列如果是「例句列」（只有 C/D 或 C/D + 部分 A/B/E）
    // 必須已經有主檔，否則跳過（避免把孤兒例句變成題）
    if (hasSentence) {
      if (!curKana || !curZh || !curWord) {
        // 主檔不完整就不出題，避免誤綁
        continue;
      }

      questions.push({
        qid: `QB_R${rowNumber}`,
        type: 'sentence',
        answerKana: curKana,
        answerZh: curZh,
        wordOriginal: curWord,
        cloze: cClozeRaw,
        clozeZh: dClozeZhRaw,
      });
      continue;
    }

    // ✅ 這列不是例句列 → 當作 vocab 題
    // vocab 題必須 A/B/E（或先前累積後）完整
    if (!curKana || !curZh || !curWord) continue;

    questions.push({
      qid: `QB_R${rowNumber}`,
      type: 'vocab',
      answerKana: curKana,
      answerZh: curZh,
      wordOriginal: curWord,
      cloze: undefined,
      clozeZh: undefined,
    });
  }

  return questions;
}
