'use client';
import { useState, use } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, BarChart3 } from 'lucide-react';

export default function NewExamPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    name: '', date: '', fullName: '',
    korean: '', english: '', math: '', science: '',
  });
  const update = (k: string, v: string) => setForm(p => ({ ...p, [k]: v }));

  const avg = (['korean','english','math','science'] as const)
    .map(k => parseFloat(form[k]))
    .filter(n => !isNaN(n));
  const avgVal = avg.length > 0 ? (avg.reduce((a, b) => a + b, 0) / avg.length).toFixed(1) : '';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch(`/api/students/${id}/mock-exams`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name, date: form.date, fullName: form.fullName,
          korean: form.korean ? parseFloat(form.korean) : null,
          english: form.english ? parseFloat(form.english) : null,
          math: form.math ? parseFloat(form.math) : null,
          science: form.science ? parseFloat(form.science) : null,
          avg: avgVal ? parseFloat(avgVal) : null,
        }),
      });
      if (res.ok) router.back();
    } finally { setLoading(false); }
  };

  return (
    <div className="ko-sans max-w-xl mx-auto px-8 py-8">
      <div className="flex items-center gap-3 mb-8">
        <button onClick={() => router.back()} className="text-slate-500 hover:text-slate-900"><ArrowLeft size={18} /></button>
        <div>
          <div className="text-[11px] uppercase tracking-widest text-slate-500">New Exam</div>
          <div className="serif-ko text-2xl font-black text-slate-900">모의고사 점수 입력</div>
        </div>
      </div>
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="bg-white border border-stone-200 rounded-xl p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-slate-600 mb-1.5 block">회차명 <span className="text-red-500">*</span></label>
              <input value={form.name} onChange={e => update('name', e.target.value)} required placeholder="1차" className="w-full text-sm border border-stone-300 rounded-lg px-3 py-2.5" />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-600 mb-1.5 block">날짜 <span className="text-red-500">*</span></label>
              <input value={form.date} onChange={e => update('date', e.target.value)} required placeholder="2026.03.14" className="w-full text-sm border border-stone-300 rounded-lg px-3 py-2.5 num" />
            </div>
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-600 mb-1.5 block">시험 전체명</label>
            <input value={form.fullName} onChange={e => update('fullName', e.target.value)} placeholder="2026 3월 전국 학력평가" className="w-full text-sm border border-stone-300 rounded-lg px-3 py-2.5" />
          </div>
        </div>
        <div className="bg-white border border-stone-200 rounded-xl p-6">
          <div className="text-xs font-bold text-slate-700 mb-4">과목별 백분위 점수</div>
          <div className="grid grid-cols-2 gap-4">
            {[['korean','국어'],['english','영어'],['math','수학'],['science','과학']].map(([k, label]) => (
              <div key={k}>
                <label className="text-xs font-semibold text-slate-600 mb-1.5 block">{label}</label>
                <input type="number" min="0" max="100" value={form[k as keyof typeof form]} onChange={e => update(k, e.target.value)} placeholder="0–100" className="w-full text-sm border border-stone-300 rounded-lg px-3 py-2.5 num" />
              </div>
            ))}
          </div>
          {avgVal && (
            <div className="mt-4 pt-4 border-t border-stone-100 flex items-center gap-2">
              <BarChart3 size={13} className="text-slate-500" />
              <span className="text-xs text-slate-600">자동 평균: <span className="num font-bold text-slate-900">{avgVal}</span></span>
            </div>
          )}
        </div>
        <button type="submit" disabled={loading} className="w-full py-3 bg-slate-900 text-white rounded-xl font-semibold hover:bg-slate-800 disabled:opacity-50">
          {loading ? '저장 중...' : '저장'}
        </button>
      </form>
    </div>
  );
}
