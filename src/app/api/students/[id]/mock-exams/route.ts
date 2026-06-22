import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { prisma } from '@/lib/db';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

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
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  try {
    const body = await req.json();
    const exam = await prisma.mockExam.create({
      data: { ...body, studentId: id },
    });
    return NextResponse.json(exam, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to create mock exam' }, { status: 500 });
  }
}
