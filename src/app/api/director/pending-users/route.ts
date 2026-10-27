import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getCurrentAppUser } from '@/lib/auth';
import { parentMatches } from '@/lib/parent-match';

export async function GET() {
  const caller = await getCurrentAppUser();
  if (caller?.role !== 'DIRECTOR' || !caller.branchId) {
    return NextResponse.json({ error: '원장 권한이 필요합니다' }, { status: 403 });
  }
  const branchId = caller.branchId;

  // 거절 건도 함께 내려준다: 거절된 신청자는 같은 아이디로 재신청할 수 없으므로
  // 원장이 화면에서 다시 승인할 수 있어야 한다.
  const applications = await prisma.pendingUser.findMany({
    where: {
      status: { in: ['PENDING', 'REJECTED'] },
      branchId,
      requestedRole: { in: ['INSTRUCTOR', 'PARENT', 'STUDENT'] },
    },
    orderBy: { createdAt: 'desc' },
  });

  // 학생 ↔ 학부모 자동 매칭 제안
  //   학생 신청: 학생이 적은 학부모 정보와 맞는 승인된 학부모
  //   학부모 신청: 이미 승인된 학생 계정 중 이 학부모를 적어 낸 학생의 프로필
  const needsMatch = applications.some(a => a.requestedRole === 'STUDENT' || a.requestedRole === 'PARENT');
  const [parents, studentAccounts] = needsMatch
    ? await Promise.all([
        prisma.user.findMany({ where: { role: 'PARENT', branchId }, select: { id: true, name: true, phone: true } }),
        prisma.pendingUser.findMany({
          where: {
            branchId, requestedRole: 'STUDENT', status: 'APPROVED',
            OR: [{ parentPhone: { not: null } }, { parentName: { not: null } }],
          },
          select: { parentName: true, parentPhone: true, user: { select: { studentProfileId: true } } },
        }),
      ])
    : [[], []];

  return NextResponse.json(applications.map(a => {
    if (a.requestedRole === 'STUDENT') {
      return { ...a, suggestedParentIds: parents.filter(p => parentMatches(a, p)).map(p => p.id) };
    }
    if (a.requestedRole === 'PARENT') {
      const ids = studentAccounts
        .filter(s => s.user.studentProfileId && parentMatches(s, { name: a.name, phone: a.phone }))
        .map(s => s.user.studentProfileId as string);
      return { ...a, suggestedStudentIds: [...new Set(ids)] };
    }
    return a;
  }));
}
