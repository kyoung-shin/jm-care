'use client';

import { useState } from 'react';
import { X, Calendar } from 'lucide-react';

const DAY_LABELS = ['일', '월', '화', '수', '목', '금', '토'];
const TYPE_OPTIONS = ['수업', '상담', '보충', '면담', '점검', '기타'];

function getThisWeekRange(): { monday: string; friday: string } {
  const today = new Date();
  const dow = today.getDay();
  const mondayOffset = dow === 0 ? -6 : 1 - dow;
  const monday = new Date(today);
  monday.setDate(today.getDate() + mondayOffset);
  const friday = new Date(monday);
  friday.setDate(monday.getDate() + 4);
  const fmt = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  return { monday: fmt(monday), friday: fmt(friday) };
}

const inputCls = 'w-full text-sm border border-stone-300 rounded-lg px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-slate-300';

interface Props {
  instructorId: string;
  onClose: () => void;
  onSaved: () => void;
}

export default function ScheduleEventModal({ instructorId, onClose, onSaved }: Props) {
  const { monday, friday } = getThisWeekRange();
  const [date, setDate] = useState(monday);
  const [time, setTime] = useState('');
  const [type, setType] = useState(TYPE_OPTIONS[0]);
  const [label, setLabel] = useState('');
  const [urgent, setUrgent] = useState(false);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!time.trim() || !label.trim()) { setError('시간과 내용을 입력해 주세요'); return; }
    setSaving(true);
    setError('');
    try {
      const d = new Date(`${date}T00:00:00`);
      const mmdd = `${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`;
      const day = DAY_LABELS[d.getDay()];
      const res = await fetch(`/api/instructors/${instructorId}/schedule`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date: mmdd, day, time, type, label, urgent }),
      });
      if (!res.ok) throw new Error('일정 저장에 실패했습니다');
      onSaved();
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : '일정 저장에 실패했습니다');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 ko-sans">
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={onClose} />
      <div className="absolute inset-0 flex items-center justify-center p-6 pointer-events-none">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm pointer-events-auto overflow-hidden">
          <div className="flex items-center justify-between px-6 py-4 border-b border-stone-200 bg-stone-50">
            <div className="serif-ko text-lg font-bold text-slate-900 flex items-center gap-2"><Calendar size={16} /> 일정 추가</div>
            <button onClick={onClose} className="text-slate-400 hover:text-slate-700"><X size={20} /></button>
          </div>
          <div className="p-6 space-y-4">
            <div>
              <label className="text-[11px] font-semibold text-slate-600 mb-1.5 block">날짜 (이번 주 중) <span className="text-red-500">*</span></label>
              <input type="date" value={date} min={monday} max={friday} onChange={e => setDate(e.target.value)} className={inputCls} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] font-semibold text-slate-600 mb-1.5 block">시간 <span className="text-red-500">*</span></label>
                <input type="time" value={time} onChange={e => setTime(e.target.value)} className={inputCls} />
              </div>
              <div>
                <label className="text-[11px] font-semibold text-slate-600 mb-1.5 block">유형</label>
                <select value={type} onChange={e => setType(e.target.value)} className={`${inputCls} bg-white`}>
                  {TYPE_OPTIONS.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
            </div>
            <div>
              <label className="text-[11px] font-semibold text-slate-600 mb-1.5 block">내용 <span className="text-red-500">*</span></label>
              <input value={label} onChange={e => setLabel(e.target.value)} placeholder="예: 김민준 수학 월간" className={inputCls} />
            </div>
            <label className="flex items-center gap-2 text-xs text-slate-600 cursor-pointer">
              <input type="checkbox" checked={urgent} onChange={e => setUrgent(e.target.checked)} /> 긴급 일정으로 표시
            </label>
            {error && <div className="text-xs text-red-600">{error}</div>}
          </div>
          <div className="flex gap-2 px-6 py-4 border-t border-stone-200 bg-stone-50">
            <button onClick={onClose} className="flex-1 py-2 text-sm border border-stone-300 rounded-lg text-slate-600 hover:bg-stone-100 transition-colors">취소</button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex-1 py-2 text-sm bg-slate-900 text-white rounded-lg font-semibold hover:bg-slate-800 disabled:opacity-50 transition-colors"
            >
              {saving ? '저장 중...' : '저장'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
