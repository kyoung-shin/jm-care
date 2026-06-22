'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, UserPlus } from 'lucide-react';

export default function NewStudentPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [instructors, setInstructors] = useState<Array<{id: string, name: string}>>([]);
  const [form, setForm] = useState({
    name: '', initial: '', grade: '중1', school: '',
    finalGoalSchool: '', finalGoalDetail: '', finalGoalTrack: '',
    midGoalSchool: '', midGoalDetail: '', midGoalTrack: '',
    instructorId: '', branchId: 'branch_wonjung',
  });
  const update = (k: string, v: string) => setForm(p => ({ ...p, [k]: v }));

  useEffect(() => {
    fetch('/api/users?role=INSTRUCTOR').then(r => r.json()).then(d => {
      if (Array.isArray(d)) setInstructors(d.filter((u: any) => u.role === 'INSTRUCTOR'));
    }).catch(() => {});
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.instructorId) return;
    setLoading(true);
    try {
      const res = await fetch('/api/students', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, initial: form.name.charAt(0) }),
      });
      if (res.ok) router.push('/director');
    } finally { setLoading(false); }
  };

  return (
    <div className="ko-sans max-w-2xl mx-auto px-8 py-8">
      <div className="flex items-center gap-3 mb-8">
        <Link href="/director" className="text-slate-500 hover:text-slate-900"><ArrowLeft size={18} /></Link>
        <div>
          <div className="text-[11px] uppercase tracking-widest text-slate-500">New Student</div>
          <div className="serif-ko text-2xl font-black text-slate-900">학생 등록</div>
        </div>
      </div>
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="bg-white border border-stone-200 rounded-xl p-6">
          <div className="text-xs font-bold text-slate-700 mb-4 uppercase tracking-wider">기본 정보</div>
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="text-xs font-semibold text-slate-600 mb-1.5 block">학생 이름 <span className="text-red-500">*</span></label>
              <input value={form.name} onChange={e => update('name', e.target.value)} required className="w-full text-sm border border-stone-300 rounded-lg px-3 py-2.5" placeholder="김민준" />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-600 mb-1.5 block">학년</label>
              <select value={form.grade} onChange={e => update('grade', e.target.value)} className="w-full text-sm border border-stone-300 rounded-lg px-3 py-2.5 bg-white">
                {['중1','중2','중3','고1','고2','고3'].map(g => <option key={g}>{g}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-600 mb-1.5 block">학교</label>
              <input value={form.school} onChange={e => update('school', e.target.value)} className="w-full text-sm border border-stone-300 rounded-lg px-3 py-2.5" placeholder="파주 운정중" />
            </div>
            <div className="col-span-2">
              <label className="text-xs font-semibold text-slate-600 mb-1.5 block">담임 강사 <span className="text-red-500">*</span></label>
              <select value={form.instructorId} onChange={e => update('instructorId', e.target.value)} required className="w-full text-sm border border-stone-300 rounded-lg px-3 py-2.5 bg-white">
                <option value="">강사 선택</option>
                {instructors.map(i => <option key={i.id} value={i.id}>{i.name}</option>)}
              </select>
            </div>
          </div>
        </div>
        <div className="bg-white border border-stone-200 rounded-xl p-6">
          <div className="text-xs font-bold text-slate-700 mb-4 uppercase tracking-wider">목표 설정</div>
          <div className="space-y-4">
            <div>
              <div className="text-[10px] text-amber-600 font-bold mb-2">최종 목표</div>
              <div className="grid grid-cols-3 gap-3">
                <input value={form.finalGoalSchool} onChange={e => update('finalGoalSchool', e.target.value)} className="text-sm border border-stone-300 rounded-lg px-3 py-2.5" placeholder="고려대학교" />
                <input value={form.finalGoalDetail} onChange={e => update('finalGoalDetail', e.target.value)} className="text-sm border border-stone-300 rounded-lg px-3 py-2.5" placeholder="공학계열 희망" />
                <input value={form.finalGoalTrack} onChange={e => update('finalGoalTrack', e.target.value)} className="text-sm border border-stone-300 rounded-lg px-3 py-2.5" placeholder="수시·정시 트랙" />
              </div>
            </div>
            <div>
              <div className="text-[10px] text-slate-500 font-bold mb-2">중간 목표</div>
              <div className="grid grid-cols-3 gap-3">
                <input value={form.midGoalSchool} onChange={e => update('midGoalSchool', e.target.value)} className="text-sm border border-stone-300 rounded-lg px-3 py-2.5" placeholder="일반고 상위권" />
                <input value={form.midGoalDetail} onChange={e => update('midGoalDetail', e.target.value)} className="text-sm border border-stone-300 rounded-lg px-3 py-2.5" placeholder="내신 1점대 진입" />
                <input value={form.midGoalTrack} onChange={e => update('midGoalTrack', e.target.value)} className="text-sm border border-stone-300 rounded-lg px-3 py-2.5" placeholder="고입 2027" />
              </div>
            </div>
          </div>
        </div>
        <button type="submit" disabled={loading} className="w-full py-3 bg-slate-900 text-white rounded-xl font-semibold flex items-center justify-center gap-2 hover:bg-slate-800 disabled:opacity-50">
          <UserPlus size={16} /> {loading ? '등록 중...' : '학생 등록'}
        </button>
      </form>
    </div>
  );
}
