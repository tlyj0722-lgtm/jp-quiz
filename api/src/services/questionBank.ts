import { readRange, getQuestionSheetTitle } from './sheets.js';
import type { Question } from '../types/domain.js';

function norm(s?: string) {
  return (s ?? '').toString().trim();
}

export async function loadQuestionBank(): Promise<Question[]> {
  const sheetTitle = await getQuestionSheetTitle();
  // A: 平假名, B: 中文, C: 例句(挖空), D: 例句中文, E: 單字原貌
  const rows = await readRange(`${sheetTitle}!A2:E`);

  let lastKana = '';
  let lastZh = '';
  let lastWord = '';

  const questions: Question[] = [];

  // Google Sheets values are 0-indexed arrays
  for (let i = 0; i < rows.length; i++) {
    const rowNumber = i + 2; // because A2 is first data row
    const r = rows[i] || [];
    const aKanaRaw = norm(r[0]);
    const bZhRaw = norm(r[1]);
    const cClozeRaw = norm(r[2]);
    const dClozeZhRaw = norm(r[3]);
    const eWordRaw = norm(r[4]);

    const answerKana = aKanaRaw || lastKana;
    const answerZh = bZhRaw || lastZh;
    const wordOriginal = eWordRaw || lastWord;

    if (!answerKana || !answerZh || !wordOriginal) {
      // still update carry if present, but skip rows that cannot be normalized
      if (aKanaRaw) lastKana = aKanaRaw;
      if (bZhRaw) lastZh = bZhRaw;
      if (eWordRaw) lastWord = eWordRaw;
      continue;
    }

    // carry forward for next rows
    lastKana = answerKana;
    lastZh = answerZh;
    lastWord = wordOriginal;

    const isSentence = Boolean(cClozeRaw || dClozeZhRaw);

    const q: Question = {
      qid: `QB_R${rowNumber}`,
      type: isSentence ? 'sentence' : 'vocab',
      answerKana,
      answerZh,
      wordOriginal,
      ...(isSentence
        ? { cloze: cClozeRaw, clozeZh: dClozeZhRaw }
        : { cloze: undefined, clozeZh: undefined })
    };

    // for vocab type: 題目 = 中文(B)
    if (!isSentence) {
      // keep bZh as answerZh already; prompt is handled on frontend using answerZh
    }

    questions.push(q);
  }

  return questions;
}
