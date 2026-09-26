'use client';
import RoleGuard from '@/components/RoleGuard';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Search, Eye, Pencil, UserPlus } from 'lucide-react';
import StudentInputModal from '@/components/modals/StudentInputModal';
import StudentDetailModal from '@/components/modals/StudentDetailModal';

interface StudentRow {
  id: string;
  name: string;
  grade: string;
  school: string;
  finalGoalSchool: string | null;
  overallReadiness: number | null;
  instructor?: { name: string } | null;
}

function StudentsListPage() {
  const [students, setStudents] = useState<StudentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<StudentRow | null>(null);
  // 조회 전용으로 여는 학생 (강사도 성적·상담 내용을 볼 수 있어야 한다)
  const [viewing, setViewing] = useState<StudentRow | null>(null);

  const load = () => {
    fetch('/api/auth/me')
      .then(r => r.json())
      .then(async me => {
        if (!me?.id) { setLoading(false); return; }
        const url = me.role === 'DIRECTOR'
          ? `/api/students?branchId=${me.branchId}`
          : `/api/students?instructorId=${me.id}`;
        const data = await fetch(url).then(r => r.json());
        if (Array.isArray(data)) setStudents(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const filtered = students.filter(s => s.name.includes(query) || s.school.includes(query));

  return (
    <div className="ko-sans max-w-4xl mx-auto px-8 py-8">
      <div className="mb-7 border-b border-stone-200 pb-5 flex items-end justify-between gap-4">
        <div>
          <div className="text-[11px] uppercase tracking-[0.2em] text-slate-500 mb-1.5">My Students</div>
          <div className="serif-ko text-3xl font-black text-slate-900">담당 학생 전체 보기</div>
          <div className="text-sm text-slate-500 mt-1.5">
            <span className="font-semibold text-slate-700">보기</span>로 성적·상담 내용을 확인하고,{' '}
            <span className="font-semibold text-slate-700">입력</span>으로 현황을 갱신합니다
          </div>
        </div>
        <Link
          href="/students/new"
          className="flex items-center gap-1.5 px-4 py-2 bg-slate-900 text-white rounded-lg text-sm font-semibold hover:bg-slate-800 shrink-0"
        >
          <UserPlus size={14} /> 학생 등록
        </Link>
      </div>

      <div className="relative mb-4">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="이름 또는 학교 검색"
          className="w-full text-sm border border-stone-300 rounded-lg pl-9 pr-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-slate-300"
        />
      </div>

      <div className="space-y-2">
        {!loading && filtered.length === 0 && (
          <div className="text-sm text-slate-400 text-center py-12 border border-dashed border-stone-300 rounded-xl">담당 학생이 없습니다</div>
        )}
        {filtered.map(s => (
          <div
            key={s.id}
            data-student-id={s.id}
            className="flex items-center gap-3 bg-white border border-stone-200 rounded-lg p-3.5 hover:border-slate-400 hover:shadow-sm transition-all"
          >
            <button onClick={() => setViewing(s)} className="flex items-center gap-3 flex-1 min-w-0 text-left">
              <div className="w-9 h-9 rounded-full bg-slate-900 text-white flex items-center justify-center serif-ko font-bold text-sm shrink-0">{s.name.charAt(0)}</div>
              <div className="flex-1 min-w-0">
                <div className="font-bold text-slate-900 text-sm">{s.name} <span className="text-[11px] text-slate-500 font-normal">{s.grade} · {s.school}</span></div>
                <div className="text-[11px] text-slate-500 mt-0.5 truncate">{s.finalGoalSchool ?? '목표 미설정'} {s.instructor?.name && `· ${s.instructor.name} 강사`}</div>
              </div>
              {typeof s.overallReadiness === 'number' && (
                <div className="text-sm num font-bold text-slate-700 shrink-0">{s.overallReadiness}%</div>
              )}
            </button>
            <div className="flex items-center gap-1 shrink-0">
              <button
                onClick={() => setViewing(s)}
                className="flex items-center gap-1 text-[11px] px-2.5 py-1.5 border border-stone-300 rounded-lg text-slate-700 hover:bg-stone-50"
              >
                <Eye size={11} /> 보기
              </button>
              <button
                onClick={() => setSelected(s)}
                className="flex items-center gap-1 text-[11px] px-2.5 py-1.5 border border-stone-300 rounded-lg text-slate-700 hover:bg-stone-50"
              >
                <Pencil size={11} /> 입력
              </button>
            </div>
          </div>
        ))}
      </div>

      {viewing && (
        <StudentDetailModal
          studentId={viewing.id}
          onClose={() => setViewing(null)}
          onEditStatus={() => { setSelected(viewing); setViewing(null); }}
        />
      )}
      {selected && (
        <StudentInputModal
          studentId={selected.id}
          studentName={selected.name}
          grade={selected.grade}
          onClose={() => setSelected(null)}
          onSaved={load}
        />
      )}
    </div>
  );
}

export default function StudentsListPageGuarded() {
  return (
    <RoleGuard allowed={['INSTRUCTOR', 'DIRECTOR']}>
      <StudentsListPage />
    </RoleGuard>
  );
}
