'use client';
import { useUser, SignOutButton } from '@clerk/nextjs';
import { Clock, Mail, Phone } from 'lucide-react';

export default function PendingPage() {
  const { user } = useUser();
  return (
    <div className="ko-sans min-h-screen bg-stone-50 flex items-center justify-center p-8">
      <div className="max-w-md w-full">
        <div className="text-center mb-8">
          <div className="serif-ko text-3xl font-black text-slate-900 mb-2">JM-CARE</div>
          <div className="text-xs text-slate-500">종로엠스쿨 학생 종합관리 시스템</div>
        </div>
        <div className="bg-white rounded-2xl border border-stone-200 p-8 shadow-sm">
          <div className="flex items-center justify-center w-16 h-16 bg-amber-50 border-2 border-amber-200 rounded-full mx-auto mb-6">
            <Clock size={28} className="text-amber-600" />
          </div>
          <div className="text-center mb-6">
            <div className="serif-ko text-2xl font-bold text-slate-900 mb-2">가입 신청이 접수되었습니다</div>
            <div className="text-sm text-slate-600 leading-relaxed">
              {user?.fullName || user?.firstName || ''}님의 가입 신청을 받았습니다.<br />
              관리자 승인 후 이용 가능합니다.
            </div>
          </div>
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-5 mb-6">
            <div className="text-sm font-semibold text-amber-800 mb-3">승인 안내</div>
            <ul className="text-xs text-amber-700 space-y-1.5">
              <li>• 보통 1-2 영업일 내에 승인이 완료됩니다</li>
              <li>• 승인 완료 후 이메일로 안내드립니다</li>
              <li>• 승인 후 재로그인 시 해당 역할 페이지로 이동합니다</li>
            </ul>
          </div>
          <div className="border border-stone-200 rounded-xl p-5 mb-6">
            <div className="text-xs font-semibold text-slate-700 mb-3">담당자 연락처</div>
            <div className="space-y-2.5">
              <div className="flex items-center gap-3 text-sm text-slate-700">
                <Mail size={14} className="text-slate-400" />
                <span>admin@jmcare.kr</span>
              </div>
              <div className="flex items-center gap-3 text-sm text-slate-700">
                <Phone size={14} className="text-slate-400" />
                <span>031-000-0000</span>
              </div>
            </div>
          </div>
          <SignOutButton redirectUrl="/sign-in">
            <button className="w-full py-2.5 border border-stone-300 rounded-lg text-sm text-slate-600 hover:bg-stone-50 transition-colors">
              로그아웃
            </button>
          </SignOutButton>
        </div>
      </div>
    </div>
  );
}
