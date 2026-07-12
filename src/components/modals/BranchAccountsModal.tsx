'use client';

import { useEffect, useState } from 'react';
import { X, School, GraduationCap, Users, Trash2 } from 'lucide-react';

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

const DELETABLE_ROLES: Account['role'][] = ['DIRECTOR', 'INSTRUCTOR'];

export default function BranchAccountsModal({ branchId, branchName, onClose }: Props) {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [confirmTarget, setConfirmTarget] = useState<Account | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  useEffect(() => {
    fetch(`/api/admin/branches/${branchId}/accounts`)
      .then(r => r.json())
      .then(d => { if (Array.isArray(d)) setAccounts(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, [branchId]);

  const openConfirm = (a: Account) => {
    setDeleteError('');
    setConfirmTarget(a);
  };

  const confirmDelete = async () => {
    if (!confirmTarget) return;
    setDeleting(true);
    setDeleteError('');
    try {
      const res = await fetch(`/api/admin/users/${confirmTarget.id}`, { method: 'DELETE' });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setDeleteError(data.error || '삭제에 실패했습니다');
        setDeleting(false);
        return;
      }
      setAccounts(prev => prev.filter(a => a.id !== confirmTarget.id));
      setConfirmTarget(null);
      setDeleting(false);
    } catch {
      setDeleteError('삭제에 실패했습니다');
      setDeleting(false);
    }
  };

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
                          <div className="flex items-center gap-3">
                            <div className="text-[11px] text-slate-400">{a.email ?? ''}</div>
                            {DELETABLE_ROLES.includes(a.role) && (
                              <button
                                onClick={() => openConfirm(a)}
                                className="text-slate-400 hover:text-red-600 transition-colors"
                                title="계정 삭제"
                              >
                                <Trash2 size={14} />
                              </button>
                            )}
                          </div>
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

      {confirmTarget && (
        <div className="fixed inset-0 z-[60]">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => !deleting && setConfirmTarget(null)} />
          <div className="absolute inset-0 flex items-center justify-center p-6 pointer-events-none">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm pointer-events-auto overflow-hidden">
              <div className="p-6">
                <div className="serif-ko text-lg font-bold text-slate-900 mb-2">계정 삭제</div>
                <div className="text-sm text-slate-600">
                  <span className="font-semibold text-slate-900">{confirmTarget.name}</span>
                  {GROUPS.find(g => g.role === confirmTarget.role)?.label} 계정을 삭제하시겠습니까?
                  <br />이 작업은 되돌릴 수 없습니다.
                </div>
                {deleteError && <div className="text-xs text-red-600 mt-3">{deleteError}</div>}
              </div>
              <div className="flex gap-2 px-6 py-4 border-t border-stone-200 bg-stone-50">
                <button
                  onClick={() => setConfirmTarget(null)}
                  disabled={deleting}
                  className="flex-1 py-2 text-sm border border-stone-300 rounded-lg text-slate-600 hover:bg-stone-100 transition-colors disabled:opacity-50"
                >
                  취소
                </button>
                <button
                  onClick={confirmDelete}
                  disabled={deleting}
                  className="flex-1 py-2 text-sm bg-red-600 text-white rounded-lg font-semibold hover:bg-red-700 disabled:opacity-50 transition-colors"
                >
                  {deleting ? '삭제 중...' : '확인'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
