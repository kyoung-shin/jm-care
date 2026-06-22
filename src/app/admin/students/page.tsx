'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Plus, Pencil, Trash2, Check, X } from 'lucide-react';

interface Student { id: string; name: string; grade: string; school: string; overallReadiness?: number; instructor?: { name: string }; }

export default function AdminStudentsPage() {
  const [students, setStudents] = useState<Student[]>([]);
  const [editId, setEditId] = useState<string | null>(null);
  const [editData, setEditData] = useState<Partial<Student>>({});

  const load = () => fetch('/api/students').then(r => r.json()).then(d => { if (Array.isArray(d)) setStudents(d); }).catch(() => {});
  useEffect(() => { load(); }, []);

  const startEdit = (s: Student) => { setEditId(s.id); setEditData({ name: s.name, grade: s.grade, school: s.school }); };
  const cancelEdit = () => { setEditId(null); setEditData({}); };

  const saveEdit = async (id: string) => {
    await fetch(`/api/students/${id}`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(editData),
    });
    setEditId(null);
    load();
  };

  const deleteStudent = async (id: string) => {
    if (!confirm('학생을 삭제하시겠습니까?')) return;
    await fetch(`/api/students/${id}`, { method: 'DELETE' });
    load();
  };

  return (
    <div className="ko-sans max-w-6xl mx-auto px-8 py-8">
      <div className="mb-7 flex items-end justify-between border-b border-stone-200 pb-5">
        <div>
          <div className="text-[11px] uppercase tracking-[0.2em] text-slate-500 mb-1.5">Student Management</div>
          <div className="serif-ko text-3xl font-black text-slate-900">학생 관리</div>
        </div>
        <Link href="/students/new" className="flex items-center gap-1.5 px-4 py-2 bg-slate-900 text-white rounded-lg text-sm font-semibold hover:bg-slate-800">
          <Plus size={14} /> 학생 추가
        </Link>
      </div>
      <div className="bg-white border border-stone-200 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-stone-50 text-[11px] text-slate-600 border-b border-stone-200">
            <tr>
              <th className="px-4 py-3 text-left font-semibold">이름</th>
              <th className="px-4 py-3 text-left font-semibold">학년</th>
              <th className="px-4 py-3 text-left font-semibold">학교</th>
              <th className="px-4 py-3 text-left font-semibold">준비도</th>
              <th className="px-4 py-3 text-left font-semibold">담임 강사</th>
              <th className="px-4 py-3 text-center font-semibold">관리</th>
            </tr>
          </thead>
          <tbody>
            {students.map(s => (
              <tr key={s.id} className="border-t border-stone-100 hover:bg-stone-50">
                <td className="px-4 py-3">
                  {editId === s.id
                    ? <input value={editData.name || ''} onChange={e => setEditData(d => ({ ...d, name: e.target.value }))} className="text-sm border border-stone-300 rounded px-2 py-1 w-24" />
                    : <span className="font-semibold text-slate-900">{s.name}</span>}
                </td>
                <td className="px-4 py-3">
                  {editId === s.id
                    ? <select value={editData.grade || ''} onChange={e => setEditData(d => ({ ...d, grade: e.target.value }))} className="text-sm border border-stone-300 rounded px-2 py-1 bg-white">
                        {['중1','중2','중3','고1','고2','고3'].map(g => <option key={g}>{g}</option>)}
                      </select>
                    : s.grade}
                </td>
                <td className="px-4 py-3 text-slate-600">
                  {editId === s.id
                    ? <input value={editData.school || ''} onChange={e => setEditData(d => ({ ...d, school: e.target.value }))} className="text-sm border border-stone-300 rounded px-2 py-1 w-32" />
                    : s.school}
                </td>
                <td className="px-4 py-3 num text-slate-700">{s.overallReadiness ? `${s.overallReadiness}%` : '—'}</td>
                <td className="px-4 py-3 text-slate-600">{(s as any).instructor?.name || '—'}</td>
                <td className="px-4 py-3 text-center">
                  {editId === s.id ? (
                    <div className="flex items-center justify-center gap-1">
                      <button onClick={() => saveEdit(s.id)} className="p-1 text-emerald-600 hover:text-emerald-700"><Check size={14} /></button>
                      <button onClick={cancelEdit} className="p-1 text-slate-400 hover:text-slate-700"><X size={14} /></button>
                    </div>
                  ) : (
                    <div className="flex items-center justify-center gap-1">
                      <button onClick={() => startEdit(s)} className="p-1 text-slate-400 hover:text-slate-700"><Pencil size={14} /></button>
                      <button onClick={() => deleteStudent(s.id)} className="p-1 text-slate-400 hover:text-red-600"><Trash2 size={14} /></button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
