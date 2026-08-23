import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getCurrentAppUser } from '@/lib/auth';

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string; eventId: string }> }
) {
  try {
    const caller = await getCurrentAppUser();
    if (!caller) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id, eventId } = await params;
    const existing = await prisma.scheduleEvent.findUnique({ where: { id: eventId } });
    if (!existing || existing.instructorId !== id) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    await prisma.scheduleEvent.delete({ where: { id: eventId } });
    return NextResponse.json({ success: true });
  } catch (e) {
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
