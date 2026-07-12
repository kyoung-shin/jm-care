import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getCurrentAppUser } from '@/lib/auth';

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const caller = await getCurrentAppUser();
    if (caller?.role !== 'ADMIN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const { userId } = await params;

    const target = await prisma.user.findUnique({
      where: { id: userId },
      include: { _count: { select: { students: true } } },
    });
    if (!target) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    if (!['DIRECTOR', 'INSTRUCTOR'].includes(target.role)) {
      return NextResponse.json({ error: '원장 또는 강사 계정만 삭제할 수 있습니다' }, { status: 400 });
    }

    if (target._count.students > 0) {
      return NextResponse.json({ error: '담당 학생이 있어 삭제할 수 없습니다' }, { status: 409 });
    }

    await prisma.user.delete({ where: { id: userId } });
    return NextResponse.json({ success: true });
  } catch (e) {
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
