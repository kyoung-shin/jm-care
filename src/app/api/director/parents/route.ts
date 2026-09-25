import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getCurrentAppUser } from '@/lib/auth';

/**
 * 승인이 끝난 우리 지점 학부모와 현재 연결된 자녀 목록.
 * 가입 승인 후에 형제·자매가 새로 등록되면 여기서 추가로 연결한다.
 */
export async function GET() {
  const caller = await getCurrentAppUser();
  if (caller?.role !== 'DIRECTOR' || !caller.branchId) {
    return NextResponse.json({ error: '원장 권한이 필요합니다' }, { status: 403 });
  }

  const parents = await prisma.user.findMany({
    where: { role: 'PARENT', branchId: caller.branchId },
    select: {
      id: true,
      name: true,
      phone: true,
      email: true,
      children: {
        select: { id: true, name: true, grade: true, school: true },
        orderBy: { name: 'asc' },
      },
    },
    orderBy: { name: 'asc' },
  });
  return NextResponse.json(parents);
}
