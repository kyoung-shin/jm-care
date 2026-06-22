'use client';
import { useEffect, useState } from 'react';
import { Plus, Check, X } from 'lucide-react';

interface Branch { id: string; name: string; _count?: { users: number; students: number }; }

export default function AdminBranchesPage() {
  const [branches, setBranches] = useState<Branch[]>([]);
  const [newName, setNewName] = useState('');
  const [adding, setAdding] = useState(false);

  const load = () => fetch('/api/admin/branches').then(r => r.json()).then(d => { if (Array.isArray(d)) setBranches(d); }).catch(() => {});
  useEffect(() => { load(); }, []);

  const addBranch = async () => {
    if (!newName.trim()) return;
    await fetch('/api/admin/branches', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: newName }) });
    setNewName(''); setAdding(false); load();
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
          <button onClick={addBranch} className="p-2 text-emerald-600 hover:text-emerald-700"><Check size={16} /></button>
          <button onClick={() => setAdding(false)} className="p-2 text-slate-400 hover:text-slate-700"><X size={16} /></button>
        </div>
      )}
      <div className="space-y-3">
        {branches.map(b => (
          <div key={b.id} className="bg-white border border-stone-200 rounded-xl p-5 flex items-center justify-between">
            <div>
              <div className="font-semibold text-slate-900">{b.name}</div>
              <div className="text-xs text-slate-500 mt-0.5 num">
                강사 {b._count?.users ?? 0}명 · 학생 {b._count?.students ?? 0}명
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
