'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, UserPlus, Users, Search } from 'lucide-react';
import GoalPicker, { useAdmissionCatalog } from '@/components/GoalPicker';

interface ParentOption { id: string; name: string; phone: string | null; children: Array<{ id: string; name: string; grade: string }> }

export default function NewStudentPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [instructors, setInstructors] = useState<Array<{id: string, name: string}>>([]);
  const [myBranchId, setMyBranchId] = useState<string | null>(null);
  const [myBranchName, setMyBranchName] = useState<string | null>(null);
  const [branches, setBranches] = useState<Array<{id: string, name: string}>>([]);
  const [branchId, setBranchId] = useState('');
  const [form, setForm] = useState({
    name: '', initial: '', grade: '중1', school: '',
    finalGoalSchool: '', finalGoalDetail: '', finalGoalTrack: '',
    midGoalSchool: '', midGoalDetail: '', midGoalTrack: '',
    instructorId: '',
  });
  const update = (k: string, v: string) => setForm(p => ({ ...p, [k]: v }));
  const catalog = useAdmissionCatalog();
  const [role, setRole] = useState<string | null>(null);
  const [error, setError] = useState('');
  // 등록과 함께 연결할 학부모 (형제·자매가 있으면 기존 학부모를 그대로 고른다)
  const [parents, setParents] = useState<ParentOption[]>([]);
  const [parentIds, setParentIds] = useState<string[]>([]);
  const [parentQuery, setParentQuery] = useState('');
  const toggleParent = (id: string) => setParentIds(ids => ids.includes(id) ? ids.filter(x => x !== id) : [...ids, id]);

  useEffect(() => {
    fetch('/api/auth/me').then(r => r.json()).then(me => {
      setRole(me?.role ?? null);
      if (me?.branchId) {
        setMyBranchId(me.branchId);
        setMyBranchName(me.branchName ?? null);
        setBranchId(me.branchId);
      } else {
        fetch('/api/branches').then(r => r.json()).then(list => {
          if (Array.isArray(list)) setBranches(list);
        }).catch(() => {});
      }
    }).catch(() => {});
  }, []);

  useEffect(() => {
    const url = branchId ? `/api/users?role=INSTRUCTOR&branchId=${branchId}` : '/api/users?role=INSTRUCTOR';
    fetch(url).then(r => r.json()).then(d => {
      if (Array.isArray(d)) setInstructors(d.filter((u: any) => u.role === 'INSTRUCTOR'));
    }).catch(() => {});
  }, [branchId]);

  useEffect(() => {
    if (!branchId) return;
    fetch(`/api/parents?branchId=${branchId}`)
      .then(r => (r.ok ? r.json() : []))
      .then(d => { if (Array.isArray(d)) setParents(d); })
      .catch(() => {});
  }, [branchId]);

  const backHref = role === 'INSTRUCTOR' ? '/instructor' : '/director';
  const pq = parentQuery.trim();
  const visibleParents = pq
    ? parents.filter(p => p.name.includes(pq) || (p.phone ?? '').includes(pq) || p.children.some(c => c.name.includes(pq)))
    : parents;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.instructorId || !branchId) return;
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/students', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, branchId, initial: form.name.charAt(0), parentIds }),
      });
      if (res.ok) { router.push(backHref); return; }
      const d = await res.json().catch(() => ({}));
      setError(d.error || '학생 등록에 실패했습니다');
    } catch {
      setError('네트워크 오류로 등록하지 못했습니다');
    } finally { setLoading(false); }
  };

  return (
    <div className="ko-sans max-w-2xl mx-auto px-8 py-8">
      <div className="flex items-center gap-3 mb-8">
        <Link href={backHref} className="text-slate-500 hover:text-slate-900"><ArrowLeft size={18} /></Link>
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
              <label className="text-xs font-semibold text-slate-600 mb-1.5 block">소속 지점 <span className="text-red-500">*</span></label>
              {myBranchId ? (
                <div className="w-full text-sm border border-stone-200 bg-stone-50 rounded-lg px-3 py-2.5 text-slate-600">{myBranchName ?? '소속 지점'}</div>
              ) : (
                <select value={branchId} onChange={e => setBranchId(e.target.value)} required className="w-full text-sm border border-stone-300 rounded-lg px-3 py-2.5 bg-white">
                  <option value="">지점 선택</option>
                  {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                </select>
              )}
            </div>
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
              <div className="text-[10px] text-amber-600 font-bold mb-2">최종 목표 <span className="text-slate-400 font-normal">· 입시 전형 DB 에서 선택하거나 직접 입력</span></div>
              <GoalPicker
                catalog={catalog}
                label="최종 목표"
                className="w-full text-sm border border-stone-300 rounded-lg px-3 py-2.5"
                school={form.finalGoalSchool}
                detail={form.finalGoalDetail}
                track={form.finalGoalTrack}
                placeholders={{ school: '목표 학교 선택', detail: '계열/학과 선택', track: '모집시기 선택' }}
                onChange={(f, v) => update(f === 'school' ? 'finalGoalSchool' : f === 'detail' ? 'finalGoalDetail' : 'finalGoalTrack', v)}
              />
            </div>
            <div>
              <div className="text-[10px] text-slate-500 font-bold mb-2">중간 목표</div>
              <GoalPicker
                catalog={catalog}
                label="중간 목표"
                className="w-full text-sm border border-stone-300 rounded-lg px-3 py-2.5"
                school={form.midGoalSchool}
                detail={form.midGoalDetail}
                track={form.midGoalTrack}
                placeholders={{ school: '중간 목표 선택 (예: 자사고)', detail: '세부 (예: 내신 1점대)', track: '트랙 (예: 고입 2027)' }}
                onChange={(f, v) => update(f === 'school' ? 'midGoalSchool' : f === 'detail' ? 'midGoalDetail' : 'midGoalTrack', v)}
              />
            </div>
          </div>
        </div>
        <div className="bg-white border border-stone-200 rounded-xl p-6">
          <div className="flex items-center justify-between mb-1">
            <div className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5"><Users size={13} /> 학부모 연결</div>
            <div className="text-[11px] text-slate-500">{parentIds.length > 0 ? `${parentIds.length}명 선택` : '선택 안 함'}</div>
          </div>
          <div className="text-[11px] text-slate-500 mb-3">가입 승인이 끝난 우리 지점 학부모 중에서 고릅니다. 형제·자매가 이미 다니면 그 학부모를 고르세요. 나중에 가입 승인 화면에서도 연결할 수 있습니다.</div>
          {parents.length === 0 ? (
            <div className="text-xs text-slate-400 text-center py-4 bg-stone-50 rounded-lg border border-stone-200">연결할 수 있는 학부모 계정이 없습니다</div>
          ) : (
            <>
              <div className="relative mb-2">
                <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input value={parentQuery} onChange={e => setParentQuery(e.target.value)} className="w-full text-xs border border-stone-300 rounded-lg pl-8 pr-3 py-2" placeholder="학부모 이름 · 연락처 · 자녀 이름 검색" />
              </div>
              <div className="max-h-48 overflow-y-auto border border-stone-200 rounded-lg divide-y divide-stone-100">
                {visibleParents.map(p => (
                  <label key={p.id} data-parent-id={p.id} className="flex items-center gap-3 px-3 py-2 cursor-pointer hover:bg-stone-50">
                    <input type="checkbox" checked={parentIds.includes(p.id)} onChange={() => toggleParent(p.id)} />
                    <div className="min-w-0">
                      <div className="text-sm font-semibold text-slate-900">{p.name} <span className="text-[11px] text-slate-500 font-normal num">{p.phone ?? ''}</span></div>
                      <div className="text-[10px] text-slate-500 truncate">
                        {p.children.length > 0 ? `연결된 자녀: ${p.children.map(c => `${c.name}(${c.grade})`).join(', ')}` : '연결된 자녀 없음'}
                      </div>
                    </div>
                  </label>
                ))}
                {visibleParents.length === 0 && <div className="text-xs text-slate-400 text-center py-4">검색 결과가 없습니다</div>}
              </div>
            </>
          )}
        </div>
        {error && <div className="text-xs text-red-600 font-semibold">{error}</div>}
        <button type="submit" disabled={loading || !branchId} className="w-full py-3 bg-slate-900 text-white rounded-xl font-semibold flex items-center justify-center gap-2 hover:bg-slate-800 disabled:opacity-50">
          <UserPlus size={16} /> {loading ? '등록 중...' : '학생 등록'}
        </button>
      </form>
    </div>
  );
}
