import fs from 'node:fs';
import path from 'node:path';
import { PDFDocument, PDFFont, PDFPage, rgb, RGB } from 'pdf-lib';
import fontkit from '@pdf-lib/fontkit';
import type { SubjectDef } from '@/lib/subjects';

// pdf-lib 의 subset:true 는 CJK 글리프를 깨뜨리므로 폰트를 통째로 임베드한다.
// 대신 Bold 는 싣지 않고 같은 글자를 미세하게 겹쳐 찍어 굵기를 낸다(용량 절반).
const FONT_PATH = path.join(process.cwd(), 'src/server/fonts/NotoSansKR-Regular.ttf');
let fontCache: Buffer | null = null;
function loadFont(): Buffer {
  if (!fontCache) fontCache = fs.readFileSync(FONT_PATH);
  return fontCache;
}

const A4: [number, number] = [595.28, 841.89];
const M = 48; // 여백
const CONTENT_W = A4[0] - M * 2;

const INK = rgb(0.06, 0.09, 0.16);
const MUTED = rgb(0.42, 0.45, 0.5);
const LINE = rgb(0.85, 0.84, 0.82);
const BAND = rgb(0.97, 0.96, 0.95);
const ACCENT = rgb(0.85, 0.53, 0.06);
const GOOD = rgb(0.02, 0.47, 0.34);
const WARN = rgb(0.72, 0.25, 0.05);
const RISK = rgb(0.75, 0.11, 0.11);

export interface ReportSubject {
  name: string;
  current: number | null;
  target: number | null;
  status: 'good' | 'close' | 'lacking' | 'risk' | null;
  note: string;
}
export interface ReportExam {
  name: string;
  date: string;
  korean: number | null;
  english: number | null;
  math: number | null;
  social: number | null;
  science: number | null;
  avg: number | null;
  percentile: string | null;
}
export interface ReportAction {
  name: string;
  owner: string;
  deadline: string;
  status: string;
}
export interface ReportInput {
  studentName: string;
  grade: string;
  school: string;
  branchName: string;
  instructorName: string;
  enrolledMonths: number;
  period: string;
  generatedAt: Date;
  goal: { school: string; detail: string; track: string; daysUntilCSAT: number | null };
  stats: Array<{ label: string; value: string; delta: string }>;
  subjects: ReportSubject[];
  /** 학년에 따라 달라지는 표시 과목 (초·중 5과목 / 고 4과목) */
  subjectDefs: SubjectDef[];
  exams: ReportExam[];
  actions: ReportAction[];
  message: string;
  includeGrades: boolean;
}

const STATUS_LABEL: Record<string, string> = {
  good: '목표 충족', close: '근접', lacking: '보강 필요', risk: '집중 보강',
};
const STATUS_COLOR: Record<string, RGB> = { good: GOOD, close: ACCENT, lacking: WARN, risk: RISK };

class Doc {
  page: PDFPage;
  y: number;
  constructor(private pdf: PDFDocument, private font: PDFFont) {
    this.page = pdf.addPage(A4);
    this.y = A4[1] - M;
  }
  // 푸터(M-8 선 + M-20 글자) 위로 넘어가지 않도록 남은 높이를 확인하고 필요하면 개행
  ensure(h: number) {
    if (this.y - h < M + 16) {
      this.page = this.pdf.addPage(A4);
      this.y = A4[1] - M;
      return true;
    }
    return false;
  }
  text(t: string, opts: { size?: number; color?: RGB; bold?: boolean; x?: number; dy?: number } = {}) {
    const size = opts.size ?? 10;
    this.ensure(size + 6);
    const x = opts.x ?? M;
    const y = this.y - size;
    this.draw(t, x, y, size, opts.color ?? INK, opts.bold);
    this.y = y - (opts.dy ?? 4);
  }
  draw(t: string, x: number, y: number, size: number, color: RGB, bold = false) {
    const safe = this.sanitize(t);
    const passes = bold ? [0, 0.3, 0.6] : [0];
    for (const dx of passes) this.page.drawText(safe, { x: x + dx, y, size, font: this.font, color });
  }
  // 폰트에 없는 글자(이모지 등)는 pdf-lib 에서 예외를 던지므로 미리 걸러낸다
  sanitize(t: string): string {
    let out = '';
    for (const ch of t) {
      if (ch === '\n' || ch === '\t') { out += ' '; continue; }
      try { this.font.widthOfTextAtSize(ch, 10); out += ch; } catch { out += '?'; }
    }
    return out;
  }
  width(t: string, size: number) {
    return this.font.widthOfTextAtSize(this.sanitize(t), size);
  }
  gap(h: number) { this.y -= h; }
  rule(color: RGB = LINE) {
    this.ensure(8);
    this.page.drawLine({ start: { x: M, y: this.y }, end: { x: M + CONTENT_W, y: this.y }, thickness: 0.7, color });
    this.y -= 10;
  }
  band(h: number, color: RGB = BAND) {
    this.ensure(h);
    this.page.drawRectangle({ x: M, y: this.y - h, width: CONTENT_W, height: h, color });
  }
  sectionTitle(t: string) {
    this.gap(10);
    this.ensure(26);
    this.page.drawRectangle({ x: M, y: this.y - 15, width: 3, height: 13, color: ACCENT });
    this.draw(t, M + 9, this.y - 13, 11.5, INK, true);
    this.y -= 24;
  }
  // 긴 문장을 폭에 맞춰 줄바꿈
  paragraph(t: string, size = 9.5, color: RGB = MUTED, x = M, maxW = CONTENT_W) {
    for (const rawLine of t.split('\n')) {
      if (!rawLine.trim()) { this.gap(size * 0.6); continue; }
      let line = '';
      for (const word of rawLine.split(' ')) {
        const next = line ? `${line} ${word}` : word;
        if (this.width(next, size) > maxW && line) {
          this.text(line, { size, color, x, dy: 3 });
          line = word;
        } else line = next;
      }
      if (line) this.text(line, { size, color, x, dy: 3 });
    }
  }
}

export async function buildReportPdf(data: ReportInput): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  pdf.registerFontkit(fontkit);
  const font = await pdf.embedFont(loadFont(), { subset: false });
  const d = new Doc(pdf, font);

  pdf.setTitle(`${data.studentName} 학습 리포트 ${data.period}`.trim());
  pdf.setAuthor(data.branchName || 'JM-CARE');
  pdf.setCreator('JM-CARE');
  // 공개 범위를 문서 속성에 남겨 둔다 (파일 속성에서 확인 가능)
  pdf.setSubject(data.includeGrades ? '학습 리포트 · 백분위 포함' : '학습 리포트 · 백분위 비공개');

  // ── 표지 헤더 ──────────────────────────────────────────────
  d.text('JM-CARE', { size: 9, color: ACCENT, bold: true, dy: 2 });
  d.text(`${data.period ? data.period + ' ' : ''}학습 리포트`, { size: 22, bold: true, dy: 6 });
  const meta = [data.studentName, data.grade, data.school].filter(Boolean).join(' · ');
  d.text(meta, { size: 11, color: INK, bold: true, dy: 3 });
  const sub = [
    data.branchName && `${data.branchName}`,
    data.instructorName && `담임 ${data.instructorName}`,
    data.enrolledMonths ? `재원 ${data.enrolledMonths}개월` : '',
  ].filter(Boolean).join('  ·  ');
  d.text(sub, { size: 9, color: MUTED, dy: 8 });
  d.rule();

  // ── 목표 ───────────────────────────────────────────────────
  d.sectionTitle('목표');
  const goalLines = [
    ['최종 목표', data.goal.school || '미설정'],
    ['세부', data.goal.detail || '미설정'],
    ['트랙', data.goal.track || '미설정'],
    ['수능까지', data.goal.daysUntilCSAT !== null ? `D-${data.goal.daysUntilCSAT}` : '미설정'],
  ];
  for (const [k, v] of goalLines) {
    const y = d.y - 10;
    d.draw(k, M, y, 9, MUTED);
    d.draw(v, M + 80, y, 10, INK, true);
    d.y = y - 5;
  }

  // ── 성장 요약 ──────────────────────────────────────────────
  d.sectionTitle('성장 요약');
  const colW = CONTENT_W / 3;
  d.band(46);
  const top = d.y;
  data.stats.forEach((s, i) => {
    const x = M + colW * i + 12;
    d.draw(s.label, x, top - 15, 8, MUTED);
    d.draw(s.value, x, top - 30, 12, INK, true);
    if (s.delta) d.draw(s.delta, x, top - 41, 7.5, MUTED);
  });
  d.y = top - 46 - 6;

  // ── 과목별 현황 ────────────────────────────────────────────
  d.sectionTitle('과목별 목표 대비 현황');
  const cols = data.includeGrades
    ? [{ t: '과목', x: 0 }, { t: '현재', x: 70 }, { t: '목표', x: 125 }, { t: '격차', x: 180 }, { t: '상태', x: 240 }, { t: '코멘트', x: 320 }]
    : [{ t: '과목', x: 0 }, { t: '상태', x: 70 }, { t: '코멘트', x: 160 }];
  const headY = d.y - 10;
  cols.forEach(c => d.draw(c.t, M + c.x, headY, 8, MUTED, true));
  d.y = headY - 6;
  d.rule();
  for (const s of data.subjects) {
    d.ensure(20);
    const y = d.y - 11;
    const statusText = s.status ? STATUS_LABEL[s.status] : '데이터 없음';
    const statusColor = s.status ? STATUS_COLOR[s.status] : MUTED;
    if (data.includeGrades) {
      d.draw(s.name, M, y, 10, INK, true);
      d.draw(s.current !== null ? String(s.current) : '-', M + 70, y, 10, INK);
      d.draw(s.target !== null ? String(s.target) : '-', M + 125, y, 10, MUTED);
      const gap = s.current !== null && s.target !== null ? +(s.current - s.target).toFixed(1) : null;
      d.draw(gap === null ? '-' : `${gap >= 0 ? '+' : ''}${gap}`, M + 180, y, 10, gap === null ? MUTED : gap >= 0 ? GOOD : WARN);
      d.draw(statusText, M + 240, y, 9, statusColor, true);
      d.draw(s.note, M + 320, y, 8, MUTED);
    } else {
      d.draw(s.name, M, y, 10, INK, true);
      d.draw(statusText, M + 70, y, 9, statusColor, true);
      d.draw(s.note, M + 160, y, 8, MUTED);
    }
    d.y = y - 7;
    d.rule(rgb(0.93, 0.92, 0.91));
  }

  // ── 모의고사 추이 ──────────────────────────────────────────
  if (data.includeGrades && data.exams.length > 0) {
    d.sectionTitle('모의고사 추이');
    // 과목 수(4~5개)에 따라 열 간격을 나눠 잡는다
    const firstCol = 140;
    const colGap = (CONTENT_W - firstCol - 60) / (data.subjectDefs.length + 1);
    const subjectX = data.subjectDefs.map((_, i) => firstCol + colGap * i);
    const avgX = firstCol + colGap * data.subjectDefs.length;
    const pctX = avgX + colGap;

    const ehY = d.y - 10;
    d.draw('회차', M, ehY, 8, MUTED, true);
    data.subjectDefs.forEach((sd, i) => d.draw(sd.label, M + subjectX[i], ehY, 8, MUTED, true));
    d.draw('평균', M + avgX, ehY, 8, MUTED, true);
    d.draw('전국', M + pctX, ehY, 8, MUTED, true);
    d.y = ehY - 6;
    d.rule();
    for (const e of data.exams) {
      d.ensure(20);
      const y = d.y - 11;
      d.draw(e.name || e.date, M, y, 9, INK);
      data.subjectDefs.forEach((sd, i) => {
        const v = e[sd.field];
        d.draw(v === null || v === undefined ? '-' : String(v), M + subjectX[i], y, 9, MUTED);
      });
      d.draw(e.avg === null ? '-' : String(e.avg), M + avgX, y, 9, INK, true);
      d.draw(e.percentile ?? '-', M + pctX, y, 8.5, MUTED);
      d.y = y - 7;
      d.rule(rgb(0.93, 0.92, 0.91));
    }
  }

  // ── 액션 플랜 ──────────────────────────────────────────────
  if (data.actions.length > 0) {
    d.sectionTitle('진행 중 액션 플랜');
    for (const a of data.actions) {
      d.ensure(28);
      const y = d.y - 11;
      d.page.drawCircle({ x: M + 3, y: y + 3, size: 2, color: ACCENT });
      d.draw(a.name, M + 12, y, 9.5, INK, true);
      const tail = [a.owner && `담당 ${a.owner}`, a.deadline && `기한 ${a.deadline}`, a.status].filter(Boolean).join('  ·  ');
      if (tail) d.draw(tail, M + 12, y - 11, 8, MUTED);
      d.y = y - 24;
    }
  }

  // ── 강사 메시지 ────────────────────────────────────────────
  if (data.message.trim()) {
    d.sectionTitle('담임 강사 메시지');
    d.paragraph(data.message, 9.5, INK, M, CONTENT_W);
  }

  // ── 푸터 ───────────────────────────────────────────────────
  const pages = pdf.getPages();
  const stamp = formatStamp(data.generatedAt);
  pages.forEach((p, i) => {
    p.drawLine({ start: { x: M, y: M - 8 }, end: { x: M + CONTENT_W, y: M - 8 }, thickness: 0.7, color: LINE });
    const foot = `JM-CARE · ${data.branchName || ''} · 생성 ${stamp} · 내부 운영 메모는 포함되지 않습니다`;
    p.drawText(d.sanitize(foot), { x: M, y: M - 20, size: 7.5, font, color: MUTED });
    const num = `${i + 1} / ${pages.length}`;
    p.drawText(num, { x: M + CONTENT_W - font.widthOfTextAtSize(num, 7.5), y: M - 20, size: 7.5, font, color: MUTED });
  });

  return pdf.save();
}

function formatStamp(dt: Date): string {
  const kst = new Date(dt.getTime() + 9 * 60 * 60 * 1000);
  const p = (n: number) => String(n).padStart(2, '0');
  return `${kst.getUTCFullYear()}.${p(kst.getUTCMonth() + 1)}.${p(kst.getUTCDate())} ${p(kst.getUTCHours())}:${p(kst.getUTCMinutes())}`;
}
