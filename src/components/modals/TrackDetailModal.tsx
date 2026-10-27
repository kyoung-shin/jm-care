'use client';

import { X } from 'lucide-react';
import type { TrackData } from './EditTrackModal';

const STATUS_LABELS: Record<string, string> = { VERIFIED: '검증완료', REVIEW: '검토중', DRAFT: '초안' };

interface Props {
  schoolName: string;
  track: TrackData & {
    extraCriteria?: string | null;
    recordRatio?: string | null;
    expectedGrade?: number | null;
    expectedStandard?: number | null;
    expectedPercentile?: number | null;
  };
  onClose: () => void;
}

function Item({ label, value }: { label: string; value: React.ReactNode }) {
  const empty = value === null || value === undefined || value === '';
  return (
    <div>
      <div className="text-[11px] font-semibold text-slate-500 mb-1">{label}</div>
      <div className={`text-sm rounded-lg px-3 py-2.5 border border-stone-200 bg-stone-50 min-h-[40px] ${empty ? 'text-slate-400' : 'text-slate-900'}`}>
        {empty ? '—' : value}
      </div>
    </div>
  );
}

/** 원장·강사용 전형 자세히 보기 (읽기 전용). 수정은 본사 입시기준 DB 에서만 한다. */
export default function TrackDetailModal({ schoolName, track, onClose }: Props) {
  return (
    <div className="fixed inset-0 z-[60] ko-sans">
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={onClose} />
      <div className="absolute inset-0 flex items-center justify-center p-6 pointer-events-none">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg pointer-events-auto overflow-hidden max-h-[90vh] flex flex-col">
          <div className="flex items-center justify-between px-6 py-4 border-b border-stone-200 bg-stone-50 shrink-0">
            <div className="serif-ko text-lg font-bold text-slate-900">전형 상세 — {schoolName}</div>
            <button onClick={onClose} className="text-slate-400 hover:text-slate-700"><X size={20} /></button>
          </div>
          <div className="p-6 space-y-4 overflow-y-auto">
            <div className="grid grid-cols-2 gap-4">
              <Item label="전형명" value={track.name} />
              <Item label="모집시기" value={track.period} />
              <div className="col-span-2"><Item label="계열 / 학과" value={track.dept} /></div>
              <Item label="전형 유형" value={track.type} />
              <Item label="전형 방법" value={track.method} />
              <Item label="수능최저 기준" value={track.csatMinCriteria} />
              <Item label="한국사" value={track.koreanHistory} />
              {track.extraCriteria && <div className="col-span-2"><Item label="추가 반영" value={track.extraCriteria} /></div>}
              {track.recordRatio && <Item label="학생부 반영비율" value={track.recordRatio} />}
            </div>

            <div className="border-t border-stone-100 pt-4">
              <div className="text-[11px] font-semibold text-slate-600 mb-2">목표 지표 (학생 갭 계산 기준)</div>
              <div className="grid grid-cols-3 gap-3">
                <Item label="내신 평균 등급" value={track.targetGrade != null ? `${track.targetGrade}등급 이하` : null} />
                <Item label="수능최저 충족 가능성" value={track.targetCsatMinRate != null ? `${track.targetCsatMinRate}% 이상` : null} />
                <Item label="생기부 계열적합 활동" value={track.targetRecordCount != null ? `${track.targetRecordCount}건 이상` : null} />
              </div>
            </div>

            {(track.expectedGrade != null || track.expectedStandard != null || track.expectedPercentile != null) && (
              <div className="border-t border-stone-100 pt-4">
                <div className="text-[11px] font-semibold text-slate-600 mb-2">예상 입결</div>
                <div className="grid grid-cols-3 gap-3">
                  <Item label="내신 등급" value={track.expectedGrade} />
                  <Item label="표준점수" value={track.expectedStandard} />
                  <Item label="백분위" value={track.expectedPercentile} />
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4 border-t border-stone-100 pt-4">
              <Item label="상태" value={STATUS_LABELS[track.status] ?? track.status} />
              <Item label="출처" value={track.source} />
            </div>
          </div>
          <div className="flex px-6 py-4 border-t border-stone-200 bg-stone-50 shrink-0">
            <button onClick={onClose} className="flex-1 py-2 text-sm bg-slate-900 text-white rounded-lg font-semibold hover:bg-slate-800">닫기</button>
          </div>
        </div>
      </div>
    </div>
  );
}
