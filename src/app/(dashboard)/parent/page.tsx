'use client';

import { useState } from 'react';
import {
  Award, UserCheck, TrendingUp, Heart, ShieldCheck,
  Calendar, MessageSquare, FileText, Phone, ChevronRight, Eye,
} from 'lucide-react';
import { LineChart, Line, ResponsiveContainer, XAxis, YAxis, Tooltip } from 'recharts';
import ReportModal from '@/components/modals/ReportModal';
import Footer from '@/components/dashboard/Footer';
import { parentData, mockExams, statusConfig } from '@/lib/dummy-data';

export default function ParentPage() {
  const [reportOpen, setReportOpen] = useState(false);
  const d = parentData;

  return (
    <div className="bg-[#f9f6f0] min-h-screen">
      <div className="max-w-5xl mx-auto px-8 py-10">
        <div className="mb-8 pb-6 border-b border-stone-300/60">
          <div className="text-[11px] uppercase tracking-[0.2em] text-slate-500 mb-2">JONGNO M-SCHOOL · For Parents</div>
          <div className="serif-ko text-[36px] font-black text-slate-900 leading-tight">{d.parentName}, 안녕하세요.</div>
          <div className="text-base text-slate-600 mt-2.5 leading-relaxed">
            <span className="font-bold text-slate-900">{d.child}</span> 학생이 종로엠스쿨과 함께한 지 <span className="font-bold text-slate-900">1년</span>이 되었습니다. 그 성장의 기록을 안내드립니다.
          </div>
        </div>

        {/* Hero */}
        <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-2xl p-8 mb-5 text-white relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 rounded-full bg-amber-400/10 -translate-y-20 translate-x-20 blur-3xl" />
          <div className="relative grid grid-cols-12 gap-6">
            <div className="col-span-7">
              <div className="text-[11px] uppercase tracking-widest text-amber-300/90 mb-2 flex items-center gap-1.5"><Award size={11} /> 최종 진학 목표</div>
              <div className="serif-ko text-3xl font-bold leading-tight">{d.finalGoal}</div>
              <div className="text-sm text-slate-300 mt-1.5">{d.track} · 수능까지 D-<span className="num font-semibold text-white">{d.daysUntilCSAT.toLocaleString()}</span></div>
              <div className="mt-6 pt-5 border-t border-white/10">
                <div className="text-[11px] text-slate-400 mb-2">현재 단계 준비도 <span className="text-slate-500">(고려대 합격생의 중2 시점 평균 기준)</span></div>
                <div className="flex items-baseline gap-2">
                  <div className="text-[64px] font-black num leading-none">{d.overallReadiness}<span className="text-3xl text-slate-400">%</span></div>
                  <div className="text-xs text-emerald-300 font-semibold flex items-center gap-1 ml-2">↑ 1년간 +{d.trendChange}%p</div>
                </div>
                <div className="relative h-2 bg-white/10 rounded-full overflow-hidden mt-3">
                  <div className="absolute h-full bg-gradient-to-r from-amber-400 to-amber-300 rounded-full" style={{ width: `${d.overallReadiness}%` }} />
                </div>
              </div>
            </div>
            <div className="col-span-5 bg-white/5 backdrop-blur rounded-xl p-5 border border-white/10">
              <div className="text-[11px] uppercase tracking-widest text-amber-300/90 mb-2 flex items-center gap-1.5"><UserCheck size={11} /> 학원의 진단</div>
              <div className="text-xs text-slate-300 leading-relaxed">{d.schoolMessage}</div>
              <div className="mt-4 pt-4 border-t border-white/10 flex items-center gap-2 text-[11px] text-slate-400">
                <div className="w-7 h-7 rounded-full bg-amber-400/20 flex items-center justify-center serif-ko text-amber-300 font-bold text-xs">박</div>
                <div>
                  <div className="text-white text-xs font-semibold">{d.messageFrom}</div>
                  <div className="text-[10px]">담임 강사 · 1시간 전 작성</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 1년 성장 */}
        <div className="bg-white border-2 border-emerald-200 rounded-2xl p-7 mb-5 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-44 h-44 rounded-full bg-emerald-100/60 -translate-y-16 translate-x-16 blur-2xl" />
          <div className="relative">
            <div className="flex items-center gap-2 mb-1"><TrendingUp size={16} className="text-emerald-700" /><div className="serif-ko text-xl font-bold text-slate-900">지난 1년, 민준이는 이만큼 성장했습니다</div></div>
            <div className="text-xs text-slate-500 mb-5">4회의 전국 학력평가로 확인된 객관적 성장 기록입니다 (전국 백분위 기준)</div>
            <div className="grid grid-cols-4 gap-3 mb-5">
              {d.growth.map((g, i) => (
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
                  <div className={`text-xs font-bold mt-1 num ${g.highlight ? 'text-emerald-700' : 'text-emerald-600'}`}>+{g.delta} 상승</div>
                </div>
              ))}
            </div>
            <div className="bg-stone-50/60 rounded-xl border border-stone-200 p-4">
              <div className="text-[11px] font-semibold text-slate-700 mb-2">종합 백분위 추이 — 4회 학력평가</div>
              <div className="h-28">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={mockExams} margin={{ top: 8, right: 12, bottom: 0, left: -20 }}>
                    <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} />
                    <YAxis domain={[65, 95]} tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} />
                    <Tooltip contentStyle={{ fontSize: 11, borderRadius: 8 }} />
                    <Line type="monotone" dataKey="avg" name="종합 백분위" stroke="#059669" strokeWidth={2.5} dot={{ r: 4, fill: '#059669' }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
              <div className="flex justify-between text-[10px] text-slate-500 mt-1 num px-2">
                <span>전국 상위 26.2%에서 출발</span>
                <span className="font-bold text-emerald-700">현재 전국 상위 14.2%</span>
              </div>
            </div>
          </div>
        </div>

        {/* 과목별 현황 */}
        <div className="bg-white border border-stone-200 rounded-2xl p-7 mb-5">
          <div className="mb-5">
            <div className="serif-ko text-xl font-bold text-slate-900">과목별 현재 상태</div>
            <div className="text-xs text-slate-500 mt-1">학원이 각 과목을 어떻게 관리하고 있는지 안내드립니다</div>
          </div>
          <div className="grid grid-cols-4 gap-3">
            {d.subjects.map(s => {
              const cfg = statusConfig[s.status];
              return (
                <div key={s.name} className={`border ${cfg.border} ${cfg.bg} rounded-xl p-4`}>
                  <div className="flex items-center justify-between mb-3">
                    <div className="font-bold text-slate-900 text-base serif-ko">{s.name}</div>
                    <div className={`w-2.5 h-2.5 rounded-full ${cfg.soft}`} />
                  </div>
                  <div className={`text-sm font-bold ${cfg.text} mb-1`}>{s.headline}</div>
                  <div className="text-[11px] text-slate-600 leading-relaxed">{s.detail}</div>
                </div>
              );
            })}
          </div>
          <div className="mt-4 pt-4 border-t border-stone-100 flex items-start gap-2 text-[11px] text-slate-500 leading-relaxed">
            <Heart size={11} className="text-stone-400 mt-0.5 shrink-0" />
            <span>구체적인 백분위와 동학년 비교 데이터는 다음 정기 점검(2026.05.20)에서 담임 강사와 함께 자세히 설명드립니다.</span>
          </div>
        </div>

        {/* 학원이 약속한 것 */}
        <div className="bg-white border-2 border-amber-200 rounded-2xl p-7 mb-5 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-40 h-40 rounded-full bg-amber-100/60 -translate-y-16 translate-x-16 blur-2xl" />
          <div className="relative">
            <div className="flex items-center gap-2 mb-1"><ShieldCheck size={16} className="text-amber-700" /><div className="serif-ko text-xl font-bold text-slate-900">학원이 약속하고 진행 중인 일</div></div>
            <div className="text-xs text-slate-500 mb-5">상담에서 합의된 학습 관리가 지금 어떻게 진행되고 있는지 확인하실 수 있습니다</div>
            <div className="space-y-3">
              {d.ongoingPromises.map((p, i) => (
                <div key={i} className="bg-stone-50/60 rounded-xl p-4 border border-stone-200">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <div className="font-bold text-slate-900">{p.task}</div>
                      <div className="text-[11px] text-slate-500 mt-0.5">{p.detail} · 시작일 <span className="num">{p.since}</span></div>
                    </div>
                    <div className="text-[10px] px-2 py-1 bg-emerald-100 text-emerald-700 rounded-full font-bold">진행 중</div>
                  </div>
                  <div className="relative h-1.5 bg-stone-200 rounded-full overflow-hidden">
                    <div className="absolute h-full bg-emerald-500 rounded-full" style={{ width: `${p.progress}%` }} />
                  </div>
                  <div className="text-[10px] text-slate-500 mt-1.5 text-right num">진척률 {p.progress}%</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* 일정 + 상담 */}
        <div className="grid grid-cols-12 gap-4 mb-5">
          <div className="col-span-5 bg-white border border-stone-200 rounded-2xl p-7">
            <div className="flex items-center gap-2 mb-1"><Calendar size={14} className="text-slate-700" /><div className="serif-ko text-lg font-bold text-slate-900">다가오는 일정</div></div>
            <div className="text-xs text-slate-500 mb-5">학원이 미리 잡아둔 점검·상담 일정입니다</div>
            <div className="space-y-3">
              {d.upcomingSchedule.map((s, i) => (
                <div key={i} className="flex gap-3">
                  <div className="w-14 shrink-0 text-center bg-stone-50 border border-stone-200 rounded-lg py-2">
                    <div className="text-[9px] text-slate-500">{s.date.split('.')[1]}월</div>
                    <div className="text-lg font-bold num leading-none text-slate-900">{s.date.split('.')[2]}</div>
                  </div>
                  <div className="flex-1 min-w-0 pt-0.5">
                    <div className="font-semibold text-slate-900 text-sm">{s.label}</div>
                    <div className="text-[11px] text-slate-500 mt-0.5">{s.who}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="col-span-7 bg-white border border-stone-200 rounded-2xl p-7">
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-2"><MessageSquare size={14} className="text-slate-700" /><div className="serif-ko text-lg font-bold text-slate-900">최근 상담 요약</div></div>
              <div className="text-[10px] uppercase tracking-wider text-slate-500">For Parents</div>
            </div>
            <div className="text-xs text-slate-500 mb-5">상담에서 합의된 내용을 학부모 안내용으로 정리한 것입니다</div>
            <div className="space-y-4">
              {d.recentCounseling.map((c, i) => (
                <div key={i} className="flex gap-3">
                  <div className="shrink-0">
                    <div className="w-8 h-8 rounded-full bg-stone-100 border border-stone-200 flex items-center justify-center"><MessageSquare size={12} className="text-slate-500" /></div>
                  </div>
                  <div className="flex-1 pb-3 border-b border-stone-100 last:border-0">
                    <div className="text-[11px] text-slate-500 num font-semibold mb-1">{c.date}</div>
                    <div className="text-xs text-slate-700 leading-relaxed">{c.summary}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* 리포트 + 연락 */}
        <div className="grid grid-cols-12 gap-4 mb-5">
          <div className="col-span-7 bg-white border border-stone-200 rounded-2xl p-7">
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-2"><FileText size={14} className="text-slate-700" /><div className="serif-ko text-lg font-bold text-slate-900">월간 리포트</div></div>
            </div>
            <div className="space-y-2">
              {d.reports.map((r, i) => (
                <div key={i} onClick={() => setReportOpen(true)} className="flex items-center justify-between p-3 border border-stone-200 rounded-lg hover:bg-stone-50 hover:border-slate-400 cursor-pointer transition-all">
                  <div className="flex items-center gap-3">
                    <FileText size={16} className="text-slate-400" />
                    <div>
                      <div className="text-sm font-semibold text-slate-900">{r.month} 학습 리포트</div>
                      <div className="text-[11px] text-slate-500 num">발송 {r.date}</div>
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
                  { icon: MessageSquare, label: '메시지 보내기', sub: '평일 9시~21시 응답' },
                  { icon: Phone, label: '상담 전화 예약', sub: '강사 일정 확인 후 연결' },
                  { icon: Calendar, label: '대면 상담 예약', sub: '학원 방문 일정 조율' },
                ].map((btn, i) => (
                  <button key={i} className="w-full flex items-center gap-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg p-3 text-left transition-colors">
                    <btn.icon size={14} className="text-amber-300" />
                    <div className="flex-1">
                      <div className="text-sm font-semibold">{btn.label}</div>
                      <div className="text-[10px] text-slate-400">{btn.sub}</div>
                    </div>
                    <ChevronRight size={12} className="text-slate-400" />
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        <Footer perspective="학부모" extra="자녀 정보만 노출되며 내부 운영 메모는 표시되지 않습니다 · 학부모용 화면" />
      </div>

      {reportOpen && <ReportModal mode="parent" onClose={() => setReportOpen(false)} />}
    </div>
  );
}
