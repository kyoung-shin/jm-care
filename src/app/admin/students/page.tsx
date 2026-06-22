'use client';

import { useState, useEffect } from 'react';
import { Users, Plus, Upload, Search } from 'lucide-react';

interface Student {
  id: string;
  name: string;
  grade: string;
  school: string;
  enrolledMonths: number;
  overallReadiness: number | null;
  instructor: { name: string } | null;
  branch: { name: string } | null;
}

export default function AdminStudentsPage() {
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    fetch('/api/students')
      .then(r => r.json())
      .then(data => { setStudents(Array.isArray(data) ? data : []); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const filtered = students.filter(s =>
    s.name.includes(search) || s.school.includes(search) || s.grade.includes(search)
  );

  return (
    <div>
      <div className="mb-8 flex items-end justify-between">
        <div>
          <div className="serif-ko text-3xl font-black text-slate-900">학생 관리</div>
          <div className="text-sm text-slate-500 mt-1">전체 등록 학생 목록 · DB 연동</div>
        </div>
        <div className="flex items-center gap-2">
          <button className="px-3 py-1.5 bg-white border border-stone-300 rounded text-xs text-slate-700 hover:bg-stone-50 flex items-center gap-1">
            <Upload size={12} /> CSV 업로드 (모의고사)
          </button>
          <button onClick={() => setShowForm(!showForm)} className="px-3 py-1.5 bg-slate-900 text-white rounded text-xs hover:bg-slate-800 flex items-center gap-1">
            <Plus size={12} /> 학생 등록
          </button>
        </div>
      </div>

      {showForm && (
        <div className="bg-white border border-stone-200 rounded-xl p-6 mb-6">
          <div className="serif-ko text-base font-bold text-slate-900 mb-4">신규 학생 등록</div>
          <form className="grid grid-cols-3 gap-4" onSubmit={async e => {
            e.preventDefault();
            const fd = new FormData(e.currentTarget);
            const body = Object.fromEntries(fd.entries());
            const res = await fetch('/api/students', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
            if (res.ok) { const s = await res.json(); setStudents(prev => [s, ...prev]); setShowForm(false); }
          }}>
            {[
              { name: 'name', label: '이름', placeholder: '김민준' },
              { name: 'grade', label: '학년', placeholder: '중2' },
              { name: 'school', label: '학교', placeholder: '파주 운정중' },
            ].map(f => (
              <div key={f.name}>
                <label className="text-[11px] font-semibold text-slate-600 mb-1.5 block">{f.label}</label>
                <input name={f.name} placeholder={f.placeholder} required className="w-full text-sm border border-stone-300 rounded-lg px-3 py-2" />
              </div>
            ))}
            <div className="col-span-3 flex justify-end gap-2">
              <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 text-xs text-slate-700 hover:bg-stone-100 rounded">취소</button>
              <button type="submit" className="px-5 py-2 text-xs bg-slate-900 text-white rounded font-bold">저장</button>
            </div>
          </form>
        </div>
      )}

      <div className="bg-white border border-stone-200 rounded-xl overflow-hidden">
        <div className="p-4 border-b border-stone-200 flex items-center gap-3">
          <div className="relative flex-1 max-w-xs">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="이름, 학교, 학년 검색..."
              className="w-full text-sm border border-stone-300 rounded-lg pl-9 pr-3 py-2"
            />
          </div>
          <div className="text-xs text-slate-500">총 <span className="font-semibold num text-slate-900">{filtered.length}</span>명</div>
        </div>

        {loading ? (
          <div className="p-12 text-center text-slate-500 text-sm">데이터 로딩 중...</div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center">
            <Users size={32} className="text-slate-300 mx-auto mb-3" />
            <div className="text-slate-500 text-sm">등록된 학생이 없습니다</div>
            <div className="text-xs text-slate-400 mt-1">시드 데이터를 실행하거나 학생을 직접 등록하세요</div>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-stone-50 text-[11px] text-slate-600">
              <tr>
                <th className="px-4 py-3 text-left font-semibold">이름</th>
                <th className="px-4 py-3 text-left font-semibold">학년</th>
                <th className="px-4 py-3 text-left font-semibold">학교</th>
                <th className="px-4 py-3 text-left font-semibold">담임 강사</th>
                <th className="px-4 py-3 text-left font-semibold">지점</th>
                <th className="px-4 py-3 text-center font-semibold">재원</th>
                <th className="px-4 py-3 text-center font-semibold">준비도</th>
                <th className="px-4 py-3 text-center font-semibold">관리</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((s, i) => (
                <tr key={s.id} className={`border-t border-stone-200 hover:bg-stone-50 ${i % 2 === 0 ? '' : 'bg-stone-50/30'}`}>
                  <td className="px-4 py-3 font-bold text-slate-900">{s.name}</td>
                  <td className="px-4 py-3 text-slate-700">{s.grade}</td>
                  <td className="px-4 py-3 text-slate-600">{s.school}</td>
                  <td className="px-4 py-3 text-slate-600">{s.instructor?.name ?? '-'}</td>
                  <td className="px-4 py-3 text-slate-600">{s.branch?.name ?? '-'}</td>
                  <td className="px-4 py-3 text-center num text-slate-600">{s.enrolledMonths}개월</td>
                  <td className="px-4 py-3 text-center num font-semibold text-slate-900">{s.overallReadiness ?? '-'}%</td>
                  <td className="px-4 py-3 text-center">
                    <button className="text-[11px] px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded">상세</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
