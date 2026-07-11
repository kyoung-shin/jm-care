import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getCurrentAppUser } from '@/lib/auth';

export async function POST(
  req: Request,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const caller = await getCurrentAppUser();
    if (caller?.role !== 'DIRECTOR' || !caller.branchId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { userId } = await params;

    const pending = await prisma.pendingUser.findUnique({ where: { userId } });
    if (
      !pending ||
      pending.branchId !== caller.branchId ||
      !['INSTRUCTOR', 'PARENT', 'STUDENT'].includes(pending.requestedRole)
    ) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    await prisma.pendingUser.update({
      where: { userId },
      data: { status: 'REJECTED' },
    });

    return NextResponse.json({ success: true });
  } catch (e) {
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
