'use client';
import { useEffect } from 'react';
import { useUser } from '@clerk/nextjs';
import { useRouter } from 'next/navigation';

const ROLE_ROUTES: Record<string, string> = {
  ADMIN: '/admin',
  DIRECTOR: '/director',
  INSTRUCTOR: '/instructor',
  PARENT: '/parent',
};

export default function RoleGuard({
  allowed,
  children,
}: {
  allowed: string[];
  children: React.ReactNode;
}) {
  const { user, isLoaded } = useUser();
  const router = useRouter();

  useEffect(() => {
    if (!isLoaded) return;
    const role = user?.publicMetadata?.role as string | undefined;
    if (!role || !allowed.includes(role)) {
      router.replace(ROLE_ROUTES[role ?? ''] ?? '/pending');
    }
  }, [isLoaded, user]);

  if (!isLoaded) return null;
  const role = user?.publicMetadata?.role as string | undefined;
  if (!role || !allowed.includes(role)) return null;
  return <>{children}</>;
}
