import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const { id } = await params;
    const histories = await prisma.goalHistory.findMany({
      where: { studentId: id },
      orderBy: { createdAt: 'desc' },
    });
    return NextResponse.json(histories);
  } catch (e) {
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const { id } = await params;
    const { finalGoalSchool, finalGoalDetail, finalGoalTrack, midGoalSchool, midGoalDetail, midGoalTrack, reason } = await req.json();

    // Mark old current as not current
    await prisma.goalHistory.updateMany({
      where: { studentId: id, isCurrent: true },
      data: { isCurrent: false },
    });

    // Create new history entry
    await prisma.goalHistory.create({
      data: {
        studentId: id,
        date: new Date().toLocaleDateString('ko-KR', { year: 'numeric', month: '2-digit' }).replace('. ', '.').replace('.', '년 ').replace('.', '월').trim(),
        label: '목표 업데이트',
        target: finalGoalSchool || '',
        track: finalGoalTrack || '',
        reason,
        isCurrent: true,
      },
    });

    // Update student goals
    const student = await prisma.student.update({
      where: { id },
      data: { finalGoalSchool, finalGoalDetail, finalGoalTrack, midGoalSchool, midGoalDetail, midGoalTrack },
    });

    return NextResponse.json(student);
  } catch (e) {
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
