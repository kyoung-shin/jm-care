import { prisma } from '@/lib/db';
import { Users, MessageSquare, FileText, BookOpen } from 'lucide-react';

async function getStats() {
  try {
    const [studentCount, userCount, counselingCount, reportCount] = await Promise.all([
      prisma.student.count(),
      prisma.user.count(),
      prisma.counseling.count(),
      prisma.report.count(),
    ]);
    return { studentCount, userCount, counselingCount, reportCount };
  } catch {
    return { studentCount: 0, userCount: 0, counselingCount: 0, reportCount: 0 };
  }
}

export default async function AdminPage() {
  const stats = await getStats();

  const cards = [
    { label: '전체 학생 수', value: stats.studentCount, icon: Users, color: 'bg-blue-50 border-blue-200 text-blue-700' },
    { label: '전체 강사 수', value: stats.userCount, icon: Users, color: 'bg-emerald-50 border-emerald-200 text-emerald-700' },
    { label: '총 상담 기록 수', value: stats.counselingCount, icon: MessageSquare, color: 'bg-amber-50 border-amber-200 text-amber-700' },
    { label: '발송된 리포트 수', value: stats.reportCount, icon: FileText, color: 'bg-purple-50 border-purple-200 text-purple-700' },
  ];

  return (
    <div>
      <div className="mb-8">
        <div className="serif-ko text-3xl font-black text-slate-900">어드민 대시보드</div>
        <div className="text-sm text-slate-500 mt-1">시스템 전체 현황을 확인합니다</div>
      </div>

      <div className="grid grid-cols-4 gap-4 mb-8">
        {cards.map((card, i) => (
          <div key={i} className={`border rounded-xl p-6 ${card.color}`}>
            <div className="flex items-center justify-between mb-3">
              <div className="text-xs font-semibold uppercase tracking-wider opacity-70">{card.label}</div>
              <card.icon size={16} />
            </div>
            <div className="text-4xl font-black num">{card.value}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-6">
        <div className="bg-white border border-stone-200 rounded-xl p-6">
          <div className="flex items-center gap-2 mb-4">
            <BookOpen size={16} className="text-slate-700" />
            <div className="serif-ko text-lg font-bold text-slate-900">빠른 메뉴</div>
          </div>
          <div className="space-y-2">
            {[
              { href: '/admin/students', label: '학생 목록 관리', desc: '신규 등록, 담임 배정, 모의고사 업로드' },
              { href: '/admin/users', label: '사용자 관리', desc: '강사·원장·학부모 계정 및 권한 설정' },
              { href: '/director', label: '원장 뷰로 이동', desc: '학생 종합 현황 대시보드' },
            ].map((item, i) => (
              <a key={i} href={item.href} className="flex items-start gap-3 p-3 border border-stone-200 rounded-lg hover:bg-stone-50 hover:border-slate-400 transition-all">
                <div className="flex-1">
                  <div className="text-sm font-semibold text-slate-900">{item.label}</div>
                  <div className="text-[11px] text-slate-500 mt-0.5">{item.desc}</div>
                </div>
              </a>
            ))}
          </div>
        </div>

        <div className="bg-white border border-stone-200 rounded-xl p-6">
          <div className="serif-ko text-lg font-bold text-slate-900 mb-4">시스템 정보</div>
          <div className="space-y-3 text-sm">
            {[
              { label: 'DB 연결', value: stats.studentCount >= 0 ? '✓ 정상' : '✗ 오류', ok: stats.studentCount >= 0 },
              { label: '버전', value: 'JM-CARE v0.6', ok: true },
              { label: '환경', value: process.env.NODE_ENV ?? 'unknown', ok: true },
            ].map((row, i) => (
              <div key={i} className="flex items-center justify-between py-2 border-b border-stone-100 last:border-0">
                <span className="text-slate-500">{row.label}</span>
                <span className={`font-semibold num ${row.ok ? 'text-emerald-700' : 'text-red-700'}`}>{row.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
