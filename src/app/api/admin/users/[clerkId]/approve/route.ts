import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { clerkClient } from '@clerk/nextjs/server';

export async function POST(
  req: Request,
  { params }: { params: Promise<{ clerkId: string }> }
) {
  try {
    const { sessionClaims } = await auth();
    const callerRole = (sessionClaims?.metadata as any)?.role;
    if (callerRole !== 'ADMIN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const { clerkId } = await params;
    const { role, branchId } = await req.json();

    const client = await clerkClient();

    // Set publicMetadata.role via Clerk API
    await client.users.updateUserMetadata(clerkId, {
      publicMetadata: { role },
    });

    // Update DB User
    await prisma.user.upsert({
      where: { clerkId },
      update: { role, branchId: branchId || null },
      create: { clerkId, name: '', email: '', role, branchId: branchId || null },
    });

    // Update PendingUser
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
