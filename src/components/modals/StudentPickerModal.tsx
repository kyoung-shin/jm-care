'use client';

import { useEffect, useState } from 'react';
import { X, Search, User } from 'lucide-react';

interface StudentListItem {
  id: string;
  name: string;
  grade: string;
  school: string;
  overallReadiness: number | null;
  instructor?: { name: string } | null;
}

interface Props {
  branchId?: string;
  students?: StudentListItem[];
  currentStudentId?: string;
  title?: string;
  onSelect: (studentId: string) => void;
  onClose: () => void;
}

export default function StudentPickerModal({ branchId, students: providedStudents, currentStudentId, title, onSelect, onClose }: Props) {
  const [students, setStudents] = useState<StudentListItem[]>(providedStudents ?? []);
  const [loading, setLoading] = useState(!providedStudents && !!branchId);
  const [query, setQuery] = useState('');

  useEffect(() => {
    if (providedStudents || !branchId) return;
    fetch(`/api/students?branchId=${branchId}`)
      .then(r => r.json())
      .then(d => { if (Array.isArray(d)) setStudents(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, [branchId, providedStudents]);

  const filtered = students.filter(s => s.name.includes(query) || s.school.includes(query));

  return (
    <div className="fixed inset-0 z-50 ko-sans">
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={onClose} />
      <div className="absolute inset-0 flex items-center justify-center p-6 pointer-events-none">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[80vh] flex flex-col pointer-events-auto overflow-hidden">
          <div className="flex items-center justify-between px-6 py-4 border-b border-stone-200 bg-stone-50 shrink-0">
            <div className="serif-ko text-lg font-bold text-slate-900">{title ?? '학생 선택'}</div>
            <button onClick={onClose} className="text-slate-400 hover:text-slate-700"><X size={20} /></button>
          </div>
          <div className="px-6 py-3 border-b border-stone-200 shrink-0">
            <div className="relative">
              <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder="이름 또는 학교 검색"
                autoFocus
                className="w-full text-sm border border-stone-300 rounded-lg pl-8 pr-3 py-2 focus:outline-none focus:ring-2 focus:ring-slate-300"
              />
            </div>
          </div>
          <div className="flex-1 overflow-y-auto p-3">
            {loading && <div className="text-sm text-slate-400 text-center py-8">불러오는 중...</div>}
            {!loading && filtered.length === 0 && (
              <div className="text-sm text-slate-400 text-center py-8">학생이 없습니다</div>
            )}
            {filtered.map(s => (
              <button
                key={s.id}
                onClick={() => onSelect(s.id)}
                className={`w-full text-left flex items-center gap-3 px-3 py-2.5 rounded-lg mb-1 transition-colors ${
                  s.id === currentStudentId ? 'bg-slate-100' : 'hover:bg-stone-50'
                }`}
              >
                <div className="w-9 h-9 rounded-full bg-slate-900 text-white flex items-center justify-center serif-ko text-sm font-bold shrink-0">
                  {s.name.charAt(0)}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-semibold text-slate-900 flex items-center gap-1.5">
                    {s.name}
                    {s.id === currentStudentId && <span className="text-[10px] text-slate-500 font-normal">(현재 보는 중)</span>}
                  </div>
                  <div className="text-[11px] text-slate-500">{s.grade} · {s.school} {s.instructor?.name && `· ${s.instructor.name} 강사`}</div>
                </div>
                {typeof s.overallReadiness === 'number' && (
                  <div className="text-xs num font-bold text-slate-600 shrink-0 flex items-center gap-1">
                    <User size={11} className="text-slate-400" />{s.overallReadiness}%
                  </div>
                )}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
