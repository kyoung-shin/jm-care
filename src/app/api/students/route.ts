import { NextRequest, NextResponse } from 'next/server';
import { getSessionUserId } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { getCurrentAppUser } from '@/lib/auth';

export async function GET(req: NextRequest) {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const instructorId = searchParams.get('instructorId');
  const parentId = searchParams.get('parentId');
  const branchId = searchParams.get('branchId');

  try {
    const students = await prisma.student.findMany({
      where: {
        ...(instructorId ? { instructorId } : {}),
        ...(branchId ? { branchId } : {}),
      },
      include: {
        instructor: { select: { id: true, name: true } },
        branch: { select: { id: true, name: true } },
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
    const data = await req.json();
    const student = await prisma.student.create({ data });
    return NextResponse.json(student, { status: 201 });
  } catch (e) {
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
