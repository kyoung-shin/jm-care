import { Map, Clock, Sparkles, Flag, Award } from 'lucide-react';

export interface RoadmapStep {
  stage: string;
  period: string;
  label: string;
  desc: string;
  status: 'done' | 'current' | 'upcoming' | 'goal';
}

const STAGE_TEMPLATE: RoadmapStep[] = [
  { stage: '중2', period: '', label: '', desc: '', status: 'upcoming' },
  { stage: '중3', period: '', label: '', desc: '', status: 'upcoming' },
  { stage: '고1', period: '', label: '', desc: '', status: 'upcoming' },
  { stage: '고2', period: '', label: '', desc: '', status: 'upcoming' },
  { stage: '고3', period: '', label: '', desc: '', status: 'upcoming' },
];

interface Props {
  roadmap?: RoadmapStep[] | null;
  daysUntilCSAT?: number | null;
  daysUntilHS?: number | null;
  finalGoalSchool?: string | null;
}

export default function Roadmap({ roadmap, daysUntilCSAT, daysUntilHS, finalGoalSchool }: Props) {
  const hasRealRoadmap = !!(roadmap && roadmap.length > 0);
  const steps = hasRealRoadmap ? roadmap! : STAGE_TEMPLATE;

  return (
    <div className="bg-white border border-stone-200 rounded-xl p-6 mb-4">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <Map size={15} className="text-slate-700" />
          <div className="serif-ko text-lg font-bold text-slate-900">{finalGoalSchool ? `${finalGoalSchool}까지 — 장기 로드맵` : '장기 로드맵'}</div>
        </div>
        <div className="flex items-center gap-3 text-[11px] text-slate-500">
          {typeof daysUntilCSAT === 'number' && (
            <span className="flex items-center gap-1">
              <Clock size={11} /> 수능까지 D-<span className="num font-semibold text-slate-700">{daysUntilCSAT.toLocaleString()}</span>
            </span>
          )}
          {typeof daysUntilCSAT === 'number' && typeof daysUntilHS === 'number' && <span className="text-stone-300">|</span>}
          {typeof daysUntilHS === 'number' && (
            <span>고입까지 D-<span className="num font-semibold text-slate-700">{daysUntilHS.toLocaleString()}</span></span>
          )}
        </div>
      </div>

      {!hasRealRoadmap && (
        <div className="mb-4 text-[11px] text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
          아직 입력된 로드맵이 없습니다. &quot;학생 종합 현황 입력&quot;에서 단계별 제목·설명과 현재 단계를 설정할 수 있습니다.
        </div>
      )}

      <div className="relative">
        <div className="absolute left-0 right-0 top-[18px] h-1 bg-stone-100 rounded-full" />
        <div className="absolute left-0 top-[18px] h-1 bg-gradient-to-r from-emerald-500 to-amber-400 rounded-full" style={{ width: '13%' }} />
        <div className="grid grid-cols-5 gap-3 relative">
          {steps.map((r, i) => {
            const isCurrent = hasRealRoadmap && r.status === 'current';
            const isGoal = hasRealRoadmap && r.status === 'goal';
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
                    {r.period && <span className={`text-[10px] num ${isGoal ? 'text-slate-400' : 'text-slate-500'}`}>{r.period}</span>}
                  </div>
                  <div className={`text-xs font-bold mt-1 ${isGoal ? 'text-white' : r.label ? 'text-slate-800' : 'text-slate-400 italic'}`}>{r.label || '미입력'}</div>
                  {r.desc && <div className={`text-[10px] mt-1 leading-relaxed ${isGoal ? 'text-slate-300' : 'text-slate-500'}`}>{r.desc}</div>}
                  {isCurrent && <div className="text-[9px] font-bold text-amber-700 mt-1.5 uppercase tracking-wider">● 현재 단계</div>}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {hasRealRoadmap && (
        <div className="mt-4 pt-4 border-t border-stone-100 text-[11px] text-slate-500 flex items-start gap-2">
          <Sparkles size={11} className="text-amber-500 mt-0.5 shrink-0" />
          <span>각 단계의 제목·설명은 &quot;학생 종합 현황 입력&quot;에서 강사가 직접 설정한 내용입니다.</span>
        </div>
      )}
    </div>
  );
}
