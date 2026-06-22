import { Map, Clock, Sparkles, Flag, Award } from 'lucide-react';
import { roadmap } from '@/lib/dummy-data';

export default function Roadmap() {
  return (
    <div className="bg-white border border-stone-200 rounded-xl p-6 mb-4">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <Map size={15} className="text-slate-700" />
          <div className="serif-ko text-lg font-bold text-slate-900">고려대학교까지 — 5년 장기 로드맵</div>
        </div>
        <div className="flex items-center gap-3 text-[11px] text-slate-500">
          <span className="flex items-center gap-1">
            <Clock size={11} /> 수능까지 D-<span className="num font-semibold text-slate-700">1,647</span>
          </span>
          <span className="text-stone-300">|</span>
          <span>고입까지 D-<span className="num font-semibold text-slate-700">477</span></span>
        </div>
      </div>

      <div className="relative">
        <div className="absolute left-0 right-0 top-[18px] h-1 bg-stone-100 rounded-full" />
        <div className="absolute left-0 top-[18px] h-1 bg-gradient-to-r from-emerald-500 to-amber-400 rounded-full" style={{ width: '13%' }} />
        <div className="grid grid-cols-5 gap-3 relative">
          {roadmap.map((r, i) => {
            const isCurrent = r.status === 'current';
            const isGoal = r.status === 'goal';
            return (
              <div key={i}>
                <div className="flex items-center mb-3 h-10">
                  {isCurrent ? (
                    <div className="w-10 h-10 rounded-full bg-amber-400 border-[3px] border-slate-900 flex items-center justify-center relative z-10 shadow-md">
                      <Flag size={14} className="text-slate-900" />
                    </div>
                  ) : isGoal ? (
                    <div className="w-9 h-9 rounded-full bg-slate-900 flex items-center justify-center relative z-10">
                      <Award size={14} className="text-amber-300" />
                    </div>
                  ) : (
                    <div className="w-5 h-5 ml-2 rounded-full bg-white border-2 border-slate-300 relative z-10" />
                  )}
                </div>
                <div className={`rounded-lg p-3 border ${isCurrent ? 'bg-amber-50 border-amber-300' : isGoal ? 'bg-slate-900 border-slate-900 text-white' : 'bg-stone-50/60 border-stone-200'}`}>
                  <div className="flex items-baseline gap-1.5">
                    <span className={`serif-ko text-base font-black ${isGoal ? 'text-amber-300' : 'text-slate-900'}`}>{r.stage}</span>
                    <span className={`text-[10px] num ${isGoal ? 'text-slate-400' : 'text-slate-500'}`}>{r.period}</span>
                  </div>
                  <div className={`text-xs font-bold mt-1 ${isGoal ? 'text-white' : 'text-slate-800'}`}>{r.label}</div>
                  <div className={`text-[10px] mt-1 leading-relaxed ${isGoal ? 'text-slate-300' : 'text-slate-500'}`}>{r.desc}</div>
                  {isCurrent && <div className="text-[9px] font-bold text-amber-700 mt-1.5 uppercase tracking-wider">● 현재 단계</div>}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="mt-4 pt-4 border-t border-stone-100 text-[11px] text-slate-500 flex items-start gap-2">
        <Sparkles size={11} className="text-amber-500 mt-0.5 shrink-0" />
        <span>각 단계의 목표 수치는 고려대 합격생들의 동일 시점 평균 데이터를 기준으로 설정되며, 단계 전환 시 자동으로 다음 단계 기준이 적용됩니다.</span>
      </div>
    </div>
  );
}
