'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { setProfile, setToken } from '@/lib/auth';

export default function LoginPage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [studentId, setStudentId] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const r = await api.login(name, studentId);
      setToken(r.token);
      setProfile({ name: r.name, studentId: r.studentId });
      router.push('/quiz');
    } catch (err: any) {
      setError(err?.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-md">
      <div className="rounded-2xl bg-white p-6 shadow-sm border">
        <h1 className="text-xl font-semibold">登入</h1>
        <p className="mt-1 text-sm text-zinc-600">用「本名 + 學號」作為帳號/密碼。</p>

        <form className="mt-6 space-y-4" onSubmit={onSubmit}>
          <div>
            <label className="block text-sm font-medium">本名</label>
            <input
              className="mt-1 w-full rounded-xl border px-3 py-2 outline-none focus:ring"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="例如：簡宜芳"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium">學號</label>
            <input
              className="mt-1 w-full rounded-xl border px-3 py-2 outline-none focus:ring"
              value={studentId}
              onChange={(e) => setStudentId(e.target.value)}
              placeholder="例如：410123456"
              required
            />
          </div>

          {error && <div className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-zinc-900 px-4 py-2.5 text-white disabled:opacity-50"
          >
            {loading ? '登入中…' : '開始'}
          </button>
        </form>

        <div className="mt-4 text-xs text-zinc-500">
          進度與錯題會綁定在這組登入資訊。
        </div>
      </div>
    </div>
  );
}
