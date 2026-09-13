// 리포트 본문 계산. 화면(ReportModal)과 PDF 출력이 같은 값을 쓰도록 여기서만 계산한다.

export const REPORT_SUBJECTS = ['국어', '영어', '수학', '과학'] as const;
export const SUBJECT_FIELD: Record<string, 'korean' | 'english' | 'math' | 'science'> = {
  국어: 'korean', 영어: 'english', 수학: 'math', 과학: 'science',
};

export interface ReportExamSource {
  id?: string;
  name: string;
  date: string;
  korean: number | null;
  english: number | null;
  math: number | null;
  science: number | null;
  avg: number | null;
  percentile: string | null;
}

export interface ReportCounselingSource {
  actionName: string | null;
  actionOwner: string | null;
  actionDeadline: string | null;
  actionStatus: string;
}

export interface ReportStudentSource {
  name: string;
  grade: string;
  school: string;
  enrolledMonths: number;
  finalGoalSchool: string | null;
  finalGoalDetail: string | null;
  finalGoalTrack: string | null;
  daysUntilCSAT: number | null;
  subjectTargets: Record<string, number> | null;
  instructor: { name: string } | null;
  branch: { name: string } | null;
  mockExams: ReportExamSource[];
  counselings: ReportCounselingSource[];
}

const ACTION_STATUS_LABEL: Record<string, string> = {
  'done': '완료', 'completed': '완료', 'in-progress': '진행 중', 'pending': '대기', 'planned': '예정',
};

export function formatPeriodLabel(dateStr: string): string {
  const m = dateStr.match(/(\d{4})\.(\d{2})/);
  return m ? `${m[1]}년 ${Number(m[2])}월` : dateStr;
}

export function buildReportModel(student: ReportStudentSource, selectedExamIdx = -1) {
  const examCount = student.mockExams.length;
  const effectiveExamIdx = selectedExamIdx >= 0 && selectedExamIdx < examCount ? selectedExamIdx : examCount - 1;
  const visibleExams = student.mockExams.slice(0, effectiveExamIdx + 1);
  const firstExam = visibleExams[0];
  const latestExam = visibleExams[visibleExams.length - 1];
  const hasGrowthRange = !!(firstExam && latestExam && firstExam !== latestExam);
  const period = latestExam ? formatPeriodLabel(latestExam.date) : '';

  const percentile = latestExam?.percentile ?? '데이터 없음';
  const percentileDelta = hasGrowthRange && firstExam?.percentile ? `${firstExam.percentile}에서 변화` : '';
  const avgValue = latestExam?.avg === null || latestExam?.avg === undefined
    ? '데이터 없음'
    : hasGrowthRange && firstExam?.avg != null ? `${firstExam.avg} → ${latestExam.avg}` : `${latestExam.avg}`;
  const avgDelta = hasGrowthRange && firstExam?.avg != null && latestExam?.avg != null
    ? `${latestExam.avg - firstExam.avg >= 0 ? '+' : ''}${(latestExam.avg - firstExam.avg).toFixed(1)}`
    : '';

  let bestSubject: { label: string; delta: string } = { label: '데이터 부족', delta: '모의고사 2회 이상 필요' };
  if (hasGrowthRange && firstExam && latestExam) {
    let best: { name: string; delta: number } | null = null;
    for (const name of REPORT_SUBJECTS) {
      const field = SUBJECT_FIELD[name];
      const a = firstExam[field];
      const b = latestExam[field];
      if (a === null || b === null) continue;
      const delta = b - a;
      if (!best || delta > best.delta) best = { name, delta };
    }
    bestSubject = best
      ? {
          label: `${best.name} ${best.delta >= 0 ? '+' : ''}${best.delta}`,
          delta: `${firstExam[SUBJECT_FIELD[best.name]]} → ${latestExam[SUBJECT_FIELD[best.name]]}`,
        }
      : { label: '데이터 없음', delta: '' };
  }

  const stats = [
    { label: '종합 백분위', value: avgValue, delta: avgDelta },
    { label: '전국 위치', value: percentile, delta: percentileDelta },
    { label: '최고 성장 과목', value: bestSubject.label, delta: bestSubject.delta },
  ];

  const subjects = REPORT_SUBJECTS.map(name => {
    const field = SUBJECT_FIELD[name];
    const current = latestExam?.[field] ?? null;
    const target = student.subjectTargets?.[name] ?? null;
    const gap = current !== null && target !== null ? +(current - target).toFixed(1) : null;
    const status = gap === null ? null : gap >= 0 ? 'good' : gap >= -3 ? 'close' : gap >= -7 ? 'lacking' : 'risk';
    const note = target === null
      ? '목표 점수가 설정되지 않았습니다.'
      : current === null
      ? '등록된 모의고사 성적이 없습니다.'
      : status === 'good' ? '목표를 충족했습니다. 현 수준을 유지해 주세요.'
      : status === 'close' ? '목표에 근접했습니다. 꾸준한 관리로 충족 가능합니다.'
      : status === 'lacking' ? '목표 대비 격차가 있습니다. 보강이 필요합니다.'
      : '목표 대비 격차가 큽니다. 집중 보강이 시급합니다.';
    return { name, current, target, status: status as 'good' | 'close' | 'lacking' | 'risk' | null, note };
  });

  const actions = student.counselings
    .filter(c => c.actionName && c.actionName !== '(액션 미설정)')
    .slice(0, 6)
    .map(c => ({
      name: c.actionName ?? '',
      owner: c.actionOwner ?? '',
      deadline: c.actionDeadline ?? '',
      status: ACTION_STATUS_LABEL[c.actionStatus] ?? c.actionStatus,
    }));

  return { period, effectiveExamIdx, visibleExams, firstExam, latestExam, hasGrowthRange, stats, subjects, actions };
}
