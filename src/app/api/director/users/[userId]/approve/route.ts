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
    const { studentIds } = await req.json().catch(() => ({ studentIds: [] as string[] }));

    const pending = await prisma.pendingUser.findUnique({ where: { userId } });
    if (
      !pending ||
      pending.branchId !== caller.branchId ||
      !['INSTRUCTOR', 'PARENT', 'STUDENT'].includes(pending.requestedRole)
    ) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    await prisma.user.update({
      where: { id: userId },
      data: {
        role: pending.requestedRole as 'INSTRUCTOR' | 'PARENT' | 'STUDENT',
        branchId: pending.branchId,
        phone: pending.phone,
        ...(pending.requestedRole === 'STUDENT' ? { studentProfileId: studentIds?.[0] ?? null } : {}),
        ...(pending.requestedRole === 'PARENT' ? { children: { set: (studentIds ?? []).map((id: string) => ({ id })) } } : {}),
      },
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
