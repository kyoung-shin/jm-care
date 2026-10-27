import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getCurrentAppUser } from '@/lib/auth';

/**
 * 학생 등록 화면에서 연결할 학부모 후보 — 가입 승인이 끝난 같은 지점 학부모.
 * 원장·강사는 본인 지점만, 본사는 branchId 로 지점을 고른다.
 */
export async function GET(req: NextRequest) {
  const caller = await getCurrentAppUser();
  if (!caller) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!['ADMIN', 'DIRECTOR', 'INSTRUCTOR'].includes(caller.role)) {
    return NextResponse.json({ error: '학부모 목록을 볼 권한이 없습니다' }, { status: 403 });
  }
  const branchId = caller.role === 'ADMIN'
    ? new URL(req.url).searchParams.get('branchId')
    : caller.branchId;
  if (!branchId) return NextResponse.json([]);

  const parents = await prisma.user.findMany({
    where: { role: 'PARENT', branchId },
    select: {
      id: true,
      name: true,
      phone: true,
      children: { select: { id: true, name: true, grade: true }, orderBy: { name: 'asc' } },
    },
    orderBy: { name: 'asc' },
  });
  return NextResponse.json(parents);
}
