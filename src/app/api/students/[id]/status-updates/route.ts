import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getCurrentAppUser } from '@/lib/auth';
import type { Prisma } from '@/generated/prisma/client';

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const caller = await getCurrentAppUser();
  if (!caller) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  const updates = await prisma.studentStatusUpdate.findMany({
    where: { studentId: id },
    orderBy: { createdAt: 'desc' },
  });
  return NextResponse.json(updates);
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const caller = await getCurrentAppUser();
    if (!caller) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!['ADMIN', 'DIRECTOR', 'INSTRUCTOR'].includes(caller.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id } = await params;
    const { overallReadiness, peerAverage, subjectTargets, roadmap, riskSignals, note } = await req.json();

    const entry: Prisma.StudentStatusUpdateCreateInput = {
      student: { connect: { id } },
      createdBy: caller.name,
    };
    const mirror: Prisma.StudentUpdateInput = {};

    if (typeof overallReadiness === 'number') { entry.overallReadiness = overallReadiness; mirror.overallReadiness = overallReadiness; }
    if (typeof peerAverage === 'number') { entry.peerAverage = peerAverage; mirror.peerAverage = peerAverage; }
    if (subjectTargets !== undefined) { entry.subjectTargets = subjectTargets; mirror.subjectTargets = subjectTargets; }
    if (roadmap !== undefined) { entry.roadmap = roadmap; mirror.roadmap = roadmap; }
    if (riskSignals !== undefined) { entry.riskSignals = riskSignals; mirror.riskSignals = riskSignals; }
    if (typeof note === 'string') { entry.note = note; }

    const [update] = await prisma.$transaction([
      prisma.studentStatusUpdate.create({ data: entry }),
      ...(Object.keys(mirror).length > 0
        ? [prisma.student.update({ where: { id }, data: mirror })]
        : []),
    ]);

    return NextResponse.json(update, { status: 201 });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
