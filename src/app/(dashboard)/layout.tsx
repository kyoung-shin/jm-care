import TopBar from '@/components/dashboard/TopBar';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="ko-sans min-h-screen bg-stone-50 text-slate-900">
      <TopBar />
      {children}
    </div>
  );
}
