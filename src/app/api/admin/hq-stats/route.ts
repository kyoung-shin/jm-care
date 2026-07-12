import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getCurrentAppUser } from '@/lib/auth';

export async function GET() {
  try {
    const user = await getCurrentAppUser();
    if (user?.role !== 'ADMIN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);

    const [
      branchCount,
      activeBranchCount,
      preparingBranchCount,
      instructorCount,
      newInstructorsThisMonth,
      studentCount,
      schoolCount,
      verifiedSchoolCount,
    ] = await Promise.all([
      prisma.branch.count(),
      prisma.branch.count({ where: { status: 'ACTIVE' } }),
      prisma.branch.count({ where: { status: 'PREPARING' } }),
      prisma.user.count({ where: { role: 'INSTRUCTOR' } }),
      prisma.user.count({ where: { role: 'INSTRUCTOR', createdAt: { gte: monthStart } } }),
      prisma.student.count(),
      prisma.admissionSchool.count(),
      prisma.admissionSchool.count({ where: { status: 'VERIFIED' } }),
    ]);

    return NextResponse.json({
      branchCount,
      activeBranchCount,
      preparingBranchCount,
      instructorCount,
      newInstructorsThisMonth,
      studentCount,
      schoolCount,
      verifiedSchoolCount,
      updatingSchoolCount: schoolCount - verifiedSchoolCount,
    });
  } catch (e) {
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
