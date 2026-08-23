import { NextResponse } from 'next/server';
import { getSessionUserId } from '@/lib/auth';
import { prisma } from '@/lib/db';

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  try {
    const requests = await prisma.appointmentRequest.findMany({
      where: { student: { instructorId: id } },
      include: { student: { select: { id: true, name: true } } },
      orderBy: { createdAt: 'desc' },
    });
    return NextResponse.json(requests);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch appointment requests' }, { status: 500 });
  }
}
