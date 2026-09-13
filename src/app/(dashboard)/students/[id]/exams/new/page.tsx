'use client';
import { useState, use, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, BarChart3 } from 'lucide-react';
import { subjectsForGrade, averageOfSubjects, type SubjectField } from '@/lib/subjects';

export default function NewExamPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [grade, setGrade] = useState<string | null>(null);
  const [studentName, setStudentName] = useState('');
  const [form, setForm] = useState<Record<string, string>>({
    name: '', date: '', fullName: '',
    korean: '', english: '', math: '', social: '', science: '',
  });
  const update = (k: string, v: string) => setForm(p => ({ ...p, [k]: v }));

  // 학년에 따라 입력 과목이 달라진다 (초·중 5과목 / 고 4과목)
  useEffect(() => {
    fetch(`/api/students/${id}`).then(r => r.json()).then(d => {
      if (!d?.error) { setGrade(d.grade ?? null); setStudentName(d.name ?? ''); }
    }).catch(() => {});
  }, [id]);

  const subjects = subjectsForGrade(grade);
  const scores = Object.fromEntries(
    subjects.map(s => [s.field, form[s.field] ? parseFloat(form[s.field]) : null])
  ) as Partial<Record<SubjectField, number | null>>;
  const avgVal = averageOfSubjects(scores, grade);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch(`/api/students/${id}/mock-exams`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name, date: form.date, fullName: form.fullName,
          // 해당 학년에서 쓰지 않는 과목은 null 로 비워 둔다
          korean: scores.korean ?? null,
          english: scores.english ?? null,
          math: scores.math ?? null,
          social: scores.social ?? null,
          science: scores.science ?? null,
          avg: avgVal,
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
          <div className="flex items-baseline justify-between mb-4">
            <div className="text-xs font-bold text-slate-700">과목별 백분위 점수</div>
            <div className="text-[11px] text-slate-500">
              {grade ? `${studentName ? studentName + ' · ' : ''}${grade} 과정 ${subjects.length}과목` : '학년 확인 중...'}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            {subjects.map(s => (
              <div key={s.field}>
                <label className="text-xs font-semibold text-slate-600 mb-1.5 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full" style={{ background: s.color }} />
                  {s.label}
                </label>
                <input type="number" min="0" max="100" value={form[s.field]} onChange={e => update(s.field, e.target.value)} placeholder="0–100" className="w-full text-sm border border-stone-300 rounded-lg px-3 py-2.5 num" />
              </div>
            ))}
          </div>
          {avgVal !== null && (
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
