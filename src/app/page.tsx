import { redirect } from 'next/navigation';
import { getCurrentAppUser } from '@/lib/auth';

export default async function RootPage() {
  const user = await getCurrentAppUser();
  if (!user) redirect('/sign-in');

  const role = user.role;
  if (role === 'ADMIN') redirect('/admin');
  if (role === 'DIRECTOR') redirect('/director');
  if (role === 'INSTRUCTOR') redirect('/instructor');
  if (role === 'PARENT') redirect('/parent');
  if (role === 'STUDENT') redirect('/student');
  redirect('/pending');
}
