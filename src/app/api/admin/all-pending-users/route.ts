import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getCurrentAppUser } from '@/lib/auth';

export async function GET() {
  try {
    const caller = await getCurrentAppUser();
    if (caller?.role !== 'ADMIN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const pending = await prisma.pendingUser.findMany({
      where: { status: 'PENDING' },
      include: { branch: true, user: { select: { username: true } } },
      orderBy: { createdAt: 'desc' },
    });
    return NextResponse.json(pending);
  } catch (e) {
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
