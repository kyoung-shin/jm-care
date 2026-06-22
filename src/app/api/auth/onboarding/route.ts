import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function POST(req: Request) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { name, email, requestedRole, branchId, reason } = await req.json();

    // Upsert User with PENDING role
    await prisma.user.upsert({
      where: { clerkId: userId },
      update: { name, email },
      create: { clerkId: userId, name, email, role: 'PENDING', branchId: branchId || null },
    });

    // Create PendingUser
    const pending = await prisma.pendingUser.upsert({
      where: { clerkId: userId },
      update: { name, email, requestedRole, reason, status: 'PENDING' },
      create: { clerkId: userId, name, email, requestedRole, reason, status: 'PENDING' },
    });

    return NextResponse.json({ success: true, id: pending.id });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
