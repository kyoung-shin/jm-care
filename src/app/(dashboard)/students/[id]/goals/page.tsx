'use client';
import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Target, BookOpen } from 'lucide-react';

interface GoalHistory { id: string; date: string; label: string; target: string; track: string; reason?: string; isCurrent: boolean; }

export default function GoalsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [histories, setHistories] = useState<GoalHistory[]>([]);
  const [form, setForm] = useState({
    finalGoalSchool: '', finalGoalDetail: '', finalGoalTrack: '',
    midGoalSchool: '', midGoalDetail: '', midGoalTrack: '',
    reason: '',
  });
  const update = (k: string, v: string) => setForm(p => ({ ...p, [k]: v }));

  useEffect(() => {
    fetch(`/api/students/${id}/goals`).then(r => r.json()).then(d => {
      if (Array.isArray(d)) setHistories(d);
    }).catch(() => {});
    fetch(`/api/students/${id}`).then(r => r.json()).then((s: any) => {
      if (s.id) setForm(f => ({
        ...f,
        finalGoalSchool: s.finalGoalSchool || '',
        finalGoalDetail: s.finalGoalDetail || '',
        finalGoalTrack: s.finalGoalTrack || '',
        midGoalSchool: s.midGoalSchool || '',
        midGoalDetail: s.midGoalDetail || '',
        midGoalTrack: s.midGoalTrack || '',
      }));
    }).catch(() => {});
  }, [id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch(`/api/students/${id}/goals`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      if (res.ok) {
        router.back();
      }
    } finally { setLoading(false); }
  };

  return (
    <div className="ko-sans max-w-2xl mx-auto px-8 py-8">
      <div className="flex items-center gap-3 mb-8">
        <button onClick={() => router.back()} className="text-slate-500 hover:text-slate-900"><ArrowLeft size={18} /></button>
        <div>
          <div className="text-[11px] uppercase tracking-widest text-slate-500">Goal Management</div>
          <div className="serif-ko text-2xl font-black text-slate-900">목표 관리</div>
        </div>
      </div>
      <div className="space-y-6">
        <form onSubmit={handleSubmit} className="bg-white border border-stone-200 rounded-xl p-6 space-y-5">
          <div className="flex items-center gap-2 mb-2"><Target size={14} className="text-amber-500" /><div className="font-bold text-slate-900">목표 수정</div></div>
          <div>
            <div className="text-[10px] text-amber-600 font-bold mb-2">최종 목표</div>
            <div className="grid grid-cols-3 gap-3">
              <input value={form.finalGoalSchool} onChange={e => update('finalGoalSchool', e.target.value)} className="text-sm border border-stone-300 rounded-lg px-3 py-2.5" placeholder="고려대학교" />
              <input value={form.finalGoalDetail} onChange={e => update('finalGoalDetail', e.target.value)} className="text-sm border border-stone-300 rounded-lg px-3 py-2.5" placeholder="공학계열 희망" />
              <input value={form.finalGoalTrack} onChange={e => update('finalGoalTrack', e.target.value)} className="text-sm border border-stone-300 rounded-lg px-3 py-2.5" placeholder="수시·정시 트랙" />
            </div>
          </div>
          <div>
            <div className="text-[10px] text-slate-500 font-bold mb-2">중간 목표</div>
            <div className="grid grid-cols-3 gap-3">
              <input value={form.midGoalSchool} onChange={e => update('midGoalSchool', e.target.value)} className="text-sm border border-stone-300 rounded-lg px-3 py-2.5" placeholder="일반고 상위권" />
              <input value={form.midGoalDetail} onChange={e => update('midGoalDetail', e.target.value)} className="text-sm border border-stone-300 rounded-lg px-3 py-2.5" placeholder="내신 1점대 진입" />
              <input value={form.midGoalTrack} onChange={e => update('midGoalTrack', e.target.value)} className="text-sm border border-stone-300 rounded-lg px-3 py-2.5" placeholder="고입 2027" />
            </div>
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-600 mb-1.5 block">변경 사유</label>
            <input value={form.reason} onChange={e => update('reason', e.target.value)} className="w-full text-sm border border-stone-300 rounded-lg px-3 py-2.5" placeholder="목표 변경 사유 (선택)" />
          </div>
          <button type="submit" disabled={loading} className="w-full py-3 bg-slate-900 text-white rounded-xl font-semibold hover:bg-slate-800 disabled:opacity-50">
            {loading ? '저장 중...' : '저장'}
          </button>
        </form>

        {histories.length > 0 && (
          <div className="bg-white border border-stone-200 rounded-xl p-6">
            <div className="flex items-center gap-2 mb-5"><BookOpen size={14} className="text-slate-700" /><div className="font-bold text-slate-900">목표 변경 히스토리</div></div>
            <div className="relative">
              <div className="absolute left-1.5 top-0 bottom-0 w-px bg-stone-200"></div>
              <div className="space-y-4">
                {histories.map((h, i) => (
                  <div key={h.id} className="flex gap-4 pl-6 relative">
                    <div className={`absolute left-0 top-1 w-3 h-3 rounded-full border-2 ${h.isCurrent ? 'bg-amber-400 border-slate-900' : 'bg-white border-slate-400'}`}></div>
                    <div className="flex-1 min-w-0">
                      <div className="text-[11px] text-slate-500 num font-semibold">{h.date}</div>
                      <div className="text-sm font-bold text-slate-900 mt-0.5">{h.target}</div>
                      <div className="text-xs text-slate-500">{h.track}</div>
                      {h.reason && <div className="text-[11px] text-slate-500 mt-1 border-l-2 border-stone-200 pl-2">{h.reason}</div>}
                    </div>
                    {h.isCurrent && <div className="text-[10px] px-2 py-0.5 bg-amber-100 text-amber-700 font-bold rounded-full self-start">현재</div>}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
