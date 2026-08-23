import { NextRequest, NextResponse } from 'next/server';
import { getSessionUserId } from '@/lib/auth';
import { prisma } from '@/lib/db';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  try {
    const requests = await prisma.appointmentRequest.findMany({
      where: { studentId: id },
      orderBy: { createdAt: 'desc' },
    });
    return NextResponse.json(requests);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch appointment requests' }, { status: 500 });
  }
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  try {
    const { type, slot1, slot2, slot3, requestedBy } = await req.json();
    if (!type || !slot1 || !slot2 || !slot3) {
      return NextResponse.json({ error: '유형과 3개의 희망 일시를 모두 입력해 주세요' }, { status: 400 });
    }
    const request = await prisma.appointmentRequest.create({
      data: { studentId: id, type, slot1, slot2, slot3, requestedBy },
    });
    return NextResponse.json(request, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to create appointment request' }, { status: 500 });
  }
}
