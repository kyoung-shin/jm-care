// 성적 과목 정의. 학년에 따라 과목 구성이 달라지므로 여기서만 정의하고 화면·리포트·PDF가 공유한다.
//
//   초·중  국어 · 영어 · 수학 · 사회 · 과학
//   고     국어 · 영어 · 수학 · 탐구
//
// 고등의 '탐구'는 초·중의 '과학'과 같은 칸(science)에 저장한다.
// 중3 → 고1 진학 후에도 같은 계열 점수 추이가 끊기지 않게 하기 위함이다.

export type SubjectField = 'korean' | 'english' | 'math' | 'social' | 'science';

export interface SubjectDef {
  label: string;
  field: SubjectField;
  color: string;
}

export const SUBJECT_COLOR: Record<SubjectField, string> = {
  korean: '#0f766e',
  english: '#2563eb',
  math: '#d97706',
  social: '#be123c',
  science: '#7c3aed',
};

const CORE: SubjectDef[] = [
  { label: '국어', field: 'korean', color: SUBJECT_COLOR.korean },
  { label: '영어', field: 'english', color: SUBJECT_COLOR.english },
  { label: '수학', field: 'math', color: SUBJECT_COLOR.math },
];

const ELEMENTARY_MIDDLE_SUBJECTS: SubjectDef[] = [
  ...CORE,
  { label: '사회', field: 'social', color: SUBJECT_COLOR.social },
  { label: '과학', field: 'science', color: SUBJECT_COLOR.science },
];

const HIGH_SUBJECTS: SubjectDef[] = [
  ...CORE,
  { label: '탐구', field: 'science', color: SUBJECT_COLOR.science },
];

/** 저장 가능한 모든 과목 칸 (마이그레이션·CSV 등 학년 무관 처리용) */
export const ALL_SUBJECT_FIELDS: SubjectField[] = ['korean', 'english', 'math', 'social', 'science'];

export function isHighSchoolGrade(grade?: string | null): boolean {
  return !!grade && grade.startsWith('고');
}

export function subjectsForGrade(grade?: string | null): SubjectDef[] {
  return isHighSchoolGrade(grade) ? HIGH_SUBJECTS : ELEMENTARY_MIDDLE_SUBJECTS;
}

/** 해당 학년에서 쓰는 과목 칸만 추출 */
export function subjectFieldsForGrade(grade?: string | null): SubjectField[] {
  return subjectsForGrade(grade).map(s => s.field);
}

/** 입력된 과목 점수들의 평균. 값이 없는 과목은 제외한다. */
export function averageOfSubjects(
  scores: Partial<Record<SubjectField, number | null | undefined>>,
  grade?: string | null
): number | null {
  const vals = subjectFieldsForGrade(grade)
    .map(f => scores[f])
    .filter((n): n is number => typeof n === 'number' && !Number.isNaN(n));
  if (vals.length === 0) return null;
  return +(vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(1);
}
