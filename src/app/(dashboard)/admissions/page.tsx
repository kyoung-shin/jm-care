'use client';
import RoleGuard from '@/components/RoleGuard';

import { useEffect, useState } from 'react';
import { Search, Database, Eye } from 'lucide-react';
import TrackDetailModal from '@/components/modals/TrackDetailModal';
import type { TrackData } from '@/components/modals/EditTrackModal';
import Footer from '@/components/dashboard/Footer';

interface CatalogSchool {
  id: string;
  name: string;
  dept: string | null;
  year: number;
  status: string;
  tracks: TrackData[];
}

const PERIODS = ['전체', '수시', '정시', '고입'] as const;

/** 원장·강사용 입시 전형 보기. 본사가 등록·업로드한 전형 DB 를 읽기 전용으로 보여 준다. */
export default function AdmissionsPage() {
  const [schools, setSchools] = useState<CatalogSchool[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [period, setPeriod] = useState<(typeof PERIODS)[number]>('전체');
  const [detail, setDetail] = useState<{ school: CatalogSchool; track: TrackData } | null>(null);

  useEffect(() => {
    fetch('/api/admission/catalog')
      .then(async r => {
        const d = await r.json();
        if (!r.ok) throw new Error(d.error || '불러오지 못했습니다');
        setSchools(Array.isArray(d) ? d : []);
      })
      .catch(e => setError(e instanceof Error ? e.message : '불러오지 못했습니다'))
      .finally(() => setLoading(false));
  }, []);

  const q = query.trim().toLowerCase();
  const rows = schools
    .flatMap(s => s.tracks.map(t => ({ school: s, track: t })))
    .filter(r => period === '전체' || r.track.period === period)
    .filter(r => !q || [r.school.name, r.track.name, r.track.dept, r.track.type, r.school.dept].join(' ').toLowerCase().includes(q));

  return (
    <RoleGuard allowed={['DIRECTOR', 'INSTRUCTOR']}>
      <div className="max-w-7xl mx-auto px-8 py-8">
        <div className="mb-6 flex items-end justify-between border-b border-stone-200 pb-5">
          <div>
            <div className="text-[11px] uppercase tracking-[0.2em] text-slate-500 mb-1.5">Admission Database</div>
            <div className="serif-ko text-[30px] font-black text-slate-900 leading-none">입시 전형 보기</div>
            <div className="text-sm text-slate-500 mt-2">본사가 등록한 대학·고교 전형 전체 — 학생 목표 설정과 상담에 참고하세요</div>
          </div>
          <div className="text-xs text-slate-500 num">학교 {schools.length}개교 · 전형 {schools.reduce((n, s) => n + s.tracks.length, 0)}건</div>
        </div>

        <div className="bg-white border border-stone-200 rounded-xl overflow-hidden">
          <div className="flex items-center justify-between gap-3 px-5 py-3 border-b border-stone-200 bg-stone-50">
            <div className="flex bg-white border border-stone-200 rounded-lg p-0.5 text-xs">
              {PERIODS.map(p => (
                <button
                  key={p}
                  onClick={() => setPeriod(p)}
                  className={`px-3 py-1 rounded-md transition-colors ${period === p ? 'bg-slate-900 text-white' : 'text-slate-600 hover:text-slate-900'}`}
                >
                  {p}
                </button>
              ))}
            </div>
            <div className="relative">
              <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input value={query} onChange={e => setQuery(e.target.value)} className="text-xs border border-stone-300 rounded-lg pl-8 pr-3 py-1.5 w-60 bg-white" placeholder="학교 · 계열 · 전형 검색" />
            </div>
          </div>
          <table className="w-full text-sm">
            <thead className="bg-stone-50/60 text-[11px] text-slate-500">
              <tr>
                <th className="px-5 py-2.5 text-left font-semibold">학교</th>
                <th className="px-3 py-2.5 text-center font-semibold">모집시기</th>
                <th className="px-3 py-2.5 text-left font-semibold">계열/학과</th>
                <th className="px-3 py-2.5 text-left font-semibold">전형명</th>
                <th className="px-3 py-2.5 text-left font-semibold">전형유형</th>
                <th className="px-3 py-2.5"></th>
              </tr>
            </thead>
            <tbody>
              {loading && <tr><td colSpan={6} className="px-5 py-8 text-center text-slate-400 text-sm">불러오는 중...</td></tr>}
              {!loading && error && <tr><td colSpan={6} className="px-5 py-8 text-center text-red-600 text-sm">{error}</td></tr>}
              {!loading && !error && rows.length === 0 && (
                <tr><td colSpan={6} className="px-5 py-8 text-center text-slate-400 text-sm">{q || period !== '전체' ? '조건에 맞는 전형이 없습니다' : '등록된 전형이 없습니다'}</td></tr>
              )}
              {rows.map(({ school, track }) => (
                <tr key={track.id} className="border-t border-stone-100 hover:bg-stone-50/50">
                  <td className="px-5 py-3">
                    <div className="font-semibold text-slate-900">{school.name}</div>
                    <div className="text-[10px] text-slate-400 num">{school.year}학년도</div>
                  </td>
                  <td className="px-3 py-3 text-center text-slate-700">{track.period}</td>
                  <td className="px-3 py-3 text-slate-700">{track.dept ?? school.dept ?? '—'}</td>
                  <td className="px-3 py-3 font-semibold text-slate-900">{track.name}</td>
                  <td className="px-3 py-3 text-slate-600">{track.type ?? '—'}</td>
                  <td className="px-3 py-3 text-right">
                    <button
                      onClick={() => setDetail({ school, track })}
                      className="inline-flex items-center gap-1 text-[11px] px-2.5 py-1.5 border border-stone-300 rounded-lg text-slate-700 hover:bg-stone-50"
                    >
                      <Eye size={11} /> 자세히보기
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mt-3 flex items-center gap-1.5 text-[11px] text-slate-500">
          <Database size={11} /> 전형 내용 수정은 본사 입시기준 DB 에서만 할 수 있습니다
        </div>

        <Footer perspective="원장·강사" />

        {detail && (
          <TrackDetailModal schoolName={detail.school.name} track={detail.track} onClose={() => setDetail(null)} />
        )}
      </div>
    </RoleGuard>
  );
}
