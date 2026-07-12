'use client';

import { useState } from 'react';
import { X } from 'lucide-react';

type BranchStatus = 'ACTIVE' | 'PREPARING' | 'CLOSING';

const STATUS_LABELS: Record<BranchStatus, string> = { ACTIVE: '운영중', PREPARING: '준비중', CLOSING: '정리중' };

interface Props {
  onClose: () => void;
  onCreated: () => void;
}

export default function AddBranchModal({ onClose, onCreated }: Props) {
  const [name, setName] = useState('');
  const [region, setRegion] = useState('');
  const [status, setStatus] = useState<BranchStatus>('ACTIVE');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const handleConfirm = async () => {
    if (!name.trim()) {
      setError('지점 이름을 입력해 주세요');
      return;
    }
    setSaving(true);
    setError('');
    try {
      const res = await fetch('/api/admin/branches', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, region, status }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error || '지점 추가에 실패했습니다');
        setSaving(false);
        return;
      }
      onCreated();
      onClose();
    } catch {
      setError('지점 추가에 실패했습니다');
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 ko-sans">
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={onClose} />
      <div className="absolute inset-0 flex items-center justify-center p-6 pointer-events-none">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm pointer-events-auto overflow-hidden">
          <div className="flex items-center justify-between px-6 py-4 border-b border-stone-200 bg-stone-50">
            <div className="serif-ko text-lg font-bold text-slate-900">지점 추가</div>
            <button onClick={onClose} className="text-slate-400 hover:text-slate-700"><X size={20} /></button>
          </div>

          <div className="p-6 space-y-4">
            <div>
              <label className="text-[11px] font-semibold text-slate-600 mb-1.5 block">지점 이름 <span className="text-red-500">*</span></label>
              <input
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="예: 일산점"
                className="w-full text-sm border border-stone-300 rounded-lg px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-violet-300"
                autoFocus
              />
            </div>
            <div>
              <label className="text-[11px] font-semibold text-slate-600 mb-1.5 block">지역</label>
              <input
                value={region}
                onChange={e => setRegion(e.target.value)}
                placeholder="예: 경기 고양"
                className="w-full text-sm border border-stone-300 rounded-lg px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-violet-300"
              />
            </div>
            <div>
              <label className="text-[11px] font-semibold text-slate-600 mb-1.5 block">상태</label>
              <select
                value={status}
                onChange={e => setStatus(e.target.value as BranchStatus)}
                className="w-full text-sm border border-stone-300 rounded-lg px-3 py-2.5 bg-white focus:outline-none focus:ring-2 focus:ring-violet-300"
              >
                {(Object.keys(STATUS_LABELS) as BranchStatus[]).map(s => <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}
              </select>
            </div>
            {error && <div className="text-xs text-red-600">{error}</div>}
          </div>

          <div className="flex gap-2 px-6 py-4 border-t border-stone-200 bg-stone-50">
            <button
              onClick={onClose}
              className="flex-1 py-2 text-sm border border-stone-300 rounded-lg text-slate-600 hover:bg-stone-100 transition-colors"
            >
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
