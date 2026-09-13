import { authorizeStudentAccess, studentAccessError, writeForbidden } from '@/lib/auth';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string; examId: string }> }
) {
  try {
    const access = await authorizeStudentAccess((await params).id);
    if (!access.ok) return studentAccessError(access);
    if (!access.canWrite) return writeForbidden();
    const { examId } = await params;
    const data = await req.json();
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
    const { examId } = await params;
    await prisma.mockExam.delete({ where: { id: examId } });
    return NextResponse.json({ success: true });
  } catch (e) {
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
