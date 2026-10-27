import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { authorizeStudentAccess, studentAccessError, writeForbidden } from '@/lib/auth';
import type { Prisma } from '@/generated/prisma/client';

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const access = await authorizeStudentAccess((await params).id);
  if (!access.ok) return studentAccessError(access);

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
    const access = await authorizeStudentAccess((await params).id);
    if (!access.ok) return studentAccessError(access);
    if (!access.canWrite) return writeForbidden();

    const { id } = await params;
    const {
      overallReadiness, peerAverage, subjectTargets, roadmap, riskSignals, enrolledMonths, note,
      recordSpecialNotes, recordRemarks,
    } = await req.json();

    const entry: Prisma.StudentStatusUpdateCreateInput = {
      student: { connect: { id } },
      createdBy: access.user.name,
    };
    const mirror: Prisma.StudentUpdateInput = {};

    if (typeof overallReadiness === 'number') { entry.overallReadiness = overallReadiness; mirror.overallReadiness = overallReadiness; }
    if (typeof peerAverage === 'number') { entry.peerAverage = peerAverage; mirror.peerAverage = peerAverage; }
    if (subjectTargets !== undefined) { entry.subjectTargets = subjectTargets; mirror.subjectTargets = subjectTargets; }
    if (roadmap !== undefined) { entry.roadmap = roadmap; mirror.roadmap = roadmap; }
    if (riskSignals !== undefined) { entry.riskSignals = riskSignals; mirror.riskSignals = riskSignals; }
    if (typeof enrolledMonths === 'number' && Number.isInteger(enrolledMonths)) { mirror.enrolledMonths = enrolledMonths; }
    if (typeof note === 'string') { entry.note = note; }
    // 학생부 기록란: 빈 문자열은 "지움"으로 본다
    if (typeof recordSpecialNotes === 'string') {
      const v = recordSpecialNotes.trim() || null;
      entry.recordSpecialNotes = v; mirror.recordSpecialNotes = v;
    }
    if (typeof recordRemarks === 'string') {
      const v = recordRemarks.trim() || null;
      entry.recordRemarks = v; mirror.recordRemarks = v;
    }

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
