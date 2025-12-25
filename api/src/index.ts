import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import jwt from 'jsonwebtoken';
import { z } from 'zod';

import { ensureDataSheetsExist } from './services/sheets.js';
import { hashUserKey, ensureUser, upsertProgress, markWrong, markResolved, getWrongMap, addReset } from './services/progress.js';
import { requireAuth, type AuthedRequest } from './middleware/auth.js';
import { getNextQuestions, getBankStats, checkAnswer } from './services/quiz.js';
import { getUserProfile } from './services/user.js';
import { sendWrongPdf } from './services/pdf.js';
import { getQuestionBankCached } from './services/cache.js';

const PORT = parseInt(process.env.PORT || '3001', 10);
const app = express();

app.use(helmet());
app.use(express.json({ limit: '1mb' }));
app.use(
  cors({
    origin: process.env.CORS_ORIGIN || '*',
    credentials: false,
    allowedHeaders: ['Content-Type', 'Authorization'],
    methods: ['GET', 'POST', 'OPTIONS']
  })
);

app.get('/health', (_req, res) => res.status(200).json({ ok: true }));

app.post('/auth/login', async (req, res) => {
  const schema = z.object({
    name: z.string().min(1),
    studentId: z.string().min(1)
  });

  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const { name, studentId } = parsed.data;

  try {
    await ensureDataSheetsExist();
    const userKey = hashUserKey(name, studentId);
    await ensureUser(userKey, name, studentId);

    const secret = process.env.JWT_SECRET;
    if (!secret) return res.status(500).json({ error: 'JWT_SECRET not set' });

    const token = jwt.sign({ userKey }, secret, { expiresIn: '30d' });
    res.json({ token, userKey, name, studentId });
  } catch (e: any) {
    res.status(500).json({ error: e?.message || 'Login failed' });
  }
});

app.get('/quiz/next', requireAuth, async (req: AuthedRequest, res) => {
  const count = Math.min(50, Math.max(1, parseInt((req.query.count as string) || '25', 10)));
  try {
    await ensureDataSheetsExist();
    const questions = await getNextQuestions(req.userKey!, count);
    res.json({ questions, count: questions.length });
  } catch (e: any) {
    res.status(500).json({ error: e?.message || 'Failed to load questions' });
  }
});

app.post('/quiz/answer', requireAuth, async (req: AuthedRequest, res) => {
  const schema = z.object({ qid: z.string().min(1), answer: z.string().default('') });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  try {
    await ensureDataSheetsExist();
    const { qid, answer } = parsed.data;
    const bank = await getQuestionBankCached();
    const q = bank.find((x) => x.qid === qid);
    if (!q) return res.status(404).json({ error: 'Question not found' });

    const isCorrect = checkAnswer(q, answer);
    await upsertProgress(req.userKey!, qid, isCorrect ? 'correct' : 'wrong', answer);

    if (!isCorrect) {
      await markWrong(req.userKey!, qid, answer);
    } else {
      await markResolved(req.userKey!, qid);
    }

    return res.json({
      isCorrect,
      correctKana: q.answerKana,
      correctZh: q.answerZh,
      wordOriginal: q.wordOriginal
    });
  } catch (e: any) {
    res.status(500).json({ error: e?.message || 'Failed to submit answer' });
  }
});

app.get('/me/summary', requireAuth, async (req: AuthedRequest, res) => {
  try {
    await ensureDataSheetsExist();
    const stats = await getBankStats(req.userKey!);
    const wrongMap = await getWrongMap(req.userKey!);
    const wrongUnresolved = Array.from(wrongMap.values()).filter((x) => !x.resolved).length;
    res.json({ ...stats, wrongUnresolved });
  } catch (e: any) {
    res.status(500).json({ error: e?.message || 'Failed to load summary' });
  }
});

app.post('/me/reset', requireAuth, async (req: AuthedRequest, res) => {
  try {
    await ensureDataSheetsExist();
    await addReset(req.userKey!);
    res.json({ ok: true });
  } catch (e: any) {
    res.status(500).json({ error: e?.message || 'Failed to reset' });
  }
});

app.get('/me/wrong/pdf', requireAuth, async (req: AuthedRequest, res) => {
  try {
    await ensureDataSheetsExist();
    const profile = await getUserProfile(req.userKey!);
    if (!profile) return res.status(404).json({ error: 'User not found' });

    const wrongMap = await getWrongMap(req.userKey!);
    const unresolvedIds = Array.from(wrongMap.values()).filter((x) => !x.resolved).map((x) => x.qid);

    const bank = await getQuestionBankCached();
    const wrongQuestions = unresolvedIds
      .map((qid) => bank.find((q) => q.qid === qid))
      .filter((x): x is NonNullable<typeof x> => Boolean(x));

    return sendWrongPdf(res, {
      name: profile.name,
      studentId: profile.studentId,
      wrongQuestions
    });
  } catch (e: any) {
    res.status(500).json({ error: e?.message || 'Failed to export pdf' });
  }
});

app.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`API running on :${PORT}`);
});
