import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { authorizeInstructorAccess, studentAccessError } from '@/lib/auth';

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const access = await authorizeInstructorAccess((await params).id);
    if (!access.ok) return studentAccessError(access);

    const { id } = await params;
    const { date, day, time, type, label, urgent } = await req.json();

    if (!date || !day || !time || !type || !label) {
      return NextResponse.json({ error: '날짜·시간·유형·내용을 모두 입력해 주세요' }, { status: 400 });
    }

    const event = await prisma.scheduleEvent.create({
      data: { instructorId: id, date, day, time, type, label, urgent: !!urgent },
    });
    return NextResponse.json(event, { status: 201 });
  } catch (e) {
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
