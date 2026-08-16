'use client';

import { useState } from 'react';
import { X } from 'lucide-react';

type AdmissionSchoolStatus = 'VERIFIED' | 'REVIEW' | 'DRAFT';

const STATUS_LABELS: Record<AdmissionSchoolStatus, string> = { VERIFIED: '검증완료', REVIEW: '검토중', DRAFT: '초안' };

const inputCls = 'w-full text-sm border border-stone-300 rounded-lg px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-violet-300';

export interface TrackData {
  id: string;
  schoolId: string;
  name: string;
  period: string;
  type: string | null;
  method: string | null;
  csatMinCriteria: string | null;
  koreanHistory: string | null;
  targetGrade: number | null;
  targetCsatMinRate: number | null;
  targetRecordCount: number | null;
  status: AdmissionSchoolStatus;
  source: string | null;
  updatedBy: string | null;
  updatedAt: string;
}

interface Props {
  schoolName: string;
  track: TrackData;
  onClose: () => void;
  onSaved: () => void;
}

export default function EditTrackModal({ schoolName, track, onClose, onSaved }: Props) {
  const [name, setName] = useState(track.name);
  const [period, setPeriod] = useState(track.period);
  const [type, setType] = useState(track.type ?? '');
  const [method, setMethod] = useState(track.method ?? '');
  const [csatMinCriteria, setCsatMinCriteria] = useState(track.csatMinCriteria ?? '');
  const [koreanHistory, setKoreanHistory] = useState(track.koreanHistory ?? '');
  const [targetGrade, setTargetGrade] = useState(track.targetGrade !== null ? String(track.targetGrade) : '');
  const [targetCsatMinRate, setTargetCsatMinRate] = useState(track.targetCsatMinRate !== null ? String(track.targetCsatMinRate) : '');
  const [targetRecordCount, setTargetRecordCount] = useState(track.targetRecordCount !== null ? String(track.targetRecordCount) : '');
  const [status, setStatus] = useState<AdmissionSchoolStatus>(track.status);
  const [source, setSource] = useState(track.source ?? '');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const handleConfirm = async () => {
    if (!name.trim()) { setError('전형명을 입력해 주세요'); return; }
    setSaving(true);
    setError('');
    try {
      const res = await fetch(`/api/admin/admission-schools/${track.schoolId}/tracks/${track.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name, period, type, method, csatMinCriteria, koreanHistory,
          targetGrade, targetCsatMinRate, targetRecordCount, status, source,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error || '전형 수정에 실패했습니다');
        setSaving(false);
        return;
      }
      onSaved();
      onClose();
    } catch {
      setError('전형 수정에 실패했습니다');
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] ko-sans">
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={onClose} />
      <div className="absolute inset-0 flex items-center justify-center p-6 pointer-events-none">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg pointer-events-auto overflow-hidden max-h-[90vh] flex flex-col">
          <div className="flex items-center justify-between px-6 py-4 border-b border-stone-200 bg-stone-50 shrink-0">
            <div className="serif-ko text-lg font-bold text-slate-900">전형 수정 — {schoolName}</div>
            <button onClick={onClose} className="text-slate-400 hover:text-slate-700"><X size={20} /></button>
          </div>

          <div className="p-6 space-y-4 overflow-y-auto">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-[11px] font-semibold text-slate-600 mb-1.5 block">전형명 <span className="text-red-500">*</span></label>
                <input value={name} onChange={e => setName(e.target.value)} className={inputCls} autoFocus />
              </div>
              <div>
                <label className="text-[11px] font-semibold text-slate-600 mb-1.5 block">모집시기 <span className="text-red-500">*</span></label>
                <select value={period} onChange={e => setPeriod(e.target.value)} className={`${inputCls} bg-white`}>
                  <option>수시</option><option>정시</option><option>고입</option>
                </select>
              </div>
              <div>
                <label className="text-[11px] font-semibold text-slate-600 mb-1.5 block">전형 유형</label>
                <input value={type} onChange={e => setType(e.target.value)} className={inputCls} />
              </div>
              <div>
                <label className="text-[11px] font-semibold text-slate-600 mb-1.5 block">전형 방법</label>
                <input value={method} onChange={e => setMethod(e.target.value)} className={inputCls} />
              </div>
              <div>
                <label className="text-[11px] font-semibold text-slate-600 mb-1.5 block">수능최저 기준</label>
                <input value={csatMinCriteria} onChange={e => setCsatMinCriteria(e.target.value)} className={inputCls} />
              </div>
              <div>
                <label className="text-[11px] font-semibold text-slate-600 mb-1.5 block">한국사</label>
                <input value={koreanHistory} onChange={e => setKoreanHistory(e.target.value)} className={inputCls} />
              </div>
            </div>

            <div className="border-t border-stone-100 pt-4">
              <div className="text-[11px] font-semibold text-slate-600 mb-2">목표 지표 (학생 갭 계산 기준)</div>
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-stone-50 rounded-lg p-3 border border-stone-200">
                  <div className="text-[10px] text-slate-500 mb-1">내신 평균 등급</div>
                  <div className="flex items-center gap-1">
                    <input value={targetGrade} onChange={e => setTargetGrade(e.target.value)} inputMode="decimal" className="w-16 text-sm border border-stone-300 rounded px-2 py-1 num" />
                    <span className="text-xs text-slate-500">등급 이하</span>
                  </div>
                </div>
                <div className="bg-stone-50 rounded-lg p-3 border border-stone-200">
                  <div className="text-[10px] text-slate-500 mb-1">수능최저 충족 가능성</div>
                  <div className="flex items-center gap-1">
                    <input value={targetCsatMinRate} onChange={e => setTargetCsatMinRate(e.target.value)} inputMode="numeric" className="w-16 text-sm border border-stone-300 rounded px-2 py-1 num" />
                    <span className="text-xs text-slate-500">% 이상</span>
                  </div>
                </div>
                <div className="bg-stone-50 rounded-lg p-3 border border-stone-200">
                  <div className="text-[10px] text-slate-500 mb-1">생기부 계열적합 활동</div>
                  <div className="flex items-center gap-1">
                    <input value={targetRecordCount} onChange={e => setTargetRecordCount(e.target.value)} inputMode="numeric" className="w-16 text-sm border border-stone-300 rounded px-2 py-1 num" />
                    <span className="text-xs text-slate-500">건 이상</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 border-t border-stone-100 pt-4">
              <div>
                <label className="text-[11px] font-semibold text-slate-600 mb-1.5 block">상태</label>
                <select value={status} onChange={e => setStatus(e.target.value as AdmissionSchoolStatus)} className={`${inputCls} bg-white`}>
                  {(Object.keys(STATUS_LABELS) as AdmissionSchoolStatus[]).map(s => <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}
                </select>
              </div>
              <div>
                <label className="text-[11px] font-semibold text-slate-600 mb-1.5 block">출처</label>
                <input value={source} onChange={e => setSource(e.target.value)} className={inputCls} />
              </div>
            </div>
            {error && <div className="text-xs text-red-600">{error}</div>}
          </div>

          <div className="flex gap-2 px-6 py-4 border-t border-stone-200 bg-stone-50 shrink-0">
            <button onClick={onClose} className="flex-1 py-2 text-sm border border-stone-300 rounded-lg text-slate-600 hover:bg-stone-100 transition-colors">
              취소
            </button>
            <button
              onClick={handleConfirm}
              disabled={saving}
              className="flex-1 py-2 text-sm bg-violet-600 text-white rounded-lg font-semibold hover:bg-violet-700 disabled:opacity-50 transition-colors"
            >
              {saving ? '저장 중...' : '저장'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
