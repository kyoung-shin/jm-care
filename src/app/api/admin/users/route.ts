import { currentUser } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { clerkClient } from '@clerk/nextjs/server';

export async function GET() {
  try {
    const user = await currentUser();
    if (user?.publicMetadata?.role !== 'ADMIN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    const users = await prisma.user.findMany({ include: { branch: true }, orderBy: { createdAt: 'desc' } });
    return NextResponse.json(users);
  } catch (e) {
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const caller = await currentUser();
    if (caller?.publicMetadata?.role !== 'ADMIN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    const { clerkId, role } = await req.json();
    const client = await clerkClient();
    await client.users.updateUserMetadata(clerkId, { publicMetadata: { role } });
    const updated = await prisma.user.update({ where: { clerkId }, data: { role } });
    return NextResponse.json(updated);
  } catch (e) {
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
