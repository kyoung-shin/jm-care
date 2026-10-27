// 리포트 본문 계산. 화면(ReportModal)과 PDF 출력이 같은 값을 쓰도록 여기서만 계산한다.

import { subjectsForGrade, type SubjectField } from '@/lib/subjects';

export interface ReportExamSource {
  id?: string;
  name: string;
  date: string;
  korean: number | null;
  english: number | null;
  math: number | null;
  social: number | null;
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
  // 표시 과목은 학년으로 결정된다 (초·중 5과목 / 고 4과목)
  const subjects = subjectsForGrade(student.grade);
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
    let best: { name: string; field: SubjectField; delta: number } | null = null;
    for (const s of subjects) {
      const a = firstExam[s.field];
      const b = latestExam[s.field];
      if (a === null || a === undefined || b === null || b === undefined) continue;
      const delta = b - a;
      if (!best || delta > best.delta) best = { name: s.label, field: s.field, delta };
    }
    bestSubject = best
      ? {
          label: `${best.name} ${best.delta >= 0 ? '+' : ''}${best.delta}`,
          delta: `${firstExam[best.field]} → ${latestExam[best.field]}`,
        }
      : { label: '데이터 없음', delta: '' };
  }

  const stats = [
    { label: '종합 백분위', value: avgValue, delta: avgDelta },
    { label: '전국 위치', value: percentile, delta: percentileDelta },
    { label: '최고 성장 과목', value: bestSubject.label, delta: bestSubject.delta },
  ];

  const subjectRows = subjects.map(({ label: name, field }) => {
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

  return {
    period, effectiveExamIdx, visibleExams, firstExam, latestExam, hasGrowthRange,
    stats, subjects: subjectRows, subjectDefs: subjects, actions,
  };
}

// ── 업로드된 기준표·로드맵을 리포트에 반영하는 부분 ─────────────────

export interface CriteriaRow { verdict: string; percentile: number; tierLabel: string }
export interface RoadmapRow { goal: string; stage: string; content: string; sortOrder: number }

/**
 * 종합 백분위로 전국 라인과 판정을 찾는다.
 * 기준표는 백분위 내림차순이고, 학생 점수 이하의 첫 구간이 그 학생의 위치다.
 */
export function resolveCriteria(percentile: number | null | undefined, table: CriteriaRow[]) {
  if (percentile === null || percentile === undefined || table.length === 0) return null;
  const sorted = [...table].sort((a, b) => b.percentile - a.percentile);
  const hit = sorted.find(r => percentile >= r.percentile);
  if (!hit) {
    const lowest = sorted[sorted.length - 1];
    return { tierLabel: `${lowest.tierLabel} 미만`, verdict: '', percentile: lowest.percentile, below: true };
  }
  return { tierLabel: hit.tierLabel, verdict: hit.verdict, percentile: hit.percentile, below: false };
}

/** 학년 → 로드맵 표의 구간명 */
export function roadmapStageForGrade(grade?: string | null): string | null {
  if (!grade) return null;
  if (/^초[456]$/.test(grade)) return '초등 고학년';
  if (/^초[123]$/.test(grade)) return '초등 고학년';
  if (/^중[123]$/.test(grade)) return grade;
  return null; // 고등학생은 표에 구간이 없다
}

// 로드맵 표의 목표는 "대학 이름"이 아니라 "목표 유형"이다(상위권 대학 / 의약계열 / 과기원 …).
// 학생 목표 문구가 표의 목표명과 글자로 겹치지 않아도 유형으로 맞출 수 있게 키워드를 둔다.
// 앞쪽 규칙이 우선이다 — 의예과 지망은 학교와 무관하게 의약계열 로드맵을 따른다.
const GOAL_CATEGORY_RULES: Array<{ table: RegExp; student: RegExp }> = [
  { table: /의약/, student: /의예|의대|의학|한의|치의|치대|약학|약대|수의|간호|의약|한의에/ },
  { table: /과기원|KAIST/i, student: /KAIST|카이스트|과기원|과학기술원|GIST|DGIST|UNIST|POSTECH|포항공/i },
  { table: /과학고|영재/, student: /과학고|영재/ },
  { table: /외고|국제고/, student: /외고|외국어고|국제고/ },
  { table: /상위권\s*대학/, student: /서울대|연세대|고려대|서강대|성균관대|한양대|중앙대|경희대|한국외대|외국어대|서울시립대|이화여대|건국대|동국대|홍익대/ },
  { table: /일반고/, student: /일반고/ },
];

/**
 * 목표 문구로 로드맵 행을 고른다.
 * 표의 목표명("고려대 등 상위권 대학")과 학생 목표("고려대학교")가 정확히 같지 않으므로
 * 서로를 포함하는지, 앞 세 글자가 겹치는지 보고, 그래도 안 되면 목표 유형 키워드로 맞춘다.
 * detail 은 학과·계열 문구(예: "한의예과")로, 유형 판단에만 쓴다.
 */
export function matchRoadmapGoal(goal: string | null | undefined, rows: RoadmapRow[], detail?: string | null): string | null {
  const goals = [...new Set(rows.map(r => r.goal))];
  if (goals.length === 0) return null;
  const g = (goal ?? '').replace(/\s+/g, '');
  const text = `${g} ${(detail ?? '').replace(/\s+/g, '')}`;
  // 의약계열처럼 학과로 정해지는 유형은 학교명 일치보다 앞선다
  const medical = GOAL_CATEGORY_RULES[0];
  if (medical.student.test(text)) {
    const hit = goals.find(x => medical.table.test(x));
    if (hit) return hit;
  }
  if (!g) return null;

  const exact = goals.find(x => x.replace(/\s+/g, '') === g);
  if (exact) return exact;
  const contains = goals.find(x => {
    const t = x.replace(/\s+/g, '');
    return t.includes(g) || g.includes(t);
  });
  if (contains) return contains;
  // "고려대학교" ↔ "고려대 등 상위권 대학" 처럼 학교명 앞부분만 겹치는 경우
  const head = g.slice(0, 3);
  const byHead = goals.find(x => x.replace(/\s+/g, '').includes(head));
  if (byHead) return byHead;
  // "서울대학교" 처럼 표에 이름이 없는 학교는 목표 유형으로 맞춘다
  for (const rule of GOAL_CATEGORY_RULES) {
    if (!rule.student.test(text)) continue;
    const hit = goals.find(x => rule.table.test(x));
    if (hit) return hit;
  }
  return null;
}

/** 학생의 목표·학년에 해당하는 학습 내용과, 이어지는 단계들 */
export function resolveRoadmap(
  goal: string | null | undefined,
  grade: string | null | undefined,
  rows: RoadmapRow[],
  detail?: string | null
) {
  const matchedGoal = matchRoadmapGoal(goal, rows, detail);
  if (!matchedGoal) return null;
  const mine = rows.filter(r => r.goal === matchedGoal).sort((a, b) => a.sortOrder - b.sortOrder);
  if (mine.length === 0) return null;
  const stage = roadmapStageForGrade(grade);
  const currentIdx = stage ? mine.findIndex(r => r.stage === stage) : -1;
  return {
    goal: matchedGoal,
    stage,
    current: currentIdx >= 0 ? mine[currentIdx] : null,
    steps: mine,
    currentIdx,
  };
}

/** 학생 현황 입력의 "장기 로드맵" 한 단계 */
export interface StudentRoadmapEntry { stage: string; label?: string; desc?: string; status?: string }

export interface ReportRoadmap {
  goal: string;
  /** 'student' = 담임이 학생별로 입력한 로드맵, 'template' = 본사 목표별 표 */
  source: 'student' | 'template';
  steps: Array<{ stage: string; content: string }>;
  currentIdx: number;
}

/**
 * 리포트에 실을 학년별 로드맵.
 * 담임이 학생 현황 입력에서 적은 로드맵이 있으면 그것을 쓰고,
 * 없을 때만 본사가 올린 목표별 표(roadmap.csv)로 채운다.
 */
export function resolveReportRoadmap(
  student: { roadmap?: unknown; finalGoalSchool?: string | null; finalGoalDetail?: string | null; grade?: string | null },
  rows: RoadmapRow[]
): ReportRoadmap | null {
  const own = (Array.isArray(student.roadmap) ? student.roadmap as StudentRoadmapEntry[] : [])
    .filter(r => r && typeof r.stage === 'string' && ((r.label ?? '').trim() || (r.desc ?? '').trim()));
  if (own.length > 0) {
    return {
      goal: student.finalGoalSchool?.trim() || '담임 설정 로드맵',
      source: 'student',
      steps: own.map(r => {
        const label = (r.label ?? '').trim();
        const desc = (r.desc ?? '').trim();
        return { stage: r.stage, content: label && desc ? `${label} — ${desc}` : label || desc };
      }),
      currentIdx: own.findIndex(r => r.status === 'current'),
    };
  }
  const plan = resolveRoadmap(student.finalGoalSchool, student.grade, rows, student.finalGoalDetail);
  if (!plan || plan.steps.length === 0) return null;
  return {
    goal: plan.goal,
    source: 'template',
    steps: plan.steps.map(x => ({ stage: x.stage, content: x.content })),
    currentIdx: plan.currentIdx,
  };
}
