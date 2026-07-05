'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Bell } from 'lucide-react';
import { UserButton, useUser } from '@clerk/nextjs';

const ROLE_LABEL: Record<string, string> = {
  DIRECTOR: '원장',
  INSTRUCTOR: '강사',
  PARENT: '학부모',
};

const PERSPECTIVES = [
  { label: '원장', href: '/director' },
  { label: '강사', href: '/instructor' },
  { label: '학부모', href: '/parent' },
];

export default function TopBar() {
  const pathname = usePathname();
  const { user } = useUser();
  const role = user?.publicMetadata?.role as string | undefined;

  return (
    <div className="bg-slate-900 text-white">
      <div className="max-w-7xl mx-auto px-8 py-3.5 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/" className="serif-ko text-xl font-black tracking-tight">JM-CARE</Link>
          <div className="h-4 w-px bg-slate-700" />
          <div className="text-xs text-slate-400">종로엠스쿨 학생 종합관리 시스템</div>
        </div>
        <div className="flex items-center gap-5">
          {role === 'DIRECTOR' ? (
            <div className="flex bg-slate-800 rounded-md p-0.5 text-xs">
              {PERSPECTIVES.map(p => {
                const isActive = pathname.startsWith(p.href);
                return (
                  <Link
                    key={p.label}
                    href={p.href}
                    className={`px-3 py-1 rounded transition-colors ${isActive ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-slate-200'}`}
                  >
                    {p.label} 관점
                  </Link>
                );
              })}
            </div>
          ) : role ? (
            <div className="text-xs px-3 py-1.5 bg-slate-800 rounded-md text-slate-300 font-medium">
              {ROLE_LABEL[role] ?? role} 관점
            </div>
          ) : null}
          <div className="relative">
            <Bell size={16} className="text-slate-400" />
            <div className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 bg-red-500 rounded-full" />
          </div>
          <UserButton />
        </div>
      </div>
    </div>
  );
}
