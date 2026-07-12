import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getCurrentAppUser } from '@/lib/auth';

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentAppUser();
    if (user?.role !== 'ADMIN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const { id } = await params;
    const { name, region, status } = await req.json();

    const data: { name?: string; region?: string | null; status?: 'ACTIVE' | 'PREPARING' | 'CLOSING' } = {};
    if (typeof name === 'string' && name.trim()) data.name = name;
    if (typeof region === 'string' || region === null) data.region = region || null;
    if (status && ['ACTIVE', 'PREPARING', 'CLOSING'].includes(status)) data.status = status;

    const branch = await prisma.branch.update({ where: { id }, data });
    return NextResponse.json(branch);
  } catch (e) {
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentAppUser();
    if (user?.role !== 'ADMIN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const { id } = await params;

    const branch = await prisma.branch.findUnique({
      where: { id },
      include: { _count: { select: { users: true, students: true, pendingUsers: true } } },
    });
    if (!branch) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    if (branch._count.users > 0 || branch._count.students > 0 || branch._count.pendingUsers > 0) {
      return NextResponse.json(
        { error: '소속된 계정, 학생 또는 가입 신청이 있어 삭제할 수 없습니다' },
        { status: 409 }
      );
    }

    await prisma.branch.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (e) {
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
