'use client';

import { useState } from 'react';
import {
  LineChart, Line, ResponsiveContainer, ReferenceLine,
  YAxis, XAxis, CartesianGrid, Tooltip,
} from 'recharts';
import { BarChart3, Pencil, Check, X } from 'lucide-react';
import { subjectsForGrade, averageOfSubjects, type SubjectField } from '@/lib/subjects';
import { computeScoreDomain, isWithinDomain } from '@/lib/chart-scale';

export interface MockExamRow {
  id?: string;
  name: string;
  date: string;
  fullName?: string | null;
  korean?: number | null;
  english?: number | null;
  math?: number | null;
  social?: number | null;
  science?: number | null;
  avg?: number | null;
  percentile?: string | null;
}

interface Props {
  mockExams: MockExamRow[];
  compact?: boolean;
  /** 학년에 따라 표시 과목이 달라진다 (초·중 5과목 / 고 4과목) */
  grade?: string | null;
  /** 넘기면 표의 각 회차에 수정 버튼이 붙는다 (원장·강사 화면) */
  studentId?: string;
  /** 수정 저장 후 호출 — 화면이 학생 데이터를 다시 읽는다 */
  onChanged?: () => void;
}

type EditDraft = { name: string; date: string; percentile: string } & Partial<Record<SubjectField, string>>;

const cellInput = 'w-14 text-xs text-center border border-stone-300 rounded px-1 py-1 num focus:outline-none focus:ring-2 focus:ring-slate-300';

function parsePercentile(p?: string | null): number | null {
  if (!p) return null;
  const m = p.match(/[\d.]+/);
  return m ? parseFloat(m[0]) : null;
}

export default function MockExamChart({ mockExams, compact = false, grade, studentId, onChanged }: Props) {
  const subjects = subjectsForGrade(grade);
  const editable = !!studentId;
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<EditDraft>({ name: '', date: '', percentile: '' });
  const [saving, setSaving] = useState(false);
  const [editError, setEditError] = useState('');

  const startEdit = (e: MockExamRow) => {
    if (!e.id) return;
    const d: EditDraft = { name: e.name, date: e.date, percentile: e.percentile ?? '' };
    for (const s of subjects) d[s.field] = e[s.field] != null ? String(e[s.field]) : '';
    setDraft(d);
    setEditError('');
    setEditingId(e.id);
  };

  const saveEdit = async () => {
    if (!studentId || !editingId) return;
    if (!draft.name.trim() || !draft.date.trim()) { setEditError('회차와 날짜를 입력해 주세요'); return; }
    const scores: Partial<Record<SubjectField, number | null>> = {};
    for (const s of subjects) {
      const raw = (draft[s.field] ?? '').trim();
      if (raw === '') { scores[s.field] = null; continue; }
      const n = Number(raw);
      if (!Number.isFinite(n) || n < 0 || n > 100) { setEditError(`${s.label} 점수는 0~100 사이 숫자로 입력해 주세요`); return; }
      scores[s.field] = n;
    }
    setSaving(true);
    setEditError('');
    try {
      const res = await fetch(`/api/students/${studentId}/mock-exams/${editingId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        // 종합(평균)은 고친 과목 점수로 다시 계산한다
        body: JSON.stringify({
          name: draft.name, date: draft.date, percentile: draft.percentile || null,
          ...scores, avg: averageOfSubjects(scores, grade),
        }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.error || '저장에 실패했습니다');
      }
      setEditingId(null);
      onChanged?.();
    } catch (err) {
      setEditError(err instanceof Error ? err.message : '저장에 실패했습니다');
    } finally {
      setSaving(false);
    }
  };

  const chartData = mockExams.map(e => {
    const row: Record<string, string | number | null | undefined> = { name: e.name, date: e.date, 종합: e.avg };
    for (const s of subjects) row[s.label] = e[s.field];
    return row;
  });

  // 실제 찍히는 점수에 맞춰 Y축을 좁혀 변화를 확대해 보여준다
  const plotted = mockExams.flatMap(e => [...subjects.map(s => e[s.field]), e.avg]);
  const { domain, ticks } = computeScoreDomain(plotted);

  const first = mockExams[0];
  const last = mockExams[mockExams.length - 1];
  const avgDelta = first && last && typeof first.avg === 'number' && typeof last.avg === 'number'
    ? (last.avg - first.avg).toFixed(1)
    : null;
  const firstPct = parsePercentile(first?.percentile);
  const lastPct = parsePercentile(last?.percentile);

  return (
    <div className="bg-white border border-stone-200 rounded-xl p-6 mb-4">
      <div className="flex items-end justify-between mb-5">
        <div>
          <div className="flex items-center gap-2">
            <BarChart3 size={15} className="text-slate-700" />
            <div className="serif-ko text-lg font-bold text-slate-900">
              전국 모의고사 누적 현황
            </div>
          </div>
          <div className="text-xs text-slate-500 mt-1.5">
            {mockExams.length}회 전국 학력평가 · 백분위 기준
            {avgDelta !== null && (
              <>
                {' '}· 종합{' '}
                <span className={`num font-bold ${+avgDelta >= 0 ? 'text-emerald-700' : 'text-red-700'}`}>
                  {first.avg} → {last.avg} ({+avgDelta >= 0 ? `+${avgDelta}` : avgDelta})
                </span>
              </>
            )}
            {firstPct !== null && lastPct !== null && (
              <>
                {' '}· 전국 상위{' '}
                <span className="num font-bold text-emerald-700">{firstPct}% → {lastPct}%</span>
              </>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 text-[10px]">
          {subjects.map(s => (
            <div key={s.label} className="flex items-center gap-1">
              <div className="w-2.5 h-0.5 rounded" style={{ background: s.color }} />
              <span className="text-slate-600">{s.label}</span>
            </div>
          ))}
          <div className="flex items-center gap-1">
            <div className="w-2.5 h-[3px] rounded bg-slate-900" />
            <span className="text-slate-900 font-semibold">종합</span>
          </div>
        </div>
      </div>

      {mockExams.length === 0 ? (
        <div className="h-40 flex items-center justify-center text-sm text-slate-400">등록된 모의고사 기록이 없습니다</div>
      ) : (
        <>
          <div className="h-64 -ml-2">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 8, right: 16, bottom: 0, left: -16 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e7e5e4" vertical={false} />
                <XAxis
                  dataKey="name"
                  tick={{ fontSize: 11, fill: '#64748b' }}
                  tickFormatter={(v, i) => `${v} (${mockExams[i]?.date?.slice(2, 7) ?? ''})`}
                  axisLine={{ stroke: '#d6d3d1' }}
                  tickLine={false}
                />
                <YAxis domain={domain} ticks={ticks} allowDecimals={false} tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #e7e5e4' }} />
                {isWithinDomain(90, domain) && <ReferenceLine y={90} stroke="#94a3b8" strokeDasharray="4 4" />}
                {subjects.map(s => (
                  <Line key={s.label} type="monotone" dataKey={s.label} stroke={s.color} strokeWidth={1.8} dot={{ r: 3 }} connectNulls />
                ))}
                <Line type="monotone" dataKey="종합" stroke="#0f172a" strokeWidth={3} dot={{ r: 4, fill: '#0f172a' }} connectNulls />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {!compact && (
            <div className="mt-5 overflow-hidden rounded-lg border border-stone-200">
              <table className="w-full text-xs">
                <thead className="bg-stone-50 text-[11px] text-slate-600">
                  <tr>
                    <th className="px-3 py-2.5 text-left font-semibold">회차 · 시험</th>
                    {subjects.map(s => (
                      <th key={s.field} className="px-3 py-2.5 text-center font-semibold">{s.label}</th>
                    ))}
                    <th className="px-3 py-2.5 text-center font-semibold">종합</th>
                    <th className="px-3 py-2.5 text-center font-semibold">전국 위치</th>
                    {editable && <th className="px-3 py-2.5 text-center font-semibold w-24">수정</th>}
                  </tr>
                </thead>
                <tbody>
                  {mockExams.map((e, i) => {
                    const prev = i > 0 ? mockExams[i - 1] : null;
                    const delta = prev && typeof prev.avg === 'number' && typeof e.avg === 'number' ? (e.avg - prev.avg).toFixed(1) : null;
                    if (editable && e.id && editingId === e.id) {
                      return (
                        <tr key={e.id} data-exam-id={e.id} className="border-t border-stone-200 bg-sky-50/40">
                          <td className="px-3 py-2">
                            <div className="flex gap-1">
                              <input aria-label="회차" value={draft.name} onChange={ev => setDraft(d => ({ ...d, name: ev.target.value }))} className="w-20 text-xs border border-stone-300 rounded px-1.5 py-1" />
                              <input aria-label="날짜" value={draft.date} onChange={ev => setDraft(d => ({ ...d, date: ev.target.value }))} className="w-24 text-xs border border-stone-300 rounded px-1.5 py-1 num" placeholder="2026.05.07" />
                            </div>
                            {editError && <div className="text-[10px] text-red-600 font-semibold mt-1">{editError}</div>}
                          </td>
                          {subjects.map(s => (
                            <td key={s.field} className="px-1 py-2 text-center">
                              <input
                                aria-label={`${s.label} 점수`}
                                inputMode="decimal"
                                value={draft[s.field] ?? ''}
                                onChange={ev => setDraft(d => ({ ...d, [s.field]: ev.target.value }))}
                                className={cellInput}
                              />
                            </td>
                          ))}
                          <td className="px-3 py-2 text-center num text-slate-500">
                            {averageOfSubjects(Object.fromEntries(subjects.map(s => [s.field, draft[s.field] ? Number(draft[s.field]) : null])), grade) ?? '—'}
                          </td>
                          <td className="px-1 py-2 text-center">
                            <input aria-label="전국 위치" value={draft.percentile} onChange={ev => setDraft(d => ({ ...d, percentile: ev.target.value }))} className="w-20 text-xs text-center border border-stone-300 rounded px-1 py-1" placeholder="상위 5%" />
                          </td>
                          <td className="px-2 py-2 text-center whitespace-nowrap">
                            <button onClick={saveEdit} disabled={saving} className="inline-flex items-center gap-0.5 text-[11px] px-2 py-1 bg-slate-900 text-white rounded font-semibold disabled:opacity-50">
                              <Check size={11} /> {saving ? '저장 중' : '저장'}
                            </button>
                            <button onClick={() => setEditingId(null)} disabled={saving} title="취소" className="ml-1 inline-flex items-center text-slate-500 hover:text-slate-900 align-middle">
                              <X size={13} />
                            </button>
                          </td>
                        </tr>
                      );
                    }
                    return (
                      <tr key={e.id ?? i} className={`border-t border-stone-200 ${i === mockExams.length - 1 ? 'bg-amber-50/40' : ''}`}>
                        <td className="px-3 py-2.5">
                          <div className="font-semibold text-slate-900">
                            {e.name} <span className="text-slate-500 font-normal num">· {e.date}</span>
                          </div>
                          <div className="text-[10px] text-slate-500">{e.fullName}</div>
                        </td>
                        {subjects.map(s => (
                          <td key={s.field} className="px-3 py-2.5 text-center num font-semibold text-slate-800">{e[s.field] ?? '—'}</td>
                        ))}
                        <td className="px-3 py-2.5 text-center">
                          <span className="num font-black text-slate-900">{e.avg ?? '—'}</span>
                          {delta && (
                            <span className={`ml-1 text-[10px] num font-bold ${+delta > 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                              {+delta > 0 ? `+${delta}` : delta}
                            </span>
                          )}
                        </td>
                        <td className="px-3 py-2.5 text-center num text-slate-700">{e.percentile ?? '—'}</td>
                        {editable && (
                          <td className="px-3 py-2.5 text-center">
                            <button
                              onClick={() => startEdit(e)}
                              disabled={!e.id || (editingId !== null && editingId !== e.id)}
                              className="inline-flex items-center gap-1 text-[11px] px-2 py-1 border border-stone-300 rounded text-slate-700 hover:bg-stone-50 disabled:opacity-40"
                            >
                              <Pencil size={10} /> 수정
                            </button>
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  );
}
