'use client';
import { useEffect, useState, useRef } from 'react';
import { Upload, BarChart3 } from 'lucide-react';

interface Exam { id: string; name: string; date: string; avg?: number; korean?: number; english?: number; math?: number; science?: number; student?: { name: string }; studentId: string; }

export default function AdminExamsPage() {
  const [exams, setExams] = useState<Exam[]>([]);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch('/api/students').then(r => r.json()).then(async (students: any[]) => {
      if (!Array.isArray(students)) return;
      const all: Exam[] = [];
      for (const s of students.slice(0, 20)) {
        const es = await fetch(`/api/students/${s.id}/mock-exams`).then(r => r.json()).catch(() => []);
        if (Array.isArray(es)) all.push(...es.map((e: any) => ({ ...e, student: { name: s.name } })));
      }
      all.sort((a, b) => b.date.localeCompare(a.date));
      setExams(all);
    }).catch(() => {});
  }, []);

  const handleCSV = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    const lines = text.trim().split('\n').slice(1);
    // Expected columns: studentId,name,date,korean,english,math,science
    for (const line of lines) {
      const [studentId, name, date, korean, english, math, science] = line.split(',');
      if (!studentId || !name) continue;
      const avg = [korean, english, math, science].map(Number).filter(n => !isNaN(n) && n > 0);
      await fetch(`/api/students/${studentId.trim()}/mock-exams`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), date: date.trim(), korean: parseFloat(korean), english: parseFloat(english), math: parseFloat(math), science: parseFloat(science), avg: avg.length ? avg.reduce((a,b) => a+b, 0)/avg.length : null }),
      });
    }
    alert('업로드 완료');
  };

  return (
    <div className="ko-sans max-w-6xl mx-auto px-8 py-8">
      <div className="mb-7 flex items-end justify-between border-b border-stone-200 pb-5">
        <div>
          <div className="text-[11px] uppercase tracking-[0.2em] text-slate-500 mb-1.5">Exam Management</div>
          <div className="serif-ko text-3xl font-black text-slate-900">모의고사 데이터 관리</div>
        </div>
        <div>
          <input ref={fileRef} type="file" accept=".csv" onChange={handleCSV} className="hidden" />
          <button onClick={() => fileRef.current?.click()} className="flex items-center gap-1.5 px-4 py-2 bg-slate-900 text-white rounded-lg text-sm font-semibold hover:bg-slate-800">
            <Upload size={14} /> CSV 업로드
          </button>
          <div className="text-[10px] text-slate-400 mt-1 text-right">studentId,회차,날짜,국어,영어,수학,과학</div>
        </div>
      </div>
      <div className="bg-white border border-stone-200 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-stone-50 text-[11px] text-slate-600 border-b border-stone-200">
            <tr>
              <th className="px-4 py-3 text-left font-semibold">날짜</th>
              <th className="px-4 py-3 text-left font-semibold">학생</th>
              <th className="px-4 py-3 text-left font-semibold">회차</th>
              <th className="px-4 py-3 text-center font-semibold">국어</th>
              <th className="px-4 py-3 text-center font-semibold">영어</th>
              <th className="px-4 py-3 text-center font-semibold">수학</th>
              <th className="px-4 py-3 text-center font-semibold">과학</th>
              <th className="px-4 py-3 text-center font-semibold">종합</th>
            </tr>
          </thead>
          <tbody>
            {exams.map(e => (
              <tr key={e.id} className="border-t border-stone-100 hover:bg-stone-50">
                <td className="px-4 py-3 num text-slate-600 whitespace-nowrap">{e.date}</td>
                <td className="px-4 py-3 font-semibold text-slate-900">{e.student?.name}</td>
                <td className="px-4 py-3 text-slate-600">{e.name}</td>
                {[e.korean, e.english, e.math, e.science].map((v, i) => (
                  <td key={i} className="px-4 py-3 text-center num text-slate-700">{v ?? '—'}</td>
                ))}
                <td className="px-4 py-3 text-center num font-bold text-slate-900">{e.avg?.toFixed(1) ?? '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
