"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { clearAuth, getProfile, getToken } from "@/lib/auth";

type Profile = {
  name: string;
  studentId: string;
};

type Summary = {
  total: number;
  done: number;
  remaining: number;
  wrongUnresolved: number;
};

export default function DashboardPage() {
  const router = useRouter();

  // ✅ 避免 render 階段碰 localStorage：改用 state + useEffect
  const [profile, setProfile] = useState<Profile | null>(null);
  const [hasToken, setHasToken] = useState<boolean | null>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [summary, setSummary] = useState<Summary | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const s = await api.summary();
      setSummary(s);
    } catch (e: any) {
      setError(e?.message || "載入失敗");
    } finally {
      setLoading(false);
    }
  }

  // ✅ 只在瀏覽器端 mount 後讀 token/profile
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

      void load();
    } catch {
      setHasToken(false);
      router.replace("/login");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function logout() {
    clearAuth();
    router.replace("/login");
  }

  async function doReset() {
    if (!confirm("確定要重置進度與錯題嗎？（重置後題目會重新出現）")) return;
    try {
      await api.reset();
      await load();
      alert("已重置");
    } catch (e: any) {
      alert(e?.message || "重置失敗");
    }
  }

  async function downloadPdf() {
    try {
      // ✅ 這裡也避免直接在 render 期間取 token（現在只會在點擊時執行，OK）
      const token = getToken();
      const r = await fetch(api.wrongPdfUrl(), {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!r.ok) throw new Error("下載失敗");
      const blob = await r.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `wrong-questions-${profile?.studentId || ""}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (e: any) {
      alert(e?.message || "下載失敗");
    }
  }

  const progressPct = summary ? Math.round((summary.done / Math.max(1, summary.total)) * 100) : 0;

  // ✅ token 還沒判定前先給個 loading，避免閃爍/誤導
  if (hasToken === null) {
    return <div className="rounded-2xl border bg-white p-6">準備中…</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="text-sm text-zinc-600">
          {profile ? `${profile.name}（${profile.studentId}）` : ""}
        </div>
        <div className="flex gap-2">
          <a className="rounded-xl border bg-white px-3 py-1.5 text-sm" href="/quiz">
            開始測驗
          </a>
          <button className="rounded-xl border bg-white px-3 py-1.5 text-sm" onClick={logout}>
            登出
          </button>
        </div>
      </div>

      <div className="rounded-2xl border bg-white p-6 shadow-sm">
        <h1 className="text-xl font-semibold">個人介面</h1>

        {loading && <div className="mt-4 text-sm text-zinc-600">載入中…</div>}
        {!loading && error && <div className="mt-4 text-sm text-red-700">{error}</div>}

        {!loading && summary && (
          <div className="mt-4 space-y-4">
            <div>
              <div className="text-sm text-zinc-600">總答題進度</div>
              <div className="mt-1 text-lg font-semibold">
                {summary.done} / {summary.total}（{progressPct}%）
              </div>
              <div className="mt-2 h-2 w-full rounded-full bg-zinc-100">
                <div className="h-2 rounded-full bg-zinc-900" style={{ width: `${progressPct}%` }} />
              </div>
              <div className="mt-2 text-sm text-zinc-600">剩餘未出題：{summary.remaining}</div>
            </div>

            <div className="rounded-xl border bg-zinc-50 p-4">
              <div className="text-sm text-zinc-600">未解決錯題</div>
              <div className="mt-1 text-lg font-semibold">{summary.wrongUnresolved}</div>
              <div className="mt-3 flex flex-wrap gap-2">
                <button className="rounded-xl bg-zinc-900 px-4 py-2 text-white" onClick={downloadPdf}>
                  匯出錯題 PDF
                </button>
                <button className="rounded-xl border bg-white px-4 py-2" onClick={doReset}>
                  進度重置
                </button>
              </div>
              <div className="mt-2 text-xs text-zinc-500">
                PDF 若出現亂碼，請在 API 端設定 CJK 字型（見 api/README）。
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
