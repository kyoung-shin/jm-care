import { NextRequest, NextResponse } from 'next/server';
import { getSessionUserId } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { buildReportModel } from '@/lib/report-data';
import { buildReportPdf } from '@/server/report-pdf';

// 폰트 임베드 때문에 Node 런타임이 필요하다(Edge 불가)
export const runtime = 'nodejs';

// 학년으로부터 수능까지 남은 일수 추정 (students/[id] 라우트와 동일 기준)
const GRADE_INDEX: Record<string, number> = {
  초1: 0, 초2: 1, 초3: 2, 초4: 3, 초5: 4, 초6: 5,
  중1: 6, 중2: 7, 중3: 8, 고1: 9, 고2: 10, 고3: 11,
};
function estimateCsatDday(grade: string | null): number | null {
  if (!grade || !(grade in GRADE_INDEX)) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const academicYear = today.getMonth() >= 2 ? today.getFullYear() : today.getFullYear() - 1;
  const csatDate = new Date(academicYear + (11 - GRADE_INDEX[grade]), 10, 15);
  return Math.round((csatDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

function sanitizeFilenamePart(s: string) {
  return s.replace(/[\\/:*?"<>|]/g, '').replace(/\s+/g, '_').slice(0, 60);
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  const sp = req.nextUrl.searchParams;
  const examIdx = sp.get('examIdx') !== null ? Number(sp.get('examIdx')) : -1;
  const includeGrades = sp.get('includeGrades') !== '0';
  const reportId = sp.get('reportId');

  try {
    const student = await prisma.student.findUnique({
      where: { id },
      include: {
        instructor: { select: { name: true } },
        branch: { select: { name: true } },
        mockExams: { orderBy: { createdAt: 'asc' } },
        counselings: { orderBy: { createdAt: 'desc' } },
      },
    });
    if (!student) return NextResponse.json({ error: '학생을 찾을 수 없습니다' }, { status: 404 });

    const source = {
      ...student,
      subjectTargets: (student.subjectTargets as Record<string, number> | null) ?? null,
      daysUntilCSAT: estimateCsatDday(student.grade),
    };
    const model = buildReportModel(source, Number.isFinite(examIdx) ? examIdx : -1);

    // 발송된 리포트를 여는 경우 저장된 기간/메시지를 우선 사용한다
    let period = model.period;
    let message = '';
    if (reportId) {
      const report = await prisma.report.findFirst({ where: { id: reportId, studentId: id } });
      if (report) {
        period = report.period || period;
        message = report.message ?? '';
      }
    }

    const bytes = await buildReportPdf({
      studentName: student.name,
      grade: student.grade,
      school: student.school,
      branchName: student.branch?.name ?? '',
      instructorName: student.instructor?.name ?? '',
      enrolledMonths: student.enrolledMonths,
      period,
      generatedAt: new Date(),
      goal: {
        school: student.finalGoalSchool ?? '',
        detail: student.finalGoalDetail ?? '',
        track: student.finalGoalTrack ?? '',
        daysUntilCSAT: source.daysUntilCSAT,
      },
      stats: model.stats,
      subjects: model.subjects,
      exams: model.visibleExams,
      actions: model.actions,
      message,
      includeGrades,
    });

    const base = `JM-CARE_학습리포트_${sanitizeFilenamePart(student.name)}${period ? '_' + sanitizeFilenamePart(period) : ''}`;
    const ascii = `JM-CARE_report_${Date.now()}.pdf`;

    return new NextResponse(Buffer.from(bytes), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Length': String(bytes.length),
        // 한글 파일명은 RFC 5987 형식으로, 구형 클라이언트용 ASCII 대체값도 함께 보낸다
        'Content-Disposition':
          `attachment; filename="${ascii}"; filename*=UTF-8''${encodeURIComponent(base + '.pdf')}`,
        'Cache-Control': 'no-store',
      },
    });
  } catch (e) {
    console.error('[report pdf]', e);
    return NextResponse.json({ error: 'PDF 생성 중 오류가 발생했습니다' }, { status: 500 });
  }
}
