'use client';

import { useEffect, useState } from 'react';

// 학생 목표(학교 · 계열/학과 · 모집시기)를 본사 입시 전형 DB 에서 골라 넣는 입력칸.
// DB 에 없는 목표(예: "일반고 상위권")도 있으므로 "직접 입력"으로 언제든 바꿀 수 있다.

interface CatalogTrack { period: string; dept: string | null; name: string }
interface CatalogSchool { id: string; name: string; dept: string | null; tracks: CatalogTrack[] }

const CUSTOM = '__custom__';
const DEFAULT_PERIODS = ['수시', '정시', '고입'];

/** 입시 전형 DB 를 한 번 읽어 온다. 권한이 없거나 실패하면 빈 목록 — 입력칸은 직접 입력으로 동작한다. */
export function useAdmissionCatalog() {
  const [schools, setSchools] = useState<CatalogSchool[]>([]);
  useEffect(() => {
    let cancelled = false;
    fetch('/api/admission/catalog')
      .then(r => (r.ok ? r.json() : []))
      .then(d => { if (!cancelled && Array.isArray(d)) setSchools(d); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, []);
  return schools;
}

function uniq(list: Array<string | null | undefined>): string[] {
  return [...new Set(list.map(v => (v ?? '').trim()).filter(Boolean))];
}

interface SelectProps {
  value: string;
  onChange: (v: string) => void;
  options: string[];
  placeholder: string;
  ariaLabel: string;
  className: string;
}

/** 목록에서 고르거나, "직접 입력"을 고르면 글자 입력칸으로 바뀐다 */
function CatalogSelect({ value, onChange, options, placeholder, ariaLabel, className }: SelectProps) {
  const inList = !value || options.includes(value);
  const [custom, setCustom] = useState(false);
  // 목록이 비었으면 고를 것이 없으니 처음부터 입력칸
  if (custom || options.length === 0) {
    return (
      <div className="relative">
        <input
          aria-label={ariaLabel}
          className={`${className} ${options.length > 0 ? 'pr-12' : ''}`}
          placeholder={placeholder}
          value={value}
          onChange={e => onChange(e.target.value)}
          autoFocus={custom}
        />
        {options.length > 0 && (
          <button
            type="button"
            onClick={() => setCustom(false)}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-slate-500 hover:text-slate-900"
          >
            목록
          </button>
        )}
      </div>
    );
  }
  return (
    <select
      aria-label={ariaLabel}
      className={`${className} bg-white`}
      value={value}
      onChange={e => {
        if (e.target.value === CUSTOM) { setCustom(true); return; }
        onChange(e.target.value);
      }}
    >
      <option value="">{placeholder}</option>
      {!inList && <option value={value}>{value} (직접 입력)</option>}
      {options.map(o => <option key={o} value={o}>{o}</option>)}
      <option value={CUSTOM}>직접 입력…</option>
    </select>
  );
}

interface GoalPickerProps {
  catalog: CatalogSchool[];
  school: string;
  detail: string;
  track: string;
  onChange: (field: 'school' | 'detail' | 'track', value: string) => void;
  placeholders: { school: string; detail: string; track: string };
  /** 스크린리더·테스트용 접두어 (예: "최종 목표") */
  label: string;
  className: string;
}

export default function GoalPicker({ catalog, school, detail, track, onChange, placeholders, label, className }: GoalPickerProps) {
  const schoolOptions = uniq(catalog.map(s => s.name));
  // 고른 학교의 전형에서 계열·모집시기를 뽑는다. 학교를 아직 안 골랐거나 DB 에 없으면 전체에서.
  const matched = catalog.filter(s => s.name === school);
  const pool = matched.length > 0 ? matched : catalog;
  const detailOptions = uniq(pool.flatMap(s => [...s.tracks.map(t => t.dept), matched.length > 0 ? s.dept : null]));
  const periodOptions = uniq([...pool.flatMap(s => s.tracks.map(t => t.period)), ...(matched.length > 0 ? [] : DEFAULT_PERIODS)]);

  return (
    <div className="grid grid-cols-3 gap-3">
      <CatalogSelect
        ariaLabel={`${label} 학교`}
        className={className}
        value={school}
        options={schoolOptions}
        placeholder={placeholders.school}
        onChange={v => onChange('school', v)}
      />
      <CatalogSelect
        ariaLabel={`${label} 계열/학과`}
        className={className}
        value={detail}
        options={detailOptions}
        placeholder={placeholders.detail}
        onChange={v => onChange('detail', v)}
      />
      <CatalogSelect
        ariaLabel={`${label} 모집시기`}
        className={className}
        value={track}
        options={periodOptions}
        placeholder={placeholders.track}
        onChange={v => onChange('track', v)}
      />
    </div>
  );
}
