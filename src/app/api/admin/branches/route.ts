import { currentUser } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET() {
  try {
    const user = await currentUser();
    if (user?.publicMetadata?.role !== 'ADMIN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    const branches = await prisma.branch.findMany({ include: { _count: { select: { users: true, students: true } } } });
    return NextResponse.json(branches);
  } catch (e) {
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const user = await currentUser();
    if (user?.publicMetadata?.role !== 'ADMIN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    const { name } = await req.json();
    const branch = await prisma.branch.create({ data: { name } });
    return NextResponse.json(branch, { status: 201 });
  } catch (e) {
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
