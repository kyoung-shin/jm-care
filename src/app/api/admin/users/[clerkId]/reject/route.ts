import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function POST(
  req: Request,
  { params }: { params: Promise<{ clerkId: string }> }
) {
  try {
    const { sessionClaims } = await auth();
    const callerRole = (sessionClaims?.metadata as any)?.role;
    if (callerRole !== 'ADMIN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const { clerkId } = await params;

    await prisma.pendingUser.updateMany({
      where: { clerkId },
      data: { status: 'REJECTED' },
    });

    return NextResponse.json({ success: true });
  } catch (e) {
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
