'use client';

import { useState } from 'react';
import { X } from 'lucide-react';

type AdmissionSchoolStatus = 'VERIFIED' | 'REVIEW' | 'DRAFT';

const STATUS_LABELS: Record<AdmissionSchoolStatus, string> = { VERIFIED: '검증완료', REVIEW: '검토중', DRAFT: '초안' };

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

  return (
    <div className="fixed inset-0 z-50 ko-sans">
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={onClose} />
      <div className="absolute inset-0 flex items-center justify-center p-6 pointer-events-none">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md pointer-events-auto overflow-hidden">
          <div className="flex items-center justify-between px-6 py-4 border-b border-stone-200 bg-stone-50">
            <div className="serif-ko text-lg font-bold text-slate-900">{isEdit ? '학교 정보 수정' : '학교 추가'}</div>
            <button onClick={onClose} className="text-slate-400 hover:text-slate-700"><X size={20} /></button>
          </div>

          <div className="p-6 space-y-4">
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
          </div>

          <div className="flex gap-2 px-6 py-4 border-t border-stone-200 bg-stone-50">
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
    </div>
  );
}
