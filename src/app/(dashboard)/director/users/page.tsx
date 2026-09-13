'use client';
import RoleGuard from '@/components/RoleGuard';
import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Check, X, Search, UserPlus, RotateCcw, AlertCircle } from 'lucide-react';

interface PendingUser {
  id: string;
  userId: string;
  name: string;
  email?: string;
  phone?: string;
  requestedRole: string;
  reason?: string;
  status: string;
  createdAt: string;
}
interface Student {
  id: string;
  name: string;
  grade: string;
  school: string;
  loginUser?: { id: string; name: string } | null;
}

const ROLE_LABELS: Record<string, string> = { INSTRUCTOR: '강사', PARENT: '학부모', STUDENT: '학생' };

function DirectorUsersPage() {
  const [applications, setApplications] = useState<PendingUser[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [selected, setSelected] = useState<Record<string, string[]>>({});
  const [queries, setQueries] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState<Record<string, boolean>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [branchName, setBranchName] = useState<string | null>(null);

  const load = async () => {
    const me = await fetch('/api/auth/me').then(r => (r.ok ? r.json() : null)).catch(() => null);
    setBranchName(me?.branchName ?? null);
    const [p, s] = await Promise.all([
      fetch('/api/director/pending-users').then(r => (r.ok ? r.json() : [])).catch(() => []),
      me?.branchId
        ? fetch(`/api/students?branchId=${me.branchId}`).then(r => (r.ok ? r.json() : [])).catch(() => [])
        : Promise.resolve([]),
    ]);
    if (Array.isArray(p)) setApplications(p);
    if (Array.isArray(s)) setStudents(s);
  };

  useEffect(() => { load(); }, []);

  const pending = useMemo(() => applications.filter(a => a.status === 'PENDING'), [applications]);
  const rejected = useMemo(() => applications.filter(a => a.status === 'REJECTED'), [applications]);

  const toggleStudent = (userId: string, studentId: string, multi: boolean) => {
    setSelected(prev => {
      const current = prev[userId] ?? [];
      if (multi) {
        const next = current.includes(studentId) ? current.filter(id => id !== studentId) : [...current, studentId];
        return { ...prev, [userId]: next };
      }
      return { ...prev, [userId]: current.includes(studentId) ? [] : [studentId] };
    });
  };

  const run = async (p: PendingUser, action: 'approve' | 'reject') => {
    setLoading(l => ({ ...l, [p.userId]: true }));
    setErrors(e => ({ ...e, [p.userId]: '' }));
    try {
      const res = await fetch(`/api/director/users/${p.userId}/${action}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ studentIds: selected[p.userId] ?? [] }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setErrors(e => ({
          ...e,
          [p.userId]: data.error || (action === 'approve' ? '승인에 실패했습니다' : '거절에 실패했습니다'),
        }));
        return;
      }
      await load();
    } catch {
      setErrors(e => ({ ...e, [p.userId]: '네트워크 오류가 발생했습니다. 다시 시도해 주세요' }));
    } finally {
      setLoading(l => ({ ...l, [p.userId]: false }));
    }
  };

  const renderCard = (p: PendingUser) => {
    const needsLink = p.requestedRole === 'STUDENT' || p.requestedRole === 'PARENT';
    const isMulti = p.requestedRole === 'PARENT';
    const chosen = selected[p.userId] ?? [];
    const query = queries[p.userId] ?? '';
    const isRejected = p.status === 'REJECTED';
    const visible = students.filter(
      s => !query || s.name.includes(query) || (s.school ?? '').includes(query)
    );
    const error = errors[p.userId];

    return (
      <div
        key={p.id}
        className={`border rounded-xl p-5 ${isRejected ? 'bg-stone-50 border-stone-200' : 'bg-amber-50 border-amber-200'}`}
      >
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-4 flex-1 min-w-0">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center serif-ko font-bold shrink-0 ${isRejected ? 'bg-stone-200 text-slate-600' : 'bg-amber-200 text-amber-800'}`}>
              {p.name.charAt(0)}
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-semibold text-slate-900 flex items-center gap-2">
                {p.name}
                {isRejected && (
                  <span className="text-[10px] font-semibold text-slate-500 border border-stone-300 rounded px-1.5 py-0.5">거절됨</span>
                )}
              </div>
              <div className="text-xs text-slate-500">{p.email}{p.phone && ` · ${p.phone}`}</div>
              <div className={`text-xs mt-1 ${isRejected ? 'text-slate-500' : 'text-amber-700'}`}>
                신청 역할: {ROLE_LABELS[p.requestedRole] || p.requestedRole}{p.reason && ` · ${p.reason}`}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => run(p, 'approve')}
              disabled={loading[p.userId] || (needsLink && chosen.length === 0)}
              className="flex items-center gap-1 px-4 py-1.5 bg-emerald-600 text-white rounded-lg text-sm font-semibold hover:bg-emerald-700 disabled:opacity-50"
            >
              {isRejected ? <RotateCcw size={14} /> : <Check size={14} />} {isRejected ? '다시 승인' : '승인'}
            </button>
            {!isRejected && (
              <button
                onClick={() => run(p, 'reject')}
                disabled={loading[p.userId]}
                className="flex items-center gap-1 px-3 py-1.5 bg-white border border-stone-300 rounded-lg text-sm text-slate-600 hover:bg-stone-50 disabled:opacity-50"
              >
                <X size={14} /> 거절
              </button>
            )}
          </div>
        </div>

        {error && (
          <div className="mt-3 flex items-start gap-2 text-xs text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
            <AlertCircle size={13} className="mt-px shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {needsLink && (
          <div className={`mt-4 pt-4 border-t ${isRejected ? 'border-stone-200' : 'border-amber-200'}`}>
            <div className="flex items-center justify-between gap-3 mb-2">
              <div className="text-xs font-semibold text-slate-600">
                연결할 학생 {isMulti ? '(여러 명 선택 가능)' : '선택'}
                {chosen.length > 0 && <span className="text-emerald-700 ml-1.5">· {chosen.length}명 선택됨</span>}
              </div>
              {students.length > 0 && (
                <div className="relative w-52">
                  <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    value={query}
                    onChange={e => setQueries(q => ({ ...q, [p.userId]: e.target.value }))}
                    placeholder="이름 또는 학교 검색"
                    className="w-full text-xs bg-white border border-stone-300 rounded-lg pl-7 pr-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-slate-300"
                  />
                </div>
              )}
            </div>

            {students.length === 0 ? (
              <div className="text-xs text-slate-600 bg-white border border-stone-200 rounded-lg p-3.5">
                <div className="font-semibold text-slate-700 mb-1">
                  {branchName ? `${branchName}에` : '우리 지점에'} 등록된 학생이 없습니다
                </div>
                <div className="text-slate-500 mb-2.5">
                  학부모·학생 계정은 학생과 연결해야 승인할 수 있습니다. 먼저 학생을 등록해 주세요.
                </div>
                <Link
                  href="/students/new"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 text-white rounded-lg text-xs font-semibold hover:bg-slate-800"
                >
                  <UserPlus size={12} /> 학생 등록하러 가기
                </Link>
              </div>
            ) : visible.length === 0 ? (
              <div className="text-xs text-slate-400">&lsquo;{query}&rsquo; 검색 결과가 없습니다</div>
            ) : (
              <div className="flex flex-wrap gap-2 max-h-56 overflow-y-auto">
                {visible.map(s => {
                  const isChosen = chosen.includes(s.id);
                  // 학생 계정은 프로필 1개에 1계정만 연결할 수 있다
                  const claimed =
                    p.requestedRole === 'STUDENT' && !!s.loginUser && s.loginUser.id !== p.userId;
                  return (
                    <button
                      key={s.id}
                      onClick={() => toggleStudent(p.userId, s.id, isMulti)}
                      disabled={claimed}
                      title={claimed ? `이미 ${s.loginUser!.name} 계정에 연결된 학생입니다` : undefined}
                      className={`text-xs px-3 py-1.5 rounded-lg border transition-colors ${
                        claimed
                          ? 'border-stone-200 bg-stone-100 text-slate-400 cursor-not-allowed line-through'
                          : isChosen
                            ? 'border-slate-900 bg-slate-900 text-white'
                            : 'border-stone-300 bg-white text-slate-700 hover:border-slate-400'
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
  };

  return (
    <div className="ko-sans max-w-4xl mx-auto px-8 py-8">
      <div className="mb-7 border-b border-stone-200 pb-5">
        <div className="text-[11px] uppercase tracking-[0.2em] text-slate-500 mb-1.5">Approval Queue</div>
        <div className="serif-ko text-3xl font-black text-slate-900">가입 승인</div>
        <div className="text-sm text-slate-500 mt-1.5">
          {branchName ? `${branchName} ` : '우리 지점 '}강사·학부모·학생의 가입 신청을 승인합니다
        </div>
      </div>

      {pending.length === 0 ? (
        <div className="text-sm text-slate-400 py-12 text-center border border-dashed border-stone-300 rounded-xl">대기 중인 신청이 없습니다</div>
      ) : (
        <div className="space-y-3">{pending.map(renderCard)}</div>
      )}

      {rejected.length > 0 && (
        <div className="mt-10">
          <div className="text-xs font-bold text-slate-600 mb-1">거절한 신청 ({rejected.length})</div>
          <div className="text-xs text-slate-500 mb-3">
            거절된 신청자는 같은 아이디로 다시 신청할 수 없습니다. 잘못 거절했다면 여기서 다시 승인해 주세요.
          </div>
          <div className="space-y-3">{rejected.map(renderCard)}</div>
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
