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

    await prisma.scheduleEvent.delete({ where: { id: eventId } });
    return NextResponse.json({ success: true });
  } catch (e) {
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
