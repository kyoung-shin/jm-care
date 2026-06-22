'use client';

import { useState, useEffect } from 'react';
import {
  Bell, AlertTriangle, CheckCircle2, Target, Calendar, MessageSquare,
  ChevronRight, ArrowUpRight, Sparkles, FileText,
  Activity, ShieldCheck, TrendingUp, BookOpen, Clock,
} from 'lucide-react';
import { LineChart, Line, ResponsiveContainer, ReferenceLine, YAxis } from 'recharts';
import MockExamChart from '@/components/charts/MockExamChart';
import Roadmap from '@/components/dashboard/Roadmap';
import CounselingModal from '@/components/modals/CounselingModal';
import ReportModal from '@/components/modals/ReportModal';
import Footer from '@/components/dashboard/Footer';
import {
  targetStudent, subjects, counseling, goalHistory, riskSignals,
  statusConfig, actionStatusConfig,
  type CounselingRecord,
} from '@/lib/dummy-data';

export default function DirectorPage() {
  const [counselingList, setCounselingList] = useState<CounselingRecord[]>(counseling);
  const [reportOpen, setReportOpen] = useState(false);
  const [counselingModal, setCounselingModal] = useState<{
    mode: 'new' | 'detail';
    data?: CounselingRecord;
    prefill?: { subject?: string; topic?: string; summary?: string; action?: string } | null;
  } | null>(null);

  useEffect(() => {
    async function loadCounselings() {
      try {
        const res = await fetch('/api/students/student_minjun/counselings');
        if (res.ok) {
          const data = await res.json();
          if (data.length > 0) setCounselingList(data);
        }
      } catch {
        // fall back to dummy data
      }
    }
    loadCounselings();
  }, []);

  const handleSaveCounseling = async (record: CounselingRecord) => {
    setCounselingList(prev => [record, ...prev]);
    setCounselingModal(null);
    try {
      await fetch('/api/students/student_minjun/counselings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(record),
      });
    } catch { /* best-effort */ }
  };

  const handleToggleAction = async (counselingDate: string) => {
    setCounselingList(prev =>
      prev.map(c =>
        c.date === counselingDate
          ? { ...c, action: { ...c.action, status: c.action.status === 'completed' ? 'in-progress' : 'completed' } }
          : c
      )
    );
    try {
      await fetch(`/api/students/student_minjun/counselings`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date: counselingDate }),
      });
    } catch { /* best-effort */ }
  };

  const student = targetStudent;

  return (
    <div className="max-w-7xl mx-auto px-8 py-8">
      <div className="mb-7 flex items-end justify-between border-b border-stone-200 pb-5">
        <div>
          <div className="text-[11px] uppercase tracking-[0.2em] text-slate-500 mb-1.5">Student Comprehensive View</div>
          <div className="serif-ko text-[34px] font-black text-slate-900 leading-none">학생 종합 현황</div>
          <div className="text-sm text-slate-500 mt-2">최종 목표 기준으로 본 한 학생의 모든 것 — 장기 로드맵 관리</div>
        </div>
        <div className="flex items-center gap-3 text-xs">
          <div className="text-slate-500">최종 업데이트: 1시간 전</div>
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
        <div className="col-span-4 bg-white border border-stone-200 rounded-xl p-6">
          <div className="text-[10px] uppercase tracking-widest text-slate-500 mb-3">Student</div>
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 rounded-full bg-slate-900 text-white flex items-center justify-center serif-ko text-xl font-bold shrink-0">{student.initial}</div>
            <div className="min-w-0">
              <div className="text-2xl font-bold text-slate-900 leading-tight">{student.name}</div>
              <div className="text-sm text-slate-600 mt-1">{student.grade} · {student.school}</div>
              <div className="flex items-center gap-3 mt-3 text-[11px] text-slate-500">
                <span>재원 <span className="num font-semibold text-slate-700">{student.enrolledMonths}</span>개월</span>
                <span className="w-1 h-1 rounded-full bg-stone-300" />
                <span>담임 {student.homeroom}</span>
              </div>
            </div>
          </div>
          <div className="mt-4 pt-4 border-t border-stone-100 flex items-center gap-2 text-[11px]">
            <TrendingUp size={12} className="text-emerald-600" />
            <span className="text-slate-600">1년간 종합 백분위 <span className="num font-bold text-emerald-700">+12.0</span> 상승</span>
          </div>
        </div>

        <div className="col-span-4 bg-white border border-stone-200 rounded-xl p-6">
          <div className="flex items-center justify-between mb-3">
            <div className="text-[10px] uppercase tracking-widest text-slate-500 flex items-center gap-1.5"><Target size={10} /> Goal Structure</div>
            <button className="text-[10px] text-slate-500 hover:text-slate-900 flex items-center gap-0.5">히스토리 <ChevronRight size={10} /></button>
          </div>
          <div className="space-y-2.5">
            <div>
              <div className="text-[10px] text-amber-600 font-bold mb-0.5">최종 목표 · {student.finalGoal.track}</div>
              <div className="font-bold text-slate-900 leading-tight serif-ko text-lg">{student.finalGoal.school}</div>
              <div className="text-[11px] text-slate-500">{student.finalGoal.detail}</div>
            </div>
            <div className="border-t border-stone-100 pt-2.5">
              <div className="text-[10px] text-slate-500 mb-0.5">중간 목표 · {student.midGoal.track}</div>
              <div className="text-sm text-slate-700 font-semibold">{student.midGoal.school}</div>
              <div className="text-[10px] text-slate-500">{student.midGoal.detail}</div>
            </div>
          </div>
        </div>

        <div className="col-span-4 bg-slate-900 text-white rounded-xl p-6 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 rounded-full bg-amber-500/10 -translate-y-12 translate-x-12 blur-2xl" />
          <div className="relative">
            <div className="text-[10px] uppercase tracking-widest text-slate-400 mb-3">Stage Readiness — 중등 기초역량</div>
            <div className="flex items-baseline gap-1 mb-1">
              <div className="text-[56px] font-black num leading-none tracking-tight">{student.overallReadiness}</div>
              <div className="text-2xl text-slate-400 font-bold">%</div>
            </div>
            <div className="text-xs text-slate-400 mb-4">고려대 합격생의 중2 시점 평균 수준 기준</div>
            <div className="relative h-2 bg-slate-700/70 rounded-full overflow-hidden">
              <div className="absolute h-full bg-gradient-to-r from-amber-500 to-amber-300 rounded-full" style={{ width: `${student.overallReadiness}%` }} />
              <div className="absolute h-full w-[2px] bg-white" style={{ left: `${student.peerAverage}%` }} />
            </div>
            <div className="flex justify-between text-[10px] text-slate-400 mt-1.5">
              <span>현재</span>
              <span style={{ marginLeft: `${student.peerAverage - 14}%` }}>↑ 합격생 평균 경로 {student.peerAverage}%</span>
            </div>
          </div>
        </div>
      </div>

      <Roadmap />
      <MockExamChart />

      {/* 핵심 4과목 */}
      <div className="bg-white border border-stone-200 rounded-xl p-6 mb-4">
        <div className="flex items-end justify-between mb-5">
          <div>
            <div className="serif-ko text-lg font-bold text-slate-900">핵심 4과목 vs 합격생 경로 기준</div>
            <div className="text-xs text-slate-500 mt-1">고려대 합격생의 중2 시점 평균 백분위 기준 (국·수 90 / 영·과 88)</div>
          </div>
          <button className="text-xs text-slate-500 hover:text-slate-900 flex items-center gap-1">전체 성적 추이 <ChevronRight size={12} /></button>
        </div>
        <div className="grid grid-cols-4 gap-4">
          {subjects.map(s => {
            const cfg = statusConfig[s.status];
            return (
              <div key={s.name} className={`border ${cfg.border} ${cfg.bg} rounded-lg p-4 relative overflow-hidden`}>
                <div className="flex items-center justify-between mb-3">
                  <div className="font-bold text-slate-900 text-base">{s.name}</div>
                  <div className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${cfg.text} bg-white border ${cfg.border}`}>● {cfg.label}</div>
                </div>
                <div className="flex items-baseline gap-1.5 mb-0.5">
                  <div className="text-[34px] font-black text-slate-900 num leading-none">{s.current}</div>
                  <div className="text-xs text-slate-500">/ 기준 {s.target}</div>
                </div>
                <div className={`text-xs ${cfg.text} font-semibold mb-3`}>{s.gap > 0 ? `+${s.gap} 우위` : s.gap === 0 ? '기준 도달' : `${Math.abs(s.gap)} 부족`}</div>
                <div className="h-12 -mx-1">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={s.trend.map((v, i) => ({ v, i }))}>
                      <YAxis hide domain={[60, 100]} />
                      <Line type="monotone" dataKey="v" stroke={cfg.stroke} strokeWidth={2.2} dot={false} />
                      <ReferenceLine y={s.target} stroke="#94a3b8" strokeDasharray="3 3" strokeWidth={1} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex items-center justify-between text-[10px] text-slate-500 mt-1">
                  <span>학평 4회 추이</span>
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
          <div className="space-y-3">
            {[
              { rank: 'TOP 1', subject: '국어', status: 'risk', gap: -6, color: 'red',
                desc: '비문학 독해 기초 체력 부족이 주요 원인. 상승 추세이나 합격생 경로 대비 갭 최대.',
                action: '독해 기초반 + 주간 지문 훈련' },
              { rank: 'TOP 2', subject: '과학', status: 'lacking', gap: -6, color: 'amber',
                desc: '탐구 개념 연결력 보강 필요. 공학계열 목표 기준 고1 통합과학 대비 선행 검토 시점.',
                action: '개념 연결 특강 + 격주 점검' },
            ].map(item => (
              <div key={item.subject} className={`border border-${item.color}-200 bg-${item.color}-50/40 rounded-lg p-4`}>
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div className={`text-xs font-bold text-${item.color}-700`}>{item.rank}</div>
                    <div className="font-bold text-slate-900">{item.subject}</div>
                    <div className={`text-[10px] px-1.5 py-0.5 rounded bg-${item.color}-100 text-${item.color}-700 font-semibold`}>{statusConfig[item.status].label}</div>
                  </div>
                  <div className={`text-xs text-${item.color}-700 font-semibold num`}>{item.gap}</div>
                </div>
                <div className="text-xs text-slate-700 mb-3 leading-relaxed">{item.desc}</div>
                <div className={`flex items-center justify-between bg-white rounded border border-${item.color}-100 px-3 py-2`}>
                  <div className="flex items-center gap-2">
                    <ArrowUpRight size={12} className={`text-${item.color}-600`} />
                    <div className="text-xs"><span className="text-slate-500">추천: </span><span className="font-semibold text-slate-900">{item.action}</span></div>
                  </div>
                  <button
                    onClick={() => setCounselingModal({ mode: 'new', prefill: { subject: item.subject, topic: '학습', summary: `${item.subject} 갭 분석 관련 상담`, action: item.action } })}
                    className="text-[10px] text-slate-700 hover:text-slate-900 font-semibold"
                  >상담 기록 →</button>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="col-span-7 bg-white border border-stone-200 rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2"><MessageSquare size={14} className="text-slate-700" /><div className="serif-ko text-base font-bold text-slate-900">상담 기록 · 진행 중 액션플랜</div></div>
            <div className="flex items-center gap-2 text-[11px] text-slate-500"><Calendar size={11} /><span>다음 점검: <span className="num font-semibold text-slate-700">2026.05.20</span></span></div>
          </div>
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
        </div>
      </div>

      {/* 위험 신호 + 목표 히스토리 */}
      <div className="grid grid-cols-12 gap-4 mb-4">
        <div className="col-span-5 bg-white border border-stone-200 rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2"><Activity size={14} className="text-slate-700" /><div className="serif-ko text-base font-bold text-slate-900">위험 신호 모니터링</div></div>
            <div className="text-[10px] uppercase tracking-wider text-emerald-700 font-semibold">All Clear</div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {riskSignals.map((r, i) => {
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
          <div className="mt-4 pt-4 border-t border-stone-100 text-[11px] text-slate-500 flex items-start gap-2">
            <AlertTriangle size={11} className="text-slate-400 mt-0.5 shrink-0" />
            <span>장기 재원생은 학년 전환기에 이탈 위험이 가장 높아 해당 시기 자동 집중 모니터링이 적용됩니다 (Phase 2 기능)</span>
          </div>
        </div>

        <div className="col-span-7 bg-white border border-stone-200 rounded-xl p-6">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-2"><BookOpen size={14} className="text-slate-700" /><div className="serif-ko text-base font-bold text-slate-900">목표 변경 히스토리</div></div>
            <div className="text-[10px] uppercase tracking-wider text-slate-500">Goal Journey</div>
          </div>
          <div className="relative">
            <div className="absolute left-0 right-0 top-3 h-px bg-stone-200" />
            <div className="grid grid-cols-3 gap-4 relative">
              {goalHistory.map((g, i) => (
                <div key={i}>
                  <div className="flex items-center mb-3">
                    <div className={`w-3 h-3 rounded-full border-2 ${g.current ? 'bg-amber-400 border-slate-900' : 'bg-white border-slate-400'} relative z-10`} />
                  </div>
                  <div className="text-[11px] text-slate-500 num font-semibold">{g.date}</div>
                  <div className={`text-xs font-bold mt-0.5 ${g.current ? 'text-slate-900' : 'text-slate-700'}`}>{g.label}</div>
                  <div className="text-xs text-slate-700 mt-1.5 leading-tight">{g.target}</div>
                  <div className="text-[10px] text-slate-500 mt-0.5">{g.track}</div>
                  {g.reason && <div className="text-[10px] text-slate-500 mt-2 leading-relaxed border-l-2 border-stone-200 pl-2">{g.reason}</div>}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <Footer perspective="원장" />

      {reportOpen && <ReportModal mode="director" onClose={() => setReportOpen(false)} />}
      {counselingModal && (
        <CounselingModal
          mode={counselingModal.mode}
          data={counselingModal.data}
          prefill={counselingModal.prefill}
          onClose={() => setCounselingModal(null)}
          onSave={handleSaveCounseling}
          onToggleAction={handleToggleAction}
        />
      )}
    </div>
  );
}
