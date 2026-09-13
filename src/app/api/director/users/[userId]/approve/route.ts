import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getCurrentAppUser } from '@/lib/auth';

const APPROVABLE_ROLES = ['INSTRUCTOR', 'PARENT', 'STUDENT'];
// 학부모·학생 계정은 반드시 학생 프로필과 연결한 뒤 승인한다
const LINK_REQUIRED_ROLES = ['PARENT', 'STUDENT'];

export async function POST(
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
      ? body.studentIds.filter((id: unknown): id is string => typeof id === 'string' && !!id)
      : [];

    const pending = await prisma.pendingUser.findUnique({ where: { userId } });
    if (!pending || pending.branchId !== branchId || !APPROVABLE_ROLES.includes(pending.requestedRole)) {
      return NextResponse.json({ error: '신청 내역을 찾을 수 없습니다' }, { status: 404 });
    }
    if (pending.status === 'APPROVED') {
      return NextResponse.json({ error: '이미 승인된 신청입니다' }, { status: 409 });
    }

    const role = pending.requestedRole as 'INSTRUCTOR' | 'PARENT' | 'STUDENT';

    if (LINK_REQUIRED_ROLES.includes(role) && studentIds.length === 0) {
      return NextResponse.json({ error: '연결할 학생을 1명 이상 선택해 주세요' }, { status: 400 });
    }
    if (role === 'STUDENT' && studentIds.length > 1) {
      return NextResponse.json({ error: '학생 계정은 학생 프로필 1개에만 연결할 수 있습니다' }, { status: 400 });
    }

    if (studentIds.length > 0) {
      const students = await prisma.student.findMany({
        where: { id: { in: studentIds } },
        select: { id: true, name: true, branchId: true, loginUser: { select: { id: true, name: true } } },
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
      if (role === 'STUDENT') {
        const claimed = students.find(s => s.loginUser && s.loginUser.id !== userId);
        if (claimed) {
          return NextResponse.json(
            { error: `'${claimed.name}' 학생 프로필은 이미 ${claimed.loginUser!.name} 계정에 연결되어 있습니다` },
            { status: 409 }
          );
        }
      }
    }

    await prisma.$transaction([
      prisma.user.update({
        where: { id: userId },
        data: {
          role,
          branchId: pending.branchId,
          phone: pending.phone,
          ...(role === 'STUDENT' ? { studentProfileId: studentIds[0] } : {}),
          ...(role === 'PARENT' ? { children: { set: studentIds.map(id => ({ id })) } } : {}),
        },
      }),
      prisma.pendingUser.update({
        where: { userId },
        data: { status: 'APPROVED', approvedAt: new Date(), approvedBy: caller.id },
      }),
    ]);

    return NextResponse.json({ success: true });
  } catch (e) {
    console.error('[director approve]', e);
    return NextResponse.json({ error: '승인 처리 중 오류가 발생했습니다' }, { status: 500 });
  }
}
