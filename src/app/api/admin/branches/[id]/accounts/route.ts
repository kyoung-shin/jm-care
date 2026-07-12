import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getCurrentAppUser } from '@/lib/auth';

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const caller = await getCurrentAppUser();
    if (caller?.role !== 'ADMIN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const { id } = await params;
    const users = await prisma.user.findMany({
      where: { branchId: id, role: { in: ['DIRECTOR', 'INSTRUCTOR', 'PARENT'] } },
      select: { id: true, name: true, username: true, email: true, phone: true, role: true, createdAt: true },
      orderBy: { createdAt: 'asc' },
    });

    const order = { DIRECTOR: 0, INSTRUCTOR: 1, PARENT: 2 } as const;
    users.sort((a, b) => order[a.role as keyof typeof order] - order[b.role as keyof typeof order]);

    return NextResponse.json(users);
  } catch (e) {
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
