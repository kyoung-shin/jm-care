import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getCurrentAppUser } from '@/lib/auth';

/**
 * 입시 전형 DB 열람용 목록 (학교 + 전형).
 * 본사 입시기준 DB 표, 원장·강사의 전형 보기, 학생 목표 선택이 함께 쓴다.
 * 읽기 전용이며 수정은 본사 전용 /api/admin/admission-schools 로만 한다.
 */
export async function GET() {
  const user = await getCurrentAppUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!['ADMIN', 'DIRECTOR', 'INSTRUCTOR'].includes(user.role)) {
    return NextResponse.json({ error: '입시 전형 정보를 볼 권한이 없습니다' }, { status: 403 });
  }
  try {
    const schools = await prisma.admissionSchool.findMany({
      orderBy: [{ year: 'desc' }, { name: 'asc' }],
      include: { tracks: { orderBy: [{ period: 'asc' }, { name: 'asc' }] } },
    });
    return NextResponse.json(schools);
  } catch {
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
