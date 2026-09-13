import { NextResponse } from 'next/server';
import { authorizeStudentAccess, studentAccessError } from '@/lib/auth';
import { prisma } from '@/lib/db';

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string; reportId: string }> }
) {
  const access = await authorizeStudentAccess((await params).id);
  if (!access.ok) return studentAccessError(access);

  const { id, reportId } = await params;
  try {
    const report = await prisma.report.findUnique({ where: { id: reportId } });
    if (!report || report.studentId !== id) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    if (report.viewedAt) return NextResponse.json(report);

    const updated = await prisma.report.update({
      where: { id: reportId },
      data: { viewedAt: new Date() },
    });
    return NextResponse.json(updated);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to mark report viewed' }, { status: 500 });
  }
}
