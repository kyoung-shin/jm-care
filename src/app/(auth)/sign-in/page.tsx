'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function SignInPage() {
  const router = useRouter();
  const [form, setForm] = useState({ username: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error || '로그인에 실패했습니다');
        setLoading(false);
        return;
      }
      router.push('/');
      router.refresh();
    } catch {
      setError('로그인에 실패했습니다');
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-stone-200 p-8 shadow-sm">
      <div className="serif-ko text-xl font-bold text-slate-900 mb-6">로그인</div>
      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label className="text-xs font-semibold text-slate-600 mb-1.5 block">아이디</label>
          <input
            value={form.username}
            onChange={e => setForm(f => ({ ...f, username: e.target.value }))}
            className="w-full text-sm border border-stone-300 rounded-lg px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-slate-300"
            placeholder="아이디를 입력하세요"
            autoComplete="username"
          />
        </div>
        <div>
          <label className="text-xs font-semibold text-slate-600 mb-1.5 block">비밀번호</label>
          <input
            type="password"
            value={form.password}
            onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
            className="w-full text-sm border border-stone-300 rounded-lg px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-slate-300"
            placeholder="비밀번호를 입력하세요"
            autoComplete="current-password"
          />
        </div>
        {error && <div className="text-xs text-red-600">{error}</div>}
        <button
          type="submit"
          disabled={!form.username || !form.password || loading}
          className="w-full py-3 bg-slate-900 text-white rounded-xl font-semibold text-sm hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {loading ? '로그인 중...' : '로그인'}
        </button>
        <div className="text-center text-xs text-slate-500">
          계정이 없으신가요? <a href="/sign-up" className="text-slate-900 font-semibold hover:underline">가입 신청</a>
        </div>
      </form>
    </div>
  );
}
