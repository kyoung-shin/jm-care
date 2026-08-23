'use client';
import RoleGuard from '@/components/RoleGuard';

import { useState, useEffect, useCallback } from 'react';
import {
  AlertTriangle, CheckCircle2, Target, MessageSquare,
  ArrowUpRight, Sparkles, FileText,
  Activity, TrendingUp, BookOpen,
} from 'lucide-react';
import { LineChart, Line, ResponsiveContainer, ReferenceLine, YAxis } from 'recharts';
import MockExamChart, { type MockExamRow } from '@/components/charts/MockExamChart';
import Roadmap, { type RoadmapStep } from '@/components/dashboard/Roadmap';
import CounselingModal from '@/components/modals/CounselingModal';
import ReportModal from '@/components/modals/ReportModal';
import StudentPickerModal from '@/components/modals/StudentPickerModal';
import Footer from '@/components/dashboard/Footer';
import { statusConfig, actionStatusConfig, type CounselingRecord } from '@/lib/dummy-data';

const SUBJECT_NAMES = ['국어', '영어', '수학', '과학'] as const;
type SubjectName = (typeof SUBJECT_NAMES)[number];
const SUBJECT_FIELD: Record<SubjectName, 'korean' | 'english' | 'math' | 'science'> = {
  국어: 'korean', 영어: 'english', 수학: 'math', 과학: 'science',
};

interface StudentDetail {
  id: string;
  name: string;
  initial: string;
  grade: string;
  school: string;
  enrolledMonths: number;
  finalGoalSchool: string | null;
  finalGoalDetail: string | null;
  finalGoalTrack: string | null;
  midGoalSchool: string | null;
  midGoalDetail: string | null;
  midGoalTrack: string | null;
  daysUntilCSAT: number | null;
  daysUntilHS: number | null;
  overallReadiness: number | null;
  peerAverage: number | null;
  roadmap: RoadmapStep[] | null;
  riskSignals: { label: string; value: string; detail: string; tone: 'good' | 'risk' }[] | null;
  subjectTargets: Partial<Record<SubjectName, number>> | null;
  instructor: { id: string; name: string } | null;
  mockExams: MockExamRow[];
  goalHistories: { id: string; date: string; label: string; target: string; track: string; reason: string | null; isCurrent: boolean }[];
}

interface ComputedSubject {
  name: SubjectName;
  current: number | null;
  target: number | null;
  gap: number | null;
  status: 'good' | 'close' | 'lacking' | 'risk' | null;
  source: string;
  trend: number[];
}

function computeSubjects(mockExams: MockExamRow[], subjectTargets: Partial<Record<SubjectName, number>> | null): ComputedSubject[] {
  const latest = mockExams[mockExams.length - 1];
  return SUBJECT_NAMES.map(name => {
    const field = SUBJECT_FIELD[name];
    const trend = mockExams.map(e => e[field]).filter((v): v is number => typeof v === 'number');
    const current = latest?.[field] ?? null;
    const target = subjectTargets?.[name] ?? null;
    const gap = typeof current === 'number' && typeof target === 'number' ? current - target : null;
    const status: ComputedSubject['status'] =
      gap === null ? null : gap >= 0 ? 'good' : gap >= -3 ? 'close' : gap >= -6 ? 'lacking' : 'risk';
    return { name, current, target, gap, status, source: latest ? `${latest.name} · ${latest.date}` : '기록 없음', trend };
  });
}

const DEFAULT_RISK_SIGNALS: StudentDetail['riskSignals'] = [
  { label: '출결', value: '—', detail: '기록 없음', tone: 'good' },
  { label: '과제 수행률', value: '—', detail: '기록 없음', tone: 'good' },
  { label: '학습 태도', value: '—', detail: '기록 없음', tone: 'good' },
  { label: '종합 이탈위험', value: '—', detail: '기록 없음', tone: 'good' },
];

function DirectorPage() {
  const [branchId, setBranchId] = useState<string | null>(null);
  const [studentId, setStudentId] = useState<string | null>(null);
  const [student, setStudent] = useState<StudentDetail | null>(null);
  const [counselingList, setCounselingList] = useState<CounselingRecord[]>([]);
  const [reportOpen, setReportOpen] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [counselingModal, setCounselingModal] = useState<{
    mode: 'new' | 'detail';
    data?: CounselingRecord;
    prefill?: { subject?: string; topic?: string; summary?: string; action?: string } | null;
  } | null>(null);

  useEffect(() => {
    fetch('/api/auth/me')
      .then(r => r.json())
      .then(async me => {
        if (!me?.branchId) return;
        setBranchId(me.branchId);
        const students = await fetch(`/api/students?branchId=${me.branchId}`).then(r => r.json());
        if (Array.isArray(students) && students.length > 0) {
          const preferred = students.find((s: { id: string }) => s.id === 'student_minjun') ?? students[0];
          setStudentId(preferred.id);
        } else {
          setStudentId('student_minjun');
        }
      })
      .catch(() => setStudentId('student_minjun'));
  }, []);

  useEffect(() => {
    if (!studentId) return;
    fetch(`/api/students/${studentId}`)
      .then(r => r.json())
      .then(d => { if (!d.error) setStudent(d); })
      .catch(() => {});
    fetch(`/api/students/${studentId}/counselings`)
      .then(r => r.json())
      .then(d => { if (Array.isArray(d)) setCounselingList(d); })
      .catch(() => setCounselingList([]));
  }, [studentId]);

  const handleSaveCounseling = useCallback(async (record: CounselingRecord) => {
    if (!studentId) return;
    setCounselingList(prev => [record, ...prev]);
    setCounselingModal(null);
    try {
      await fetch(`/api/students/${studentId}/counselings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(record),
      });
    } catch { /* best-effort */ }
  }, [studentId]);

  const handleToggleAction = useCallback(async (counselingDate: string) => {
    if (!studentId) return;
    setCounselingList(prev =>
      prev.map(c =>
        c.date === counselingDate
          ? { ...c, action: { ...c.action, status: c.action.status === 'completed' ? 'in-progress' : 'completed' } }
          : c
      )
    );
    try {
      await fetch(`/api/students/${studentId}/counselings`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date: counselingDate }),
      });
    } catch { /* best-effort */ }
  }, [studentId]);

  if (!student) {
    return (
      <RoleGuard allowed={['DIRECTOR']}>
        <div className="max-w-7xl mx-auto px-8 py-16 text-center text-sm text-slate-400">불러오는 중...</div>
      </RoleGuard>
    );
  }

  const subjects = computeSubjects(student.mockExams, student.subjectTargets);
  const worstTwo = [...subjects]
    .filter(s => s.gap !== null)
    .sort((a, b) => (a.gap ?? 0) - (b.gap ?? 0))
    .slice(0, 2);
  const risk = student.riskSignals && student.riskSignals.length > 0 ? student.riskSignals : DEFAULT_RISK_SIGNALS!;
  const firstExam = student.mockExams[0];
  const lastExam = student.mockExams[student.mockExams.length - 1];
  const avgDelta = firstExam && lastExam && typeof firstExam.avg === 'number' && typeof lastExam.avg === 'number'
    ? +(lastExam.avg - firstExam.avg).toFixed(1)
    : null;
  const currentRoadmapLabel = student.roadmap?.find(r => r.status === 'current')?.label ?? '진행 단계';

  return (
    <RoleGuard allowed={['DIRECTOR']}>
    <div className="max-w-7xl mx-auto px-8 py-8">
      <div className="mb-7 flex items-end justify-between border-b border-stone-200 pb-5">
        <div>
          <div className="text-[11px] uppercase tracking-[0.2em] text-slate-500 mb-1.5">Student Comprehensive View</div>
          <div className="serif-ko text-[34px] font-black text-slate-900 leading-none">학생 종합 현황</div>
          <div className="text-sm text-slate-500 mt-2">최종 목표 기준으로 본 한 학생의 모든 것 — 장기 로드맵 관리</div>
        </div>
        <div className="flex items-center gap-3 text-xs">
          <button onClick={() => setReportOpen(true)} className="px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-white border border-amber-600 rounded font-semibold flex items-center gap-1 shadow-sm">
            <FileText size={12} /> 학부모 리포트 생성
          </button>
          <button onClick={() => setCounselingModal({ mode: 'new', prefill: null })} className="px-3 py-1.5 bg-slate-900 text-white rounded hover:bg-slate-800 flex items-center gap-1">
            <MessageSquare size={12} /> 상담 기록 +
          </button>
        </div>
      </div>

      {/* Hero 3-cards */}
      <div className="grid grid-cols-12 gap-4 mb-4">
        <button
          onClick={() => setPickerOpen(true)}
          className="col-span-4 bg-white border border-stone-200 rounded-xl p-6 text-left hover:border-slate-400 hover:shadow-sm transition-all cursor-pointer"
        >
          <div className="flex items-center justify-between mb-3">
            <div className="text-[10px] uppercase tracking-widest text-slate-500">Student</div>
            <div className="text-[10px] text-slate-400">학생 변경 →</div>
          </div>
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 rounded-full bg-slate-900 text-white flex items-center justify-center serif-ko text-xl font-bold shrink-0">{student.initial}</div>
            <div className="min-w-0">
              <div className="text-2xl font-bold text-slate-900 leading-tight">{student.name}</div>
              <div className="text-sm text-slate-600 mt-1">{student.grade} · {student.school}</div>
              <div className="flex items-center gap-3 mt-3 text-[11px] text-slate-500">
                <span>재원 <span className="num font-semibold text-slate-700">{student.enrolledMonths}</span>개월</span>
                <span className="w-1 h-1 rounded-full bg-stone-300" />
                <span>담임 {student.instructor?.name ?? '미배정'}</span>
              </div>
            </div>
          </div>
          {avgDelta !== null && (
            <div className="mt-4 pt-4 border-t border-stone-100 flex items-center gap-2 text-[11px]">
              <TrendingUp size={12} className={avgDelta >= 0 ? 'text-emerald-600' : 'text-red-600'} />
              <span className="text-slate-600">누적 종합 백분위 <span className={`num font-bold ${avgDelta >= 0 ? 'text-emerald-700' : 'text-red-700'}`}>{avgDelta >= 0 ? `+${avgDelta}` : avgDelta}</span> 변화</span>
            </div>
          )}
        </button>

        <div className="col-span-4 bg-white border border-stone-200 rounded-xl p-6">
          <div className="flex items-center justify-between mb-3">
            <div className="text-[10px] uppercase tracking-widest text-slate-500 flex items-center gap-1.5"><Target size={10} /> Goal Structure</div>
          </div>
          <div className="space-y-2.5">
            <div>
              <div className="text-[10px] text-amber-600 font-bold mb-0.5">최종 목표 · {student.finalGoalTrack ?? '미설정'}</div>
              <div className="font-bold text-slate-900 leading-tight serif-ko text-lg">{student.finalGoalSchool ?? '미설정'}</div>
              <div className="text-[11px] text-slate-500">{student.finalGoalDetail ?? ''}</div>
            </div>
            <div className="border-t border-stone-100 pt-2.5">
              <div className="text-[10px] text-slate-500 mb-0.5">중간 목표 · {student.midGoalTrack ?? '미설정'}</div>
              <div className="text-sm text-slate-700 font-semibold">{student.midGoalSchool ?? '미설정'}</div>
              <div className="text-[10px] text-slate-500">{student.midGoalDetail ?? ''}</div>
            </div>
          </div>
        </div>

        <div className="col-span-4 bg-slate-900 text-white rounded-xl p-6 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 rounded-full bg-amber-500/10 -translate-y-12 translate-x-12 blur-2xl" />
          <div className="relative">
            <div className="text-[10px] uppercase tracking-widest text-slate-400 mb-3">Stage Readiness — {currentRoadmapLabel}</div>
            <div className="flex items-baseline gap-1 mb-1">
              <div className="text-[56px] font-black num leading-none tracking-tight">{student.overallReadiness ?? '—'}</div>
              <div className="text-2xl text-slate-400 font-bold">%</div>
            </div>
            <div className="text-xs text-slate-400 mb-4">{student.finalGoalSchool ?? '목표 대학'} 합격생의 {student.grade} 시점 평균 수준 기준</div>
            {typeof student.overallReadiness === 'number' && (
              <>
                <div className="relative h-2 bg-slate-700/70 rounded-full overflow-hidden">
                  <div className="absolute h-full bg-gradient-to-r from-amber-500 to-amber-300 rounded-full" style={{ width: `${student.overallReadiness}%` }} />
                  {typeof student.peerAverage === 'number' && (
                    <div className="absolute h-full w-[2px] bg-white" style={{ left: `${student.peerAverage}%` }} />
                  )}
                </div>
                {typeof student.peerAverage === 'number' && (
                  <div className="flex justify-between text-[10px] text-slate-400 mt-1.5">
                    <span>현재</span>
                    <span style={{ marginLeft: `${student.peerAverage - 14}%` }}>↑ 합격생 평균 경로 {student.peerAverage}%</span>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      <Roadmap roadmap={student.roadmap} daysUntilCSAT={student.daysUntilCSAT} daysUntilHS={student.daysUntilHS} finalGoalSchool={student.finalGoalSchool} studentGrade={student.grade} />
      <MockExamChart mockExams={student.mockExams} />

      {/* 핵심 4과목 */}
      <div className="bg-white border border-stone-200 rounded-xl p-6 mb-4">
        <div className="flex items-end justify-between mb-5">
          <div>
            <div className="serif-ko text-lg font-bold text-slate-900">핵심 4과목 vs 목표 기준</div>
            <div className="text-xs text-slate-500 mt-1">과목별 목표 점수 대비 현재 위치</div>
          </div>
        </div>
        <div className="grid grid-cols-4 gap-4">
          {subjects.map(s => {
            const cfg = s.status ? statusConfig[s.status] : null;
            return (
              <div key={s.name} className={`border ${cfg?.border ?? 'border-stone-200'} ${cfg?.bg ?? 'bg-stone-50/40'} rounded-lg p-4 relative overflow-hidden`}>
                <div className="flex items-center justify-between mb-3">
                  <div className="font-bold text-slate-900 text-base">{s.name}</div>
                  <div className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${cfg?.text ?? 'text-slate-500'} bg-white border ${cfg?.border ?? 'border-stone-200'}`}>
                    {cfg ? `● ${cfg.label}` : '목표 미설정'}
                  </div>
                </div>
                <div className="flex items-baseline gap-1.5 mb-0.5">
                  <div className="text-[34px] font-black text-slate-900 num leading-none">{s.current ?? '—'}</div>
                  <div className="text-xs text-slate-500">/ 목표 {s.target ?? '—'}</div>
                </div>
                <div className={`text-xs ${cfg?.text ?? 'text-slate-400'} font-semibold mb-3`}>
                  {s.gap === null ? (s.target === null ? '목표 점수 미입력' : '기록 없음') : s.gap > 0 ? `+${s.gap} 우위` : s.gap === 0 ? '기준 도달' : `${Math.abs(s.gap)} 부족`}
                </div>
                <div className="h-12 -mx-1">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={s.trend.map((v, i) => ({ v, i }))}>
                      <YAxis hide domain={[0, 100]} />
                      <Line type="monotone" dataKey="v" stroke={cfg?.stroke ?? '#94a3b8'} strokeWidth={2.2} dot={false} />
                      {s.target !== null && <ReferenceLine y={s.target} stroke="#94a3b8" strokeDasharray="3 3" strokeWidth={1} />}
                    </LineChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex items-center justify-between text-[10px] text-slate-500 mt-1">
                  <span>학평 {s.trend.length}회 추이</span>
                  <span>{s.source}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 갭 분석 + 상담 기록 */}
      <div className="grid grid-cols-12 gap-4 mb-4">
        <div className="col-span-5 bg-white border border-stone-200 rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2"><Sparkles size={14} className="text-amber-500" /><div className="serif-ko text-base font-bold text-slate-900">갭 분석 · 추천 액션</div></div>
            <div className="text-[10px] uppercase tracking-wider text-slate-500">Top Priority</div>
          </div>
          {worstTwo.length === 0 ? (
            <div className="text-xs text-slate-400 text-center py-6">모의고사 기록이 없어 분석할 수 없습니다</div>
          ) : (
            <div className="space-y-3">
              {worstTwo.map((s, i) => {
                const color = s.status === 'risk' ? 'red' : 'amber';
                return (
                  <div key={s.name} className={`border border-${color}-200 bg-${color}-50/40 rounded-lg p-4`}>
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <div className={`text-xs font-bold text-${color}-700`}>TOP {i + 1}</div>
                        <div className="font-bold text-slate-900">{s.name}</div>
                        <div className={`text-[10px] px-1.5 py-0.5 rounded bg-${color}-100 text-${color}-700 font-semibold`}>{s.status ? statusConfig[s.status].label : ''}</div>
                      </div>
                      <div className={`text-xs text-${color}-700 font-semibold num`}>{s.gap}</div>
                    </div>
                    <div className="text-xs text-slate-700 mb-3 leading-relaxed">목표 대비 {Math.abs(s.gap ?? 0)}점 부족 — 집중 보강이 필요합니다.</div>
                    <div className={`flex items-center justify-between bg-white rounded border border-${color}-100 px-3 py-2`}>
                      <div className="flex items-center gap-2">
                        <ArrowUpRight size={12} className={`text-${color}-600`} />
                        <div className="text-xs"><span className="text-slate-500">추천: </span><span className="font-semibold text-slate-900">{s.name} 집중 보강반</span></div>
                      </div>
                      <button
                        onClick={() => setCounselingModal({ mode: 'new', prefill: { subject: s.name, topic: '학습', summary: `${s.name} 갭 분석 관련 상담`, action: `${s.name} 집중 보강반` } })}
                        className="text-[10px] text-slate-700 hover:text-slate-900 font-semibold"
                      >상담 기록 →</button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="col-span-7 bg-white border border-stone-200 rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2"><MessageSquare size={14} className="text-slate-700" /><div className="serif-ko text-base font-bold text-slate-900">상담 기록 · 진행 중 액션플랜</div></div>
          </div>
          {counselingList.length === 0 ? (
            <div className="text-xs text-slate-400 text-center py-6">상담 기록이 없습니다</div>
          ) : (
            <div className="space-y-3">
              {counselingList.map((c, idx) => {
                const aCfg = actionStatusConfig[c.action.status];
                return (
                  <div key={idx} className="border border-stone-200 rounded-lg overflow-hidden hover:border-slate-400 transition-colors">
                    <div className="flex items-center justify-between px-4 py-2 bg-stone-50 border-b border-stone-200">
                      <div className="flex items-center gap-3">
                        <div className="text-xs font-semibold text-slate-700 num">{c.date}</div>
                        <div className="text-[10px] px-1.5 py-0.5 rounded bg-white border border-stone-200 text-slate-600">{c.type}</div>
                        <div className="text-[10px] text-slate-500">{c.topic}</div>
                        {idx === 0 && c.isNew && <div className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-700 font-bold">방금 추가됨</div>}
                      </div>
                      <button onClick={() => setCounselingModal({ mode: 'detail', data: c })} className="text-[10px] text-slate-500 hover:text-slate-900 font-semibold">전체 상담 내용 →</button>
                    </div>
                    <div onClick={() => setCounselingModal({ mode: 'detail', data: c })} className="p-4 cursor-pointer">
                      <div className="text-xs text-slate-700 leading-relaxed mb-3 line-clamp-2">{c.summary}</div>
                      <div className="flex items-center gap-3 bg-stone-50 rounded p-2.5 border border-stone-200">
                        <div className={`w-1.5 h-1.5 rounded-full ${aCfg.dot} shrink-0`} />
                        <div className="flex-1 min-w-0">
                          <div className="text-xs font-semibold text-slate-900 truncate">{c.action.name}</div>
                          <div className="text-[10px] text-slate-500 mt-0.5">담당 {c.action.owner} · 기한 <span className="num">{c.action.deadline}</span></div>
                        </div>
                        <button
                          onClick={e => { e.stopPropagation(); handleToggleAction(c.date); }}
                          className={`text-[10px] px-2 py-1 rounded font-semibold shrink-0 transition-colors ${c.action.status === 'completed' ? 'bg-emerald-600 text-white hover:bg-emerald-700' : `${aCfg.bg} ${aCfg.text} hover:ring-1 hover:ring-slate-300`}`}
                        >
                          {c.action.status === 'completed' ? '✓ 완료' : aCfg.label}
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* 위험 신호 + 목표 히스토리 */}
      <div className="grid grid-cols-12 gap-4 mb-4">
        <div className="col-span-5 bg-white border border-stone-200 rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2"><Activity size={14} className="text-slate-700" /><div className="serif-ko text-base font-bold text-slate-900">위험 신호 모니터링</div></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {risk.map((r, i) => {
              const tone = r.tone === 'good' ? 'border-emerald-200 bg-emerald-50/40' : 'border-red-200 bg-red-50/40';
              const tColor = r.tone === 'good' ? 'text-emerald-700' : 'text-red-700';
              return (
                <div key={i} className={`border ${tone} rounded-lg p-3.5`}>
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="text-[11px] text-slate-500">{r.label}</div>
                    {r.tone === 'good' ? <CheckCircle2 size={13} className={tColor} /> : <AlertTriangle size={13} className={tColor} />}
                  </div>
                  <div className={`text-base font-bold ${tColor}`}>{r.value}</div>
                  <div className="text-[10px] text-slate-500 mt-0.5">{r.detail}</div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="col-span-7 bg-white border border-stone-200 rounded-xl p-6">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-2"><BookOpen size={14} className="text-slate-700" /><div className="serif-ko text-base font-bold text-slate-900">목표 변경 히스토리</div></div>
            <div className="text-[10px] uppercase tracking-wider text-slate-500">Goal Journey</div>
          </div>
          {student.goalHistories.length === 0 ? (
            <div className="text-xs text-slate-400 text-center py-6">목표 변경 기록이 없습니다</div>
          ) : (
            <div className="relative">
              <div className="absolute left-0 right-0 top-3 h-px bg-stone-200" />
              <div className="grid grid-cols-3 gap-4 relative">
                {student.goalHistories.slice(0, 3).map(g => (
                  <div key={g.id}>
                    <div className="flex items-center mb-3">
                      <div className={`w-3 h-3 rounded-full border-2 ${g.isCurrent ? 'bg-amber-400 border-slate-900' : 'bg-white border-slate-400'} relative z-10`} />
                    </div>
                    <div className="text-[11px] text-slate-500 num font-semibold">{g.date}</div>
                    <div className={`text-xs font-bold mt-0.5 ${g.isCurrent ? 'text-slate-900' : 'text-slate-700'}`}>{g.label}</div>
                    <div className="text-xs text-slate-700 mt-1.5 leading-tight">{g.target}</div>
                    <div className="text-[10px] text-slate-500 mt-0.5">{g.track}</div>
                    {g.reason && <div className="text-[10px] text-slate-500 mt-2 leading-relaxed border-l-2 border-stone-200 pl-2">{g.reason}</div>}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      <Footer perspective="원장" />

      {reportOpen && (
        <ReportModal
          mode="director"
          studentId={studentId ?? undefined}
          studentName={student?.name}
          onClose={() => setReportOpen(false)}
        />
      )}
      {counselingModal && (
        <CounselingModal
          mode={counselingModal.mode}
          data={counselingModal.data}
          prefill={counselingModal.prefill}
          studentName={student?.name}
          onClose={() => setCounselingModal(null)}
          onSave={handleSaveCounseling}
          onToggleAction={handleToggleAction}
        />
      )}
      {pickerOpen && branchId && (
        <StudentPickerModal
          branchId={branchId}
          currentStudentId={studentId ?? undefined}
          onSelect={id => { setStudentId(id); setPickerOpen(false); }}
          onClose={() => setPickerOpen(false)}
        />
      )}
    </div>
    </RoleGuard>
  );
}

export default DirectorPage;
