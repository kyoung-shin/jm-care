export type SubjectStatus = 'good' | 'close' | 'lacking' | 'risk';
export type ActionStatus = 'in-progress' | 'completed' | 'overdue' | 'urgent';
export type RoadmapStatus = 'current' | 'upcoming' | 'goal';
export type Priority = 'critical' | 'high';

export interface TargetStudent {
  name: string;
  initial: string;
  grade: string;
  school: string;
  enrolledMonths: number;
  homeroom: string;
  finalGoal: { school: string; detail: string; track: string };
  midGoal: { school: string; detail: string; track: string };
  daysUntilCSAT: number;
  daysUntilHS: number;
  overallReadiness: number;
  peerAverage: number;
}

export interface MockExam {
  name: string;
  date: string;
  fullName: string;
  국어: number;
  영어: number;
  수학: number;
  과학: number;
  avg: number;
  percentile: string;
}

export interface Subject {
  name: string;
  current: number;
  target: number;
  gap: number;
  status: SubjectStatus;
  source: string;
  trend: number[];
}

export interface RoadmapStep {
  stage: string;
  period: string;
  label: string;
  desc: string;
  status: RoadmapStatus;
}

export interface CounselingAction {
  name: string;
  owner: string;
  deadline: string;
  status: ActionStatus;
}

export interface CounselingRecord {
  date: string;
  type: string;
  topic: string;
  summary: string;
  internalMemo: string;
  parentShare: string;
  action: CounselingAction;
  isNew?: boolean;
}

export interface GoalHistory {
  date: string;
  label: string;
  target: string;
  track: string;
  reason?: string;
  current: boolean;
}

export interface RiskSignal {
  label: string;
  value: string;
  detail: string;
  tone: 'good' | 'risk';
  icon: string;
}

export interface AlertStudent {
  name: string;
  grade: string;
  target: string;
  signal: string;
  detail: string;
  priority: Priority;
  daysAgo: number;
}

export interface StudentListItem {
  name: string;
  grade: string;
  target: string;
  readiness: number;
  status: SubjectStatus;
  lastCheck: string;
  nextCheck: string;
  signals: number;
}

export interface InstructorAction {
  student: string;
  task: string;
  deadline: string;
  daysLeft: number;
  status: ActionStatus;
}

export interface ScheduleItem {
  time: string;
  type: string;
  label: string;
  urgent?: boolean;
}

export interface WeekDay {
  date: string;
  day: string;
  isToday?: boolean;
  items: ScheduleItem[];
}

export interface InstructorData {
  name: string;
  role: string;
  branch: string;
  myStudentsCount: number;
  todayItems: number;
  urgentActions: number;
  alertStudents: AlertStudent[];
  myStudents: StudentListItem[];
  myActions: InstructorAction[];
  thisWeek: WeekDay[];
}

export interface ParentGrowth {
  subject: string;
  from: number;
  to: number;
  delta: number;
  highlight: boolean;
}

export interface ParentSubject {
  name: string;
  status: SubjectStatus;
  headline: string;
  detail: string;
}

export interface ParentSchedule {
  date: string;
  label: string;
  who: string;
}

export interface OngoingPromise {
  task: string;
  detail: string;
  since: string;
  progress: number;
}

export interface RecentCounseling {
  date: string;
  summary: string;
}

export interface MonthlyReport {
  month: string;
  date: string;
}

export interface ParentData {
  parentName: string;
  child: string;
  childGrade: string;
  homeroom: string;
  finalGoal: string;
  track: string;
  daysUntilCSAT: number;
  overallReadiness: number;
  trendChange: number;
  schoolMessage: string;
  messageFrom: string;
  growth: ParentGrowth[];
  subjects: ParentSubject[];
  upcomingSchedule: ParentSchedule[];
  ongoingPromises: OngoingPromise[];
  recentCounseling: RecentCounseling[];
  reports: MonthlyReport[];
}

export const targetStudent: TargetStudent = {
  name: '김민준', initial: '김', grade: '중2', school: '파주 운정중',
  enrolledMonths: 12, homeroom: '박지훈 강사',
  finalGoal: { school: '고려대학교', detail: '공학계열 희망', track: '수시·정시 트랙 고1 결정 예정' },
  midGoal: { school: '일반고 상위권 트랙', detail: '내신 1점대 진입 기반 조성', track: '고입 2027' },
  daysUntilCSAT: 1647, daysUntilHS: 477,
  overallReadiness: 71, peerAverage: 78,
};

export const mockExams: MockExam[] = [
  { name: '1차', date: '2025.06.14', fullName: '2025 6월 전국 학력평가', 국어: 72, 영어: 80, 수학: 68, 과학: 75, avg: 73.8, percentile: '상위 26.2%' },
  { name: '2차', date: '2025.09.13', fullName: '2025 9월 전국 학력평가', 국어: 76, 영어: 84, 수학: 75, 과학: 78, avg: 78.3, percentile: '상위 21.7%' },
  { name: '3차', date: '2025.12.13', fullName: '2025 12월 전국 학력평가', 국어: 81, 영어: 86, 수학: 82, 과학: 77, avg: 81.5, percentile: '상위 18.5%' },
  { name: '4차', date: '2026.03.14', fullName: '2026 3월 전국 학력평가', 국어: 84, 영어: 89, 수학: 88, 과학: 82, avg: 85.8, percentile: '상위 14.2%' },
];

export const subjectColors: Record<string, string> = { 국어: '#0f766e', 영어: '#2563eb', 수학: '#d97706', 과학: '#7c3aed' };

export const subjects: Subject[] = [
  { name: '국어', current: 84, target: 90, gap: -6, status: 'risk', source: '4차 학평 (2026.03)', trend: [72, 76, 81, 84] },
  { name: '영어', current: 89, target: 88, gap: +1, status: 'good', source: '4차 학평 (2026.03)', trend: [80, 84, 86, 89] },
  { name: '수학', current: 88, target: 90, gap: -2, status: 'close', source: '4차 학평 (2026.03)', trend: [68, 75, 82, 88] },
  { name: '과학', current: 82, target: 88, gap: -6, status: 'lacking', source: '4차 학평 (2026.03)', trend: [75, 78, 77, 82] },
];

export const roadmap: RoadmapStep[] = [
  { stage: '중2', period: '2026 · 현재', label: '기초 역량 완성', desc: '국영수과 백분위 90 도달 + 학습 습관 정착', status: 'current' },
  { stage: '중3', period: '2027', label: '고입 · 고교 선행', desc: '일반고 진학 + 수학·과학 고1 과정 선행 완성', status: 'upcoming' },
  { stage: '고1', period: '2028', label: '내신 1점대 진입', desc: '첫 내신 안착 + 수시/정시 트랙 결정', status: 'upcoming' },
  { stage: '고2', period: '2029', label: '학생부 핵심 완성', desc: '공학계열 탐구·활동 완성 + 모의고사 1등급권', status: 'upcoming' },
  { stage: '고3', period: '2030', label: '수능 · 지원', desc: '고려대 수시/정시 지원', status: 'goal' },
];

export const counseling: CounselingRecord[] = [
  {
    date: '2026.04.15', type: '정기상담', topic: '학습',
    summary: '4차 학평 분석 결과 국어 백분위 84로 상승 추세이나, 고려대 합격생 중2 시점 평균(90) 대비 갭 최대. 비문학 독해 기초 체력이 원인으로 진단되어 독해 기초반 편성 결정.',
    internalMemo: '학생이 문학 지문은 강하나 비문학(특히 과학·기술 지문)에서 시간 부족. 학부모가 국어보다 수학에 관심이 집중되어 있어, 국어 보강 필요성을 데이터로 설득할 것.',
    parentShare: '국어 비문학 독해력 향상을 위해 독해 기초반을 시작합니다. 6월 학평에서 성과를 확인하겠습니다.',
    action: { name: '국어 독해 기초반 편성 (주 2회)', owner: '박지훈 강사', deadline: '2026.05.31', status: 'in-progress' },
  },
  {
    date: '2026.01.10', type: '정기상담', topic: '학습',
    summary: '3차 학평 분석. 수학 백분위 68→82 급성장 확인 (입학 후 +14). 현 추세 유지를 위해 고1 과정 심화 선행 시작 결정.',
    internalMemo: '수학 자신감이 학습 전반의 동력이 되고 있음. 이 흐름을 칭찬으로 강화하되 과신은 경계.',
    parentShare: '수학이 크게 성장하여 고1 과정 선행을 시작합니다. 월간 점검으로 꼼꼼히 관리하겠습니다.',
    action: { name: '수학 고1 선행반 배정 + 월간 점검', owner: '김서연 강사', deadline: '2026.02.28', status: 'completed' },
  },
  {
    date: '2025.11.20', type: '진로상담', topic: '진로',
    summary: '학부모 면담. 학생의 공학 분야 흥미와 1년간 성장 추세를 근거로 최종 목표를 고려대학교(공학계열)로 구체화. 중간 목표는 일반고 상위권 트랙으로 합의.',
    internalMemo: '학부모가 처음에는 의대를 희망했으나, 학생 본인의 공학 흥미와 적성을 데이터로 보여드린 후 공학계열에 동의. 학생 동기부여가 핵심 자산.',
    parentShare: '민준이의 공학 분야 흥미와 성장 추세를 근거로 고려대학교(공학계열)를 목표로 정하고, 5년 로드맵을 수립했습니다.',
    action: { name: '5년 장기 로드맵 수립 및 공유', owner: '박지훈 강사', deadline: '2025.12.10', status: 'completed' },
  },
];

export const goalHistory = [
  { date: '2025.05', label: '입학', target: '인서울 상위권 대학', track: '방향 탐색 단계', current: false },
  { date: '2025.11', label: '목표 구체화', target: '고려대학교 (공학계열)', track: '5년 장기 로드맵',
    reason: '1년간 모의고사 종합 백분위 73.8→81.5 상승 추세 + 학생의 공학 분야 흥미 구체화', current: false },
  { date: '현재', label: '진행 중', target: '고려대학교 (공학계열)', track: '중등 기초역량 단계', current: true },
];

export const riskSignals = [
  { label: '출결', value: '정상', detail: '최근 4주 결석 0회', tone: 'good' as const },
  { label: '과제 수행률', value: '88%', detail: '직전 분기 85%', tone: 'good' as const },
  { label: '학습 태도', value: '양호', detail: '강사 관찰 메모 +3건', tone: 'good' as const },
  { label: '종합 이탈위험', value: '낮음', detail: '신호 0건 / 4지표', tone: 'good' as const },
];

export const instructorData: InstructorData = {
  name: '박지훈', role: '담임 강사', branch: '운정점',
  myStudentsCount: 12, todayItems: 3, urgentActions: 2,
  alertStudents: [
    { name: '이서연', grade: '중2', target: '고양국제고', signal: '출결+참여 신호',
      detail: '최근 4주 결석 3회, 과제 수행률 48% (직전 분기 80%)', priority: 'critical', daysAgo: 3 },
    { name: '김민준', grade: '중2', target: '고려대학교 (장기)', signal: '학습 신호',
      detail: '국어 백분위, 합격생 평균 경로 대비 갭 -6 지속', priority: 'high', daysAgo: 7 },
  ],
  myStudents: [
    { name: '이서연', grade: '중2', target: '고양국제고', readiness: 61, status: 'risk', lastCheck: '04.22', nextCheck: '05.10', signals: 2 },
    { name: '김민준', grade: '중2', target: '고려대학교 (장기 로드맵)', readiness: 71, status: 'lacking', lastCheck: '04.15', nextCheck: '05.20', signals: 1 },
    { name: '정유진', grade: '중3', target: '연세대학교 (장기 로드맵)', readiness: 75, status: 'close', lastCheck: '04.20', nextCheck: '05.22', signals: 0 },
    { name: '윤하늘', grade: '중3', target: '김포외고', readiness: 78, status: 'close', lastCheck: '05.03', nextCheck: '05.17', signals: 0 },
    { name: '박준호', grade: '중1', target: '과학고 탐색 트랙', readiness: 81, status: 'good', lastCheck: '04.28', nextCheck: '05.25', signals: 0 },
    { name: '최지원', grade: '중3', target: '서울대학교 (장기 로드맵)', readiness: 87, status: 'good', lastCheck: '05.01', nextCheck: '05.18', signals: 0 },
  ],
  myActions: [
    { student: '이서연', task: '결석 사유 1:1 면담', deadline: '2026.05.10', daysLeft: -2, status: 'overdue' },
    { student: '박준호', task: '학부모 진로 상담 진행', deadline: '2026.05.14', daysLeft: 2, status: 'urgent' },
    { student: '김민준', task: '수학 고1 선행 월간 점검', deadline: '2026.05.15', daysLeft: 3, status: 'in-progress' },
    { student: '정유진', task: '장기 로드맵 중간 리뷰', deadline: '2026.05.18', daysLeft: 6, status: 'in-progress' },
    { student: '김민준', task: '국어 독해 기초반 (주 2회 진행 중)', deadline: '2026.05.31', daysLeft: 19, status: 'in-progress' },
  ],
  thisWeek: [
    { date: '05.12', day: '월', isToday: true, items: [
      { time: '17:00', type: '수업', label: '중2 심화 수학' },
      { time: '19:30', type: '보충', label: '김민준 국어 독해' }] },
    { date: '05.13', day: '화', items: [
      { time: '16:00', type: '면담', label: '이서연 1:1 (지연중)', urgent: true },
      { time: '19:00', type: '수업', label: '중2 심화 과학' }] },
    { date: '05.14', day: '수', items: [
      { time: '14:00', type: '상담', label: '박준호 학부모' },
      { time: '17:00', type: '수업', label: '중1 통합' }] },
    { date: '05.15', day: '목', items: [
      { time: '18:00', type: '점검', label: '김민준 수학 월간' }] },
    { date: '05.16', day: '금', items: [
      { time: '15:00', type: '학평', label: '전국 학력평가 (5차)' }] },
  ],
};

export const parentData: ParentData = {
  parentName: '김민준 학부모',
  child: '김민준', childGrade: '중2', homeroom: '박지훈 담임 강사',
  finalGoal: '고려대학교 (공학계열)', track: '5년 장기 로드맵 · 중등 기초역량 단계',
  daysUntilCSAT: 1647, overallReadiness: 71, trendChange: 9,
  schoolMessage: '민준이는 입학 후 1년간 종합 백분위가 73.8에서 85.8로 12점 상승했습니다. 특히 수학은 68에서 88로 가장 크게 성장해 고1 선행을 시작했습니다. 이번 학기는 국어 독해 기초를 중점 보강하고 있으며, 고려대 합격생들의 중2 시점 평균 수준까지 격차를 좁혀가는 것이 올해 목표입니다.',
  messageFrom: '박지훈 담임 강사',
  growth: [
    { subject: '수학', from: 68, to: 88, delta: 20, highlight: true },
    { subject: '영어', from: 80, to: 89, delta: 9, highlight: false },
    { subject: '국어', from: 72, to: 84, delta: 12, highlight: false },
    { subject: '과학', from: 75, to: 82, delta: 7, highlight: false },
  ],
  subjects: [
    { name: '국어', status: 'risk', headline: '집중 보강 중', detail: '독해 기초반을 주 2회로 시작했습니다' },
    { name: '영어', status: 'good', headline: '목표 도달', detail: '현 수준 유지로 충분합니다' },
    { name: '수학', status: 'close', headline: '최고 성장', detail: '1년간 +20, 고1 선행 진행 중입니다' },
    { name: '과학', status: 'lacking', headline: '점진 상승', detail: '탐구 개념 보강을 병행하고 있습니다' },
  ],
  upcomingSchedule: [
    { date: '2026.05.16', label: '5차 전국 학력평가', who: '학원 전체' },
    { date: '2026.05.20', label: '정기 학습 점검 + 5차 학평 분석', who: '박지훈 담임 강사' },
    { date: '2026.06.20', label: '여름방학 학습 전략 면담', who: '박지훈 담임 강사 + 학부모' },
  ],
  ongoingPromises: [
    { task: '국어 독해 기초반', detail: '주 2회 · 박지훈 강사', since: '2026.05.01', progress: 30 },
    { task: '수학 고1 선행반', detail: '주 4회 · 김서연 강사', since: '2026.02.01', progress: 65 },
    { task: '월간 학습 코칭 + 로드맵 점검', detail: '월 1회 정기', since: '2025.12.01', progress: 80 },
  ],
  recentCounseling: [
    { date: '2026.04.15', summary: '국어 보강 결정. 비문학 독해 기초 체력 향상을 위해 독해 기초반을 주 2회로 시작합니다. 5차 학평에서 결과를 점검하기로 했습니다.' },
    { date: '2026.01.10', summary: '수학이 1년간 가장 크게 성장하여(백분위 +14) 고1 과정 선행을 시작했습니다. 월간 점검으로 진도와 이해도를 관리합니다.' },
    { date: '2025.11.20', summary: '진로 면담. 민준이의 공학 분야 흥미와 성장 추세를 근거로 최종 목표를 고려대학교(공학계열)로 함께 정했습니다. 5년 로드맵을 수립해 공유드렸습니다.' },
  ],
  reports: [
    { month: '2026년 4월', date: '2026.05.03' },
    { month: '2026년 3월', date: '2026.04.05' },
    { month: '2026년 2월', date: '2026.03.04' },
  ],
};

export const statusConfig: Record<string, { label: string; text: string; bg: string; border: string; stroke: string; soft: string }> = {
  good:    { label: '충족', text: 'text-emerald-700', bg: 'bg-emerald-50', border: 'border-emerald-200', stroke: '#059669', soft: 'bg-emerald-500' },
  close:   { label: '근접', text: 'text-blue-700',    bg: 'bg-blue-50',    border: 'border-blue-200',    stroke: '#2563eb', soft: 'bg-blue-500' },
  lacking: { label: '부족', text: 'text-amber-700',   bg: 'bg-amber-50',   border: 'border-amber-200',   stroke: '#d97706', soft: 'bg-amber-500' },
  risk:    { label: '위험', text: 'text-red-700',     bg: 'bg-red-50',     border: 'border-red-200',     stroke: '#dc2626', soft: 'bg-red-500' },
  critical:{ label: '긴급', text: 'text-red-700',     bg: 'bg-red-50',     border: 'border-red-300',     stroke: '#b91c1c', soft: 'bg-red-600' },
};

export const actionStatusConfig: Record<string, { label: string; dot: string; text: string; bg: string }> = {
  'in-progress': { label: '진행 중',  dot: 'bg-blue-500',    text: 'text-blue-700',    bg: 'bg-blue-50' },
  'completed':   { label: '완료',     dot: 'bg-emerald-500', text: 'text-emerald-700', bg: 'bg-emerald-50' },
  'overdue':     { label: '기한초과', dot: 'bg-red-500',     text: 'text-red-700',     bg: 'bg-red-50' },
  'urgent':      { label: '임박',     dot: 'bg-amber-500',   text: 'text-amber-700',   bg: 'bg-amber-50' },
};
