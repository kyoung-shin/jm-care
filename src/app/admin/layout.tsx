import Link from 'next/link';
import { UserButton } from '@clerk/nextjs';

const NAV = [
  { href: '/admin', label: '대시보드' },
  { href: '/admin/students', label: '학생 관리' },
  { href: '/admin/users', label: '회원 관리' },
  { href: '/admin/exams', label: '모의고사' },
  { href: '/admin/counselings', label: '상담 기록' },
  { href: '/admin/branches', label: '지점 관리' },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="ko-sans min-h-screen bg-stone-50">
      <div className="bg-slate-900 text-white">
        <div className="max-w-7xl mx-auto px-8 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <Link href="/" className="serif-ko text-xl font-black">JM-CARE</Link>
            <div className="h-4 w-px bg-slate-700" />
            <div className="text-xs text-amber-300 font-semibold">Admin</div>
            <nav className="flex items-center gap-1">
              {NAV.map(n => (
                <Link key={n.href} href={n.href} className="text-xs text-slate-400 hover:text-white px-3 py-1.5 rounded hover:bg-slate-800 transition-colors">
                  {n.label}
                </Link>
              ))}
            </nav>
          </div>
          <UserButton />
        </div>
      </div>
      <div>{children}</div>
    </div>
  );
}
