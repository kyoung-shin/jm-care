import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getCurrentAppUser } from '@/lib/auth';

export async function GET() {
  try {
    const caller = await getCurrentAppUser();
    if (caller?.role !== 'ADMIN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    // passwordHash 가 응답에 섞이지 않도록 필드를 명시한다
    const users = await prisma.user.findMany({
      select: {
        id: true, name: true, username: true, role: true, phone: true, email: true,
        branchId: true, studentProfileId: true, createdAt: true,
        branch: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
    return NextResponse.json(users);
  } catch (e) {
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const caller = await getCurrentAppUser();
    if (caller?.role !== 'ADMIN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    const { userId, role } = await req.json();
    const updated = await prisma.user.update({
      where: { id: userId },
      data: { role },
      select: { id: true, name: true, role: true, branchId: true },
    });
    return NextResponse.json(updated);
  } catch (e) {
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
