import { NextRequest, NextResponse } from 'next/server';
import { getSessionUserId } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { getCurrentAppUser } from '@/lib/auth';

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
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

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
    const userId = await getSessionUserId();
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const { id } = await params;
    const data = await req.json();
    const student = await prisma.student.update({ where: { id }, data });
    return NextResponse.json(student);
  } catch (e) {
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const caller = await getCurrentAppUser();
    if (!caller) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!['ADMIN', 'DIRECTOR'].includes(caller.role)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    const { id } = await params;
    await prisma.student.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (e) {
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
