import { redirect } from 'next/navigation';
import { currentUser } from '@clerk/nextjs/server';
import TopBar from '@/components/dashboard/TopBar';

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const user = await currentUser();
  const role = user?.publicMetadata?.role as string | undefined;
  if (role === 'ADMIN') redirect('/admin');

  return (
    <div className="ko-sans min-h-screen bg-stone-50 text-slate-900">
      <TopBar />
      {children}
    </div>
  );
}
