import { NextRequest, NextResponse } from 'next/server';
import { authorizeStudentAccess, studentAccessError, writeForbidden } from '@/lib/auth';
import { prisma } from '@/lib/db';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const access = await authorizeStudentAccess((await params).id);
  if (!access.ok) return studentAccessError(access);

  const { id } = await params;
  try {
    const exams = await prisma.mockExam.findMany({
      where: { studentId: id },
      orderBy: { createdAt: 'asc' },
    });
    return NextResponse.json(exams);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch mock exams' }, { status: 500 });
  }
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const access = await authorizeStudentAccess((await params).id);
  if (!access.ok) return studentAccessError(access);
  if (!access.canWrite) return writeForbidden();

  const { id } = await params;
  try {
    const body = await req.json();
    // 클라이언트가 보낸 임의 필드를 그대로 쓰지 않고 허용 칸만 저장한다
    const num = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) ? v : null);
    const exam = await prisma.mockExam.create({
      data: {
        studentId: id,
        name: String(body.name ?? ''),
        date: String(body.date ?? ''),
        fullName: body.fullName ? String(body.fullName) : null,
        korean: num(body.korean),
        english: num(body.english),
        math: num(body.math),
        social: num(body.social),
        science: num(body.science),
        avg: num(body.avg),
        percentile: body.percentile ? String(body.percentile) : null,
      },
    });
    return NextResponse.json(exam, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to create mock exam' }, { status: 500 });
  }
}
