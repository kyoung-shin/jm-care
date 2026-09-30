// CSV 파서. 업로드되는 파일이 엑셀에서 내보낸 것이라 따옴표 안에 줄바꿈·쉼표가 들어 있고,
// 표 위쪽에 제목 행이 몇 줄 붙어 있다. 그래서 직접 파싱하고 헤더 행을 찾아 쓴다.

/** 따옴표·줄바꿈을 처리해 2차원 배열로 만든다 */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let inQuotes = false;

  // 엑셀이 붙이는 BOM 제거
  const src = text.replace(/^﻿/, '');

  for (let i = 0; i < src.length; i++) {
    const c = src[i];
    if (inQuotes) {
      if (c === '"') {
        if (src[i + 1] === '"') { field += '"'; i++; }
        else inQuotes = false;
      } else field += c;
      continue;
    }
    if (c === '"') { inQuotes = true; continue; }
    if (c === ',') { row.push(field); field = ''; continue; }
    if (c === '\r') continue;
    if (c === '\n') { row.push(field); rows.push(row); row = []; field = ''; continue; }
    field += c;
  }
  if (field.length > 0 || row.length > 0) { row.push(field); rows.push(row); }
  return rows;
}

const norm = (s: string) => (s ?? '').replace(/\s+/g, '').trim();

/**
 * 표 위에 붙은 제목 행들을 건너뛰고 실제 헤더 행을 찾는다.
 * 첫 칸이 기대한 문구로 시작하면서, 칸이 2개 이상 채워진 행을 헤더로 본다.
 * (제목 행은 "목표별 학년 로드맵" 처럼 첫 칸만 차 있어 이 조건에서 걸러진다)
 */
export function findHeaderRow(rows: string[][], firstColumn: string): number {
  const target = norm(firstColumn);
  return rows.findIndex(r => {
    if (!norm(r[0] ?? '').startsWith(target)) return false;
    return r.filter(c => (c ?? '').trim()).length >= 2;
  });
}

/** 헤더 행 기준으로 { 컬럼명: 값 } 객체 배열을 만든다. 빈 행은 버린다. */
export function toRecords(rows: string[][], headerIndex: number): Record<string, string>[] {
  if (headerIndex < 0 || headerIndex >= rows.length) return [];
  const header = rows[headerIndex].map(h => norm(h));
  const out: Record<string, string>[] = [];
  for (let i = headerIndex + 1; i < rows.length; i++) {
    const r = rows[i];
    if (!r || r.every(c => !(c ?? '').trim())) continue;
    const rec: Record<string, string> = {};
    header.forEach((h, j) => { if (h) rec[h] = (r[j] ?? '').trim(); });
    out.push(rec);
  }
  return out;
}

/** '-' 나 빈 문자열은 값 없음으로 본다 */
export function cell(v: string | undefined): string | null {
  const t = (v ?? '').trim();
  if (!t || t === '-' || t === '—' || t === '없음') return null;
  return t;
}

export function num(v: string | undefined): number | null {
  const t = cell(v);
  if (t === null) return null;
  const n = parseFloat(t.replace(/[^\d.-]/g, ''));
  return Number.isFinite(n) ? n : null;
}

export function int(v: string | undefined): number | null {
  const n = num(v);
  return n === null ? null : Math.round(n);
}
