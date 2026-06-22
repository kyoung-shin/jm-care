'use client';
import { useState, use } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, MessageSquare, ShieldCheck, Heart, Inbox } from 'lucide-react';

export default function NewCounselingPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const today = new Date().toLocaleDateString('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit' }).replace(/\. /g, '.').replace(/\.$/, '');
  const [form, setForm] = useState({
    date: today, type: '정기상담', topic: '학습',
    summary: '', internalMemo: '', parentShare: '',
    actionName: '', actionOwner: '', actionDeadline: '',
  });
  const update = (k: string, v: string) => setForm(p => ({ ...p, [k]: v }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.summary.trim()) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/students/${id}/counselings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date: form.date, type: form.type, topic: form.topic,
          summary: form.summary, internalMemo: form.internalMemo || null,
          parentShare: form.parentShare || null,
          actionName: form.actionName || null,
          actionOwner: form.actionOwner || null,
          actionDeadline: form.actionDeadline || null,
          actionStatus: 'in-progress',
        }),
      });
      if (res.ok) router.back();
    } finally { setLoading(false); }
  };

  return (
    <div className="ko-sans max-w-2xl mx-auto px-8 py-8">
      <div className="flex items-center gap-3 mb-8">
        <button onClick={() => router.back()} className="text-slate-500 hover:text-slate-900"><ArrowLeft size={18} /></button>
        <div>
          <div className="text-[11px] uppercase tracking-widest text-slate-500">New Counseling</div>
          <div className="serif-ko text-2xl font-black text-slate-900">상담 기록 작성</div>
        </div>
      </div>
      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="bg-white border border-stone-200 rounded-xl p-6 space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="text-xs font-semibold text-slate-600 mb-1.5 block">상담일</label>
              <input value={form.date} onChange={e => update('date', e.target.value)} className="w-full text-sm border border-stone-300 rounded-lg px-3 py-2.5 num" />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-600 mb-1.5 block">유형</label>
              <select value={form.type} onChange={e => update('type', e.target.value)} className="w-full text-sm border border-stone-300 rounded-lg px-3 py-2.5 bg-white">
                <option>정기상담</option><option>수시상담</option><option>진로상담</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-600 mb-1.5 block">주제</label>
              <select value={form.topic} onChange={e => update('topic', e.target.value)} className="w-full text-sm border border-stone-300 rounded-lg px-3 py-2.5 bg-white">
                <option>학습</option><option>진로</option><option>생활·태도</option><option>학부모 요청</option>
              </select>
            </div>
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-600 mb-1.5 block">상담 내용 <span className="text-red-500">*</span></label>
            <textarea value={form.summary} onChange={e => update('summary', e.target.value)} required className="w-full min-h-[100px] text-sm border border-stone-300 rounded-lg px-3 py-2.5 resize-y leading-relaxed" placeholder="상담에서 논의된 내용을 입력하세요." />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-slate-600 mb-1.5 flex items-center gap-1">
                <ShieldCheck size={11} className="text-slate-400" /> 내부 메모 <span className="text-slate-400 font-normal">(비공개)</span>
              </label>
              <textarea value={form.internalMemo} onChange={e => update('internalMemo', e.target.value)} className="w-full min-h-[80px] text-sm border border-stone-300 rounded-lg px-3 py-2.5 resize-y bg-slate-50/50" placeholder="내부 전략·관찰 메모" />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-600 mb-1.5 flex items-center gap-1">
                <Heart size={11} className="text-amber-500" /> 학부모 공유 요약
              </label>
              <textarea value={form.parentShare} onChange={e => update('parentShare', e.target.value)} className="w-full min-h-[80px] text-sm border border-stone-300 rounded-lg px-3 py-2.5 resize-y bg-amber-50/30" placeholder="학부모에게 공유될 요약" />
            </div>
          </div>
        </div>
        <div className="bg-white border border-stone-200 rounded-xl p-6">
          <div className="text-xs font-bold text-slate-700 mb-3 flex items-center gap-1.5"><Inbox size={12} /> 액션플랜</div>
          <div className="space-y-3">
            <input value={form.actionName} onChange={e => update('actionName', e.target.value)} className="w-full text-sm border border-stone-300 rounded-lg px-3 py-2.5" placeholder="예: 국어 독해 기초반 주 2회 시작" />
            <div className="grid grid-cols-2 gap-3">
              <input value={form.actionOwner} onChange={e => update('actionOwner', e.target.value)} className="w-full text-sm border border-stone-300 rounded-lg px-3 py-2.5" placeholder="담당 강사" />
              <input value={form.actionDeadline} onChange={e => update('actionDeadline', e.target.value)} className="w-full text-sm border border-stone-300 rounded-lg px-3 py-2.5 num" placeholder="기한 2026.05.31" />
            </div>
          </div>
        </div>
        <button type="submit" disabled={loading} className="w-full py-3 bg-slate-900 text-white rounded-xl font-semibold flex items-center justify-center gap-2 hover:bg-slate-800 disabled:opacity-50">
          <MessageSquare size={16} /> {loading ? '저장 중...' : '상담 기록 저장'}
        </button>
      </form>
    </div>
  );
}
