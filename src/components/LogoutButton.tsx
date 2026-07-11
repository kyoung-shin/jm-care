'use client';
import { useRouter } from 'next/navigation';

export default function LogoutButton({ className }: { className?: string }) {
  const router = useRouter();

  const logout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/sign-in');
    router.refresh();
  };

  return (
    <button onClick={logout} className={className ?? 'text-xs text-slate-400 hover:text-white transition-colors'}>
      로그아웃
    </button>
  );
}
