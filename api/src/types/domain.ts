export type QuestionType = 'sentence' | 'vocab';

export type TokenSegment = { text: string; isParticle: boolean };

export type Question = {
  qid: string;
  type: QuestionType;
  answerKana: string; // 平假名
  answerZh: string; // 中文
  cloze?: string; // 例句(挖空)
  clozeZh?: string; // 例句中文
  wordOriginal: string; // 單字原貌
  clozeTokens?: TokenSegment[]; // for sentence type
};

export type ProgressRow = {
  userKey: string;
  qid: string;
  status: 'correct' | 'wrong';
  attempts: number;
  lastAnswer: string;
  updatedAt: string;
  sheetRowNumber?: number; // for update
};

export type WrongRow = {
  userKey: string;
  qid: string;
  lastWrongAnswer: string;
  resolved: boolean;
  addedAt: string;
  resolvedAt?: string;
  sheetRowNumber?: number;
};
