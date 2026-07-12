'use client';

import { useEffect, useState } from 'react';
import { X, School, GraduationCap, Users } from 'lucide-react';

interface Account {
  id: string;
  name: string;
  username: string | null;
  email: string | null;
  phone: string | null;
  role: 'DIRECTOR' | 'INSTRUCTOR' | 'PARENT';
  createdAt: string;
}

interface Props {
  branchId: string;
  branchName: string;
  onClose: () => void;
}

const GROUPS: { role: Account['role']; label: string; icon: typeof School }[] = [
  { role: 'DIRECTOR', label: '원장', icon: School },
  { role: 'INSTRUCTOR', label: '강사', icon: GraduationCap },
  { role: 'PARENT', label: '학부모', icon: Users },
];

export default function BranchAccountsModal({ branchId, branchName, onClose }: Props) {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/admin/branches/${branchId}/accounts`)
      .then(r => r.json())
      .then(d => { if (Array.isArray(d)) setAccounts(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, [branchId]);

  return (
    <div className="fixed inset-0 z-50 ko-sans">
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={onClose} />
      <div className="absolute inset-0 flex items-center justify-center p-6 pointer-events-none">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl max-h-[85vh] flex flex-col pointer-events-auto overflow-hidden">
          <div className="flex items-center justify-between px-6 py-4 border-b border-stone-200 bg-stone-50 shrink-0">
            <div>
              <div className="serif-ko text-lg font-bold text-slate-900">{branchName} · 계정 관리</div>
              <div className="text-xs text-slate-500">원장 · 강사 · 학부모 계정 현황</div>
            </div>
            <button onClick={onClose} className="text-slate-400 hover:text-slate-700"><X size={20} /></button>
          </div>

          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {loading && <div className="text-sm text-slate-400 text-center py-8">불러오는 중...</div>}
            {!loading && GROUPS.map(g => {
              const items = accounts.filter(a => a.role === g.role);
              const Icon = g.icon;
              return (
                <div key={g.role}>
                  <div className="flex items-center gap-2 mb-2.5">
                    <Icon size={14} className="text-violet-600" />
                    <div className="text-sm font-bold text-slate-900">{g.label}</div>
                    <div className="text-xs text-slate-400 num">({items.length})</div>
                  </div>
                  {items.length === 0 ? (
                    <div className="text-xs text-slate-400 pl-6 pb-2">등록된 {g.label} 계정이 없습니다</div>
                  ) : (
                    <div className="space-y-1.5">
                      {items.map(a => (
                        <div key={a.id} className="bg-stone-50 border border-stone-200 rounded-lg px-4 py-2.5 flex items-center justify-between">
                          <div>
                            <div className="text-sm font-semibold text-slate-900">{a.name}</div>
                            <div className="text-[11px] text-slate-500">아이디 {a.username ?? '—'} {a.phone && `· ${a.phone}`}</div>
                          </div>
                          <div className="text-[11px] text-slate-400">{a.email ?? ''}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
