'use client';
import { useEffect, useState } from 'react';
import { Plus, Check, X } from 'lucide-react';

type BranchStatus = 'ACTIVE' | 'PREPARING' | 'CLOSING';

interface Branch { id: string; name: string; region: string | null; status: BranchStatus; _count?: { users: number; students: number }; }

const STATUS_LABELS: Record<BranchStatus, string> = { ACTIVE: '운영중', PREPARING: '준비중', CLOSING: '정리중' };
const STATUS_CLS: Record<BranchStatus, string> = {
  ACTIVE: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  PREPARING: 'bg-amber-50 text-amber-700 border-amber-200',
  CLOSING: 'bg-red-50 text-red-700 border-red-200',
};

export default function AdminBranchesPage() {
  const [branches, setBranches] = useState<Branch[]>([]);
  const [adding, setAdding] = useState(false);
  const [newName, setNewName] = useState('');
  const [newRegion, setNewRegion] = useState('');
  const [newStatus, setNewStatus] = useState<BranchStatus>('ACTIVE');

  const load = () => fetch('/api/admin/branches').then(r => r.json()).then(d => { if (Array.isArray(d)) setBranches(d); }).catch(() => {});
  useEffect(() => { load(); }, []);

  const addBranch = async () => {
    if (!newName.trim()) return;
    await fetch('/api/admin/branches', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newName, region: newRegion, status: newStatus }),
    });
    setNewName(''); setNewRegion(''); setNewStatus('ACTIVE'); setAdding(false); load();
  };

  const updateBranch = async (id: string, data: Partial<Pick<Branch, 'region' | 'status'>>) => {
    setBranches(bs => bs.map(b => (b.id === id ? { ...b, ...data } : b)));
    await fetch(`/api/admin/branches/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
  };

  return (
    <div className="ko-sans max-w-3xl mx-auto px-8 py-8">
      <div className="mb-7 flex items-end justify-between border-b border-stone-200 pb-5">
        <div>
          <div className="text-[11px] uppercase tracking-[0.2em] text-slate-500 mb-1.5">Branch Management</div>
          <div className="serif-ko text-3xl font-black text-slate-900">지점 관리</div>
        </div>
        <button onClick={() => setAdding(true)} className="flex items-center gap-1.5 px-4 py-2 bg-slate-900 text-white rounded-lg text-sm font-semibold hover:bg-slate-800">
          <Plus size={14} /> 지점 추가
        </button>
      </div>
      {adding && (
        <div className="bg-white border border-stone-200 rounded-xl p-4 mb-4 flex items-center gap-3">
          <input value={newName} onChange={e => setNewName(e.target.value)} placeholder="지점명" className="flex-1 text-sm border border-stone-300 rounded-lg px-3 py-2" autoFocus />
          <input value={newRegion} onChange={e => setNewRegion(e.target.value)} placeholder="지역 (예: 경기 파주)" className="flex-1 text-sm border border-stone-300 rounded-lg px-3 py-2" />
          <select value={newStatus} onChange={e => setNewStatus(e.target.value as BranchStatus)} className="text-sm border border-stone-300 rounded-lg px-3 py-2 bg-white">
            {(Object.keys(STATUS_LABELS) as BranchStatus[]).map(s => <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}
          </select>
          <button onClick={addBranch} className="p-2 text-emerald-600 hover:text-emerald-700"><Check size={16} /></button>
          <button onClick={() => setAdding(false)} className="p-2 text-slate-400 hover:text-slate-700"><X size={16} /></button>
        </div>
      )}
      <div className="space-y-3">
        {branches.map(b => (
          <div key={b.id} className="bg-white border border-stone-200 rounded-xl p-5 flex items-center justify-between gap-4">
            <div className="min-w-0">
              <div className="font-semibold text-slate-900">{b.name}</div>
              <div className="text-xs text-slate-500 mt-0.5 num">
                강사 {b._count?.users ?? 0}명 · 학생 {b._count?.students ?? 0}명
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <input
                defaultValue={b.region ?? ''}
                placeholder="지역"
                onBlur={e => { if (e.target.value !== (b.region ?? '')) updateBranch(b.id, { region: e.target.value }); }}
                className="w-32 text-xs border border-stone-300 rounded-lg px-2.5 py-1.5"
              />
              <select
                value={b.status}
                onChange={e => updateBranch(b.id, { status: e.target.value as BranchStatus })}
                className={`text-[11px] px-2 py-1.5 rounded-lg border font-semibold ${STATUS_CLS[b.status]}`}
              >
                {(Object.keys(STATUS_LABELS) as BranchStatus[]).map(s => <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}
              </select>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
