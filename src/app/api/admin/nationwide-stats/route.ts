import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getCurrentAppUser } from '@/lib/auth';

type RiskSignal = { tone?: string };

export async function GET() {
  try {
    const user = await getCurrentAppUser();
    if (user?.role !== 'ADMIN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const [branches, students, reportsSent, reportsTotal] = await Promise.all([
      prisma.branch.findMany({ select: { id: true, name: true } }),
      prisma.student.findMany({ select: { branchId: true, enrolledMonths: true, riskSignals: true, overallReadiness: true } }),
      prisma.report.count({ where: { sentAt: { not: null } } }),
      prisma.report.count(),
    ]);

    // 지점별 평균 준비도: AVG(Student.overallReadiness) GROUP BY branchId
    const byBranch = new Map<string, { sum: number; count: number }>();
    for (const s of students) {
      if (s.overallReadiness === null) continue;
      const bucket = byBranch.get(s.branchId) ?? { sum: 0, count: 0 };
      bucket.sum += s.overallReadiness;
      bucket.count += 1;
      byBranch.set(s.branchId, bucket);
    }
    const branchReadiness = branches
      .map(b => {
        const bucket = byBranch.get(b.id);
        return {
          branchId: b.id,
          branchName: b.name,
          avgReadiness: bucket ? Math.round(bucket.sum / bucket.count) : null,
          studentCount: bucket?.count ?? 0,
        };
      })
      .filter(b => b.studentCount > 0)
      .sort((a, b) => (b.avgReadiness ?? 0) - (a.avgReadiness ?? 0));

    // 전사 재원 안정성
    const totalStudents = students.length;

    const avgEnrolledMonths = totalStudents > 0
      ? +(students.reduce((sum, s) => sum + s.enrolledMonths, 0) / totalStudents).toFixed(1)
      : 0;

    const retainedCount = students.filter(s => s.enrolledMonths >= 12).length;
    const retention12moRate = totalStudents > 0 ? Math.round((retainedCount / totalStudents) * 100) : 0;

    const atRiskCount = students.filter(s =>
      Array.isArray(s.riskSignals) && (s.riskSignals as RiskSignal[]).some(r => r?.tone === 'risk' || r?.tone === 'critical')
    ).length;
    const atRiskRate = totalStudents > 0 ? +((atRiskCount / totalStudents) * 100).toFixed(1) : 0;

    return NextResponse.json({
      branchReadiness,
      enrollmentStability: {
        avgEnrolledMonths,
        totalStudents,
        retainedCount,
        retention12moRate,
        atRiskCount,
        atRiskRate,
        reportsSent,
        reportsTotal,
        reportViewTrackingAvailable: false,
      },
    });
  } catch (e) {
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
