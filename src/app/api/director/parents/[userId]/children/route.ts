import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getCurrentAppUser } from '@/lib/auth';

/**
 * 승인된 학부모의 자녀 연결을 다시 설정한다.
 * 형제·자매가 나중에 등록된 경우 여기서 추가한다. 보내준 목록이 최종 상태가 된다.
 */
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const caller = await getCurrentAppUser();
    if (caller?.role !== 'DIRECTOR' || !caller.branchId) {
      return NextResponse.json({ error: '원장 권한이 필요합니다' }, { status: 403 });
    }
    const branchId = caller.branchId;
    const { userId } = await params;

    const body = await req.json().catch(() => ({}));
    const studentIds: string[] = Array.isArray(body?.studentIds)
      ? body.studentIds.filter((v: unknown): v is string => typeof v === 'string' && !!v)
      : [];

    const parent = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, name: true, role: true, branchId: true },
    });
    if (!parent || parent.branchId !== branchId) {
      return NextResponse.json({ error: '학부모를 찾을 수 없습니다' }, { status: 404 });
    }
    if (parent.role !== 'PARENT') {
      return NextResponse.json({ error: '학부모 계정이 아닙니다' }, { status: 400 });
    }
    if (studentIds.length === 0) {
      return NextResponse.json({ error: '자녀를 1명 이상 선택해 주세요' }, { status: 400 });
    }

    const students = await prisma.student.findMany({
      where: { id: { in: studentIds } },
      select: { id: true, name: true, branchId: true },
    });
    if (students.length !== studentIds.length) {
      return NextResponse.json(
        { error: '선택한 학생을 찾을 수 없습니다. 목록을 새로고침한 뒤 다시 시도해 주세요' },
        { status: 400 }
      );
    }
    const otherBranch = students.find(s => s.branchId !== branchId);
    if (otherBranch) {
      return NextResponse.json(
        { error: `'${otherBranch.name}' 학생은 다른 지점 소속이라 연결할 수 없습니다` },
        { status: 400 }
      );
    }

    const updated = await prisma.user.update({
      where: { id: userId },
      data: { children: { set: studentIds.map(id => ({ id })) } },
      select: {
        id: true,
        name: true,
        children: { select: { id: true, name: true, grade: true, school: true }, orderBy: { name: 'asc' } },
      },
    });
    return NextResponse.json(updated);
  } catch (e) {
    console.error('[director parent children]', e);
    return NextResponse.json({ error: '자녀 연결 중 오류가 발생했습니다' }, { status: 500 });
  }
}
