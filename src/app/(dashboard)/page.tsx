import { redirect } from 'next/navigation';
import { auth, currentUser } from '@clerk/nextjs/server';

export default async function DashboardRoot() {
  const { userId } = await auth();
  if (!userId) redirect('/sign-in');
  const user = await currentUser();
  const role = user?.publicMetadata?.role as string | undefined;
  if (role === 'ADMIN') redirect('/admin');
  if (role === 'DIRECTOR') redirect('/director');
  if (role === 'INSTRUCTOR') redirect('/instructor');
  if (role === 'PARENT') redirect('/parent');
  redirect('/pending');
}
