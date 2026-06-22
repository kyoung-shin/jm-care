import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { prisma } from '@/lib/db';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  try {
    const counselings = await prisma.counseling.findMany({
      where: { studentId: id },
      orderBy: { createdAt: 'desc' },
    });
    // Map DB schema to frontend shape
    const mapped = counselings.map(c => ({
      date: c.date, type: c.type, topic: c.topic,
      summary: c.summary, internalMemo: c.internalMemo ?? '',
      parentShare: c.parentShare ?? '',
      action: {
        name: c.actionName ?? '(액션 미설정)',
        owner: c.actionOwner ?? '',
        deadline: c.actionDeadline ?? '',
        status: c.actionStatus,
      },
    }));
    return NextResponse.json(mapped);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch counselings' }, { status: 500 });
  }
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  try {
    const body = await req.json();
    const counseling = await prisma.counseling.create({
      data: {
        studentId: id,
        date: body.date,
        type: body.type,
        topic: body.topic,
        summary: body.summary,
        internalMemo: body.internalMemo,
        parentShare: body.parentShare,
        actionName: body.action?.name,
        actionOwner: body.action?.owner,
        actionDeadline: body.action?.deadline,
        actionStatus: body.action?.status ?? 'in-progress',
      },
    });
    return NextResponse.json(counseling, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to create counseling' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  try {
    const { date, counselingId, status } = await req.json();

    if (counselingId) {
      const updated = await prisma.counseling.update({
        where: { id: counselingId },
        data: { actionStatus: status },
      });
      return NextResponse.json(updated);
    }

    // Toggle by date
    const existing = await prisma.counseling.findFirst({
      where: { studentId: id, date },
    });
    if (!existing) return NextResponse.json({ error: 'Counseling not found' }, { status: 404 });

    const updated = await prisma.counseling.update({
      where: { id: existing.id },
      data: { actionStatus: existing.actionStatus === 'completed' ? 'in-progress' : 'completed' },
    });
    return NextResponse.json(updated);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to update counseling' }, { status: 500 });
  }
}
