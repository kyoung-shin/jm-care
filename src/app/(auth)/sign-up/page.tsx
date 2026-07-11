'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronRight } from 'lucide-react';

const ROLES = [
  { value: 'DIRECTOR', label: '원장', desc: '학원 전체 관리 및 학생 종합 현황 확인' },
  { value: 'INSTRUCTOR', label: '강사', desc: '담당 학생 관리 및 상담 기록 작성' },
  { value: 'PARENT', label: '학부모', desc: '자녀 학습 현황 및 상담 내용 확인' },
  { value: 'STUDENT', label: '학생', desc: '본인 성적 및 학습 현황 확인' },
];

interface Branch { id: string; name: string; }

type UsernameCheckStatus = 'idle' | 'checking' | 'available' | 'taken' | 'error';

export default function SignUpPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [branches, setBranches] = useState<Branch[]>([]);
  const [form, setForm] = useState({
    username: '',
    password: '',
    passwordConfirm: '',
    name: '',
    phone: '',
    email: '',
    branchId: '',
    requestedRole: '',
    reason: '',
  });
  const [usernameCheck, setUsernameCheck] = useState<UsernameCheckStatus>('idle');
  const [checkedUsername, setCheckedUsername] = useState('');

  useEffect(() => {
    fetch('/api/branches').then(r => r.json()).then(d => { if (Array.isArray(d)) setBranches(d); }).catch(() => {});
  }, []);

  const handleCheckUsername = async () => {
    if (form.username.length < 3) return;
    setUsernameCheck('checking');
    try {
      const res = await fetch(`/api/auth/check-username?username=${encodeURIComponent(form.username)}`);
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setUsernameCheck('error');
        return;
      }
      setCheckedUsername(form.username);
      setUsernameCheck(data.available ? 'available' : 'taken');
    } catch {
      setUsernameCheck('error');
    }
  };

  const usernameVerified = usernameCheck === 'available' && checkedUsername === form.username;

  const canSubmit =
    usernameVerified &&
    form.password.length >= 8 &&
    form.password === form.passwordConfirm &&
    !!form.name &&
    !!form.phone &&
    !!form.branchId &&
    !!form.requestedRole;

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setError('');
    setLoading(true);
    try {
      const res = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: form.username,
          password: form.password,
          name: form.name,
          phone: form.phone,
          email: form.email || undefined,
          branchId: form.branchId,
          requestedRole: form.requestedRole,
          reason: form.reason,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error || '가입 신청에 실패했습니다');
        setLoading(false);
        return;
      }
      router.push('/pending');
    } catch {
      setError('가입 신청에 실패했습니다');
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-stone-200 p-8 shadow-sm">
      <div className="serif-ko text-xl font-bold text-slate-900 mb-6">가입 신청</div>

      <div className="space-y-5">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-semibold text-slate-600 mb-1.5 block">아이디 <span className="text-red-500">*</span></label>
            <div className="flex gap-2">
              <input
                value={form.username}
                onChange={e => {
                  const value = e.target.value;
                  setForm(f => ({ ...f, username: value }));
                  setUsernameCheck('idle');
                }}
                className="flex-1 min-w-0 text-sm border border-stone-300 rounded-lg px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-slate-300"
                placeholder="3자 이상"
                autoComplete="username"
              />
              <button
                type="button"
                onClick={handleCheckUsername}
                disabled={form.username.length < 3 || usernameCheck === 'checking'}
                className="shrink-0 px-3 py-2.5 text-xs font-semibold border border-stone-300 rounded-lg text-slate-600 hover:bg-stone-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {usernameCheck === 'checking' ? '확인 중...' : '중복확인'}
              </button>
            </div>
            {usernameCheck === 'available' && (
              <div className="text-xs text-emerald-600 mt-1">사용 가능한 아이디입니다</div>
            )}
            {usernameCheck === 'taken' && (
              <div className="text-xs text-red-500 mt-1">이미 사용 중인 아이디입니다</div>
            )}
            {usernameCheck === 'error' && (
              <div className="text-xs text-red-500 mt-1">중복 확인에 실패했습니다. 다시 시도해 주세요</div>
            )}
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-600 mb-1.5 block">이름 <span className="text-red-500">*</span></label>
            <input
              value={form.name}
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              className="w-full text-sm border border-stone-300 rounded-lg px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-slate-300"
              placeholder="이름을 입력하세요"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-semibold text-slate-600 mb-1.5 block">비밀번호 <span className="text-red-500">*</span></label>
            <input
              type="password"
              value={form.password}
              onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
              className="w-full text-sm border border-stone-300 rounded-lg px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-slate-300"
              placeholder="8자 이상"
              autoComplete="new-password"
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-600 mb-1.5 block">비밀번호 확인 <span className="text-red-500">*</span></label>
            <input
              type="password"
              value={form.passwordConfirm}
              onChange={e => setForm(f => ({ ...f, passwordConfirm: e.target.value }))}
              className="w-full text-sm border border-stone-300 rounded-lg px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-slate-300"
              placeholder="비밀번호 재입력"
              autoComplete="new-password"
            />
            {form.passwordConfirm && form.password !== form.passwordConfirm && (
              <div className="text-xs text-red-500 mt-1">비밀번호가 일치하지 않습니다</div>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-semibold text-slate-600 mb-1.5 block">전화번호 <span className="text-red-500">*</span></label>
            <input
              value={form.phone}
              onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
              className="w-full text-sm border border-stone-300 rounded-lg px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-slate-300"
              placeholder="010-0000-0000"
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-600 mb-1.5 block">이메일 <span className="text-slate-400 font-normal">(선택)</span></label>
            <input
              type="email"
              value={form.email}
              onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
              className="w-full text-sm border border-stone-300 rounded-lg px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-slate-300"
              placeholder="example@jmcare.kr"
            />
          </div>
        </div>

        <div>
          <label className="text-xs font-semibold text-slate-600 mb-1.5 block">소속 지점 <span className="text-red-500">*</span></label>
          <select
            value={form.branchId}
            onChange={e => setForm(f => ({ ...f, branchId: e.target.value }))}
            className="w-full text-sm border border-stone-300 rounded-lg px-3 py-2.5 bg-white focus:outline-none focus:ring-2 focus:ring-slate-300"
          >
            <option value="">지점을 선택하세요</option>
            {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
          </select>
        </div>

        <div>
          <label className="text-xs font-semibold text-slate-600 mb-2 block">역할 선택 <span className="text-red-500">*</span></label>
          <div className="space-y-2">
            {ROLES.map(r => (
              <button
                key={r.value}
                type="button"
                onClick={() => setForm(f => ({ ...f, requestedRole: r.value }))}
                className={`w-full text-left p-4 rounded-xl border-2 transition-all ${
                  form.requestedRole === r.value
                    ? 'border-slate-900 bg-slate-50'
                    : 'border-stone-200 hover:border-slate-300'
                }`}
              >
                <div className="font-semibold text-slate-900 text-sm">{r.label}</div>
                <div className="text-xs text-slate-500 mt-0.5">{r.desc}</div>
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="text-xs font-semibold text-slate-600 mb-1.5 block">
            {form.requestedRole === 'PARENT' ? '자녀 정보' : form.requestedRole === 'STUDENT' ? '본인 학년/반 정보' : '가입 사유'} <span className="text-slate-400 font-normal">(선택)</span>
          </label>
          <textarea
            value={form.reason}
            onChange={e => setForm(f => ({ ...f, reason: e.target.value }))}
            className="w-full text-sm border border-stone-300 rounded-lg px-3 py-2.5 resize-none h-20 focus:outline-none focus:ring-2 focus:ring-slate-300"
            placeholder={
              form.requestedRole === 'PARENT'
                ? '자녀 이름과 학년을 입력해 주세요 (원장님이 승인 시 연결합니다)'
                : form.requestedRole === 'STUDENT'
                ? '이름과 학년을 다시 한 번 적어주시면 원장님이 승인 시 빠르게 확인할 수 있습니다'
                : '가입 사유를 입력해 주세요'
            }
          />
        </div>

        {error && <div className="text-xs text-red-600">{error}</div>}

        <button
          onClick={handleSubmit}
          disabled={!canSubmit || loading}
          className="w-full py-3 bg-slate-900 text-white rounded-xl font-semibold text-sm hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-colors"
        >
          {loading ? '처리 중...' : <><span>가입 신청하기</span><ChevronRight size={16} /></>}
        </button>

        <div className="text-center text-xs text-slate-500">
          이미 계정이 있으신가요? <a href="/sign-in" className="text-slate-900 font-semibold hover:underline">로그인</a>
        </div>
      </div>
    </div>
  );
}
