'use client';

import { useState } from 'react';
import { X, Target, Activity, TrendingUp, Map, Save } from 'lucide-react';

interface Props {
  studentId: string;
  studentName: string;
  grade?: string;
  onClose: () => void;
  onSaved?: () => void;
}

const SUBJECTS = ['국어', '영어', '수학', '과학'] as const;
const SUBJECT_FIELD: Record<string, 'korean' | 'english' | 'math' | 'science'> = {
  국어: 'korean', 영어: 'english', 수학: 'math', 과학: 'science',
};
const GRADE_SEQUENCE = ['초1', '초2', '초3', '초4', '초5', '초6', '중1', '중2', '중3', '고1', '고2', '고3'];
function stagesFromGrade(grade?: string): string[] {
  const idx = grade ? GRADE_SEQUENCE.indexOf(grade) : -1;
  return idx === -1 ? ['중2', '중3', '고1', '고2', '고3'] : GRADE_SEQUENCE.slice(idx);
}
const RISK_LABELS = ['출결', '과제 수행률', '학습 태도', '종합 이탈위험'] as const;

const inputCls = 'w-full text-sm border border-stone-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-slate-300';

export default function StudentInputModal({ studentId, studentName, grade, onClose, onSaved }: Props) {
  const ROADMAP_STAGES = stagesFromGrade(grade);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);

  // 목표
  const [goal, setGoal] = useState({
    finalGoalSchool: '', finalGoalDetail: '', finalGoalTrack: '',
    midGoalSchool: '', midGoalDetail: '', midGoalTrack: '', reason: '',
  });

  // 준비도
  const [overallReadiness, setOverallReadiness] = useState('');
  const [peerAverage, setPeerAverage] = useState('');
  const [enrolledMonths, setEnrolledMonths] = useState('');

  // 과목별 목표점수
  const [targets, setTargets] = useState<Record<string, string>>({});

  // 최근 점수 (새 모의고사)
  const [addExam, setAddExam] = useState(false);
  const [exam, setExam] = useState({ name: '', date: '', fullName: '' });
  const [examScores, setExamScores] = useState<Record<string, string>>({});

  // 로드맵 — 단계별 제목/설명 + 현재 단계
  const [currentStage, setCurrentStage] = useState('');
  const [roadmapStages, setRoadmapStages] = useState<Record<string, { label: string; desc: string }>>({});
  const updateRoadmapStage = (stage: string, field: 'label' | 'desc', value: string) => {
    setRoadmapStages(prev => {
      const current = prev[stage] ?? { label: '', desc: '' };
      return { ...prev, [stage]: { ...current, [field]: value } };
    });
  };

  // 위험 신호
  const [risk, setRisk] = useState<Record<string, { value: string; detail: string; tone: 'good' | 'risk' }>>({});

  const setRiskField = (label: string, field: 'value' | 'detail' | 'tone', value: string) => {
    setRisk(prev => {
      const current = prev[label] ?? { value: '', detail: '', tone: 'good' as const };
      const next = { ...current };
      if (field === 'tone') next.tone = value === 'risk' ? 'risk' : 'good';
      else next[field] = value;
      return { ...prev, [label]: next };
    });
  };

  const handleSubmit = async () => {
    setSaving(true);
    setError('');
    try {
      // 1. 목표 (있으면 기존 additive 엔드포인트로)
      const goalTouched = Object.entries(goal).some(([k, v]) => k !== 'reason' && v.trim());
      if (goalTouched) {
        const res = await fetch(`/api/students/${studentId}/goals`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(goal),
        });
        if (!res.ok) throw new Error('목표 저장 실패');
      }

      // 2. 최근 점수 (새 모의고사 — additive)
      if (addExam && exam.name.trim() && exam.date.trim()) {
        const scores = SUBJECTS.reduce((acc, s) => {
          const v = examScores[s];
          if (v && v.trim()) acc[SUBJECT_FIELD[s]] = Number(v);
          return acc;
        }, {} as Record<string, number>);
        const scoreValues = Object.values(scores);
        const avg = scoreValues.length > 0 ? +(scoreValues.reduce((a, b) => a + b, 0) / scoreValues.length).toFixed(1) : undefined;
        const res = await fetch(`/api/students/${studentId}/mock-exams`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...exam, ...scores, avg }),
        });
        if (!res.ok) throw new Error('모의고사 점수 저장 실패');
      }

      // 3. 준비도/과목목표/로드맵/위험신호 — additive status-update
      const subjectTargets = SUBJECTS.reduce((acc, s) => {
        const v = targets[s];
        if (v && v.trim()) acc[s] = Number(v);
        return acc;
      }, {} as Record<string, number>);

      const currentIdx = ROADMAP_STAGES.indexOf(currentStage);
      const lastIdx = ROADMAP_STAGES.length - 1;
      const roadmap = currentStage
        ? ROADMAP_STAGES.map((stage, i) => ({
            stage,
            period: i === currentIdx ? '현재' : '',
            label: roadmapStages[stage]?.label?.trim() ?? '',
            desc: roadmapStages[stage]?.desc?.trim() ?? '',
            status: i === lastIdx ? 'goal' as const
              : i === currentIdx ? 'current' as const
              : i < currentIdx ? 'done' as const
              : 'upcoming' as const,
          }))
        : undefined;

      const riskSignals = RISK_LABELS
        .filter(label => risk[label]?.value?.trim())
        .map(label => ({ label, value: risk[label].value, detail: risk[label].detail || '', tone: risk[label].tone || 'good' }));

      const statusPayload: Record<string, unknown> = {};
      if (overallReadiness.trim()) statusPayload.overallReadiness = Number(overallReadiness);
      if (peerAverage.trim()) statusPayload.peerAverage = Number(peerAverage);
      if (enrolledMonths.trim()) statusPayload.enrolledMonths = Number(enrolledMonths);
      if (Object.keys(subjectTargets).length > 0) statusPayload.subjectTargets = subjectTargets;
      if (roadmap) statusPayload.roadmap = roadmap;
      if (riskSignals.length > 0) statusPayload.riskSignals = riskSignals;

      if (Object.keys(statusPayload).length > 0) {
        const res = await fetch(`/api/students/${studentId}/status-updates`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(statusPayload),
        });
        if (!res.ok) throw new Error('현황 저장 실패');
      }

      setSaved(true);
      onSaved?.();
      setTimeout(onClose, 900);
    } catch (e) {
      setError(e instanceof Error ? e.message : '저장에 실패했습니다');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 ko-sans">
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={onClose} />
      <div className="absolute inset-0 flex items-center justify-center p-6 pointer-events-none">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col pointer-events-auto overflow-hidden">
          <div className="flex items-center justify-between px-6 py-4 border-b border-stone-200 bg-stone-50 shrink-0">
            <div>
              <div className="serif-ko text-lg font-bold text-slate-900">{studentName} · 종합 현황 입력</div>
              <div className="text-xs text-slate-500">입력한 값은 새 기록으로 추가되며, 기존 데이터를 덮어쓰지 않습니다</div>
            </div>
            <button onClick={onClose} className="text-slate-400 hover:text-slate-700"><X size={20} /></button>
          </div>

          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {/* 목표 */}
            <section>
              <div className="flex items-center gap-2 mb-3"><Target size={14} className="text-amber-600" /><div className="text-sm font-bold text-slate-900">목표 구조</div></div>
              <div className="grid grid-cols-2 gap-3">
                <input className={inputCls} placeholder="최종 목표 학교" value={goal.finalGoalSchool} onChange={e => setGoal(g => ({ ...g, finalGoalSchool: e.target.value }))} />
                <input className={inputCls} placeholder="최종 목표 상세" value={goal.finalGoalDetail} onChange={e => setGoal(g => ({ ...g, finalGoalDetail: e.target.value }))} />
                <input className={inputCls} placeholder="최종 목표 트랙" value={goal.finalGoalTrack} onChange={e => setGoal(g => ({ ...g, finalGoalTrack: e.target.value }))} />
                <input className={inputCls} placeholder="중간 목표 학교" value={goal.midGoalSchool} onChange={e => setGoal(g => ({ ...g, midGoalSchool: e.target.value }))} />
                <input className={inputCls} placeholder="중간 목표 상세" value={goal.midGoalDetail} onChange={e => setGoal(g => ({ ...g, midGoalDetail: e.target.value }))} />
                <input className={inputCls} placeholder="중간 목표 트랙" value={goal.midGoalTrack} onChange={e => setGoal(g => ({ ...g, midGoalTrack: e.target.value }))} />
                <input className={`${inputCls} col-span-2`} placeholder="목표 변경 사유 (선택)" value={goal.reason} onChange={e => setGoal(g => ({ ...g, reason: e.target.value }))} />
              </div>
            </section>

            {/* 준비도 */}
            <section>
              <div className="flex items-center gap-2 mb-3"><Activity size={14} className="text-slate-700" /><div className="text-sm font-bold text-slate-900">종합 준비도</div></div>
              <div className="grid grid-cols-2 gap-3">
                <input className={inputCls} type="number" placeholder="전체 준비도 (%)" value={overallReadiness} onChange={e => setOverallReadiness(e.target.value)} />
                <input className={inputCls} type="number" placeholder="합격생 평균 경로 (%)" value={peerAverage} onChange={e => setPeerAverage(e.target.value)} />
                <input className={inputCls} type="number" placeholder="재원 개월수" value={enrolledMonths} onChange={e => setEnrolledMonths(e.target.value)} />
              </div>
            </section>

            {/* 과목별 목표점수 + 최근점수 */}
            <section>
              <div className="flex items-center gap-2 mb-3"><TrendingUp size={14} className="text-slate-700" /><div className="text-sm font-bold text-slate-900">과목별 목표점수</div></div>
              <div className="grid grid-cols-4 gap-3 mb-4">
                {SUBJECTS.map(s => (
                  <div key={s}>
                    <label className="text-[11px] text-slate-500 mb-1 block">{s} 목표</label>
                    <input className={inputCls} type="number" value={targets[s] ?? ''} onChange={e => setTargets(t => ({ ...t, [s]: e.target.value }))} />
                  </div>
                ))}
              </div>

              <label className="flex items-center gap-2 text-xs text-slate-600 mb-3">
                <input type="checkbox" checked={addExam} onChange={e => setAddExam(e.target.checked)} />
                최근 모의고사 점수 추가
              </label>
              {addExam && (
                <div className="bg-stone-50 border border-stone-200 rounded-lg p-4 space-y-3">
                  <div className="grid grid-cols-3 gap-3">
                    <input className={inputCls} placeholder="회차 (예: 5차)" value={exam.name} onChange={e => setExam(x => ({ ...x, name: e.target.value }))} />
                    <input className={inputCls} placeholder="날짜 (예: 2026.05.16)" value={exam.date} onChange={e => setExam(x => ({ ...x, date: e.target.value }))} />
                    <input className={inputCls} placeholder="시험명" value={exam.fullName} onChange={e => setExam(x => ({ ...x, fullName: e.target.value }))} />
                  </div>
                  <div className="grid grid-cols-4 gap-3">
                    {SUBJECTS.map(s => (
                      <div key={s}>
                        <label className="text-[11px] text-slate-500 mb-1 block">{s} 점수</label>
                        <input className={inputCls} type="number" value={examScores[s] ?? ''} onChange={e => setExamScores(x => ({ ...x, [s]: e.target.value }))} />
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </section>

            {/* 로드맵 */}
            <section>
              <div className="flex items-center gap-2 mb-3"><Map size={14} className="text-slate-700" /><div className="text-sm font-bold text-slate-900">장기 로드맵</div></div>
              <div className="text-[11px] text-slate-500 mb-2">단계별 제목·설명을 입력하고, 현재 단계를 표시하세요. 비워두면 해당 단계는 미입력으로 표시됩니다.</div>
              <div className="space-y-2">
                {ROADMAP_STAGES.map(stage => (
                  <div key={stage} className="grid grid-cols-[52px_1fr_1fr_60px] gap-2 items-center">
                    <div className="text-xs font-bold text-slate-700">{stage}</div>
                    <input
                      className={inputCls}
                      placeholder="단계 제목 (예: 기초 역량 완성)"
                      value={roadmapStages[stage]?.label ?? ''}
                      onChange={e => updateRoadmapStage(stage, 'label', e.target.value)}
                    />
                    <input
                      className={inputCls}
                      placeholder="세부 설명"
                      value={roadmapStages[stage]?.desc ?? ''}
                      onChange={e => updateRoadmapStage(stage, 'desc', e.target.value)}
                    />
                    <label className="flex items-center gap-1 text-[11px] text-slate-600 cursor-pointer">
                      <input type="radio" name="currentStage" checked={currentStage === stage} onChange={() => setCurrentStage(stage)} /> 현재
                    </label>
                  </div>
                ))}
              </div>
            </section>

            {/* 위험 신호 */}
            <section>
              <div className="flex items-center gap-2 mb-3"><Activity size={14} className="text-red-600" /><div className="text-sm font-bold text-slate-900">위험 신호</div></div>
              <div className="space-y-2">
                {RISK_LABELS.map(label => (
                  <div key={label} className="grid grid-cols-[80px_1fr_1fr_90px] gap-2 items-center">
                    <div className="text-xs text-slate-600">{label}</div>
                    <input className={inputCls} placeholder="값 (예: 정상, 88%)" value={risk[label]?.value ?? ''} onChange={e => setRiskField(label, 'value', e.target.value)} />
                    <input className={inputCls} placeholder="상세" value={risk[label]?.detail ?? ''} onChange={e => setRiskField(label, 'detail', e.target.value)} />
                    <select className={inputCls} value={risk[label]?.tone ?? 'good'} onChange={e => setRiskField(label, 'tone', e.target.value)}>
                      <option value="good">양호</option>
                      <option value="risk">위험</option>
                    </select>
                  </div>
                ))}
              </div>
            </section>

            {error && <div className="text-xs text-red-600">{error}</div>}
            {saved && <div className="text-xs text-emerald-600 font-semibold">저장되었습니다</div>}
          </div>

          <div className="flex gap-2 px-6 py-4 border-t border-stone-200 bg-stone-50 shrink-0">
            <button onClick={onClose} disabled={saving} className="flex-1 py-2.5 text-sm border border-stone-300 rounded-lg text-slate-600 hover:bg-stone-100 disabled:opacity-50">
              취소
            </button>
            <button
              onClick={handleSubmit}
              disabled={saving}
              className="flex-1 py-2.5 text-sm bg-slate-900 text-white rounded-lg font-semibold hover:bg-slate-800 disabled:opacity-50 flex items-center justify-center gap-1.5"
            >
              <Save size={14} /> {saving ? '저장 중...' : '저장'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
