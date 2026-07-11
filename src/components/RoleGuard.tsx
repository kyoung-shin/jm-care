'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

const ROLE_ROUTES: Record<string, string> = {
  ADMIN: '/admin',
  DIRECTOR: '/director',
  INSTRUCTOR: '/instructor',
  PARENT: '/parent',
  STUDENT: '/student',
};

export default function RoleGuard({
  allowed,
  children,
}: {
  allowed: string[];
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [role, setRole] = useState<string | undefined>(undefined);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch('/api/auth/me')
      .then(r => (r.ok ? r.json() : null))
      .then(data => {
        if (cancelled) return;
        setRole(data?.role);
        setLoaded(true);
      })
      .catch(() => {
        if (!cancelled) setLoaded(true);
      });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (!loaded) return;
    if (!role || (role !== 'ADMIN' && !allowed.includes(role))) {
      router.replace(ROLE_ROUTES[role ?? ''] ?? '/pending');
    }
  }, [loaded, role]);

  if (!loaded) return null;
  if (!role || (role !== 'ADMIN' && !allowed.includes(role))) return null;
  return <>{children}</>;
}
