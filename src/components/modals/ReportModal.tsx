'use client';

import { useState } from 'react';
import {
  X, FileText, RefreshCw, Printer, Download, Eye, Send,
  TrendingUp, MessageSquare, BookOpen, ShieldCheck, Calendar,
  Check, Edit3, Clock, Target, CheckCircle2,
} from 'lucide-react';
import { LineChart, Line, ResponsiveContainer, CartesianGrid, XAxis, YAxis, Tooltip, ReferenceLine } from 'recharts';
import { targetStudent, mockExams, subjects, parentData, subjectColors, statusConfig } from '@/lib/dummy-data';

interface Props {
  mode: 'director' | 'parent';
  onClose: () => void;
}

function SentState({ onClose }: { onClose: () => void }) {
  return (
    <div className="h-full flex items-center justify-center p-12">
      <div className="text-center max-w-md">
        <div className="w-20 h-20 rounded-full bg-emerald-100 mx-auto flex items-center justify-center mb-5">
          <Check size={36} className="text-emerald-600" strokeWidth={3} />
        </div>
        <div className="serif-ko text-2xl font-bold text-slate-900 mb-2">발송 완료</div>
        <div className="text-sm text-slate-600 leading-relaxed mb-6">
          김민준 학부모님께 <span className="font-semibold text-slate-900">2026년 4월 학습 리포트</span>가 발송되었습니다.<br />
          학부모 앱 알림 · 카카오톡 알림톡 동시 발송
        </div>
        <div className="bg-stone-50 rounded-lg p-4 text-left text-xs text-slate-600 space-y-1.5 mb-6 border border-stone-200">
          <div className="flex justify-between"><span>발송 시각</span><span className="num font-semibold text-slate-900">2026.05.12 14:32</span></div>
          <div className="flex justify-between"><span>수신자</span><span className="font-semibold text-slate-900">김민준 학부모 (010-****-7821)</span></div>
          <div className="flex justify-between"><span>발송자</span><span className="font-semibold text-slate-900">박지훈 담임 강사</span></div>
          <div className="flex justify-between"><span>다음 리포트 예정일</span><span className="num font-semibold text-slate-900">2026.06.03</span></div>
        </div>
        <div className="flex gap-2 justify-center">
          <button className="px-4 py-2 text-xs bg-white border border-stone-300 rounded hover:bg-stone-50">발송 이력 보기</button>
          <button onClick={onClose} className="px-5 py-2 text-xs bg-slate-900 text-white rounded font-bold hover:bg-slate-800">완료</button>
        </div>
      </div>
    </div>
  );
}

export default function ReportModal({ mode, onClose }: Props) {
  const isDirector = mode === 'director';
  const [step, setStep] = useState<'review' | 'sent'>(isDirector ? 'review' : 'review');
  const [period, setPeriod] = useState('2026년 4월');
  const [includeGrades, setIncludeGrades] = useState(true);
  const [editingMessage, setEditingMessage] = useState(false);
  const [message, setMessage] = useState(
    `안녕하세요, 김민준 학부모님. 박지훈 담임 강사입니다.\n\n` +
    `민준이가 종로엠스쿨과 함께한 지 1년이 되었습니다. 이번 리포트에는 그동안의 성장을 함께 담았습니다.\n\n` +
    `입학 시점 종합 백분위 73.8에서 시작해 4차 학력평가에서 85.8까지, 1년간 12점 상승했습니다. 전국 위치로는 상위 26.2%에서 상위 14.2%로 올라섰습니다. 특히 수학은 68에서 88로 20점 상승해 가장 크게 성장했고, 2월부터 고1 과정 선행을 시작했습니다.\n\n` +
    `이번 학기 중점 관리 영역은 국어입니다. 고려대 합격생들의 중2 시점 평균(백분위 90) 대비 격차가 가장 큰 과목으로, 5월부터 독해 기초반을 주 2회 운영하고 있습니다.\n\n` +
    `장기 로드맵상 민준이는 현재 '중등 기초역량 완성' 단계에 있으며 계획된 경로를 따라 착실히 가고 있습니다. 궁금하신 점은 언제든 연락 주십시오.`
  );

  const reportData = { student: targetStudent, period, generatedAt: '2026.05.12 14:30', instructor: '박지훈 담임 강사' };

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
                  {isDirector ? '자동 조립된 내용을 검수한 후 발송하실 수 있습니다' : `${reportData.period} · ${reportData.instructor} 작성`}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {isDirector && step === 'review' && (
                <>
                  <select value={period} onChange={e => setPeriod(e.target.value)} className="text-xs border border-stone-300 rounded px-2 py-1.5 bg-white">
                    <option>2026년 4월</option><option>2026년 3월</option><option>2026년 2월</option>
                  </select>
                  <button className="text-xs px-3 py-1.5 bg-white border border-stone-300 rounded hover:bg-stone-50 flex items-center gap-1">
                    <RefreshCw size={11} /> 데이터 새로 조립
                  </button>
                </>
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
                <div className="text-[10px] uppercase tracking-widest text-slate-500 font-semibold mt-6 mb-3">발송 방식</div>
                <div className="space-y-2 text-xs">
                  {['학부모 앱 알림', '카카오톡 알림톡', '이메일 (PDF 첨부)', '모든 채널'].map((ch, i) => (
                    <label key={i} className="flex items-center gap-2 cursor-pointer">
                      <input type="radio" name="ch" defaultChecked={i === 0} />
                      <span>{ch}</span>
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
              {step === 'sent' ? <SentState onClose={onClose} /> : (
                <div className="p-8">
                  <div className="max-w-3xl mx-auto bg-white rounded-xl shadow-sm border border-stone-200 overflow-hidden">
                    <div className="bg-gradient-to-br from-slate-900 to-slate-800 text-white px-8 py-6 relative overflow-hidden">
                      <div className="absolute top-0 right-0 w-40 h-40 rounded-full bg-amber-400/10 -translate-y-12 translate-x-12 blur-2xl" />
                      <div className="relative flex justify-between items-start">
                        <div>
                          <div className="text-[10px] uppercase tracking-[0.25em] text-amber-300 mb-2">JONGNO M-SCHOOL · Monthly Report</div>
                          <div className="serif-ko text-3xl font-black leading-tight">월간 학습 리포트</div>
                          <div className="text-sm text-slate-300 mt-2">{reportData.period} · {reportData.student.name} 학생 · 재원 1주년 특집</div>
                        </div>
                        <div className="text-right">
                          <div className="text-[10px] text-slate-400">생성일</div>
                          <div className="text-xs num font-semibold mt-0.5">{reportData.generatedAt}</div>
                          <div className="text-[10px] text-slate-400 mt-2">{reportData.instructor}</div>
                        </div>
                      </div>
                    </div>

                    <div className="p-8 space-y-8">
                      <section>
                        <div className="grid grid-cols-2 gap-6">
                          <div>
                            <div className="text-[10px] uppercase tracking-widest text-slate-500 mb-2">학생</div>
                            <div className="serif-ko text-2xl font-bold text-slate-900">{reportData.student.name}</div>
                            <div className="text-sm text-slate-600 mt-1">{reportData.student.grade} · {reportData.student.school}</div>
                            <div className="text-[11px] text-slate-500 mt-1">재원 {reportData.student.enrolledMonths}개월 · 담임 {reportData.student.homeroom}</div>
                          </div>
                          <div className="border-l border-stone-200 pl-6">
                            <div className="text-[10px] uppercase tracking-widest text-slate-500 mb-2 flex items-center gap-1"><Target size={10} /> 최종 진학 목표</div>
                            <div className="serif-ko text-lg font-bold text-slate-900 leading-snug">{reportData.student.finalGoal.school}</div>
                            <div className="text-xs text-slate-600 mt-0.5">{reportData.student.finalGoal.detail} · 중등 기초역량 단계</div>
                            <div className="text-[11px] text-slate-500 mt-2 flex items-center gap-1"><Clock size={10} /> 수능까지 D-<span className="num font-semibold">1,647</span></div>
                          </div>
                        </div>
                      </section>

                      <section className="bg-gradient-to-br from-emerald-50/60 to-stone-50 rounded-xl p-6 border border-emerald-200">
                        <div className="text-[10px] uppercase tracking-widest text-emerald-700 mb-3 flex items-center gap-1.5 font-bold">
                          <TrendingUp size={11} /> 입학 후 1년의 성장 — 4회 전국 학력평가 누적
                        </div>
                        <div className="h-44 mb-3">
                          <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={mockExams} margin={{ top: 8, right: 16, bottom: 0, left: -16 }}>
                              <CartesianGrid strokeDasharray="3 3" stroke="#e7e5e4" vertical={false} />
                              <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} />
                              <YAxis domain={[60, 100]} tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} />
                              <Tooltip contentStyle={{ fontSize: 11, borderRadius: 8 }} />
                              <ReferenceLine y={90} stroke="#94a3b8" strokeDasharray="4 4" />
                              <Line type="monotone" dataKey="avg" name="종합" stroke="#0f172a" strokeWidth={3} dot={{ r: 4 }} />
                              {includeGrades && Object.entries(subjectColors).map(([k, v]) => (
                                <Line key={k} type="monotone" dataKey={k} stroke={v} strokeWidth={1.4} dot={{ r: 2.5 }} />
                              ))}
                            </LineChart>
                          </ResponsiveContainer>
                        </div>
                        <div className="grid grid-cols-3 gap-3 text-center">
                          {[
                            { label: '종합 백분위', value: '73.8 → 85.8', delta: '+12.0' },
                            { label: '전국 위치', value: '상위 14.2%', delta: '26.2%에서 상승' },
                            { label: '최고 성장 과목', value: '수학 +20', delta: '고1 선행 진행 중' },
                          ].map((item, i) => (
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
                            <div className="w-7 h-7 rounded-full bg-slate-900 text-white serif-ko flex items-center justify-center font-bold text-xs">박</div>
                            <div>
                              <div className="text-slate-900 font-semibold">박지훈 담임 강사</div>
                              <div className="text-[10px]">운정점 · 김민준 학생 담당 · 12개월째</div>
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
                              {[
                                { ...subjects[0], note: '1년간 +12 상승 중이나 합격생 경로 대비 갭 최대. 5월부터 독해 기초반 주 2회 진행 중.' },
                                { ...subjects[1], note: '기준 도달. 현 수준 유지로 충분합니다.' },
                                { ...subjects[2], note: '1년간 +20으로 최고 성장. 고1 과정 선행 진행 중, 월간 점검 유지.' },
                                { ...subjects[3], note: '점진 상승 중. 공학계열 대비 탐구 개념 연결 특강 검토 중.' },
                              ].map((s, i) => {
                                const cfg = statusConfig[s.status];
                                return (
                                  <tr key={i} className="border-t border-stone-200">
                                    <td className="px-4 py-3 font-bold text-slate-900 serif-ko">{s.name}</td>
                                    <td className="px-4 py-3">
                                      <div className={`inline-flex items-center gap-1.5 text-[11px] px-2 py-1 rounded-full ${cfg.bg} ${cfg.text} border ${cfg.border} font-semibold`}>
                                        <div className={`w-1.5 h-1.5 rounded-full ${cfg.soft}`} /> {cfg.label}
                                      </div>
                                    </td>
                                    {includeGrades && (
                                      <td className="px-4 py-3 text-center">
                                        <span className="text-lg font-black num text-slate-900">{s.current}</span>
                                        <span className="text-xs text-slate-500 mx-1">/</span>
                                        <span className="text-xs text-slate-500 num">{s.target}</span>
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
                          {parentData.ongoingPromises.map((p, i) => (
                            <div key={i} className="border border-stone-200 rounded-lg p-4 bg-white">
                              <div className="flex items-start justify-between mb-2">
                                <div>
                                  <div className="font-semibold text-slate-900 text-sm">{p.task}</div>
                                  <div className="text-[11px] text-slate-500 mt-0.5">{p.detail} · <span className="num">{p.since}</span> 시작</div>
                                </div>
                                <div className="text-[10px] px-2 py-1 bg-emerald-100 text-emerald-700 rounded-full font-bold shrink-0">진행 중 {p.progress}%</div>
                              </div>
                              <div className="relative h-1.5 bg-stone-100 rounded-full overflow-hidden">
                                <div className="absolute h-full bg-emerald-500 rounded-full" style={{ width: `${p.progress}%` }} />
                              </div>
                            </div>
                          ))}
                        </div>
                      </section>

                      <div className="pt-6 border-t border-stone-200 text-center">
                        <div className="serif-ko text-base font-bold text-slate-900">종로엠스쿨 운정점</div>
                        <div className="text-[11px] text-slate-500 mt-1">학생 한 명의 진학 성공을 위해, 매월 정성껏 안내드립니다.</div>
                        <div className="text-[10px] text-slate-400 mt-3 num">JM-CARE Report · {reportData.generatedAt} 자동 생성 + 강사 검수 완료</div>
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
                <CheckCircle2 size={12} className="text-emerald-600" />
                <span>강사 메시지 작성 완료 · 발송 전 한번 더 확인하세요</span>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={onClose} className="px-4 py-2 text-xs text-slate-700 hover:bg-stone-100 rounded">취소</button>
                <button className="px-4 py-2 text-xs bg-white border border-stone-300 rounded hover:bg-stone-50 flex items-center gap-1.5"><Download size={12} /> PDF 저장</button>
                <button className="px-4 py-2 text-xs bg-white border border-stone-300 rounded hover:bg-stone-50 flex items-center gap-1.5"><Eye size={12} /> 학부모 화면 미리보기</button>
                <button onClick={() => setStep('sent')} className="px-5 py-2 text-xs bg-amber-500 hover:bg-amber-600 text-white rounded font-bold flex items-center gap-1.5 shadow-sm">
                  <Send size={12} /> 학부모께 발송하기
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
