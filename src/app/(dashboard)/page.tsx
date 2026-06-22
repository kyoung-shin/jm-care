import { redirect } from 'next/navigation';
import { auth } from '@clerk/nextjs/server';

export default async function DashboardRoot() {
  const { userId, sessionClaims } = await auth();
  if (!userId) redirect('/sign-in');
  const role = (sessionClaims?.metadata as Record<string, string> | undefined)?.role;
  if (role === 'ADMIN') redirect('/admin');
  if (role === 'DIRECTOR') redirect('/director');
  if (role === 'INSTRUCTOR') redirect('/instructor');
  if (role === 'PARENT') redirect('/parent');
  redirect('/pending');
}
