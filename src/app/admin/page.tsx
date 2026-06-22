'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Users, BookOpen, Clock, MessageSquare, ChevronRight } from 'lucide-react';

interface Stats { students: number; instructors: number; pendingCount: number; recentCounselings: any[]; recentPending: any[]; }

export default function AdminPage() {
  const [stats, setStats] = useState<Stats | null>(null);

  useEffect(() => {
    fetch('/api/admin/stats').then(r => r.json()).then(d => {
      if (d.students !== undefined) setStats(d);
    }).catch(() => {});
  }, []);

  const s = stats ?? { students: 0, instructors: 0, pendingCount: 0, recentCounselings: [], recentPending: [] };

  return (
    <div className="ko-sans max-w-7xl mx-auto px-8 py-8">
      <div className="mb-7 border-b border-stone-200 pb-5">
        <div className="text-[11px] uppercase tracking-[0.2em] text-slate-500 mb-1.5">Admin Dashboard</div>
        <div className="serif-ko text-3xl font-black text-slate-900">관리자 대시보드</div>
      </div>
      <div className="grid grid-cols-4 gap-4 mb-8">
        {[
          { label: '전체 학생', value: s.students, icon: Users, href: '/admin/students', color: 'text-blue-700' },
          { label: '강사', value: s.instructors, icon: BookOpen, href: '/admin/users', color: 'text-emerald-700' },
          { label: '승인 대기', value: s.pendingCount, icon: Clock, href: '/admin/users', color: 'text-amber-700' },
          { label: '최근 상담', value: s.recentCounselings.length, icon: MessageSquare, href: '/admin/counselings', color: 'text-purple-700' },
        ].map(item => (
          <Link key={item.label} href={item.href} className="bg-white border border-stone-200 rounded-xl p-5 hover:border-slate-400 hover:shadow-sm transition-all">
            <div className="flex items-center justify-between mb-2">
              <div className="text-[10px] uppercase tracking-widest text-slate-500">{item.label}</div>
              <item.icon size={14} className={item.color} />
            </div>
            <div className={`text-4xl font-black num ${item.color}`}>{item.value}</div>
          </Link>
        ))}
      </div>
      <div className="grid grid-cols-2 gap-6">
        <div className="bg-white border border-stone-200 rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="serif-ko text-base font-bold text-slate-900">승인 대기 신청</div>
            <Link href="/admin/users" className="text-xs text-slate-500 hover:text-slate-900 flex items-center gap-1">전체 보기 <ChevronRight size={12} /></Link>
          </div>
          {s.recentPending.length === 0
            ? <div className="text-sm text-slate-400 py-4 text-center">대기 중인 신청이 없습니다</div>
            : s.recentPending.map((p: any) => (
              <div key={p.id} className="flex items-center justify-between py-3 border-b border-stone-100 last:border-0">
                <div>
                  <div className="text-sm font-semibold text-slate-900">{p.name}</div>
                  <div className="text-xs text-slate-500">{p.email} · {p.requestedRole}</div>
                </div>
                <Link href="/admin/users" className="text-xs px-3 py-1 bg-amber-100 text-amber-700 rounded-full font-semibold hover:bg-amber-200">승인하기</Link>
              </div>
            ))
          }
        </div>
        <div className="bg-white border border-stone-200 rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="serif-ko text-base font-bold text-slate-900">최근 상담 기록</div>
            <Link href="/admin/counselings" className="text-xs text-slate-500 hover:text-slate-900 flex items-center gap-1">전체 보기 <ChevronRight size={12} /></Link>
          </div>
          {s.recentCounselings.length === 0
            ? <div className="text-sm text-slate-400 py-4 text-center">상담 기록이 없습니다</div>
            : s.recentCounselings.map((c: any) => (
              <div key={c.id} className="py-3 border-b border-stone-100 last:border-0">
                <div className="flex items-center gap-2">
                  <div className="text-sm font-semibold text-slate-900">{c.student?.name}</div>
                  <div className="text-xs text-slate-500">{c.type} · {c.topic}</div>
                </div>
                <div className="text-xs text-slate-500 mt-0.5 truncate">{c.summary}</div>
              </div>
            ))
          }
        </div>
      </div>
    </div>
  );
}
