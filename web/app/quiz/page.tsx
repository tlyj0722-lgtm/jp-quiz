"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api, type Question } from "@/lib/api";
import { clearAuth, getProfile, getToken } from "@/lib/auth";
import { ParticleText } from "@/components/ParticleText";

type Result = {
  isCorrect: boolean;
  correctKana: string;
  correctZh: string;
  wordOriginal: string;
};

type Profile = {
  name: string;
  studentId: string;
};

const POINTS_PER_Q = 4;
const QUIZ_SIZE = 25;

export default function QuizPage() {
  const router = useRouter();

  // ✅ 避免在 render 階段讀 localStorage：改成 state + useEffect 取得
  const [profile, setProfile] = useState<Profile | null>(null);
  const [hasToken, setHasToken] = useState<boolean | null>(null);

  const [loading, setLoading] = useState(true);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [idx, setIdx] = useState(0);
  const [answer, setAnswer] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [flash, setFlash] = useState<"green" | "red" | null>(null);
  const [lastResult, setLastResult] = useState<Result | null>(null);
  const [correctCount, setCorrectCount] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const q = questions[idx];
  const done = idx >= questions.length;

  async function loadQuiz() {
    setLoading(true);
    setError(null);
    setIdx(0);
    setCorrectCount(0);
    setLastResult(null);
    setFlash(null);
    setAnswer("");
    try {
      const r = await api.nextQuiz(QUIZ_SIZE);
      setQuestions(r.questions);
    } catch (e: any) {
      setError(e?.message || "載入題目失敗");
    } finally {
      setLoading(false);
    }
  }

  // ✅ 只在瀏覽器端（mount 後）讀 token/profile
  useEffect(() => {
    try {
      const t = getToken();
      setHasToken(!!t);

      if (!t) {
        router.replace("/login");
        return;
      }

      const p = getProfile();
      setProfile(p || null);

      void loadQuiz();
    } catch {
      // 若 auth util 內部讀取失敗，當作未登入
      setHasToken(false);
      router.replace("/login");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function submit() {
    if (!q) return;
    setSubmitting(true);
    setError(null);
    try {
      const r = await api.answer(q.qid, answer);
      setLastResult(r);
      if (r.isCorrect) setCorrectCount((c) => c + 1);
      setFlash(r.isCorrect ? "green" : "red");
      setTimeout(() => setFlash(null), 500);

      // Move to next after a short delay so user sees color feedback
      setTimeout(() => {
        setIdx((i) => i + 1);
        setAnswer("");
        setLastResult(null);
      }, 700);
    } catch (e: any) {
      setError(e?.message || "送出失敗");
    } finally {
      setSubmitting(false);
    }
  }

  function logout() {
    clearAuth();
    router.replace("/login");
  }

  const score = correctCount * POINTS_PER_Q;
  const maxScore = questions.length * POINTS_PER_Q;

  const bgClass =
    flash === "green"
      ? "bg-green-100"
      : flash === "red"
      ? "bg-red-100"
      : "bg-white";

  // ✅ 在 hasToken 尚未判定前，先不要渲染需要 auth 的內容（避免閃爍/誤導）
  if (hasToken === null) {
    return (
      <div className="rounded-2xl border bg-white p-6">
        準備中…
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="text-sm text-zinc-600">
          {profile ? `${profile.name}（${profile.studentId}）` : ""}
        </div>
        <div className="flex gap-2">
          <a className="rounded-xl border bg-white px-3 py-1.5 text-sm" href="/dashboard">
            個人介面
          </a>
          <button className="rounded-xl border bg-white px-3 py-1.5 text-sm" onClick={logout}>
            登出
          </button>
        </div>
      </div>

      {loading && <div className="rounded-2xl border bg-white p-6">載入題目中…</div>}

      {!loading && error && (
        <div className="rounded-2xl border bg-white p-6">
          <div className="text-red-700">{error}</div>
          <button className="mt-3 rounded-xl bg-zinc-900 px-4 py-2 text-white" onClick={loadQuiz}>
            重試
          </button>
        </div>
      )}

      {!loading && !error && questions.length === 0 && (
        <div className="rounded-2xl border bg-white p-6">
          <div className="text-lg font-semibold">題目已全部做完</div>
          <p className="mt-1 text-sm text-zinc-600">
            如果要重新出題，請到「個人介面」按進度重置。
          </p>
        </div>
      )}

      {!loading && !error && questions.length > 0 && !done && q && (
        <div className={`rounded-2xl border p-6 shadow-sm transition-colors ${bgClass}`}>
          <div className="flex items-center justify-between">
            <div className="text-sm text-zinc-600">
              第 {idx + 1} / {questions.length} 題
            </div>
            <div className="text-sm text-zinc-600">
              目前分數：{score} / {maxScore}
            </div>
          </div>

          <div className="mt-4 space-y-3">
            {q.type === "sentence" ? (
              <div className="space-y-2">
                {q.clozeTokens ? (
                  <ParticleText tokens={q.clozeTokens} />
                ) : (
                  <div className="text-lg leading-relaxed">{q.cloze}</div>
                )}
                {q.clozeZh && <div className="text-sm text-zinc-600">{q.clozeZh}</div>}
              </div>
            ) : (
              <div className="space-y-1">
                <div className="text-sm text-zinc-600">請輸入平假名答案：</div>
                <div className="text-lg">{q.answerZh}</div>
              </div>
            )}

            <div>
              <input
                className="mt-2 w-full rounded-xl border bg-white px-3 py-2 text-lg outline-none focus:ring"
                value={answer}
                onChange={(e) => setAnswer(e.target.value)}
                placeholder="輸入平假名"
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    if (!submitting) void submit();
                  }
                }}
                autoFocus
              />
              <button
                disabled={submitting}
                onClick={() => void submit()}
                className="mt-3 w-full rounded-xl bg-zinc-900 px-4 py-2.5 text-white disabled:opacity-50"
              >
                {submitting ? "送出中…" : "送出"}
              </button>
            </div>

            {lastResult && !lastResult.isCorrect && (
              <div className="rounded-xl bg-red-50 p-3 text-sm text-red-800">
                <div>❌ 答錯</div>
                <div className="mt-1">
                  正確答案（平假名）：<span className="font-semibold">{lastResult.correctKana}</span>
                </div>
                <div>中文：{lastResult.correctZh}</div>
                <div>單字原貌：{lastResult.wordOriginal}</div>
              </div>
            )}

            {lastResult && lastResult.isCorrect && (
              <div className="rounded-xl bg-green-50 p-3 text-sm text-green-800">
                ✅ 答對
                <div className="mt-1 text-green-900">單字原貌：{lastResult.wordOriginal}</div>
              </div>
            )}
          </div>
        </div>
      )}

      {!loading && !error && questions.length > 0 && done && (
        <div className="rounded-2xl border bg-white p-6 shadow-sm">
          <div className="text-lg font-semibold">本次測驗完成！</div>
          <div className="mt-2 text-sm text-zinc-600">
            分數：{score} / {maxScore}（{correctCount} 題正確）
          </div>
          <div className="mt-4 flex gap-2">
            <button className="rounded-xl bg-zinc-900 px-4 py-2 text-white" onClick={loadQuiz}>
              再測一次（不會出現已做過）
            </button>
            <a className="rounded-xl border bg-white px-4 py-2" href="/dashboard">
              去看個人介面
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
