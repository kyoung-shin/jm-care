'use client';

import {
  LineChart, Line, ResponsiveContainer, ReferenceLine,
  YAxis, XAxis, CartesianGrid, Tooltip,
} from 'recharts';
import { BarChart3 } from 'lucide-react';
import { mockExams, subjectColors } from '@/lib/dummy-data';

interface Props {
  compact?: boolean;
}

export default function MockExamChart({ compact = false }: Props) {
  const chartData = mockExams.map(e => ({ ...e, 종합: e.avg }));

  return (
    <div className="bg-white border border-stone-200 rounded-xl p-6 mb-4">
      <div className="flex items-end justify-between mb-5">
        <div>
          <div className="flex items-center gap-2">
            <BarChart3 size={15} className="text-slate-700" />
            <div className="serif-ko text-lg font-bold text-slate-900">
              전국 모의고사 누적 현황 — 입학 후 1년
            </div>
          </div>
          <div className="text-xs text-slate-500 mt-1.5">
            4회 전국 학력평가 · 백분위 기준 · 종합{' '}
            <span className="num font-bold text-emerald-700">73.8 → 85.8 (+12.0)</span>
            {' '}· 전국 상위{' '}
            <span className="num font-bold text-emerald-700">26.2% → 14.2%</span>
          </div>
        </div>
        <div className="flex items-center gap-2 text-[10px]">
          {Object.entries(subjectColors).map(([k, v]) => (
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

      <div className="h-64 -ml-2">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 8, right: 16, bottom: 0, left: -16 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e7e5e4" vertical={false} />
            <XAxis
              dataKey="name"
              tick={{ fontSize: 11, fill: '#64748b' }}
              tickFormatter={(v, i) => `${v} (${mockExams[i]?.date.slice(2, 7)})`}
              axisLine={{ stroke: '#d6d3d1' }}
              tickLine={false}
            />
            <YAxis domain={[60, 100]} tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
            <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #e7e5e4' }} />
            <ReferenceLine
              y={90}
              stroke="#94a3b8"
              strokeDasharray="4 4"
              label={{ value: '고려대 합격생 중2 평균 (90)', position: 'insideTopRight', fontSize: 10, fill: '#64748b' }}
            />
            {Object.entries(subjectColors).map(([k, v]) => (
              <Line key={k} type="monotone" dataKey={k} stroke={v} strokeWidth={1.8} dot={{ r: 3 }} />
            ))}
            <Line type="monotone" dataKey="종합" stroke="#0f172a" strokeWidth={3} dot={{ r: 4, fill: '#0f172a' }} />
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
                const delta = prev ? (e.avg - prev.avg).toFixed(1) : null;
                return (
                  <tr key={i} className={`border-t border-stone-200 ${i === mockExams.length - 1 ? 'bg-amber-50/40' : ''}`}>
                    <td className="px-3 py-2.5">
                      <div className="font-semibold text-slate-900">
                        {e.name} <span className="text-slate-500 font-normal num">· {e.date}</span>
                      </div>
                      <div className="text-[10px] text-slate-500">{e.fullName}</div>
                    </td>
                    {(['국어', '영어', '수학', '과학'] as const).map(s => (
                      <td key={s} className="px-3 py-2.5 text-center num font-semibold text-slate-800">{e[s]}</td>
                    ))}
                    <td className="px-3 py-2.5 text-center">
                      <span className="num font-black text-slate-900">{e.avg}</span>
                      {delta && (
                        <span className={`ml-1 text-[10px] num font-bold ${+delta > 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                          {+delta > 0 ? `+${delta}` : delta}
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-2.5 text-center num text-slate-700">{e.percentile}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
