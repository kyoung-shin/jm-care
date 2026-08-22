'use client';

import { useState, useEffect } from 'react';
import {
  X, FileText, Printer, Download, Eye, Send,
  TrendingUp, MessageSquare, BookOpen, ShieldCheck,
  Check, Edit3, Clock, Target, CheckCircle2,
} from 'lucide-react';
import { LineChart, Line, ResponsiveContainer, CartesianGrid, XAxis, YAxis, Tooltip, ReferenceLine } from 'recharts';
import { subjectColors, statusConfig, actionStatusConfig } from '@/lib/dummy-data';

interface Props {
  mode: 'director' | 'parent';
  onClose: () => void;
  studentId?: string;
  studentName?: string;
  reportId?: string;
  onSent?: () => void;
}

interface RealMockExam {
  id: string;
  name: string;
  date: string;
  korean: number | null;
  english: number | null;
  math: number | null;
  science: number | null;
  avg: number | null;
  percentile: string | null;
}

interface RealCounseling {
  id: string;
  date: string;
  actionName: string | null;
  actionOwner: string | null;
  actionDeadline: string | null;
  actionStatus: string;
}

interface RealStudentData {
  id: string;
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
  mockExams: RealMockExam[];
  counselings: RealCounseling[];
}

const SUBJECTS = ['국어', '영어', '수학', '과학'] as const;
const SUBJECT_FIELD: Record<string, 'korean' | 'english' | 'math' | 'science'> = {
  국어: 'korean', 영어: 'english', 수학: 'math', 과학: 'science',
};

function formatPeriodLabel(dateStr: string): string {
  const m = dateStr.match(/(\d{4})\.(\d{2})/);
  return m ? `${m[1]}년 ${Number(m[2])}월` : dateStr;
}

function formatGeneratedAt(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}.${pad(d.getMonth() + 1)}.${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function SentState({ onClose, studentName, period, sentAtLabel }: { onClose: () => void; studentName: string; period: string; sentAtLabel: string }) {
  return (
    <div className="h-full flex items-center justify-center p-12">
      <div className="text-center max-w-md">
        <div className="w-20 h-20 rounded-full bg-emerald-100 mx-auto flex items-center justify-center mb-5">
          <Check size={36} className="text-emerald-600" strokeWidth={3} />
        </div>
        <div className="serif-ko text-2xl font-bold text-slate-900 mb-2">발송 완료</div>
        <div className="text-sm text-slate-600 leading-relaxed mb-6">
          {studentName} 학부모님께 <span className="font-semibold text-slate-900">{period} 학습 리포트</span>가 발송되었습니다.
        </div>
        <div className="bg-stone-50 rounded-lg p-4 text-left text-xs text-slate-600 space-y-1.5 mb-6 border border-stone-200">
          <div className="flex justify-between"><span>발송 시각</span><span className="num font-semibold text-slate-900">{sentAtLabel}</span></div>
        </div>
        <div className="flex gap-2 justify-center">
          <button onClick={onClose} className="px-5 py-2 text-xs bg-slate-900 text-white rounded font-bold hover:bg-slate-800">완료</button>
        </div>
      </div>
    </div>
  );
}

export default function ReportModal({ mode, onClose, studentId, studentName, reportId, onSent }: Props) {
  const isDirector = mode === 'director';
  const [step, setStep] = useState<'review' | 'sent'>(isDirector ? 'review' : 'review');
  const [parentPeriod, setParentPeriod] = useState('');
  const [includeGrades, setIncludeGrades] = useState(true);
  const [editingMessage, setEditingMessage] = useState(false);
  const [message, setMessage] = useState(
    `안녕하세요, ${studentName ?? '학생'} 학부모님. 담임 강사입니다.\n\n` +
    `이번 리포트에는 그동안의 성장을 함께 담았습니다. 궁금하신 점은 언제든 연락 주십시오.`
  );
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState('');
  const [sentAt, setSentAt] = useState<Date | null>(null);
  const [generatedAt] = useState(() => new Date());

  const [realStudent, setRealStudent] = useState<RealStudentData | null>(null);
  const [selectedExamIdx, setSelectedExamIdx] = useState(-1);

  // 실제 학생 데이터(목표·모의고사 성적 등) 로드
  useEffect(() => {
    if (!studentId) return;
    fetch(`/api/students/${studentId}`).then(r => r.json()).then(d => {
      if (!d.error) setRealStudent(d);
    }).catch(() => {});
  }, [studentId]);

  // 학부모 모드: 실제 리포트 내용(기간/메시지)을 불러오고, 조회 시각을 기록
  useEffect(() => {
    if (isDirector || !studentId || !reportId) return;
    fetch(`/api/students/${studentId}/reports`).then(r => r.json()).then((reports: { id: string; period: string; message: string | null }[]) => {
      const real = Array.isArray(reports) ? reports.find(r => r.id === reportId) : null;
      if (real) {
        setParentPeriod(real.period);
        if (real.message) setMessage(real.message);
      }
    }).catch(() => {});
    fetch(`/api/students/${studentId}/reports/${reportId}/view`, { method: 'POST' }).catch(() => {});
  }, [isDirector, studentId, reportId]);

  // 상단에서 선택한 시점(=모의고사 회차)까지의 데이터로 리포트를 구성. 아직 선택하지 않았다면 최신 회차 기준.
  const examCount = realStudent?.mockExams.length ?? 0;
  const effectiveExamIdx = selectedExamIdx >= 0 && selectedExamIdx < examCount ? selectedExamIdx : examCount - 1;
  const visibleExams = realStudent?.mockExams.slice(0, effectiveExamIdx + 1) ?? [];
  const firstExam = visibleExams[0];
  const latestExam = visibleExams[visibleExams.length - 1];
  const hasGrowthRange = !!(firstExam && latestExam && firstExam !== latestExam);
  const period = isDirector ? (latestExam ? formatPeriodLabel(latestExam.date) : '') : parentPeriod;

  const handleSend = async () => {
    if (!studentId) { setSendError('발송 대상 학생 정보를 찾을 수 없습니다'); return; }
    setSending(true);
    setSendError('');
    try {
      const now = new Date();
      const res = await fetch(`/api/students/${studentId}/reports`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ period, message, sentAt: now.toISOString() }),
      });
      if (!res.ok) throw new Error('발송에 실패했습니다');
      setSentAt(now);
      onSent?.();
      setStep('sent');
    } catch (e) {
      setSendError(e instanceof Error ? e.message : '발송에 실패했습니다');
    } finally {
      setSending(false);
    }
  };

  const chartData = visibleExams.map(e => ({
    name: e.name, 국어: e.korean, 영어: e.english, 수학: e.math, 과학: e.science, avg: e.avg,
  }));

  const growthStats = (() => {
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
      for (const name of SUBJECTS) {
        const field = SUBJECT_FIELD[name];
        const a = firstExam[field];
        const b = latestExam[field];
        if (a === null || b === null) continue;
        const d = b - a;
        if (!best || d > best.delta) best = { name, delta: d };
      }
      if (best) {
        bestSubject = {
          label: `${best.name} ${best.delta >= 0 ? '+' : ''}${best.delta}`,
          delta: `${firstExam[SUBJECT_FIELD[best.name]]} → ${latestExam[SUBJECT_FIELD[best.name]]}`,
        };
      } else {
        bestSubject = { label: '데이터 없음', delta: '' };
      }
    }

    return [
      { label: '종합 백분위', value: avgValue, delta: avgDelta },
      { label: '전국 위치', value: percentile, delta: percentileDelta },
      { label: '최고 성장 과목', value: bestSubject.label, delta: bestSubject.delta },
    ];
  })();

  const subjectRows = SUBJECTS.map(name => {
    const field = SUBJECT_FIELD[name];
    const current = latestExam?.[field] ?? null;
    const target = realStudent?.subjectTargets?.[name] ?? null;
    const gap = current !== null && target !== null ? +(current - target).toFixed(1) : null;
    const status: keyof typeof statusConfig | null = gap === null ? null : gap >= 0 ? 'good' : gap >= -3 ? 'close' : gap >= -7 ? 'lacking' : 'risk';
    const note = target === null
      ? '목표 점수가 설정되지 않았습니다.'
      : current === null
      ? '등록된 모의고사 성적이 없습니다.'
      : status === 'good' ? '목표를 충족했습니다. 현 수준을 유지해 주세요.'
      : status === 'close' ? '목표에 근접했습니다. 꾸준한 관리로 충족 가능합니다.'
      : status === 'lacking' ? '목표 대비 격차가 있습니다. 보강이 필요합니다.'
      : '목표 대비 격차가 큽니다. 집중 보강이 시급합니다.';
    return { name, current, target, status, note };
  });

  const displayName = realStudent?.name ?? studentName ?? '학생';
  const instructorName = realStudent?.instructor?.name ?? '담임 강사';
  const branchName = realStudent?.branch?.name ?? '';

  const actionItems = (realStudent?.counselings ?? [])
    .filter(c => c.actionName && c.actionName !== '(액션 미설정)')
    .slice(0, 6);

  return (
    <div className="fixed inset-0 z-50 ko-sans">
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={onClose} />
      <div className="absolute inset-0 flex items-center justify-center p-6 pointer-events-none">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-6xl max-h-[92vh] flex flex-col pointer-events-auto overflow-hidden">

          <div className="flex items-center justify-between px-6 py-4 border-b border-stone-200 bg-stone-50 shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-amber-500 text-white flex items-center justify-center"><FileText size={16} /></div>
              <div>
                <div className="serif-ko text-lg font-bold text-slate-900">{isDirector ? '학부모 리포트 생성' : '월간 학습 리포트'}</div>
                <div className="text-xs text-slate-500">
                  {isDirector ? '자동 조립된 내용을 검수한 후 발송하실 수 있습니다' : `${period} · ${instructorName} 작성`}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {isDirector && step === 'review' && (
                <select
                  value={effectiveExamIdx}
                  onChange={e => setSelectedExamIdx(Number(e.target.value))}
                  disabled={!realStudent || realStudent.mockExams.length === 0}
                  className="text-xs border border-stone-300 rounded px-2 py-1.5 bg-white disabled:opacity-50"
                >
                  {realStudent && realStudent.mockExams.length > 0
                    ? realStudent.mockExams.map((e, i) => <option key={e.id} value={i}>{formatPeriodLabel(e.date)}</option>)
                    : <option>데이터 없음</option>}
                </select>
              )}
              {!isDirector && (
                <button className="text-xs px-3 py-1.5 bg-white border border-stone-300 rounded hover:bg-stone-50 flex items-center gap-1">
                  <Printer size={11} /> 인쇄
                </button>
              )}
              <button onClick={onClose} className="w-8 h-8 rounded-lg hover:bg-stone-200 flex items-center justify-center text-slate-600"><X size={16} /></button>
            </div>
          </div>

          <div className="flex-1 overflow-hidden flex">
            {isDirector && step === 'review' && (
              <div className="w-64 shrink-0 border-r border-stone-200 bg-stone-50/50 p-5 overflow-y-auto">
                <div className="text-[10px] uppercase tracking-widest text-slate-500 font-semibold mb-3">발송 옵션</div>
                <div className="space-y-3 text-xs">
                  {[
                    { label: '구체적 백분위 포함', desc: '학부모 화면에는 신호등만, 리포트에는 숫자 포함', checked: includeGrades, onChange: setIncludeGrades },
                  ].map((opt, i) => (
                    <label key={i} className="flex items-start gap-2 cursor-pointer">
                      <input type="checkbox" checked={opt.checked} onChange={e => opt.onChange(e.target.checked)} className="mt-0.5" />
                      <div>
                        <div className="font-semibold text-slate-900">{opt.label}</div>
                        <div className="text-[10px] text-slate-500 mt-0.5">{opt.desc}</div>
                      </div>
                    </label>
                  ))}
                  {['1년 성장 비교 포함', '합격생 평균 경로 비교', '진행 중 액션플랜 포함'].map((label, i) => (
                    <label key={i} className="flex items-start gap-2 cursor-pointer">
                      <input type="checkbox" defaultChecked className="mt-0.5" />
                      <div className="font-semibold text-slate-900 text-xs">{label}</div>
                    </label>
                  ))}
                </div>
                <div className="mt-6 pt-5 border-t border-stone-200 text-[10px] text-slate-500 leading-relaxed flex items-start gap-1.5">
                  <ShieldCheck size={11} className="text-emerald-600 mt-0.5 shrink-0" />
                  <span>내부 메모, 위험 신호, 다른 학생 정보는 자동으로 제외됩니다.</span>
                </div>
              </div>
            )}

            <div className="flex-1 overflow-y-auto bg-stone-100/40">
              {step === 'sent' ? (
                <SentState
                  onClose={onClose}
                  studentName={displayName}
                  period={period}
                  sentAtLabel={sentAt ? sentAt.toLocaleString('ko-KR') : ''}
                />
              ) : (
                <div className="p-8">
                  <div className="max-w-3xl mx-auto bg-white rounded-xl shadow-sm border border-stone-200 overflow-hidden">
                    <div className="bg-gradient-to-br from-slate-900 to-slate-800 text-white px-8 py-6 relative overflow-hidden">
                      <div className="absolute top-0 right-0 w-40 h-40 rounded-full bg-amber-400/10 -translate-y-12 translate-x-12 blur-2xl" />
                      <div className="relative flex justify-between items-start">
                        <div>
                          <div className="text-[10px] uppercase tracking-[0.25em] text-amber-300 mb-2">JONGNO M-SCHOOL · Monthly Report</div>
                          <div className="serif-ko text-3xl font-black leading-tight">월간 학습 리포트</div>
                          <div className="text-sm text-slate-300 mt-2">{period} · {displayName} 학생</div>
                        </div>
                        <div className="text-right">
                          <div className="text-[10px] text-slate-400">생성일</div>
                          <div className="text-xs num font-semibold mt-0.5">{formatGeneratedAt(generatedAt)}</div>
                          <div className="text-[10px] text-slate-400 mt-2">{instructorName}</div>
                        </div>
                      </div>
                    </div>

                    <div className="p-8 space-y-8">
                      <section>
                        <div className="grid grid-cols-2 gap-6">
                          <div>
                            <div className="text-[10px] uppercase tracking-widest text-slate-500 mb-2">학생</div>
                            <div className="serif-ko text-2xl font-bold text-slate-900">{displayName}</div>
                            <div className="text-sm text-slate-600 mt-1">{realStudent?.grade ?? ''} · {realStudent?.school ?? ''}</div>
                            <div className="text-[11px] text-slate-500 mt-1">재원 {realStudent?.enrolledMonths ?? 0}개월 · 담임 {instructorName}</div>
                          </div>
                          <div className="border-l border-stone-200 pl-6">
                            <div className="text-[10px] uppercase tracking-widest text-slate-500 mb-2 flex items-center gap-1"><Target size={10} /> 최종 진학 목표</div>
                            <div className="serif-ko text-lg font-bold text-slate-900 leading-snug">{realStudent?.finalGoalSchool ?? '목표 미설정'}</div>
                            {realStudent?.finalGoalDetail && <div className="text-xs text-slate-600 mt-0.5">{realStudent.finalGoalDetail}</div>}
                            {realStudent?.finalGoalTrack && <div className="text-xs text-slate-500 mt-0.5">{realStudent.finalGoalTrack}</div>}
                            {realStudent?.daysUntilCSAT != null && (
                              <div className="text-[11px] text-slate-500 mt-2 flex items-center gap-1"><Clock size={10} /> 수능까지 D-<span className="num font-semibold">{realStudent.daysUntilCSAT.toLocaleString()}</span></div>
                            )}
                          </div>
                        </div>
                      </section>

                      <section className="bg-gradient-to-br from-emerald-50/60 to-stone-50 rounded-xl p-6 border border-emerald-200">
                        <div className="text-[10px] uppercase tracking-widest text-emerald-700 mb-3 flex items-center gap-1.5 font-bold">
                          <TrendingUp size={11} /> 선택 시점까지의 성장 — 전국 학력평가 {visibleExams.length}회 누적
                        </div>
                        <div className="h-44 mb-3">
                          {chartData.length > 0 ? (
                            <ResponsiveContainer width="100%" height="100%">
                              <LineChart data={chartData} margin={{ top: 8, right: 16, bottom: 0, left: -16 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#e7e5e4" vertical={false} />
                                <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} />
                                <YAxis domain={[0, 100]} tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} />
                                <Tooltip contentStyle={{ fontSize: 11, borderRadius: 8 }} />
                                <ReferenceLine y={90} stroke="#94a3b8" strokeDasharray="4 4" />
                                <Line type="monotone" dataKey="avg" name="종합" stroke="#0f172a" strokeWidth={3} dot={{ r: 4 }} />
                                {includeGrades && Object.entries(subjectColors).map(([k, v]) => (
                                  <Line key={k} type="monotone" dataKey={k} stroke={v} strokeWidth={1.4} dot={{ r: 2.5 }} />
                                ))}
                              </LineChart>
                            </ResponsiveContainer>
                          ) : (
                            <div className="h-full flex items-center justify-center text-xs text-slate-400">등록된 모의고사 성적이 없습니다</div>
                          )}
                        </div>
                        <div className="grid grid-cols-3 gap-3 text-center">
                          {growthStats.map((item, i) => (
                            <div key={i} className="bg-white rounded-lg border border-stone-200 p-3">
                              <div className="text-[10px] text-slate-500">{item.label}</div>
                              <div className="num font-black text-slate-900 text-lg">{item.value}</div>
                              <div className="text-[10px] text-emerald-700 font-bold">{item.delta}</div>
                            </div>
                          ))}
                        </div>
                      </section>

                      <section>
                        <div className="flex items-center justify-between mb-3">
                          <div className="serif-ko text-base font-bold text-slate-900 flex items-center gap-2">
                            <MessageSquare size={14} className="text-slate-700" /> 담임 강사 메시지
                          </div>
                          {isDirector && (
                            <button onClick={() => setEditingMessage(!editingMessage)} className="text-[10px] px-2 py-1 bg-stone-100 border border-stone-300 rounded hover:bg-stone-200 flex items-center gap-1">
                              <Edit3 size={10} /> {editingMessage ? '편집 완료' : '편집'}
                            </button>
                          )}
                        </div>
                        <div className="bg-stone-50/70 rounded-lg border border-stone-200 p-5">
                          {editingMessage ? (
                            <textarea value={message} onChange={e => setMessage(e.target.value)} className="w-full min-h-[220px] text-sm text-slate-700 leading-relaxed bg-white border border-stone-300 rounded p-3 resize-y" />
                          ) : (
                            <div className="text-sm text-slate-700 leading-relaxed whitespace-pre-line">{message}</div>
                          )}
                          <div className="mt-4 pt-3 border-t border-stone-200 flex items-center gap-2 text-[11px] text-slate-500">
                            <div className="w-7 h-7 rounded-full bg-slate-900 text-white serif-ko flex items-center justify-center font-bold text-xs">{instructorName.charAt(0)}</div>
                            <div>
                              <div className="text-slate-900 font-semibold">{instructorName}</div>
                              <div className="text-[10px]">{branchName} · {displayName} 학생 담당 · {realStudent?.enrolledMonths ?? 0}개월째</div>
                            </div>
                          </div>
                        </div>
                      </section>

                      <section>
                        <div className="serif-ko text-base font-bold text-slate-900 mb-3 flex items-center gap-2"><BookOpen size={14} /> 과목별 학습 현황</div>
                        <div className="overflow-hidden rounded-lg border border-stone-200">
                          <table className="w-full text-sm">
                            <thead className="bg-stone-50 text-[11px] text-slate-600">
                              <tr>
                                <th className="px-4 py-2.5 text-left font-semibold">과목</th>
                                <th className="px-4 py-2.5 text-left font-semibold">상태</th>
                                {includeGrades && <th className="px-4 py-2.5 text-center font-semibold">현재 / 기준</th>}
                                <th className="px-4 py-2.5 text-left font-semibold">학원의 진단 및 관리 방향</th>
                              </tr>
                            </thead>
                            <tbody>
                              {subjectRows.map((s, i) => {
                                const cfg = s.status ? statusConfig[s.status] : null;
                                return (
                                  <tr key={i} className="border-t border-stone-200">
                                    <td className="px-4 py-3 font-bold text-slate-900 serif-ko">{s.name}</td>
                                    <td className="px-4 py-3">
                                      {cfg ? (
                                        <div className={`inline-flex items-center gap-1.5 text-[11px] px-2 py-1 rounded-full ${cfg.bg} ${cfg.text} border ${cfg.border} font-semibold`}>
                                          <div className={`w-1.5 h-1.5 rounded-full ${cfg.soft}`} /> {cfg.label}
                                        </div>
                                      ) : (
                                        <div className="inline-flex items-center gap-1.5 text-[11px] px-2 py-1 rounded-full bg-stone-100 text-slate-500 border border-stone-200 font-semibold">—</div>
                                      )}
                                    </td>
                                    {includeGrades && (
                                      <td className="px-4 py-3 text-center">
                                        <span className="text-lg font-black num text-slate-900">{s.current ?? '—'}</span>
                                        <span className="text-xs text-slate-500 mx-1">/</span>
                                        <span className="text-xs text-slate-500 num">{s.target ?? '—'}</span>
                                      </td>
                                    )}
                                    <td className="px-4 py-3 text-[12px] text-slate-700 leading-relaxed">{s.note}</td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      </section>

                      <section>
                        <div className="serif-ko text-base font-bold text-slate-900 mb-3 flex items-center gap-2"><ShieldCheck size={14} className="text-amber-700" /> 학원이 약속한 학습 관리 진행 현황</div>
                        <div className="space-y-2">
                          {actionItems.length === 0 && (
                            <div className="text-xs text-slate-400 text-center py-6 border border-dashed border-stone-300 rounded-lg">등록된 액션플랜이 없습니다</div>
                          )}
                          {actionItems.map(c => {
                            const cfg = actionStatusConfig[c.actionStatus] ?? actionStatusConfig['in-progress'];
                            return (
                              <div key={c.id} className="border border-stone-200 rounded-lg p-4 bg-white">
                                <div className="flex items-start justify-between mb-2">
                                  <div>
                                    <div className="font-semibold text-slate-900 text-sm">{c.actionName}</div>
                                    <div className="text-[11px] text-slate-500 mt-0.5">
                                      담당 {c.actionOwner || '—'} · <span className="num">{c.date}</span> 합의
                                      {c.actionDeadline && <> · 기한 <span className="num">{c.actionDeadline}</span></>}
                                    </div>
                                  </div>
                                  <div className={`text-[10px] px-2 py-1 rounded-full font-bold shrink-0 ${cfg.bg} ${cfg.text}`}>{cfg.label}</div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </section>

                      <div className="pt-6 border-t border-stone-200 text-center">
                        <div className="serif-ko text-base font-bold text-slate-900">종로엠스쿨{branchName ? ` ${branchName}` : ''}</div>
                        <div className="text-[11px] text-slate-500 mt-1">학생 한 명의 진학 성공을 위해, 매월 정성껏 안내드립니다.</div>
                        <div className="text-[10px] text-slate-400 mt-3 num">JM-CARE Report · {formatGeneratedAt(generatedAt)} 자동 생성 + 강사 검수 완료</div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {isDirector && step === 'review' && (
            <div className="border-t border-stone-200 bg-white px-6 py-4 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2 text-xs text-slate-500">
                {sendError ? (
                  <span className="text-red-600 font-semibold">{sendError}</span>
                ) : (
                  <>
                    <CheckCircle2 size={12} className="text-emerald-600" />
                    <span>강사 메시지 작성 완료 · 발송 전 한번 더 확인하세요</span>
                  </>
                )}
              </div>
              <div className="flex items-center gap-2">
                <button onClick={onClose} className="px-4 py-2 text-xs text-slate-700 hover:bg-stone-100 rounded">취소</button>
                <button className="px-4 py-2 text-xs bg-white border border-stone-300 rounded hover:bg-stone-50 flex items-center gap-1.5"><Eye size={12} /> 학부모 화면 미리보기</button>
                <button
                  onClick={handleSend}
                  disabled={sending}
                  className="px-5 py-2 text-xs bg-amber-500 hover:bg-amber-600 text-white rounded font-bold flex items-center gap-1.5 shadow-sm disabled:opacity-50"
                >
                  <Send size={12} /> {sending ? '발송 중...' : '학부모께 발송하기'}
                </button>
              </div>
            </div>
          )}

          {!isDirector && (
            <div className="border-t border-stone-200 bg-white px-6 py-4 flex items-center justify-between shrink-0">
              <div className="text-[11px] text-slate-500">자녀 정보만 노출되며 내부 운영 메모는 표시되지 않습니다</div>
              <div className="flex items-center gap-2">
                <button className="px-4 py-2 text-xs bg-white border border-stone-300 rounded hover:bg-stone-50 flex items-center gap-1.5"><Download size={12} /> PDF 저장</button>
                <button onClick={onClose} className="px-5 py-2 text-xs bg-slate-900 text-white rounded font-bold hover:bg-slate-800">확인</button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
