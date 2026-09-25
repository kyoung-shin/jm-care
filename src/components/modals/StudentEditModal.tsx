'use client';

import { useEffect, useState } from 'react';
import { X, Save, AlertCircle, UserCog } from 'lucide-react';

interface Props {
  studentId: string;
  branchId: string | null;
  onClose: () => void;
  onSaved?: () => void;
}

interface StudentForm {
  name: string;
  grade: string;
  school: string;
  enrolledMonths: string;
  instructorId: string;
  finalGoalSchool: string;
  finalGoalDetail: string;
  finalGoalTrack: string;
  midGoalSchool: string;
  midGoalDetail: string;
  midGoalTrack: string;
}

const EMPTY: StudentForm = {
  name: '', grade: '중1', school: '', enrolledMonths: '', instructorId: '',
  finalGoalSchool: '', finalGoalDetail: '', finalGoalTrack: '',
  midGoalSchool: '', midGoalDetail: '', midGoalTrack: '',
};

const GRADES = ['초1', '초2', '초3', '초4', '초5', '초6', '중1', '중2', '중3', '고1', '고2', '고3'];
const inputCls = 'w-full text-sm border border-stone-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-slate-300';

export default function StudentEditModal({ studentId, branchId, onClose, onSaved }: Props) {
  const [form, setForm] = useState<StudentForm>(EMPTY);
  const [instructors, setInstructors] = useState<Array<{ id: string; name: string }>>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);

  const update = (k: keyof StudentForm, v: string) => setForm(p => ({ ...p, [k]: v }));

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/students/${studentId}`)
      .then(r => r.json())
      .then(d => {
        if (cancelled || d?.error) return;
        setForm({
          name: d.name ?? '',
          grade: d.grade ?? '중1',
          school: d.school ?? '',
          enrolledMonths: d.enrolledMonths != null ? String(d.enrolledMonths) : '',
          instructorId: d.instructor?.id ?? d.instructorId ?? '',
          finalGoalSchool: d.finalGoalSchool ?? '',
          finalGoalDetail: d.finalGoalDetail ?? '',
          finalGoalTrack: d.finalGoalTrack ?? '',
          midGoalSchool: d.midGoalSchool ?? '',
          midGoalDetail: d.midGoalDetail ?? '',
          midGoalTrack: d.midGoalTrack ?? '',
        });
      })
      .catch(() => {})
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [studentId]);

  // 담임 후보는 같은 지점 강사만
  useEffect(() => {
    const url = branchId ? `/api/users?role=INSTRUCTOR&branchId=${branchId}` : '/api/users?role=INSTRUCTOR';
    fetch(url)
      .then(r => (r.ok ? r.json() : []))
      .then(d => { if (Array.isArray(d)) setInstructors(d.filter((u: { role: string }) => u.role === 'INSTRUCTOR')); })
      .catch(() => {});
  }, [branchId]);

  const handleSave = async () => {
    if (!form.name.trim()) { setError('학생 이름을 입력해 주세요'); return; }
    setSaving(true);
    setError('');
    try {
      const res = await fetch(`/api/students/${studentId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          enrolledMonths: form.enrolledMonths === '' ? undefined : Number(form.enrolledMonths),
        }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.error || '저장에 실패했습니다');
      }
      setSaved(true);
      onSaved?.();
      setTimeout(onClose, 700);
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
            <div className="flex items-center gap-2.5">
              <UserCog size={16} className="text-slate-700" />
              <div>
                <div className="serif-ko text-lg font-bold text-slate-900">학생 정보 수정</div>
                <div className="text-xs text-slate-500">기본 정보와 목표를 고칩니다. 성적·상담 기록은 각 화면에서 관리합니다.</div>
              </div>
            </div>
            <button onClick={onClose} className="text-slate-400 hover:text-slate-700"><X size={20} /></button>
          </div>

          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {loading ? (
              <div className="py-16 text-center text-sm text-slate-400">불러오는 중...</div>
            ) : (
              <>
                <section>
                  <div className="text-xs font-bold text-slate-700 mb-3 uppercase tracking-wider">기본 정보</div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="col-span-2">
                      <label className="text-xs font-semibold text-slate-600 mb-1.5 block">학생 이름 <span className="text-red-500">*</span></label>
                      <input className={inputCls} value={form.name} onChange={e => update('name', e.target.value)} />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-slate-600 mb-1.5 block">학년</label>
                      <select className={`${inputCls} bg-white`} value={form.grade} onChange={e => update('grade', e.target.value)}>
                        {GRADES.map(g => <option key={g}>{g}</option>)}
                      </select>
                      <div className="text-[10px] text-slate-400 mt-1">학년을 바꾸면 성적 입력 과목도 함께 바뀝니다</div>
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-slate-600 mb-1.5 block">학교</label>
                      <input className={inputCls} value={form.school} onChange={e => update('school', e.target.value)} />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-slate-600 mb-1.5 block">담임 강사</label>
                      <select className={`${inputCls} bg-white`} value={form.instructorId} onChange={e => update('instructorId', e.target.value)}>
                        <option value="">선택 안 함</option>
                        {instructors.map(i => <option key={i.id} value={i.id}>{i.name}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-slate-600 mb-1.5 block">재원 개월</label>
                      <input className={`${inputCls} num`} type="number" min="0" value={form.enrolledMonths} onChange={e => update('enrolledMonths', e.target.value)} />
                    </div>
                  </div>
                </section>

                <section>
                  <div className="text-xs font-bold text-slate-700 mb-3 uppercase tracking-wider">목표</div>
                  <div className="space-y-4">
                    <div>
                      <div className="text-[10px] text-amber-600 font-bold mb-2">최종 목표</div>
                      <div className="grid grid-cols-3 gap-3">
                        <input className={inputCls} placeholder="고려대학교" value={form.finalGoalSchool} onChange={e => update('finalGoalSchool', e.target.value)} />
                        <input className={inputCls} placeholder="공학계열 희망" value={form.finalGoalDetail} onChange={e => update('finalGoalDetail', e.target.value)} />
                        <input className={inputCls} placeholder="수시·정시 트랙" value={form.finalGoalTrack} onChange={e => update('finalGoalTrack', e.target.value)} />
                      </div>
                    </div>
                    <div>
                      <div className="text-[10px] text-slate-500 font-bold mb-2">중간 목표</div>
                      <div className="grid grid-cols-3 gap-3">
                        <input className={inputCls} placeholder="일반고 상위권" value={form.midGoalSchool} onChange={e => update('midGoalSchool', e.target.value)} />
                        <input className={inputCls} placeholder="내신 1점대 진입" value={form.midGoalDetail} onChange={e => update('midGoalDetail', e.target.value)} />
                        <input className={inputCls} placeholder="트랙" value={form.midGoalTrack} onChange={e => update('midGoalTrack', e.target.value)} />
                      </div>
                    </div>
                  </div>
                </section>
              </>
            )}
          </div>

          <div className="border-t border-stone-200 px-6 py-4 flex items-center justify-between shrink-0">
            <div className="text-[11px]">
              {error
                ? <span className="text-red-600 font-semibold flex items-center gap-1.5"><AlertCircle size={12} />{error}</span>
                : saved
                  ? <span className="text-emerald-700 font-semibold">저장했습니다</span>
                  : <span className="text-slate-500">지점 이동은 본사에서만 처리합니다</span>}
            </div>
            <div className="flex items-center gap-2">
              <button onClick={onClose} className="px-4 py-2 text-xs text-slate-700 hover:bg-stone-100 rounded">취소</button>
              <button
                onClick={handleSave}
                disabled={saving || loading}
                className="px-5 py-2 text-xs bg-slate-900 text-white rounded font-bold hover:bg-slate-800 disabled:opacity-50 flex items-center gap-1.5"
              >
                <Save size={12} /> {saving ? '저장 중...' : '저장'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
