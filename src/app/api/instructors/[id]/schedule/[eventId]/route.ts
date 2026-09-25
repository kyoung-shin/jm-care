import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { authorizeInstructorAccess, studentAccessError } from '@/lib/auth';

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string; eventId: string }> }
) {
  try {
    const access = await authorizeInstructorAccess((await params).id);
    if (!access.ok) return studentAccessError(access);

    const { id, eventId } = await params;
    const existing = await prisma.scheduleEvent.findUnique({ where: { id: eventId } });
    if (!existing || existing.instructorId !== id) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    // 상담 예약에서 만들어진 일정은 예약 쪽에서 변경·거절해야 상태가 어긋나지 않는다
    if (existing.appointmentId) {
      return NextResponse.json(
        { error: '상담 예약으로 생긴 일정입니다. "상담 예약 요청"에서 일시를 변경하거나 거절해 주세요' },
        { status: 400 }
      );
    }

    await prisma.scheduleEvent.delete({ where: { id: eventId } });
    return NextResponse.json({ success: true });
  } catch (e) {
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
