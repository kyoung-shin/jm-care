import { authorizeStudentAccess, studentAccessError, writeForbidden } from '@/lib/auth';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

// 숫자 칸: 빈 값·null 은 "점수 없음"으로 지우고, 숫자가 아닌 값은 건드리지 않는다
function scoreField(v: unknown): number | null | undefined {
  if (v === undefined) return undefined;
  if (v === null || v === '') return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : undefined;
}

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string; examId: string }> }
) {
  try {
    const access = await authorizeStudentAccess((await params).id);
    if (!access.ok) return studentAccessError(access);
    if (!access.canWrite) return writeForbidden();
    const { id, examId } = await params;

    // 다른 학생의 성적 id 를 넣어 고치는 것을 막는다
    const existing = await prisma.mockExam.findUnique({ where: { id: examId }, select: { studentId: true } });
    if (!existing || existing.studentId !== id) {
      return NextResponse.json({ error: '성적 기록을 찾을 수 없습니다' }, { status: 404 });
    }

    const body = await req.json();
    // 본문을 그대로 넘기지 않고 허용 칸만 고친다 (studentId 등은 바꿀 수 없다)
    const data: Record<string, string | number | null> = {};
    if (typeof body.name === 'string' && body.name.trim()) data.name = body.name.trim();
    if (typeof body.date === 'string' && body.date.trim()) data.date = body.date.trim();
    if (typeof body.fullName === 'string' || body.fullName === null) data.fullName = body.fullName?.trim() || null;
    if (typeof body.percentile === 'string' || body.percentile === null) data.percentile = body.percentile?.trim() || null;
    for (const k of ['korean', 'english', 'math', 'social', 'science', 'avg'] as const) {
      const v = scoreField(body[k]);
      if (v !== undefined) data[k] = v;
    }
    if (Object.keys(data).length === 0) {
      return NextResponse.json({ error: '수정할 내용이 없습니다' }, { status: 400 });
    }

    const exam = await prisma.mockExam.update({ where: { id: examId }, data });
    return NextResponse.json(exam);
  } catch (e) {
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string; examId: string }> }
) {
  try {
    const access = await authorizeStudentAccess((await params).id);
    if (!access.ok) return studentAccessError(access);
    if (!access.canWrite) return writeForbidden();
    const { id, examId } = await params;
    const existing = await prisma.mockExam.findUnique({ where: { id: examId }, select: { studentId: true } });
    if (!existing || existing.studentId !== id) {
      return NextResponse.json({ error: '성적 기록을 찾을 수 없습니다' }, { status: 404 });
    }
    await prisma.mockExam.delete({ where: { id: examId } });
    return NextResponse.json({ success: true });
  } catch (e) {
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
