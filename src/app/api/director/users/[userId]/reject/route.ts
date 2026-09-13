import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getCurrentAppUser } from '@/lib/auth';

const APPROVABLE_ROLES = ['INSTRUCTOR', 'PARENT', 'STUDENT'];

export async function POST(
  req: Request,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const caller = await getCurrentAppUser();
    if (caller?.role !== 'DIRECTOR' || !caller.branchId) {
      return NextResponse.json({ error: '원장 권한이 필요합니다' }, { status: 403 });
    }

    const { userId } = await params;

    const pending = await prisma.pendingUser.findUnique({ where: { userId } });
    if (
      !pending ||
      pending.branchId !== caller.branchId ||
      !APPROVABLE_ROLES.includes(pending.requestedRole)
    ) {
      return NextResponse.json({ error: '신청 내역을 찾을 수 없습니다' }, { status: 404 });
    }
    if (pending.status === 'APPROVED') {
      return NextResponse.json({ error: '이미 승인된 신청은 거절할 수 없습니다' }, { status: 409 });
    }

    await prisma.pendingUser.update({
      where: { userId },
      data: { status: 'REJECTED' },
    });

    return NextResponse.json({ success: true });
  } catch (e) {
    console.error('[director reject]', e);
    return NextResponse.json({ error: '거절 처리 중 오류가 발생했습니다' }, { status: 500 });
  }
}
