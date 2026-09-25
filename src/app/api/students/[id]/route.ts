import { NextRequest, NextResponse } from 'next/server';
import { authorizeStudentAccess, studentAccessError, writeForbidden } from '@/lib/auth';
import { prisma } from '@/lib/db';

// 초1~고3을 0~11 단계로 매핑 (한국 학제 기준)
const GRADE_INDEX: Record<string, number> = {
  초1: 0, 초2: 1, 초3: 2, 초4: 3, 초5: 4, 초6: 5,
  중1: 6, 중2: 7, 중3: 8,
  고1: 9, 고2: 10, 고3: 11,
};

// 학년으로부터 수능/고입까지 남은 일수를 추정. 학사연도는 3월 시작 기준.
// 수능은 고3 되는 해 11월 15일, 고입(자기주도학습전형 등)은 중3 되는 해 12월 1일을 근사치로 사용.
// 실제 시행일은 매년 조금씩 바뀌므로 참고용 추정치이며, 유급/재수 등 예외는 반영하지 않음.
function estimateDday(grade: string | null): { daysUntilCSAT: number | null; daysUntilHS: number | null } {
  if (!grade || !(grade in GRADE_INDEX)) return { daysUntilCSAT: null, daysUntilHS: null };
  const idx = GRADE_INDEX[grade];

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const academicYear = today.getMonth() >= 2 ? today.getFullYear() : today.getFullYear() - 1;

  const csatYear = academicYear + (11 - idx);
  const csatDate = new Date(csatYear, 10, 15);
  const daysUntilCSAT = Math.round((csatDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

  let daysUntilHS: number | null = null;
  if (idx <= 8) {
    const hsYear = academicYear + (8 - idx);
    const hsDate = new Date(hsYear, 11, 1);
    daysUntilHS = Math.round((hsDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  }

  return { daysUntilCSAT, daysUntilHS };
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const access = await authorizeStudentAccess((await params).id);
  if (!access.ok) return studentAccessError(access);

  const { id } = await params;
  try {
    const student = await prisma.student.findUnique({
      where: { id },
      include: {
        instructor: { select: { id: true, name: true } },
        branch: { select: { id: true, name: true } },
        mockExams: { orderBy: { createdAt: 'asc' } },
        counselings: { orderBy: { createdAt: 'desc' } },
        reports: { orderBy: { createdAt: 'desc' } },
        goalHistories: { orderBy: { createdAt: 'desc' } },
        statusUpdates: { orderBy: { createdAt: 'asc' }, select: { overallReadiness: true, createdAt: true } },
        appointmentRequests: { orderBy: { createdAt: 'desc' } },
      },
    });
    if (!student) return NextResponse.json({ error: 'Student not found' }, { status: 404 });
    const dday = estimateDday(student.grade);
    return NextResponse.json({ ...student, ...dday });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch student' }, { status: 500 });
  }
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const access = await authorizeStudentAccess((await params).id);
    if (!access.ok) return studentAccessError(access);
    if (!access.canWrite) return writeForbidden();
    const { id } = await params;
    const body = await req.json();

    // 요청 본문을 그대로 넘기지 않는다. 지점 이동은 이 경로로 허용하지 않는다.
    const data: Record<string, unknown> = {};
    for (const k of ['name', 'school', 'finalGoalSchool', 'finalGoalDetail', 'finalGoalTrack',
                     'midGoalSchool', 'midGoalDetail', 'midGoalTrack'] as const) {
      if (typeof body[k] === 'string') data[k] = body[k].trim() || null;
    }
    if (typeof body.name === 'string' && body.name.trim()) {
      data.name = body.name.trim();
      data.initial = body.name.trim().charAt(0);
    }
    if (typeof body.grade === 'string' && GRADE_INDEX[body.grade] !== undefined) data.grade = body.grade;
    if (body.enrolledMonths !== undefined && body.enrolledMonths !== null) {
      const n = Number(body.enrolledMonths);
      if (Number.isFinite(n) && n >= 0) data.enrolledMonths = Math.floor(n);
    }
    if (typeof body.instructorId === 'string' && body.instructorId) {
      const instructor = await prisma.user.findUnique({
        where: { id: body.instructorId },
        select: { branchId: true, role: true },
      });
      if (!instructor || instructor.branchId !== access.student.branchId) {
        return NextResponse.json({ error: '담임 강사가 해당 지점 소속이 아닙니다' }, { status: 400 });
      }
      data.instructorId = body.instructorId;
    }

    if (Object.keys(data).length === 0) {
      return NextResponse.json({ error: '수정할 내용이 없습니다' }, { status: 400 });
    }

    const student = await prisma.student.update({ where: { id }, data });
    return NextResponse.json(student);
  } catch (e) {
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const access = await authorizeStudentAccess((await params).id);
    if (!access.ok) return studentAccessError(access);
    // 삭제는 본사·원장만, 그리고 접근 범위 안의 학생에 한한다
    if (!['ADMIN', 'DIRECTOR'].includes(access.user.role)) {
      return NextResponse.json({ error: '학생을 삭제할 권한이 없습니다' }, { status: 403 });
    }
    const { id } = await params;
    await prisma.student.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (e) {
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
