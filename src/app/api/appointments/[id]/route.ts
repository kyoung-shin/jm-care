import { NextResponse } from 'next/server';
import { authorizeStudentAccess, studentAccessError, writeForbidden } from '@/lib/auth';
import { prisma } from '@/lib/db';

// 예약 슬롯은 "2026.09.28(월) 14:00" 형태로 저장된다.
// 주간 일정은 date "09.28" · day "월" · time "14:00" 을 쓰므로 이 형태로 쪼갠다.
const SLOT_RE = /^(\d{4})\.(\d{2})\.(\d{2})\(([월화수목금토일])\)\s+(\d{1,2}:\d{2})$/;

function parseSlot(slot: string) {
  const m = slot.trim().match(SLOT_RE);
  if (!m) return null;
  const [, , month, dayOfMonth, weekday, time] = m;
  return { date: `${month}.${dayOfMonth}`, day: weekday, time };
}

const TYPE_LABEL: Record<string, string> = { phone: '상담 전화', in_person: '대면 상담' };

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;

    // 예약은 학생에 딸려 있다. 그 학생을 다룰 수 있는 직원만 확정·변경·거절할 수 있다.
    const appointment = await prisma.appointmentRequest.findUnique({
      where: { id },
      select: {
        studentId: true,
        type: true,
        slot1: true,
        slot2: true,
        slot3: true,
        status: true,
        student: { select: { name: true, instructorId: true } },
      },
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

    let parsed: ReturnType<typeof parseSlot> = null;
    if (status === 'confirmed') {
      parsed = parseSlot(confirmedSlot);
      if (!parsed) {
        return NextResponse.json(
          { error: '일시 형식이 올바르지 않습니다. 예: 2026.09.28(월) 14:00' },
          { status: 400 }
        );
      }
    }

    const updated = await prisma.appointmentRequest.update({
      where: { id },
      data: { status, confirmedSlot: status === 'confirmed' ? confirmedSlot : null },
    });

    // 확정하면 담임 강사의 주간 일정에도 함께 올린다. 일시를 바꾸면 일정도 따라 바뀌고,
    // 거절로 되돌리면 일정에서 내린다.
    const instructorId = appointment.student.instructorId;
    const existing = await prisma.scheduleEvent.findUnique({ where: { appointmentId: id } });

    if (status === 'confirmed' && parsed && instructorId) {
      const eventData = {
        instructorId,
        date: parsed.date,
        day: parsed.day,
        time: parsed.time,
        type: '상담',
        label: `${appointment.student.name} 학부모 ${TYPE_LABEL[appointment.type] ?? '상담'}`,
        urgent: false,
        appointmentId: id,
      };
      if (existing) {
        await prisma.scheduleEvent.update({ where: { id: existing.id }, data: eventData });
      } else {
        await prisma.scheduleEvent.create({ data: eventData });
      }
    } else if (existing) {
      await prisma.scheduleEvent.delete({ where: { id: existing.id } });
    }

    return NextResponse.json(updated);
  } catch (e) {
    console.error('[appointment patch]', e);
    return NextResponse.json({ error: '예약 처리 중 오류가 발생했습니다' }, { status: 500 });
  }
}
