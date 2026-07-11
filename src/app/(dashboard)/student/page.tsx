'use client';
import RoleGuard from '@/components/RoleGuard';
import { Sparkles } from 'lucide-react';

export default function StudentPage() {
  return (
    <RoleGuard allowed={['STUDENT']}>
      <div className="max-w-2xl mx-auto px-8 py-24 text-center">
        <Sparkles size={28} className="text-amber-500 mx-auto mb-4" />
        <div className="serif-ko text-2xl font-bold text-slate-900 mb-2">학생용 화면 준비 중입니다</div>
        <div className="text-sm text-slate-500">본인 성적 및 학습 현황 확인 기능은 곧 제공될 예정입니다.</div>
      </div>
    </RoleGuard>
  );
}
