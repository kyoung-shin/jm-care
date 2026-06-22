import { currentUser } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET() {
  try {
    const user = await currentUser();
    if (user?.publicMetadata?.role !== 'ADMIN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const [students, instructors, pendingCount, recentCounselings, recentPending] = await Promise.all([
      prisma.student.count(),
      prisma.user.count({ where: { role: 'INSTRUCTOR' } }),
      prisma.pendingUser.count({ where: { status: 'PENDING' } }),
      prisma.counseling.findMany({ take: 5, orderBy: { createdAt: 'desc' }, include: { student: true } }),
      prisma.pendingUser.findMany({ take: 5, where: { status: 'PENDING' }, orderBy: { createdAt: 'desc' } }),
    ]);

    return NextResponse.json({ students, instructors, pendingCount, recentCounselings, recentPending });
  } catch (e) {
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
