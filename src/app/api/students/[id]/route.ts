import { NextRequest, NextResponse } from 'next/server';
import { getSessionUserId } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { getCurrentAppUser } from '@/lib/auth';

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
      },
    });
    if (!student) return NextResponse.json({ error: 'Student not found' }, { status: 404 });
    return NextResponse.json(student);
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
