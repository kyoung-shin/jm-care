'use client';

import { useEffect, useMemo, useState } from 'react';
import { X, Target, TrendingUp, MessageSquare, Pencil, Activity } from 'lucide-react';
import MockExamChart, { type MockExamRow } from '@/components/charts/MockExamChart';
import { buildReportModel } from '@/lib/report-data';
import { statusConfig, actionStatusConfig, type CounselingRecord } from '@/lib/dummy-data';

interface Props {
  studentId: string;
  onClose: () => void;
  /** "현황 입력" 으로 넘어갈 때 호출 */
  onEditStatus?: () => void;
}

interface StudentDetail {
  id: string;
  name: string;
  grade: string;
  school: string;
  enrolledMonths: number;
  finalGoalSchool: string | null;
  finalGoalDetail: string | null;
  finalGoalTrack: string | null;
  midGoalSchool: string | null;
  daysUntilCSAT: number | null;
  overallReadiness: number | null;
  peerAverage: number | null;
  subjectTargets: Record<string, number> | null;
  instructor: { name: string } | null;
  branch: { name: string } | null;
  mockExams: MockExamRow[];
  counselings: { actionName: string | null; actionOwner: string | null; actionDeadline: string | null; actionStatus: string }[];
}

export default function StudentDetailModal({ studentId, onClose, onEditStatus }: Props) {
  const [student, setStudent] = useState<StudentDetail | null>(null);
  const [counselings, setCounselings] = useState<CounselingRecord[]>([]);
  const [openIdx, setOpenIdx] = useState<number | null>(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      fetch(`/api/students/${studentId}`).then(r => r.json()).catch(() => null),
      fetch(`/api/students/${studentId}/counselings`).then(r => r.json()).catch(() => []),
    ]).then(([s, c]) => {
      if (cancelled) return;
      if (s && !s.error) setStudent(s);
      if (Array.isArray(c)) setCounselings(c);
      setLoading(false);
    });
    return () => { cancelled = true; };
  }, [studentId]);

  const model = useMemo(() => {
    if (!student) return null;
    return buildReportModel(
      {
        ...student,
        mockExams: student.mockExams as never,
        counselings: student.counselings,
      } as never,
      -1
    );
  }, [student]);

  return (
    <div className="fixed inset-0 z-50 ko-sans">
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={onClose} />
      <div className="absolute inset-0 flex items-center justify-center p-6 pointer-events-none">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[92vh] flex flex-col pointer-events-auto overflow-hidden">
          <div className="flex items-center justify-between px-6 py-4 border-b border-stone-200 bg-stone-50 shrink-0">
            <div className="min-w-0">
              <div className="serif-ko text-lg font-bold text-slate-900">
                {student ? `${student.name} · ${student.grade}` : '학생 상세'}
              </div>
              <div className="text-xs text-slate-500">
                {student
                  ? `${student.school} · 담임 ${student.instructor?.name ?? '미배정'} · 재원 ${student.enrolledMonths}개월`
                  : '불러오는 중...'}
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {onEditStatus && (
                <button
                  onClick={onEditStatus}
                  className="text-xs px-3 py-1.5 bg-white border border-stone-300 rounded hover:bg-stone-50 flex items-center gap-1.5"
                >
                  <Pencil size={11} /> 현황 입력
                </button>
              )}
              <button onClick={onClose} className="w-8 h-8 rounded-lg hover:bg-stone-200 flex items-center justify-center text-slate-600"><X size={16} /></button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-6 space-y-5">
            {loading || !student ? (
              <div className="py-20 text-center text-sm text-slate-400">불러오는 중...</div>
            ) : (
              <>
                {/* 목표 · 준비도 */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-stone-50 border border-stone-200 rounded-xl p-5">
                    <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-widest text-slate-500 mb-2">
                      <Target size={11} /> 최종 목표
                    </div>
                    <div className="serif-ko text-xl font-bold text-slate-900">{student.finalGoalSchool ?? '목표 미설정'}</div>
                    <div className="text-xs text-slate-600 mt-1">
                      {[student.finalGoalDetail, student.finalGoalTrack].filter(Boolean).join(' · ') || '세부 목표 미설정'}
                    </div>
                    {student.daysUntilCSAT != null && (
                      <div className="text-[11px] text-slate-500 mt-2 num">수능까지 D-{student.daysUntilCSAT.toLocaleString()}</div>
                    )}
                  </div>
                  <div className="bg-stone-50 border border-stone-200 rounded-xl p-5">
                    <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-widest text-slate-500 mb-2">
                      <Activity size={11} /> 준비도
                    </div>
                    <div className="flex items-baseline gap-2">
                      <div className="text-[32px] font-black num leading-none text-slate-900">
                        {student.overallReadiness ?? '—'}
                      </div>
                      {student.overallReadiness != null && <div className="text-sm text-slate-500 font-semibold">%</div>}
                    </div>
                    <div className="text-[11px] text-slate-500 mt-2">
                      {student.peerAverage != null ? `합격생 평균 ${student.peerAverage}% 대비` : '비교 기준 미설정'}
                    </div>
                  </div>
                </div>

                {/* 과목별 목표 대비 */}
                {model && (
                  <div className="bg-white border border-stone-200 rounded-xl p-5">
                    <div className="flex items-center gap-2 mb-3">
                      <TrendingUp size={13} className="text-slate-700" />
                      <div className="serif-ko text-base font-bold text-slate-900">과목별 목표 대비</div>
                    </div>
                    <div className="grid grid-cols-5 gap-2">
                      {model.subjects.map(s => {
                        const cfg = s.status ? statusConfig[s.status] : null;
                        return (
                          <div key={s.name} className="border border-stone-200 rounded-lg p-3">
                            <div className="text-xs font-bold text-slate-900 mb-1">{s.name}</div>
                            <div className="flex items-baseline gap-1">
                              <span className="text-xl font-black num text-slate-900">{s.current ?? '—'}</span>
                              <span className="text-[10px] text-slate-500">/ {s.target ?? '—'}</span>
                            </div>
                            <div className={`text-[10px] mt-1 font-semibold ${cfg?.text ?? 'text-slate-400'}`}>
                              {s.status ? cfg?.label ?? '' : '데이터 없음'}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* 모의고사 추이 */}
                <MockExamChart mockExams={student.mockExams} grade={student.grade} compact />

                {/* 상담 기록 */}
                <div className="bg-white border border-stone-200 rounded-xl p-5">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <MessageSquare size={13} className="text-slate-700" />
                      <div className="serif-ko text-base font-bold text-slate-900">상담 기록 ({counselings.length})</div>
                    </div>
                    <div className="text-[10px] uppercase tracking-wider text-slate-500">최근순</div>
                  </div>
                  {counselings.length === 0 ? (
                    <div className="text-xs text-slate-400 text-center py-6">등록된 상담 기록이 없습니다</div>
                  ) : (
                    <div className="space-y-2">
                      {counselings.map((c, i) => {
                        const open = openIdx === i;
                        const acfg = actionStatusConfig[c.action.status] ?? actionStatusConfig['in-progress'];
                        return (
                          <div key={i} className="border border-stone-200 rounded-lg overflow-hidden">
                            <button
                              onClick={() => setOpenIdx(open ? null : i)}
                              className="w-full text-left px-4 py-3 hover:bg-stone-50 transition-colors"
                            >
                              <div className="flex items-center justify-between gap-3">
                                <div className="min-w-0">
                                  <div className="flex items-center gap-2">
                                    <span className="text-xs num text-slate-500">{c.date}</span>
                                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-stone-100 text-slate-600 border border-stone-200">{c.type}</span>
                                    <span className="text-sm font-semibold text-slate-900 truncate">{c.topic}</span>
                                  </div>
                                  {!open && <div className="text-[11px] text-slate-500 mt-1 truncate">{c.summary}</div>}
                                </div>
                                <span className="text-[10px] text-slate-400 shrink-0">{open ? '접기' : '펼치기'}</span>
                              </div>
                            </button>
                            {open && (
                              <div className="px-4 pb-4 pt-1 space-y-3 border-t border-stone-100 bg-stone-50/40">
                                <div>
                                  <div className="text-[10px] font-bold text-slate-500 mb-1">상담 요약</div>
                                  <div className="text-xs text-slate-800 leading-relaxed whitespace-pre-wrap">{c.summary}</div>
                                </div>
                                {c.internalMemo && (
                                  <div>
                                    <div className="text-[10px] font-bold text-amber-700 mb-1">내부 메모 (학부모 비공개)</div>
                                    <div className="text-xs text-slate-700 leading-relaxed whitespace-pre-wrap bg-amber-50 border border-amber-200 rounded p-2.5">{c.internalMemo}</div>
                                  </div>
                                )}
                                {c.parentShare && (
                                  <div>
                                    <div className="text-[10px] font-bold text-slate-500 mb-1">학부모 공유 내용</div>
                                    <div className="text-xs text-slate-700 leading-relaxed whitespace-pre-wrap">{c.parentShare}</div>
                                  </div>
                                )}
                                {c.action.name && c.action.name !== '(액션 미설정)' && (
                                  <div className="flex items-center gap-2 text-[11px] pt-1">
                                    <span className={`px-2 py-0.5 rounded-full font-bold ${acfg.bg} ${acfg.text}`}>{acfg.label}</span>
                                    <span className="font-semibold text-slate-800">{c.action.name}</span>
                                    <span className="text-slate-500">
                                      {[c.action.owner, c.action.deadline && `기한 ${c.action.deadline}`].filter(Boolean).join(' · ')}
                                    </span>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </>
            )}
          </div>

          <div className="border-t border-stone-200 px-6 py-3.5 flex items-center justify-between shrink-0">
            <div className="text-[11px] text-slate-500">담당 학생의 현황과 상담 내용을 확인하는 화면입니다</div>
            <button onClick={onClose} className="px-5 py-2 text-xs bg-slate-900 text-white rounded font-bold hover:bg-slate-800">닫기</button>
          </div>
        </div>
      </div>
    </div>
  );
}
