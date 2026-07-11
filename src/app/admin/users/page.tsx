'use client';
import { useEffect, useState } from 'react';
import { Check, X, ChevronDown } from 'lucide-react';

interface PendingUser { id: string; userId: string; name: string; email?: string; requestedRole: string; reason?: string; status: string; createdAt: string; branch?: { name: string }; }
interface User { id: string; name: string; email?: string; role: string; branch?: { name: string }; }

const ROLES = ['DIRECTOR', 'INSTRUCTOR', 'PARENT', 'STUDENT', 'ADMIN'];
const ROLE_LABELS: Record<string, string> = { DIRECTOR: '원장', INSTRUCTOR: '강사', PARENT: '학부모', STUDENT: '학생', ADMIN: '관리자', PENDING: '대기' };

export default function AdminUsersPage() {
  const [pending, setPending] = useState<PendingUser[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState<Record<string, boolean>>({});

  const load = async () => {
    const [p, u] = await Promise.all([
      fetch('/api/admin/pending-users').then(r => r.json()),
      fetch('/api/admin/users').then(r => r.json()),
    ]);
    if (Array.isArray(p)) setPending(p);
    if (Array.isArray(u)) setUsers(u);
  };

  useEffect(() => { load(); }, []);

  const approve = async (userId: string) => {
    setLoading(l => ({ ...l, [userId]: true }));
    await fetch(`/api/admin/users/${userId}/approve`, { method: 'POST' });
    setLoading(l => ({ ...l, [userId]: false }));
    load();
  };

  const reject = async (userId: string) => {
    setLoading(l => ({ ...l, [userId]: true }));
    await fetch(`/api/admin/users/${userId}/reject`, { method: 'POST' });
    setLoading(l => ({ ...l, [userId]: false }));
    load();
  };

  const changeRole = async (userId: string, role: string) => {
    await fetch('/api/admin/users', {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, role }),
    });
    load();
  };

  return (
    <div className="ko-sans max-w-6xl mx-auto px-8 py-8">
      <div className="mb-7 border-b border-stone-200 pb-5">
        <div className="text-[11px] uppercase tracking-[0.2em] text-slate-500 mb-1.5">User Management</div>
        <div className="serif-ko text-3xl font-black text-slate-900">회원 관리</div>
      </div>

      {pending.length > 0 && (
        <div className="mb-8">
          <div className="serif-ko text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
            <span className="inline-block w-2 h-2 rounded-full bg-amber-500"></span>
            원장 승인 대기 <span className="text-amber-600 num">({pending.length})</span>
          </div>
          <div className="space-y-3">
            {pending.map(p => (
              <div key={p.id} className="bg-amber-50 border border-amber-200 rounded-xl p-5 flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-amber-200 flex items-center justify-center serif-ko font-bold text-amber-800">
                  {p.name.charAt(0)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-slate-900">{p.name}</div>
                  <div className="text-xs text-slate-500">{p.email} · {p.branch?.name ?? '지점 미지정'}</div>
                  <div className="text-xs text-amber-700 mt-1">신청 역할: 원장{p.reason && ` · ${p.reason}`}</div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => approve(p.userId)}
                    disabled={loading[p.userId]}
                    className="flex items-center gap-1 px-4 py-1.5 bg-emerald-600 text-white rounded-lg text-sm font-semibold hover:bg-emerald-700 disabled:opacity-50"
                  >
                    <Check size={14} /> 승인
                  </button>
                  <button
                    onClick={() => reject(p.userId)}
                    disabled={loading[p.userId]}
                    className="flex items-center gap-1 px-3 py-1.5 bg-white border border-stone-300 rounded-lg text-sm text-slate-600 hover:bg-stone-50 disabled:opacity-50"
                  >
                    <X size={14} /> 거절
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div>
        <div className="serif-ko text-lg font-bold text-slate-900 mb-4">전체 회원 ({users.length})</div>
        <div className="bg-white border border-stone-200 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-stone-50 text-[11px] text-slate-600 border-b border-stone-200">
              <tr>
                <th className="px-4 py-3 text-left font-semibold">이름</th>
                <th className="px-4 py-3 text-left font-semibold">이메일</th>
                <th className="px-4 py-3 text-left font-semibold">지점</th>
                <th className="px-4 py-3 text-left font-semibold">역할</th>
              </tr>
            </thead>
            <tbody>
              {users.map(u => (
                <tr key={u.id} className="border-t border-stone-100 hover:bg-stone-50">
                  <td className="px-4 py-3 font-semibold text-slate-900">{u.name}</td>
                  <td className="px-4 py-3 text-slate-500">{u.email}</td>
                  <td className="px-4 py-3 text-slate-500">{u.branch?.name || '—'}</td>
                  <td className="px-4 py-3">
                    <select
                      value={u.role}
                      onChange={e => changeRole(u.id, e.target.value)}
                      className="text-xs border border-stone-300 rounded-lg px-2 py-1 bg-white"
                    >
                      {['PENDING', ...ROLES].map(r => <option key={r} value={r}>{ROLE_LABELS[r] || r}</option>)}
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
