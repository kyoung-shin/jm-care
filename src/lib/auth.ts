import { cookies } from 'next/headers';
import { prisma } from '@/lib/db';
import { SESSION_COOKIE, verifySessionToken } from '@/lib/session';

export async function getSessionUserId(): Promise<string | null> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  return verifySessionToken(token);
}

export async function getCurrentAppUser() {
  const userId = await getSessionUserId();
  if (!userId) return null;
  return prisma.user.findUnique({ where: { id: userId }, include: { branch: true } });
}
