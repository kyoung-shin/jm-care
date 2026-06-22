import { currentUser } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { clerkClient } from '@clerk/nextjs/server';

export async function POST(
  req: Request,
  { params }: { params: Promise<{ clerkId: string }> }
) {
  try {
    const caller = await currentUser();
    if (caller?.publicMetadata?.role !== 'ADMIN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const { clerkId } = await params;
    const { role, branchId } = await req.json();

    const client = await clerkClient();
    await client.users.updateUserMetadata(clerkId, { publicMetadata: { role } });

    await prisma.user.upsert({
      where: { clerkId },
      update: { role, branchId: branchId || null },
      create: { clerkId, name: '', email: '', role, branchId: branchId || null },
    });

    await prisma.pendingUser.updateMany({
      where: { clerkId },
      data: { status: 'APPROVED', approvedAt: new Date() },
    });

    return NextResponse.json({ success: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
