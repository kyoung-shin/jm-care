export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="ko-sans min-h-screen bg-stone-50 flex items-center justify-center">
      <div className="w-full max-w-md px-4">
        <div className="text-center mb-8">
          <div className="serif-ko text-3xl font-black text-slate-900">JM-CARE</div>
          <div className="text-xs text-slate-500 mt-1">종로엠스쿨 학생 종합관리 시스템</div>
        </div>
        {children}
      </div>
    </div>
  );
}
