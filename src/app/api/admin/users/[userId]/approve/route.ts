import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getCurrentAppUser } from '@/lib/auth';

export async function POST(
  req: Request,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const caller = await getCurrentAppUser();
    if (caller?.role !== 'ADMIN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const { userId } = await params;

    const pending = await prisma.pendingUser.findUnique({ where: { userId } });
    if (!pending || pending.requestedRole !== 'DIRECTOR') {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    const existingDirector = await prisma.user.findFirst({
      where: { branchId: pending.branchId, role: 'DIRECTOR', id: { not: userId } },
    });
    if (existingDirector) {
      return NextResponse.json({ error: '이미 해당 지점에 원장이 배정되어 있습니다' }, { status: 409 });
    }

    await prisma.user.update({
      where: { id: userId },
      data: { role: 'DIRECTOR', branchId: pending.branchId, phone: pending.phone },
    });

    await prisma.pendingUser.update({
      where: { userId },
      data: { status: 'APPROVED', approvedAt: new Date(), approvedBy: caller.id },
    });

    return NextResponse.json({ success: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
