import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getCurrentAppUser } from '@/lib/auth';

export async function GET() {
  try {
    const caller = await getCurrentAppUser();
    if (caller?.role !== 'ADMIN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    const users = await prisma.user.findMany({ include: { branch: true }, orderBy: { createdAt: 'desc' } });
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
    const updated = await prisma.user.update({ where: { id: userId }, data: { role } });
    return NextResponse.json(updated);
  } catch (e) {
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
