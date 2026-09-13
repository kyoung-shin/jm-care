import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getCurrentAppUser } from '@/lib/auth';

export async function GET() {
  const caller = await getCurrentAppUser();
  if (caller?.role !== 'DIRECTOR' || !caller.branchId) {
    return NextResponse.json({ error: '원장 권한이 필요합니다' }, { status: 403 });
  }

  // 거절 건도 함께 내려준다: 거절된 신청자는 같은 아이디로 재신청할 수 없으므로
  // 원장이 화면에서 다시 승인할 수 있어야 한다.
  const applications = await prisma.pendingUser.findMany({
    where: {
      status: { in: ['PENDING', 'REJECTED'] },
      branchId: caller.branchId,
      requestedRole: { in: ['INSTRUCTOR', 'PARENT', 'STUDENT'] },
    },
    orderBy: { createdAt: 'desc' },
  });
  return NextResponse.json(applications);
}
