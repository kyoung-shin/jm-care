'use client';

import { useState } from 'react';
import { X, Phone, Calendar } from 'lucide-react';

const DAY_LABELS = ['일', '월', '화', '수', '목', '금', '토'];

function todayStr(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

// "2026.09.28(월) 14:00" → { date: '2026-09-28', time: '14:00' } (입력칸 채우기용)
function parseSlot(slot?: string | null): { date: string; time: string } {
  const m = (slot ?? '').match(/^(\d{4})\.(\d{2})\.(\d{2})\([월화수목금토일]\)\s+(\d{1,2}:\d{2})$/);
  if (!m) return { date: '', time: '' };
  const [, y, mo, d, t] = m;
  return { date: `${y}-${mo}-${d}`, time: t.padStart(5, '0') };
}

function formatSlot(date: string, time: string): string {
  if (!date || !time) return '';
  const d = new Date(`${date}T00:00:00`);
  const label = `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}(${DAY_LABELS[d.getDay()]})`;
  return `${label} ${time}`;
}

const inputCls = 'flex-1 text-sm border border-stone-300 rounded-lg px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-slate-300';

interface ExistingAppointment {
  id: string;
  slot1: string;
  slot2: string;
  slot3: string;
  status: string;
  confirmedSlot: string | null;
}

interface Props {
  studentId: string;
  type: 'phone' | 'in_person';
  requestedBy?: string;
  /** 주어지면 새 요청이 아니라 기존 요청의 희망 일시를 바꾼다 */
  appointment?: ExistingAppointment;
  onClose: () => void;
  onSaved: () => void;
}

export default function AppointmentRequestModal({ studentId, type, requestedBy, appointment, onClose, onSaved }: Props) {
  const min = todayStr();
  const isEdit = !!appointment;
  const [slots, setSlots] = useState(
    appointment
      ? [parseSlot(appointment.slot1), parseSlot(appointment.slot2), parseSlot(appointment.slot3)]
      : [
          { date: '', time: '' },
          { date: '', time: '' },
          { date: '', time: '' },
        ]
  );
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const baseTitle = type === 'phone' ? '상담 전화 예약' : '대면 상담 예약';
  const title = isEdit ? `${baseTitle} 일시 변경` : baseTitle;
  const Icon = type === 'phone' ? Phone : Calendar;

  const updateSlot = (i: number, field: 'date' | 'time', value: string) => {
    setSlots(prev => prev.map((s, idx) => (idx === i ? { ...s, [field]: value } : s)));
  };

  const handleSave = async () => {
    if (slots.some(s => !s.date || !s.time)) {
      setError('희망 일시 3개를 모두 선택해 주세요');
      return;
    }
    setSaving(true);
    setError('');
    try {
      const payload = {
        slot1: formatSlot(slots[0].date, slots[0].time),
        slot2: formatSlot(slots[1].date, slots[1].time),
        slot3: formatSlot(slots[2].date, slots[2].time),
      };
      const res = isEdit
        ? await fetch(`/api/appointments/${appointment.id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          })
        : await fetch(`/api/students/${studentId}/appointments`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ type, ...payload, requestedBy }),
          });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.error || (isEdit ? '일시 변경에 실패했습니다' : '예약 요청 접수에 실패했습니다'));
      }
      onSaved();
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : '예약 요청 접수에 실패했습니다');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 ko-sans">
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={onClose} />
      <div className="absolute inset-0 flex items-center justify-center p-6 pointer-events-none">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md pointer-events-auto overflow-hidden">
          <div className="flex items-center justify-between px-6 py-4 border-b border-stone-200 bg-stone-50">
            <div className="serif-ko text-lg font-bold text-slate-900 flex items-center gap-2"><Icon size={16} /> {title}</div>
            <button onClick={onClose} className="text-slate-400 hover:text-slate-700"><X size={20} /></button>
          </div>
          <div className="p-6 space-y-4">
            <div className="text-xs text-slate-500">희망하시는 일시를 우선순위 순으로 3개 선택해 주세요. 강사가 확인 후 하나로 확정합니다.</div>
            {isEdit && appointment.status === 'confirmed' && (
              <div className="text-[11px] text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2.5 leading-relaxed">
                이미 <span className="font-semibold num">{appointment.confirmedSlot}</span> 으로 확정된 예약입니다.
                일시를 바꾸면 <span className="font-semibold">검토 중으로 돌아가고</span> 강사가 다시 확정해야 합니다.
              </div>
            )}
            {slots.map((s, i) => (
              <div key={i}>
                <label className="text-[11px] font-semibold text-slate-600 mb-1.5 block">희망 일시 {i + 1} <span className="text-red-500">*</span></label>
                <div className="flex gap-2">
                  <input type="date" value={s.date} min={min} onChange={e => updateSlot(i, 'date', e.target.value)} className={inputCls} />
                  <input type="time" value={s.time} onChange={e => updateSlot(i, 'time', e.target.value)} className={inputCls} />
                </div>
              </div>
            ))}
            {error && <div className="text-xs text-red-600">{error}</div>}
          </div>
          <div className="flex gap-2 px-6 py-4 border-t border-stone-200 bg-stone-50">
            <button onClick={onClose} className="flex-1 py-2 text-sm border border-stone-300 rounded-lg text-slate-600 hover:bg-stone-100 transition-colors">취소</button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex-1 py-2 text-sm bg-slate-900 text-white rounded-lg font-semibold hover:bg-slate-800 disabled:opacity-50 transition-colors"
            >
              {saving ? '요청 중...' : isEdit ? '변경 요청 보내기' : '예약 요청 보내기'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
