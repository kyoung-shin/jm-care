'use client';

import {
  LineChart, Line, ResponsiveContainer, ReferenceLine,
  YAxis, XAxis, CartesianGrid, Tooltip,
} from 'recharts';
import { BarChart3 } from 'lucide-react';

const SUBJECT_COLORS: Record<string, string> = { 국어: '#0f766e', 영어: '#2563eb', 수학: '#d97706', 과학: '#7c3aed' };

export interface MockExamRow {
  id?: string;
  name: string;
  date: string;
  fullName?: string | null;
  korean?: number | null;
  english?: number | null;
  math?: number | null;
  science?: number | null;
  avg?: number | null;
  percentile?: string | null;
}

interface Props {
  mockExams: MockExamRow[];
  compact?: boolean;
}

function parsePercentile(p?: string | null): number | null {
  if (!p) return null;
  const m = p.match(/[\d.]+/);
  return m ? parseFloat(m[0]) : null;
}

export default function MockExamChart({ mockExams, compact = false }: Props) {
  const chartData = mockExams.map(e => ({
    name: e.name, date: e.date, 국어: e.korean, 영어: e.english, 수학: e.math, 과학: e.science, 종합: e.avg,
  }));

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
          {Object.entries(SUBJECT_COLORS).map(([k, v]) => (
            <div key={k} className="flex items-center gap-1">
              <div className="w-2.5 h-0.5 rounded" style={{ background: v }} />
              <span className="text-slate-600">{k}</span>
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
                <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #e7e5e4' }} />
                <ReferenceLine y={90} stroke="#94a3b8" strokeDasharray="4 4" />
                {Object.entries(SUBJECT_COLORS).map(([k, v]) => (
                  <Line key={k} type="monotone" dataKey={k} stroke={v} strokeWidth={1.8} dot={{ r: 3 }} connectNulls />
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
                    <th className="px-3 py-2.5 text-center font-semibold">국어</th>
                    <th className="px-3 py-2.5 text-center font-semibold">영어</th>
                    <th className="px-3 py-2.5 text-center font-semibold">수학</th>
                    <th className="px-3 py-2.5 text-center font-semibold">과학</th>
                    <th className="px-3 py-2.5 text-center font-semibold">종합</th>
                    <th className="px-3 py-2.5 text-center font-semibold">전국 위치</th>
                  </tr>
                </thead>
                <tbody>
                  {mockExams.map((e, i) => {
                    const prev = i > 0 ? mockExams[i - 1] : null;
                    const delta = prev && typeof prev.avg === 'number' && typeof e.avg === 'number' ? (e.avg - prev.avg).toFixed(1) : null;
                    return (
                      <tr key={e.id ?? i} className={`border-t border-stone-200 ${i === mockExams.length - 1 ? 'bg-amber-50/40' : ''}`}>
                        <td className="px-3 py-2.5">
                          <div className="font-semibold text-slate-900">
                            {e.name} <span className="text-slate-500 font-normal num">· {e.date}</span>
                          </div>
                          <div className="text-[10px] text-slate-500">{e.fullName}</div>
                        </td>
                        <td className="px-3 py-2.5 text-center num font-semibold text-slate-800">{e.korean ?? '—'}</td>
                        <td className="px-3 py-2.5 text-center num font-semibold text-slate-800">{e.english ?? '—'}</td>
                        <td className="px-3 py-2.5 text-center num font-semibold text-slate-800">{e.math ?? '—'}</td>
                        <td className="px-3 py-2.5 text-center num font-semibold text-slate-800">{e.science ?? '—'}</td>
                        <td className="px-3 py-2.5 text-center">
                          <span className="num font-black text-slate-900">{e.avg ?? '—'}</span>
                          {delta && (
                            <span className={`ml-1 text-[10px] num font-bold ${+delta > 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                              {+delta > 0 ? `+${delta}` : delta}
                            </span>
                          )}
                        </td>
                        <td className="px-3 py-2.5 text-center num text-slate-700">{e.percentile ?? '—'}</td>
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
