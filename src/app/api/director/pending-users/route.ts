import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getCurrentAppUser } from '@/lib/auth';

export async function GET() {
  const caller = await getCurrentAppUser();
  if (caller?.role !== 'DIRECTOR' || !caller.branchId) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const pending = await prisma.pendingUser.findMany({
    where: {
      status: 'PENDING',
      branchId: caller.branchId,
      requestedRole: { in: ['INSTRUCTOR', 'PARENT', 'STUDENT'] },
    },
    orderBy: { createdAt: 'desc' },
  });
  return NextResponse.json(pending);
}
