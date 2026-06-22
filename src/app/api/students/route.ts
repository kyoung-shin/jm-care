import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { prisma } from '@/lib/db';

export async function GET(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const instructorId = searchParams.get('instructorId');
  const parentId = searchParams.get('parentId');

  try {
    const students = await prisma.student.findMany({
      where: {
        ...(instructorId ? { instructorId } : {}),
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

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const body = await req.json();
    const student = await prisma.student.create({ data: body });
    return NextResponse.json(student, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to create student' }, { status: 500 });
  }
}
