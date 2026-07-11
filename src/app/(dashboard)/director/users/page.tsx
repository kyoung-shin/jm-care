'use client';
import RoleGuard from '@/components/RoleGuard';
import { useEffect, useState } from 'react';
import { Check, X } from 'lucide-react';

interface PendingUser { id: string; userId: string; name: string; email?: string; phone?: string; requestedRole: string; reason?: string; createdAt: string; }
interface Student { id: string; name: string; grade: string; school: string; }

const ROLE_LABELS: Record<string, string> = { INSTRUCTOR: '강사', PARENT: '학부모', STUDENT: '학생' };

function DirectorUsersPage() {
  const [pending, setPending] = useState<PendingUser[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [selected, setSelected] = useState<Record<string, string[]>>({});
  const [loading, setLoading] = useState<Record<string, boolean>>({});

  const load = async () => {
    const me = await fetch('/api/auth/me').then(r => r.json()).catch(() => null);
    const [p, s] = await Promise.all([
      fetch('/api/director/pending-users').then(r => r.json()),
      me?.branchId
        ? fetch(`/api/students?branchId=${me.branchId}`).then(r => r.json())
        : Promise.resolve([]),
    ]);
    if (Array.isArray(p)) setPending(p);
    if (Array.isArray(s)) setStudents(s);
  };

  useEffect(() => { load(); }, []);

  const toggleStudent = (userId: string, studentId: string, multi: boolean) => {
    setSelected(prev => {
      const current = prev[userId] ?? [];
      if (multi) {
        const next = current.includes(studentId) ? current.filter(id => id !== studentId) : [...current, studentId];
        return { ...prev, [userId]: next };
      }
      return { ...prev, [userId]: [studentId] };
    });
  };

  const approve = async (p: PendingUser) => {
    setLoading(l => ({ ...l, [p.userId]: true }));
    await fetch(`/api/director/users/${p.userId}/approve`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ studentIds: selected[p.userId] ?? [] }),
    });
    setLoading(l => ({ ...l, [p.userId]: false }));
    load();
  };

  const reject = async (p: PendingUser) => {
    setLoading(l => ({ ...l, [p.userId]: true }));
    await fetch(`/api/director/users/${p.userId}/reject`, { method: 'POST' });
    setLoading(l => ({ ...l, [p.userId]: false }));
    load();
  };

  return (
    <div className="ko-sans max-w-4xl mx-auto px-8 py-8">
      <div className="mb-7 border-b border-stone-200 pb-5">
        <div className="text-[11px] uppercase tracking-[0.2em] text-slate-500 mb-1.5">Approval Queue</div>
        <div className="serif-ko text-3xl font-black text-slate-900">가입 승인</div>
        <div className="text-sm text-slate-500 mt-1.5">우리 지점 강사·학부모·학생의 가입 신청을 승인합니다</div>
      </div>

      {pending.length === 0 ? (
        <div className="text-sm text-slate-400 py-12 text-center border border-dashed border-stone-300 rounded-xl">대기 중인 신청이 없습니다</div>
      ) : (
        <div className="space-y-3">
          {pending.map(p => {
            const needsLink = p.requestedRole === 'STUDENT' || p.requestedRole === 'PARENT';
            const isMulti = p.requestedRole === 'PARENT';
            const chosen = selected[p.userId] ?? [];
            return (
              <div key={p.id} className="bg-amber-50 border border-amber-200 rounded-xl p-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-4 flex-1 min-w-0">
                    <div className="w-10 h-10 rounded-full bg-amber-200 flex items-center justify-center serif-ko font-bold text-amber-800 shrink-0">
                      {p.name.charAt(0)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-slate-900">{p.name}</div>
                      <div className="text-xs text-slate-500">{p.email}{p.phone && ` · ${p.phone}`}</div>
                      <div className="text-xs text-amber-700 mt-1">신청 역할: {ROLE_LABELS[p.requestedRole] || p.requestedRole}{p.reason && ` · ${p.reason}`}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => approve(p)}
                      disabled={loading[p.userId] || (needsLink && chosen.length === 0)}
                      className="flex items-center gap-1 px-4 py-1.5 bg-emerald-600 text-white rounded-lg text-sm font-semibold hover:bg-emerald-700 disabled:opacity-50"
                    >
                      <Check size={14} /> 승인
                    </button>
                    <button
                      onClick={() => reject(p)}
                      disabled={loading[p.userId]}
                      className="flex items-center gap-1 px-3 py-1.5 bg-white border border-stone-300 rounded-lg text-sm text-slate-600 hover:bg-stone-50 disabled:opacity-50"
                    >
                      <X size={14} /> 거절
                    </button>
                  </div>
                </div>

                {needsLink && (
                  <div className="mt-4 pt-4 border-t border-amber-200">
                    <div className="text-xs font-semibold text-slate-600 mb-2">
                      연결할 학생 {isMulti ? '(여러 명 선택 가능)' : '선택'}
                    </div>
                    {students.length === 0 ? (
                      <div className="text-xs text-slate-400">등록된 학생이 없습니다</div>
                    ) : (
                      <div className="flex flex-wrap gap-2">
                        {students.map(s => {
                          const isChosen = chosen.includes(s.id);
                          return (
                            <button
                              key={s.id}
                              onClick={() => toggleStudent(p.userId, s.id, isMulti)}
                              className={`text-xs px-3 py-1.5 rounded-lg border transition-colors ${
                                isChosen ? 'border-slate-900 bg-slate-900 text-white' : 'border-stone-300 bg-white text-slate-700 hover:border-slate-400'
                              }`}
                            >
                              {s.name} · {s.grade} {s.school}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function DirectorUsersPageGuarded() {
  return (
    <RoleGuard allowed={['DIRECTOR']}>
      <DirectorUsersPage />
    </RoleGuard>
  );
}
