'use client';
import { useEffect, useState } from 'react';
import { Search } from 'lucide-react';

interface Counseling { id: string; date: string; type: string; topic: string; summary: string; student?: { name: string }; }

export default function AdminCounselingsPage() {
  const [counselings, setCounselings] = useState<Counseling[]>([]);
  const [search, setSearch] = useState('');

  useEffect(() => {
    fetch('/api/students')
      .then(r => r.json())
      .then(async (students: any[]) => {
        if (!Array.isArray(students)) return;
        const all: Counseling[] = [];
        for (const s of students.slice(0, 20)) {
          const cs = await fetch(`/api/students/${s.id}/counselings`).then(r => r.json()).catch(() => []);
          if (Array.isArray(cs)) all.push(...cs.map((c: any) => ({ ...c, student: { name: s.name } })));
        }
        all.sort((a, b) => b.date.localeCompare(a.date));
        setCounselings(all);
      }).catch(() => {});
  }, []);

  const filtered = counselings.filter(c =>
    !search || c.student?.name.includes(search) || c.summary.includes(search)
  );

  return (
    <div className="ko-sans max-w-6xl mx-auto px-8 py-8">
      <div className="mb-7 border-b border-stone-200 pb-5 flex items-end justify-between">
        <div>
          <div className="text-[11px] uppercase tracking-[0.2em] text-slate-500 mb-1.5">Counseling Records</div>
          <div className="serif-ko text-3xl font-black text-slate-900">상담 기록 관리</div>
        </div>
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="학생명 또는 내용 검색" className="pl-9 pr-4 py-2 text-sm border border-stone-300 rounded-lg" />
        </div>
      </div>
      <div className="bg-white border border-stone-200 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-stone-50 text-[11px] text-slate-600 border-b border-stone-200">
            <tr>
              <th className="px-4 py-3 text-left font-semibold">날짜</th>
              <th className="px-4 py-3 text-left font-semibold">학생</th>
              <th className="px-4 py-3 text-left font-semibold">유형</th>
              <th className="px-4 py-3 text-left font-semibold">주제</th>
              <th className="px-4 py-3 text-left font-semibold">내용</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(c => (
              <tr key={c.id} className="border-t border-stone-100 hover:bg-stone-50">
                <td className="px-4 py-3 num text-slate-600 whitespace-nowrap">{c.date}</td>
                <td className="px-4 py-3 font-semibold text-slate-900">{c.student?.name}</td>
                <td className="px-4 py-3"><span className="text-xs px-2 py-0.5 bg-stone-100 rounded border border-stone-200 text-slate-600">{c.type}</span></td>
                <td className="px-4 py-3 text-slate-600">{c.topic}</td>
                <td className="px-4 py-3 text-slate-600 max-w-xs truncate">{c.summary}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
