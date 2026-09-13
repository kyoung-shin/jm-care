import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getCurrentAppUser, studentListScope } from '@/lib/auth';

export async function GET(req: NextRequest) {
  const caller = await getCurrentAppUser();
  if (!caller) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  // 화면이 넘긴 필터 위에 호출자가 볼 수 있는 범위를 반드시 겹쳐 씌운다
  const scope = studentListScope(caller);
  if (scope === null) return NextResponse.json([]);

  const { searchParams } = new URL(req.url);
  const instructorId = searchParams.get('instructorId');
  const parentId = searchParams.get('parentId');
  const branchId = searchParams.get('branchId');

  try {
    const students = await prisma.student.findMany({
      // AND 로 묶어야 화면이 넘긴 필터가 범위 조건을 덮어쓰지 못한다
      // (예: 원장이 다른 지점 branchId 를 넘겨도 본인 지점 교집합만 나온다)
      where: {
        AND: [
          scope,
          {
            ...(instructorId ? { instructorId } : {}),
            ...(branchId ? { branchId } : {}),
            ...(parentId ? { parents: { some: { id: parentId } } } : {}),
          },
        ],
      },
      include: {
        instructor: { select: { id: true, name: true } },
        branch: { select: { id: true, name: true } },
        // 학생 계정 연결 화면에서 이미 연결된 프로필을 구분하는 데 쓴다
        loginUser: { select: { id: true, name: true } },
        _count: { select: { mockExams: true, counselings: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
    return NextResponse.json(students);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch students' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const caller = await getCurrentAppUser();
    if (!caller) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!['ADMIN', 'DIRECTOR', 'INSTRUCTOR'].includes(caller.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const payload = await req.json();
    // id는 서버가 생성한다. 지점은 아래에서 호출자 기준으로 다시 정한다.
    delete payload.id;
    const { branchId: requestedBranchId, ...data } = payload;

    // 소속 지점은 서버가 결정한다. 원장·강사는 본인 지점으로 고정하고 요청값은
    // 무시한다(구 버전 번들이 캐시된 클라이언트가 엉뚱한 지점을 보내도 안전하게).
    // 본사 관리자만 지점을 직접 지정할 수 있다.
    const branchId = caller.role === 'ADMIN' ? requestedBranchId : caller.branchId;
    if (!branchId) {
      return NextResponse.json({ error: '소속 지점을 확인할 수 없습니다' }, { status: 400 });
    }
    if (!data.name || !data.instructorId) {
      return NextResponse.json({ error: '학생 이름과 담임 강사는 필수입니다' }, { status: 400 });
    }

    const instructor = await prisma.user.findUnique({
      where: { id: data.instructorId },
      select: { branchId: true },
    });
    if (!instructor || instructor.branchId !== branchId) {
      return NextResponse.json(
        { error: '담임 강사가 해당 지점 소속이 아닙니다' },
        { status: 400 }
      );
    }

    const student = await prisma.student.create({
      data: { ...data, initial: data.initial || String(data.name).charAt(0), branchId },
    });
    return NextResponse.json(student, { status: 201 });
  } catch (e) {
    console.error('[students create]', e);
    return NextResponse.json({ error: '학생 등록 중 오류가 발생했습니다' }, { status: 500 });
  }
}
