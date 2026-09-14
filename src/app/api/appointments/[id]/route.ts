import { NextResponse } from 'next/server';
import { authorizeStudentAccess, studentAccessError, writeForbidden } from '@/lib/auth';
import { prisma } from '@/lib/db';

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;

    // 예약은 학생에 딸려 있다. 그 학생을 다룰 수 있는 직원만 확정·거절할 수 있다.
    const appointment = await prisma.appointmentRequest.findUnique({
      where: { id },
      select: { studentId: true },
    });
    if (!appointment) return NextResponse.json({ error: '상담 예약을 찾을 수 없습니다' }, { status: 404 });

    const access = await authorizeStudentAccess(appointment.studentId);
    if (!access.ok) return studentAccessError(access);
    if (!access.canWrite) return writeForbidden();

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
