import { readRange, getQuestionSheetTitle } from './sheets.js';
import type { Question } from '../types/domain.js';

function norm(v: unknown) {
  return (v ?? '').toString().trim();
}

function isEmptyRow(r: any[]) {
  return norm(r?.[0]) === '' && norm(r?.[1]) === '' && norm(r?.[2]) === '' && norm(r?.[3]) === '' && norm(r?.[4]) === '';
}

export async function loadQuestionBank(): Promise<Question[]> {
  const sheetTitle = await getQuestionSheetTitle();

  // A: 平假名(答案) / B: 中文(題目或解答用) / C: 例句(挖空題目) / D: 例句中文(題目顯示) / E: 單字原貌(解答顯示)
  const rows = await readRange(`${sheetTitle}!A2:E`);

  let lastA = '';
  let lastB = '';
  let lastE = '';

  const questions: Question[] = [];

  for (let i = 0; i < rows.length; i++) {
    const rowNumber = i + 2;
    const r = rows[i] || [];

    if (isEmptyRow(r)) {
      // 整列空白就略過（避免產生怪題目）
      continue;
    }

    const aRaw = norm(r[0]); // A
    const bRaw = norm(r[1]); // B
    const cRaw = norm(r[2]); // C
    const dRaw = norm(r[3]); // D
    const eRaw = norm(r[4]); // E

    const answerKana = aRaw || lastA; // A 可沿用上一列
    const answerZh = bRaw || lastB;   // B 也可沿用（因為很多句子題 B 會省略）
    const wordOriginal = eRaw || lastE; // E 也可沿用

    // 更新 carry-forward
    if (answerKana) lastA = answerKana;
    if (answerZh) lastB = answerZh;
    if (wordOriginal) lastE = wordOriginal;

    // ✅ 題型判定：只有「C 有值」才算句子題
    const isSentence = cRaw !== '';

    // 必要欄位檢查：沒有 A 或 E 這題就不成立（避免怪題）
    // （你希望解答一定能顯示 A / E）
    if (!answerKana || !wordOriginal) continue;

    const q: Question = {
      qid: `QB_R${rowNumber}`,
      type: isSentence ? 'sentence' : 'vocab',
      answerKana,     // A
      answerZh,       // B（句子題解答會用；單字題題目也用）
      wordOriginal,   // E
      // 句子題才有 C/D
      ...(isSentence
        ? {
            cloze: cRaw,     // C：題目顯示
            clozeZh: dRaw,   // D：題目顯示
          }
        : {
            cloze: undefined,
            clozeZh: undefined,
          }),
    };

    questions.push(q);
  }

  return questions;
}
