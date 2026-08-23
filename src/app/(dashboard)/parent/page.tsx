'use client';
import RoleGuard from '@/components/RoleGuard';

import { useState, useEffect } from 'react';
import {
  Award, UserCheck, TrendingUp, Heart, ShieldCheck,
  Calendar, MessageSquare, FileText, Phone, ChevronRight, Eye,
} from 'lucide-react';
import { LineChart, Line, ResponsiveContainer, XAxis, YAxis, Tooltip } from 'recharts';
import ReportModal from '@/components/modals/ReportModal';
import AppointmentRequestModal from '@/components/modals/AppointmentRequestModal';
import Footer from '@/components/dashboard/Footer';
import { statusConfig, actionStatusConfig } from '@/lib/dummy-data';

const bookingStatusConfig: Record<string, { label: string; bg: string; text: string }> = {
  pending: { label: '검토 중', bg: 'bg-amber-500/20', text: 'text-amber-300' },
  confirmed: { label: '확정', bg: 'bg-emerald-500/20', text: 'text-emerald-300' },
  declined: { label: '조율 필요', bg: 'bg-red-500/20', text: 'text-red-300' },
};

const SUBJECTS = ['국어', '영어', '수학', '과학'] as const;
const SUBJECT_FIELD: Record<string, 'korean' | 'english' | 'math' | 'science'> = {
  국어: 'korean', 영어: 'english', 수학: 'math', 과학: 'science',
};

interface RealMockExam {
  id: string; name: string; date: string;
  korean: number | null; english: number | null; math: number | null; science: number | null;
  avg: number | null; percentile: string | null;
}
interface RealCounseling {
  id: string; date: string; summary: string; parentShare: string | null;
  actionName: string | null; actionOwner: string | null; actionDeadline: string | null; actionStatus: string;
}
interface RealReport { id: string; period: string; message: string | null; sentAt: string | null; viewedAt: string | null; createdAt: string; }
interface RealStatusUpdate { overallReadiness: number | null; createdAt: string; }
interface RealAppointment {
  id: string; type: string; slot1: string; slot2: string; slot3: string;
  status: string; confirmedSlot: string | null; createdAt: string;
}
interface Child {
  id: string; name: string; grade: string; school: string; enrolledMonths: number;
  finalGoalSchool: string | null; finalGoalDetail: string | null; finalGoalTrack: string | null;
  daysUntilCSAT: number | null; overallReadiness: number | null; peerAverage: number | null;
  subjectTargets: Record<string, number> | null;
  instructor: { name: string } | null;
  mockExams: RealMockExam[];
  counselings: RealCounseling[];
  reports: RealReport[];
  statusUpdates: RealStatusUpdate[];
  appointmentRequests: RealAppointment[];
}

function enrollmentPhrase(months: number): string {
  if (months <= 0) return '함께한 지 얼마 되지 않았습니다';
  if (months < 12) return `함께한 지 ${months}개월이 되었습니다`;
  const years = Math.floor(months / 12);
  const rem = months % 12;
  return rem === 0 ? `함께한 지 ${years}년이 되었습니다` : `함께한 지 ${years}년 ${rem}개월이 되었습니다`;
}

function relativeTimeKo(dateStr: string): string {
  const diffMs = Date.now() - new Date(dateStr).getTime();
  const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (days <= 0) return '오늘 작성';
  if (days < 30) return `${days}일 전 작성`;
  const months = Math.floor(days / 30);
  return `${months}개월 전 작성`;
}

function computeGrowth(mockExams: RealMockExam[]) {
  if (mockExams.length < 2) return null;
  const first = mockExams[0];
  const last = mockExams[mockExams.length - 1];
  const perSubject = SUBJECTS.map(name => {
    const field = SUBJECT_FIELD[name];
    const a = first[field];
    const b = last[field];
    if (a == null || b == null) return null;
    return { subject: name, from: a, to: b, delta: b - a };
  }).filter((g): g is NonNullable<typeof g> => g !== null);
  if (perSubject.length === 0) return null;
  const bestDelta = Math.max(...perSubject.map(g => g.delta));
  return {
    perSubject: perSubject.map(g => ({ ...g, highlight: g.delta === bestDelta })),
    firstPercentile: first.percentile,
    lastPercentile: last.percentile,
    examCount: mockExams.length,
  };
}

function computeSubjectStatus(mockExams: RealMockExam[], subjectTargets: Record<string, number> | null) {
  const latest = mockExams[mockExams.length - 1];
  return SUBJECTS.map(name => {
    const field = SUBJECT_FIELD[name];
    const current = latest?.[field] ?? null;
    const target = subjectTargets?.[name] ?? null;
    const gap = current !== null && target !== null ? current - target : null;
    const status: keyof typeof statusConfig | null = gap === null ? null : gap >= 0 ? 'good' : gap >= -3 ? 'close' : gap >= -6 ? 'lacking' : 'risk';
    const headline = target === null ? '목표 미설정' : current === null ? '기록 없음' : status === 'good' ? '목표 도달' : status === 'close' ? '목표 근접' : status === 'lacking' ? '보강 진행 중' : '집중 보강 중';
    const detail = target === null
      ? '목표 점수가 아직 설정되지 않았습니다.'
      : current === null
      ? '등록된 모의고사 성적이 없습니다.'
      : status === 'good' ? '현재 수준을 유지하고 있습니다.'
      : status === 'close' ? '꾸준한 관리로 목표 도달이 가능합니다.'
      : status === 'lacking' ? '목표 대비 격차를 좁히는 중입니다.'
      : '목표 대비 격차가 커 집중 보강이 진행되고 있습니다.';
    return { name, status, headline, detail };
  });
}

function computeReadinessDelta(statusUpdates: RealStatusUpdate[], current: number | null): number | null {
  const withReadiness = statusUpdates.filter((s): s is { overallReadiness: number; createdAt: string } => typeof s.overallReadiness === 'number');
  if (withReadiness.length === 0 || current === null) return null;
  const earliest = withReadiness[0].overallReadiness;
  if (earliest === current) return null;
  return current - earliest;
}

export default function ParentPage() {
  const [parentName, setParentName] = useState('학부모');
  const [childId, setChildId] = useState<string | null>(null);
  const [child, setChild] = useState<Child | null>(null);
  const [loading, setLoading] = useState(true);
  const [reportOpen, setReportOpen] = useState(false);
  const [openReportId, setOpenReportId] = useState<string | null>(null);
  const [bookingType, setBookingType] = useState<'phone' | 'in_person' | null>(null);

  const reloadChild = (id: string) => {
    fetch(`/api/students/${id}`).then(r => r.json()).then(full => { if (!full.error) setChild(full); }).catch(() => {});
  };

  useEffect(() => {
    fetch('/api/auth/me').then(r => r.json()).then(async me => {
      if (!me?.id) { setLoading(false); return; }
      if (me.name) setParentName(me.name);
      const children = await fetch(`/api/students?parentId=${me.id}`).then(r => r.json());
      const first = Array.isArray(children) ? children[0] : null;
      if (!first) { setLoading(false); return; }
      setChildId(first.id);
      const full = await fetch(`/api/students/${first.id}`).then(r => r.json());
      if (!full.error) setChild(full);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <RoleGuard allowed={['PARENT', 'DIRECTOR']}>
        <div className="bg-[#f9f6f0] min-h-screen flex items-center justify-center text-sm text-slate-400">불러오는 중...</div>
      </RoleGuard>
    );
  }

  if (!child) {
    return (
      <RoleGuard allowed={['PARENT', 'DIRECTOR']}>
        <div className="bg-[#f9f6f0] min-h-screen flex items-center justify-center text-sm text-slate-500 text-center px-8">
          연결된 자녀 정보가 없습니다.<br />학원에 문의해 계정과 자녀를 연결해 주세요.
        </div>
      </RoleGuard>
    );
  }

  const sentReports = child.reports.filter(r => r.sentAt);
  const latestReport = sentReports[0] ?? null;
  const growth = computeGrowth(child.mockExams);
  const subjectRows = computeSubjectStatus(child.mockExams, child.subjectTargets);
  const readinessDelta = computeReadinessDelta(child.statusUpdates, child.overallReadiness);
  const promiseItems = child.counselings.filter(c => c.actionName && c.actionName !== '(액션 미설정)').slice(0, 4);
  const parentCounselings = child.counselings.filter(c => c.parentShare && c.parentShare.trim()).slice(0, 4);
  const chartData = child.mockExams.map(e => ({ name: e.name, avg: e.avg }));

  return (
    <RoleGuard allowed={['PARENT', 'DIRECTOR']}>
    <div className="bg-[#f9f6f0] min-h-screen">
      <div className="max-w-5xl mx-auto px-8 py-10">
        <div className="mb-8 pb-6 border-b border-stone-300/60">
          <div className="text-[11px] uppercase tracking-[0.2em] text-slate-500 mb-2">JONGNO M-SCHOOL · For Parents</div>
          <div className="serif-ko text-[36px] font-black text-slate-900 leading-tight">{parentName}, 안녕하세요.</div>
          <div className="text-base text-slate-600 mt-2.5 leading-relaxed">
            <span className="font-bold text-slate-900">{child.name}</span> 학생이 종로엠스쿨과 {enrollmentPhrase(child.enrolledMonths)} 그 성장의 기록을 안내드립니다.
          </div>
        </div>

        {/* Hero */}
        <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-2xl p-8 mb-5 text-white relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 rounded-full bg-amber-400/10 -translate-y-20 translate-x-20 blur-3xl" />
          <div className="relative grid grid-cols-12 gap-6">
            <div className="col-span-7">
              <div className="text-[11px] uppercase tracking-widest text-amber-300/90 mb-2 flex items-center gap-1.5"><Award size={11} /> 최종 진학 목표</div>
              <div className="serif-ko text-3xl font-bold leading-tight">{child.finalGoalSchool ?? '목표 미설정'}</div>
              <div className="text-sm text-slate-300 mt-1.5">
                {child.finalGoalTrack ?? child.finalGoalDetail ?? ''}
                {child.daysUntilCSAT != null && <> · 수능까지 D-<span className="num font-semibold text-white">{child.daysUntilCSAT.toLocaleString()}</span></>}
              </div>
              <div className="mt-6 pt-5 border-t border-white/10">
                <div className="text-[11px] text-slate-400 mb-2">
                  현재 단계 준비도 <span className="text-slate-500">({child.finalGoalSchool ?? '목표 대학'} 합격생의 {child.grade} 시점 평균 기준)</span>
                </div>
                <div className="flex items-baseline gap-2">
                  <div className="text-[64px] font-black num leading-none">{child.overallReadiness ?? '—'}<span className="text-3xl text-slate-400">%</span></div>
                  {readinessDelta !== null && (
                    <div className={`text-xs font-semibold flex items-center gap-1 ml-2 ${readinessDelta >= 0 ? 'text-emerald-300' : 'text-red-300'}`}>
                      {readinessDelta >= 0 ? '↑' : '↓'} {enrollmentPhrase(child.enrolledMonths).replace('함께한 지 ', '').replace('이 되었습니다', '')}간 {readinessDelta >= 0 ? '+' : ''}{readinessDelta}%p
                    </div>
                  )}
                </div>
                {typeof child.overallReadiness === 'number' && (
                  <>
                    <div className="relative h-2 bg-white/10 rounded-full overflow-hidden mt-3">
                      <div className="absolute h-full bg-gradient-to-r from-amber-400 to-amber-300 rounded-full" style={{ width: `${child.overallReadiness}%` }} />
                      {typeof child.peerAverage === 'number' && (
                        <div className="absolute h-full w-[2px] bg-white" style={{ left: `${child.peerAverage}%` }} />
                      )}
                    </div>
                    {typeof child.peerAverage === 'number' && (
                      <div className="text-[10px] text-slate-400 mt-1.5">↑ 합격생 평균 경로 {child.peerAverage}%</div>
                    )}
                  </>
                )}
              </div>
            </div>
            <div className="col-span-5 bg-white/5 backdrop-blur rounded-xl p-5 border border-white/10">
              <div className="text-[11px] uppercase tracking-widest text-amber-300/90 mb-2 flex items-center gap-1.5"><UserCheck size={11} /> 학원의 진단</div>
              {latestReport?.message ? (
                <>
                  <div className="text-xs text-slate-300 leading-relaxed whitespace-pre-line line-clamp-6">{latestReport.message}</div>
                  <div className="mt-4 pt-4 border-t border-white/10 flex items-center gap-2 text-[11px] text-slate-400">
                    <div className="w-7 h-7 rounded-full bg-amber-400/20 flex items-center justify-center serif-ko text-amber-300 font-bold text-xs">
                      {(child.instructor?.name ?? '담').charAt(0)}
                    </div>
                    <div>
                      <div className="text-white text-xs font-semibold">{child.instructor?.name ?? '담임 강사'}</div>
                      <div className="text-[10px]">담임 강사 · {relativeTimeKo(latestReport.createdAt)}</div>
                    </div>
                  </div>
                </>
              ) : (
                <div className="text-xs text-slate-400 leading-relaxed">아직 발송된 학습 리포트가 없습니다. 담임 강사가 리포트를 보내면 이곳에 진단 내용이 표시됩니다.</div>
              )}
            </div>
          </div>
        </div>

        {/* 성장 기록 */}
        <div className="bg-white border-2 border-emerald-200 rounded-2xl p-7 mb-5 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-44 h-44 rounded-full bg-emerald-100/60 -translate-y-16 translate-x-16 blur-2xl" />
          <div className="relative">
            <div className="flex items-center gap-2 mb-1"><TrendingUp size={16} className="text-emerald-700" /><div className="serif-ko text-xl font-bold text-slate-900">{child.name} 학생의 학습 성장 기록</div></div>
            {growth ? (
              <>
                <div className="text-xs text-slate-500 mb-5">{growth.examCount}회의 전국 학력평가로 확인된 객관적 성장 기록입니다 (전국 백분위 기준)</div>
                <div className="grid grid-cols-4 gap-3 mb-5">
                  {growth.perSubject.map((g, i) => (
                    <div key={i} className={`rounded-xl p-4 border ${g.highlight ? 'bg-emerald-50 border-emerald-300' : 'bg-stone-50/60 border-stone-200'}`}>
                      <div className="flex items-center justify-between mb-2">
                        <div className="font-bold text-slate-900 serif-ko">{g.subject}</div>
                        {g.highlight && <div className="text-[9px] px-1.5 py-0.5 bg-emerald-600 text-white rounded-full font-bold">최고 성장</div>}
                      </div>
                      <div className="flex items-baseline gap-1.5">
                        <span className="text-sm text-slate-500 num">{g.from}</span>
                        <span className="text-slate-400">→</span>
                        <span className="text-2xl font-black num text-slate-900">{g.to}</span>
                      </div>
                      <div className={`text-xs font-bold mt-1 num ${g.delta >= 0 ? (g.highlight ? 'text-emerald-700' : 'text-emerald-600') : 'text-red-600'}`}>
                        {g.delta >= 0 ? '+' : ''}{g.delta} {g.delta >= 0 ? '상승' : '하락'}
                      </div>
                    </div>
                  ))}
                </div>
                <div className="bg-stone-50/60 rounded-xl border border-stone-200 p-4">
                  <div className="text-[11px] font-semibold text-slate-700 mb-2">종합 백분위 추이 — {growth.examCount}회 학력평가</div>
                  <div className="h-28">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={chartData} margin={{ top: 8, right: 12, bottom: 0, left: -20 }}>
                        <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} />
                        <YAxis domain={[0, 100]} tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} />
                        <Tooltip contentStyle={{ fontSize: 11, borderRadius: 8 }} />
                        <Line type="monotone" dataKey="avg" name="종합 백분위" stroke="#059669" strokeWidth={2.5} dot={{ r: 4, fill: '#059669' }} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                  {growth.firstPercentile && growth.lastPercentile && (
                    <div className="flex justify-between text-[10px] text-slate-500 mt-1 num px-2">
                      <span>전국 {growth.firstPercentile}에서 출발</span>
                      <span className="font-bold text-emerald-700">현재 전국 {growth.lastPercentile}</span>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="text-xs text-slate-400 text-center py-8">모의고사 성적이 2회 이상 등록되면 성장 기록이 표시됩니다</div>
            )}
          </div>
        </div>

        {/* 과목별 현황 */}
        <div className="bg-white border border-stone-200 rounded-2xl p-7 mb-5">
          <div className="mb-5">
            <div className="serif-ko text-xl font-bold text-slate-900">과목별 현재 상태</div>
            <div className="text-xs text-slate-500 mt-1">학원이 각 과목을 어떻게 관리하고 있는지 안내드립니다</div>
          </div>
          <div className="grid grid-cols-4 gap-3">
            {subjectRows.map(s => {
              const cfg = s.status ? statusConfig[s.status] : null;
              return (
                <div key={s.name} className={`border ${cfg?.border ?? 'border-stone-200'} ${cfg?.bg ?? 'bg-stone-50/40'} rounded-xl p-4`}>
                  <div className="flex items-center justify-between mb-3">
                    <div className="font-bold text-slate-900 text-base serif-ko">{s.name}</div>
                    <div className={`w-2.5 h-2.5 rounded-full ${cfg?.soft ?? 'bg-slate-300'}`} />
                  </div>
                  <div className={`text-sm font-bold ${cfg?.text ?? 'text-slate-500'} mb-1`}>{s.headline}</div>
                  <div className="text-[11px] text-slate-600 leading-relaxed">{s.detail}</div>
                </div>
              );
            })}
          </div>
          <div className="mt-4 pt-4 border-t border-stone-100 flex items-start gap-2 text-[11px] text-slate-500 leading-relaxed">
            <Heart size={11} className="text-stone-400 mt-0.5 shrink-0" />
            <span>구체적인 백분위와 동학년 비교 데이터는 다음 정기 점검에서 담임 강사와 함께 자세히 설명드립니다.</span>
          </div>
        </div>

        {/* 학원이 약속한 것 */}
        <div className="bg-white border-2 border-amber-200 rounded-2xl p-7 mb-5 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-40 h-40 rounded-full bg-amber-100/60 -translate-y-16 translate-x-16 blur-2xl" />
          <div className="relative">
            <div className="flex items-center gap-2 mb-1"><ShieldCheck size={16} className="text-amber-700" /><div className="serif-ko text-xl font-bold text-slate-900">학원이 약속하고 진행 중인 일</div></div>
            <div className="text-xs text-slate-500 mb-5">상담에서 합의된 학습 관리가 지금 어떻게 진행되고 있는지 확인하실 수 있습니다</div>
            {promiseItems.length === 0 ? (
              <div className="text-xs text-slate-400 text-center py-6">등록된 약속(액션플랜)이 없습니다</div>
            ) : (
              <div className="space-y-3">
                {promiseItems.map(c => {
                  const cfg = actionStatusConfig[c.actionStatus] ?? actionStatusConfig['in-progress'];
                  return (
                    <div key={c.id} className="bg-stone-50/60 rounded-xl p-4 border border-stone-200">
                      <div className="flex items-start justify-between mb-1">
                        <div>
                          <div className="font-bold text-slate-900">{c.actionName}</div>
                          <div className="text-[11px] text-slate-500 mt-0.5">
                            담당 {c.actionOwner ?? '—'} · 합의일 <span className="num">{c.date}</span>
                            {c.actionDeadline && <> · 기한 <span className="num">{c.actionDeadline}</span></>}
                          </div>
                        </div>
                        <div className={`text-[10px] px-2 py-1 rounded-full font-bold shrink-0 ${cfg.bg} ${cfg.text}`}>{cfg.label}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* 상담 */}
        <div className="grid grid-cols-12 gap-4 mb-5">
          <div className="col-span-12 bg-white border border-stone-200 rounded-2xl p-7">
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-2"><MessageSquare size={14} className="text-slate-700" /><div className="serif-ko text-lg font-bold text-slate-900">최근 상담 요약</div></div>
              <div className="text-[10px] uppercase tracking-wider text-slate-500">For Parents</div>
            </div>
            <div className="text-xs text-slate-500 mb-5">상담에서 합의된 내용을 학부모 안내용으로 정리한 것입니다</div>
            {parentCounselings.length === 0 ? (
              <div className="text-xs text-slate-400 text-center py-6">공유된 상담 요약이 없습니다</div>
            ) : (
              <div className="space-y-4">
                {parentCounselings.map(c => (
                  <div key={c.id} className="flex gap-3">
                    <div className="shrink-0">
                      <div className="w-8 h-8 rounded-full bg-stone-100 border border-stone-200 flex items-center justify-center"><MessageSquare size={12} className="text-slate-500" /></div>
                    </div>
                    <div className="flex-1 pb-3 border-b border-stone-100 last:border-0">
                      <div className="text-[11px] text-slate-500 num font-semibold mb-1">{c.date}</div>
                      <div className="text-xs text-slate-700 leading-relaxed">{c.parentShare}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* 리포트 + 연락 */}
        <div className="grid grid-cols-12 gap-4 mb-5">
          <div className="col-span-7 bg-white border border-stone-200 rounded-2xl p-7">
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-2"><FileText size={14} className="text-slate-700" /><div className="serif-ko text-lg font-bold text-slate-900">월간 리포트</div></div>
            </div>
            <div className="space-y-2">
              {sentReports.length === 0 && (
                <div className="text-xs text-slate-400 text-center py-6">발송된 리포트가 없습니다</div>
              )}
              {sentReports.map(r => (
                <div
                  key={r.id}
                  onClick={() => { setOpenReportId(r.id); setReportOpen(true); }}
                  className="flex items-center justify-between p-3 border border-stone-200 rounded-lg hover:bg-stone-50 hover:border-slate-400 cursor-pointer transition-all"
                >
                  <div className="flex items-center gap-3">
                    <FileText size={16} className="text-slate-400" />
                    <div>
                      <div className="text-sm font-semibold text-slate-900">{r.period} 학습 리포트</div>
                      <div className="text-[11px] text-slate-500 num">
                        발송 {r.sentAt ? new Date(r.sentAt).toLocaleDateString('ko-KR') : '—'}
                        {r.viewedAt && ' · 열람됨'}
                      </div>
                    </div>
                  </div>
                  <button className="text-xs text-slate-700 hover:text-slate-900 font-semibold flex items-center gap-1"><Eye size={12} /> 열기</button>
                </div>
              ))}
            </div>
          </div>

          <div className="col-span-5 bg-slate-900 text-white rounded-2xl p-7 relative overflow-hidden">
            <div className="absolute bottom-0 right-0 w-32 h-32 rounded-full bg-amber-400/10 translate-y-12 translate-x-12 blur-2xl" />
            <div className="relative">
              <div className="serif-ko text-lg font-bold mb-1">담임 강사와 연락하기</div>
              <div className="text-xs text-slate-400 mb-5">궁금한 점이 있으시면 언제든 연락해 주세요</div>
              <div className="space-y-2.5">
                {[
                  { icon: Phone, label: '상담 전화 예약', sub: '강사 일정 확인 후 연결', type: 'phone' as const },
                  { icon: Calendar, label: '대면 상담 예약', sub: '학원 방문 일정 조율', type: 'in_person' as const },
                ].map((btn, i) => (
                  <button
                    key={i}
                    onClick={() => setBookingType(btn.type)}
                    className="w-full flex items-center gap-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg p-3 text-left transition-colors"
                  >
                    <btn.icon size={14} className="text-amber-300" />
                    <div className="flex-1">
                      <div className="text-sm font-semibold">{btn.label}</div>
                      <div className="text-[10px] text-slate-400">{btn.sub}</div>
                    </div>
                    <ChevronRight size={12} className="text-slate-400" />
                  </button>
                ))}
              </div>
              {child.appointmentRequests.length > 0 && (
                <div className="mt-5 pt-4 border-t border-white/10">
                  <div className="text-[10px] uppercase tracking-wider text-slate-500 mb-2">예약 요청 내역</div>
                  <div className="space-y-1.5">
                    {child.appointmentRequests.slice(0, 3).map(a => {
                      const cfg = bookingStatusConfig[a.status] ?? bookingStatusConfig.pending;
                      return (
                        <div key={a.id} className="flex items-center justify-between text-[11px]">
                          <div className="text-slate-300">
                            {a.type === 'phone' ? '전화' : '대면'} · {a.status === 'confirmed' && a.confirmedSlot ? a.confirmedSlot : a.slot1}
                          </div>
                          <div className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold shrink-0 ${cfg.bg} ${cfg.text}`}>{cfg.label}</div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        <Footer perspective="학부모" extra="자녀 정보만 노출되며 내부 운영 메모는 표시되지 않습니다 · 학부모용 화면" />
      </div>

      {reportOpen && (
        <ReportModal
          mode="parent"
          studentId={child.id}
          reportId={openReportId ?? undefined}
          onClose={() => { setReportOpen(false); setOpenReportId(null); }}
        />
      )}
      {bookingType && childId && (
        <AppointmentRequestModal
          studentId={childId}
          type={bookingType}
          requestedBy={parentName}
          onClose={() => setBookingType(null)}
          onSaved={() => reloadChild(childId)}
        />
      )}
    </div>
    </RoleGuard>
  );
}
