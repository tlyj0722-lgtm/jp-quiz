import { getToken } from './auth';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE;

if (!API_BASE) {
  // eslint-disable-next-line no-console
  console.warn('NEXT_PUBLIC_API_BASE is not set');
}

export type Question = {
  qid: string;
  type: 'sentence' | 'vocab';
  answerKana: string;
  answerZh: string;
  cloze?: string;
  clozeZh?: string;
  wordOriginal: string;
  // ✅ 修正：跟 API 回傳一致
  clozeTokens?: { t: string; particle?: boolean }[];
};

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = getToken();
  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      ...(init.headers || {}),
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    },
    cache: 'no-store'
  });
  if (!res.ok) {
    let msg = 'Request failed';
    try {
      const j = await res.json();
      msg = j.error?.message || j.error || msg;
    } catch {}
    throw new Error(msg);
  }
  return (await res.json()) as T;
}

export const api = {
  login: (name: string, studentId: string) =>
    request<{ token: string; name: string; studentId: string }>(`/auth/login`, {
      method: 'POST',
      body: JSON.stringify({ name, studentId })
    }),

  nextQuiz: (count = 25) => request<{ questions: Question[]; count: number }>(`/quiz/next?count=${count}`),

  answer: (qid: string, answer: string) =>
    request<{ isCorrect: boolean; correctKana: string; correctZh: string; wordOriginal: string }>(`/quiz/answer`, {
      method: 'POST',
      body: JSON.stringify({ qid, answer })
    }),

  summary: () => request<{ total: number; done: number; remaining: number; wrongUnresolved: number }>(`/me/summary`),

  reset: () => request<{ ok: true }>(`/me/reset`, { method: 'POST', body: '{}' }),

  wrongPdfUrl: () => `${API_BASE}/me/wrong/pdf`
};
