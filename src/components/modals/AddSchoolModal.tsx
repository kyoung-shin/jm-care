'use client';

import { useState, useEffect } from 'react';
import { X, Edit3, Trash2 } from 'lucide-react';
import EditTrackModal, { type TrackData } from './EditTrackModal';

type AdmissionSchoolStatus = 'VERIFIED' | 'REVIEW' | 'DRAFT';

const STATUS_LABELS: Record<AdmissionSchoolStatus, string> = { VERIFIED: '검증완료', REVIEW: '검토중', DRAFT: '초안' };
const STATUS_CLS: Record<AdmissionSchoolStatus, string> = {
  VERIFIED: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  REVIEW: 'bg-amber-50 text-amber-700 border-amber-200',
  DRAFT: 'bg-slate-100 text-slate-600 border-slate-200',
};

const inputCls = 'w-full text-sm border border-stone-300 rounded-lg px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-violet-300';

interface SchoolData {
  id: string;
  name: string;
  dept: string | null;
  year: number;
  typesCount: number;
  status: AdmissionSchoolStatus;
  source: string | null;
}

interface Props {
  defaultYear: number;
  school?: SchoolData;
  onClose: () => void;
  onCreated: () => void;
}

export default function AddSchoolModal({ defaultYear, school, onClose, onCreated }: Props) {
  const isEdit = !!school;
  const [name, setName] = useState(school?.name ?? '');
  const [dept, setDept] = useState(school?.dept ?? '');
  const [year, setYear] = useState(String(school?.year ?? defaultYear));
  const [typesCount, setTypesCount] = useState(String(school?.typesCount ?? 0));
  const [status, setStatus] = useState<AdmissionSchoolStatus>(school?.status ?? 'DRAFT');
  const [source, setSource] = useState(school?.source ?? '');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const [tracks, setTracks] = useState<TrackData[] | null>(null);
  const [editingTrack, setEditingTrack] = useState<TrackData | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const loadTracks = () => {
    if (!school) return;
    fetch(`/api/admin/admission-schools/${school.id}/tracks`).then(r => r.json()).then(d => {
      if (Array.isArray(d)) setTracks(d);
    }).catch(() => setTracks([]));
  };

  useEffect(loadTracks, [school]);

  const handleConfirm = async () => {
    if (!name.trim()) {
      setError('학교 이름을 입력해 주세요');
      return;
    }
    if (!Number.isInteger(Number(year))) {
      setError('학년도를 올바르게 입력해 주세요');
      return;
    }
    setSaving(true);
    setError('');
    try {
      const res = await fetch(
        isEdit ? `/api/admin/admission-schools/${school!.id}` : '/api/admin/admission-schools',
        {
          method: isEdit ? 'PATCH' : 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name, dept, year: Number(year), typesCount: Number(typesCount) || 0, status, source }),
        }
      );
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error || (isEdit ? '학교 정보 수정에 실패했습니다' : '학교 추가에 실패했습니다'));
        setSaving(false);
        return;
      }
      onCreated();
      onClose();
    } catch {
      setError(isEdit ? '학교 정보 수정에 실패했습니다' : '학교 추가에 실패했습니다');
      setSaving(false);
    }
  };

  const handleDeleteTrack = async (trackId: string) => {
    if (!school) return;
    setDeletingId(trackId);
    try {
      const res = await fetch(`/api/admin/admission-schools/${school.id}/tracks/${trackId}`, { method: 'DELETE' });
      if (res.ok) loadTracks();
    } finally {
      setDeletingId(null);
      setConfirmDeleteId(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 ko-sans">
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={onClose} />
      <div className="absolute inset-0 flex items-center justify-center p-6 pointer-events-none">
        <div className={`bg-white rounded-2xl shadow-2xl w-full ${isEdit ? 'max-w-2xl' : 'max-w-md'} pointer-events-auto overflow-hidden max-h-[90vh] flex flex-col`}>
          <div className="flex items-center justify-between px-6 py-4 border-b border-stone-200 bg-stone-50 shrink-0">
            <div className="serif-ko text-lg font-bold text-slate-900">{isEdit ? '학교 정보 수정' : '학교 추가'}</div>
            <button onClick={onClose} className="text-slate-400 hover:text-slate-700"><X size={20} /></button>
          </div>

          <div className="p-6 space-y-4 overflow-y-auto">
            <div>
              <label className="text-[11px] font-semibold text-slate-600 mb-1.5 block">학교 이름 <span className="text-red-500">*</span></label>
              <input value={name} onChange={e => setName(e.target.value)} placeholder="예: 고려대학교" className={inputCls} autoFocus />
            </div>
            <div>
              <label className="text-[11px] font-semibold text-slate-600 mb-1.5 block">모집단위</label>
              <input value={dept} onChange={e => setDept(e.target.value)} placeholder="예: 학업우수전형 외 12개 전형" className={inputCls} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-[11px] font-semibold text-slate-600 mb-1.5 block">학년도 <span className="text-red-500">*</span></label>
                <input value={year} onChange={e => setYear(e.target.value)} inputMode="numeric" className={`${inputCls} num`} />
              </div>
              <div>
                <label className="text-[11px] font-semibold text-slate-600 mb-1.5 block">전형 수</label>
                <input value={typesCount} onChange={e => setTypesCount(e.target.value)} inputMode="numeric" className={`${inputCls} num`} />
              </div>
            </div>
            <div>
              <label className="text-[11px] font-semibold text-slate-600 mb-1.5 block">상태</label>
              <select value={status} onChange={e => setStatus(e.target.value as AdmissionSchoolStatus)} className={`${inputCls} bg-white`}>
                {(Object.keys(STATUS_LABELS) as AdmissionSchoolStatus[]).map(s => <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}
              </select>
            </div>
            <div>
              <label className="text-[11px] font-semibold text-slate-600 mb-1.5 block">출처</label>
              <input value={source} onChange={e => setSource(e.target.value)} placeholder="예: 고려대 2027 입학전형시행계획" className={inputCls} />
            </div>
            {error && <div className="text-xs text-red-600">{error}</div>}

            {isEdit && (
              <div className="border-t border-stone-200 pt-4">
                <div className="text-[11px] font-semibold text-slate-600 mb-2">등록된 전형 {tracks ? `(${tracks.length})` : ''}</div>
                {tracks === null && <div className="text-xs text-slate-400 py-3 text-center">불러오는 중...</div>}
                {tracks !== null && tracks.length === 0 && (
                  <div className="text-xs text-slate-400 py-3 text-center bg-stone-50 rounded-lg border border-stone-200">
                    등록된 전형이 없습니다
                  </div>
                )}
                {tracks !== null && tracks.length > 0 && (
                  <div className="border border-stone-200 rounded-lg overflow-hidden">
                    <table className="w-full text-xs">
                      <thead className="bg-stone-50 text-[10px] text-slate-500">
                        <tr>
                          <th className="px-3 py-2 text-left font-semibold">전형명</th>
                          <th className="px-3 py-2 text-center font-semibold">모집시기</th>
                          <th className="px-3 py-2 text-center font-semibold">상태</th>
                          <th className="px-3 py-2 text-left font-semibold">최종 갱신</th>
                          <th className="px-3 py-2"></th>
                        </tr>
                      </thead>
                      <tbody>
                        {tracks.map(t => (
                          <tr key={t.id} className="border-t border-stone-100">
                            <td className="px-3 py-2 font-semibold text-slate-900">{t.name}</td>
                            <td className="px-3 py-2 text-center text-slate-600">{t.period}</td>
                            <td className="px-3 py-2 text-center">
                              <span className={`text-[10px] px-1.5 py-0.5 rounded-full border font-semibold ${STATUS_CLS[t.status]}`}>{STATUS_LABELS[t.status]}</span>
                            </td>
                            <td className="px-3 py-2">
                              <div className="text-slate-700 num">{new Date(t.updatedAt).toLocaleDateString('ko-KR')}</div>
                              <div className="text-[10px] text-slate-400">{t.updatedBy}</div>
                            </td>
                            <td className="px-3 py-2 text-right whitespace-nowrap">
                              <button
                                onClick={() => setEditingTrack(t)}
                                className="text-slate-500 hover:text-slate-900 mr-2"
                                title="편집"
                              >
                                <Edit3 size={12} />
                              </button>
                              {confirmDeleteId === t.id ? (
                                <button
                                  onClick={() => handleDeleteTrack(t.id)}
                                  disabled={deletingId === t.id}
                                  className="text-[10px] px-1.5 py-0.5 bg-red-600 text-white rounded font-semibold disabled:opacity-50"
                                >
                                  {deletingId === t.id ? '삭제 중' : '확인 삭제'}
                                </button>
                              ) : (
                                <button
                                  onClick={() => setConfirmDeleteId(t.id)}
                                  className="text-red-500 hover:text-red-700"
                                  title="삭제"
                                >
                                  <Trash2 size={12} />
                                </button>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
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
              {saving ? '처리 중...' : '확인'}
            </button>
          </div>
        </div>
      </div>

      {editingTrack && school && (
        <EditTrackModal
          schoolName={school.name}
          track={editingTrack}
          onClose={() => setEditingTrack(null)}
          onSaved={loadTracks}
        />
      )}
    </div>
  );
}
