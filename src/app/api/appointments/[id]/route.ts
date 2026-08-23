import { NextResponse } from 'next/server';
import { getCurrentAppUser } from '@/lib/auth';
import { prisma } from '@/lib/db';

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const caller = await getCurrentAppUser();
    if (!caller) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!['INSTRUCTOR', 'DIRECTOR', 'ADMIN'].includes(caller.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id } = await params;
    const { status, confirmedSlot } = await req.json();
    if (!['confirmed', 'declined'].includes(status)) {
      return NextResponse.json({ error: 'status는 confirmed 또는 declined여야 합니다' }, { status: 400 });
    }
    if (status === 'confirmed' && !confirmedSlot) {
      return NextResponse.json({ error: '확정할 일시를 선택해 주세요' }, { status: 400 });
    }

    const updated = await prisma.appointmentRequest.update({
      where: { id },
      data: { status, confirmedSlot: status === 'confirmed' ? confirmedSlot : null },
    });
    return NextResponse.json(updated);
  } catch (e) {
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
