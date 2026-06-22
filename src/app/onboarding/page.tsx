'use client';
import { useState, useEffect } from 'react';
import { useUser, useAuth } from '@clerk/nextjs';
import { useRouter } from 'next/navigation';
import { Sparkles, ChevronRight } from 'lucide-react';

const ROLES = [
  { value: 'DIRECTOR', label: '원장', desc: '학원 전체 관리 및 학생 종합 현황 확인' },
  { value: 'INSTRUCTOR', label: '강사', desc: '담당 학생 관리 및 상담 기록 작성' },
  { value: 'PARENT', label: '학부모', desc: '자녀 학습 현황 및 상담 내용 확인' },
];

export default function OnboardingPage() {
  const { user, isLoaded } = useUser();
  const { getToken } = useAuth();
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    name: '',
    requestedRole: '',
    reason: '',
  });

  useEffect(() => {
    if (isLoaded && user) {
      setForm(f => ({ ...f, name: user.fullName || user.firstName || '' }));
    }
  }, [isLoaded, user]);

  const handleSubmit = async () => {
    if (!form.requestedRole) return;
    setLoading(true);
    try {
      await fetch('/api/auth/onboarding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name,
          email: user?.primaryEmailAddress?.emailAddress || '',
          requestedRole: form.requestedRole,
          reason: form.reason,
        }),
      });
      router.push('/pending');
    } catch {
      setLoading(false);
    }
  };

  if (!isLoaded) return null;

  return (
    <div className="ko-sans min-h-screen bg-stone-50 flex items-center justify-center p-8">
      <div className="max-w-lg w-full">
        <div className="text-center mb-8">
          <div className="serif-ko text-3xl font-black text-slate-900 mb-2">JM-CARE</div>
          <div className="text-xs text-slate-500">추가 정보를 입력해 주세요</div>
        </div>
        <div className="bg-white rounded-2xl border border-stone-200 p-8 shadow-sm">
          <div className="flex items-center gap-2 mb-6">
            <Sparkles size={16} className="text-amber-500" />
            <div className="serif-ko text-xl font-bold text-slate-900">가입 신청</div>
          </div>

          <div className="space-y-5">
            <div>
              <label className="text-xs font-semibold text-slate-600 mb-1.5 block">이름</label>
              <input
                value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                className="w-full text-sm border border-stone-300 rounded-lg px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-slate-300"
                placeholder="이름을 입력하세요"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-600 mb-2 block">역할 선택 <span className="text-red-500">*</span></label>
              <div className="space-y-2">
                {ROLES.map(r => (
                  <button
                    key={r.value}
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
              <label className="text-xs font-semibold text-slate-600 mb-1.5 block">가입 사유 <span className="text-slate-400 font-normal">(선택)</span></label>
              <textarea
                value={form.reason}
                onChange={e => setForm(f => ({ ...f, reason: e.target.value }))}
                className="w-full text-sm border border-stone-300 rounded-lg px-3 py-2.5 resize-none h-20 focus:outline-none focus:ring-2 focus:ring-slate-300"
                placeholder="가입 사유나 소속 지점을 입력해 주세요"
              />
            </div>

            <button
              onClick={handleSubmit}
              disabled={!form.requestedRole || !form.name || loading}
              className="w-full py-3 bg-slate-900 text-white rounded-xl font-semibold text-sm hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-colors"
            >
              {loading ? '처리 중...' : <><span>가입 신청하기</span><ChevronRight size={16} /></>}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
