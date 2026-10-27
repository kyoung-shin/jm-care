/**
 * 수정 요청서 ver.3 (jm_req_ver.3.pdf) E2E — 요청 항목마다 실제 Chrome 으로 화면을 눌러 확인한다.
 *
 *   npm run e2e:v3                                   배포본(기본) 대상
 *   E2E_BASE_URL=http://localhost:3000 npm run e2e:v3
 *
 * report-pdf.ts 와 같은 방식으로 'ZZ_자동검증_' 지점과 계정·학생을 만들고 끝나면 지운다.
 * 입시 DB 검사용 학교는 이름이 'E2E' 로 시작하는 것만 만들고 지운다.
 */
import { chromium, type Browser, type Page } from 'playwright';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { prisma } from '../src/lib/db';
import { matchRoadmapGoal, resolveReportRoadmap } from '../src/lib/report-data';
import { formatSlot, parseSlot } from '../src/lib/slot';

const BASE = process.env.E2E_BASE_URL ?? 'https://jm-care.vercel.app';
const HEADED = process.env.E2E_HEADED === '1';
const TAG = 'v3' + Date.now().toString().slice(-6);
const PW = 'E2e!' + Math.random().toString(36).slice(2, 10);
const BRANCH_NAME = `ZZ_자동검증_${TAG}`;
const SCHOOL = `E2E연세대학교${TAG}`;
const SCHOOL_DUP = `${SCHOOL} (서울)`;
const ARTIFACTS = fs.mkdtempSync(path.join(os.tmpdir(), 'jmcare-v3-'));

let pass = 0;
let fail = 0;
let lastPage: Page | null = null;
const ok = (name: string, cond: boolean, detail = '') => {
  if (cond) { pass++; console.log(`  PASS  ${name}`); }
  else { fail++; console.log(`  FAIL  ${name}${detail ? ` — ${detail}` : ''}`); }
};

type Jar = { cookie: string };
const jar = (): Jar => ({ cookie: '' });
async function api(j: Jar, p: string, init: RequestInit = {}) {
  const res = await fetch(BASE + p, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...(j.cookie ? { Cookie: j.cookie } : {}), ...(init.headers ?? {}) },
    redirect: 'manual',
  });
  for (const c of res.headers.getSetCookie?.() ?? []) {
    const kv = c.split(';')[0];
    if (kv.split('=')[1]) j.cookie = kv;
  }
  let data: unknown = null;
  try { data = await res.json(); } catch { /* 비 JSON */ }
  return { status: res.status, data: data as any }; // eslint-disable-line @typescript-eslint/no-explicit-any
}
const post = (j: Jar, p: string, body: unknown) => api(j, p, { method: 'POST', body: JSON.stringify(body) });
const signup = (username: string, name: string, role: string, branchId: string) =>
  post(jar(), '/api/auth/signup', { username, password: PW, name, phone: '01012345678', requestedRole: role, branchId, reason: 'E2E' });
const login = (j: Jar, username: string, password = PW) => post(j, '/api/auth/login', { username, password });

async function shot(page: Page, name: string) {
  lastPage = page;
  const file = path.join(ARTIFACTS, `${name}.png`);
  await page.screenshot({ path: file, fullPage: false });
  return file;
}

async function signIn(browser: Browser, username: string, password = PW): Promise<Page> {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 950 }, acceptDownloads: true });
  const page = await ctx.newPage();
  lastPage = page;
  await page.goto(`${BASE}/sign-in`, { waitUntil: 'networkidle' });
  await page.locator('input').first().fill(username);
  await page.locator('input[type="password"]').first().fill(password);
  await page.locator('button[type="submit"], button:has-text("로그인")').first().click();
  await page.waitForURL(u => !u.pathname.includes('sign-in'), { timeout: 30_000 });
  return page;
}

interface Fx {
  admin: Jar; dir: Jar; ins: Jar; par: Jar;
  branchId: string; dirU: string; insU: string; parU: string;
  instructorId: string; parentId: string;
  studentA: string; studentB: string;
  otherParentId: string | null;
}

async function fixture(): Promise<Fx> {
  const admin = jar();
  if ((await login(admin, process.env.ADMIN_USERNAME!, process.env.ADMIN_PASSWORD!)).status !== 200) throw new Error('관리자 로그인 실패');
  const branchId = (await post(admin, '/api/admin/branches', { name: BRANCH_NAME, region: 'QA', status: 'PREPARING' })).data.id;

  const dirU = `${TAG}_dir`;
  await signup(dirU, 'V3원장', 'DIRECTOR', branchId);
  const dp = (await api(admin, '/api/admin/pending-users')).data.find((p: { name: string }) => p.name === 'V3원장');
  await post(admin, `/api/admin/users/${dp.userId}/approve`, {});
  const dir = jar(); await login(dir, dirU);

  const insU = `${TAG}_ins`;
  await signup(insU, 'V3강사', 'INSTRUCTOR', branchId);
  let q = (await api(dir, '/api/director/pending-users')).data;
  await post(dir, `/api/director/users/${q.find((p: { name: string }) => p.name === 'V3강사').userId}/approve`, { studentIds: [] });
  const ins = jar(); await login(ins, insU);
  const instructorId = (await api(ins, '/api/auth/me')).data.id;

  const mk = async (name: string, grade: string, extra: Record<string, unknown> = {}) =>
    (await post(dir, '/api/students', { name, grade, school: 'V3중', instructorId, ...extra })).data.id as string;
  // A: 서울대 목표(로드맵 표에 학교명이 없음) — 담임 로드맵이 리포트에 나와야 한다
  const studentA = await mk('V3가람', '중3', { finalGoalSchool: '서울대학교', finalGoalDetail: '경영학과' });
  const studentB = await mk('V3나래', '중1', { finalGoalSchool: '고려대학교', finalGoalDetail: '인문' });

  for (const [i, e] of [
    { name: '3월 모의고사', date: '2026.03.24', korean: 97, english: 95, math: 90, social: 90, science: 90 },
    { name: '5월 모의고사', date: '2026.05.07', korean: 94, english: 92, math: 95, social: 95, science: 95 },
  ].entries()) {
    const vals = [e.korean, e.english, e.math, e.social, e.science];
    await post(dir, `/api/students/${studentA}/mock-exams`, { ...e, avg: +(vals.reduce((a, b) => a + b, 0) / 5).toFixed(1), percentile: i === 0 ? null : '상위 5%' });
  }

  const parU = `${TAG}_par`;
  await signup(parU, 'V3학부모', 'PARENT', branchId);
  q = (await api(dir, '/api/director/pending-users')).data;
  const pp = q.find((p: { name: string }) => p.name === 'V3학부모');
  await post(dir, `/api/director/users/${pp.userId}/approve`, { studentIds: [studentA] });
  const par = jar(); await login(par, parU);

  await post(dir, `/api/students/${studentA}/reports`, { period: '2026년 5월', message: 'V3 리포트', includeGrades: true, sentAt: new Date().toISOString() });

  // 다른 지점 학부모 — 등록 시 연결 차단 확인용
  const others = await prisma.user.findFirst({ where: { role: 'PARENT', branchId: { not: branchId } }, select: { id: true } });

  return { admin, dir, ins, par, branchId, dirU, insU, parU, instructorId, parentId: pp.userId, studentA, studentB, otherParentId: others?.id ?? null };
}

async function cleanup() {
  const branches = await prisma.branch.findMany({ where: { name: { startsWith: 'ZZ_자동검증_' } }, select: { id: true } });
  const ids = branches.map(b => b.id);
  if (ids.length > 0) {
    const users = await prisma.user.findMany({ where: { branchId: { in: ids } }, select: { id: true } });
    const students = await prisma.student.findMany({ where: { branchId: { in: ids } }, select: { id: true } });
    for (const u of users) await prisma.user.update({ where: { id: u.id }, data: { studentProfileId: null, children: { set: [] } } });
    await prisma.scheduleEvent.deleteMany({ where: { instructorId: { in: users.map(u => u.id) } } });
    await prisma.student.deleteMany({ where: { id: { in: students.map(s => s.id) } } });
    await prisma.pendingUser.deleteMany({ where: { branchId: { in: ids } } });
    await prisma.user.deleteMany({ where: { id: { in: users.map(u => u.id) } } });
    await prisma.branch.deleteMany({ where: { id: { in: ids } } });
    console.log(`  정리 완료 — 지점 ${ids.length}, 계정 ${users.length}, 학생 ${students.length}`);
  }
  const schools = await prisma.admissionSchool.deleteMany({ where: { name: { startsWith: `E2E연세대학교${TAG}` } } });
  if (schools.count) console.log(`  입시 DB 검사 학교 ${schools.count}개 삭제`);
}

// ── 0. 순수 로직 ────────────────────────────────────────────
function unitChecks() {
  console.log('\n[로직] 로드맵 매칭 · 일시 형식');
  const rows = ['고려대 등 상위권 대학', '의약계열', 'KAIST 등 과기원', '일반고 상위권 트랙(중간목표)'].flatMap((goal, gi) =>
    ['초등 고학년', '중1', '중2', '중3'].map((stage, si) => ({ goal, stage, content: `${goal}-${stage}`, sortOrder: gi * 10 + si })));
  ok('고려대학교 → 상위권 대학 로드맵', matchRoadmapGoal('고려대학교', rows) === '고려대 등 상위권 대학');
  ok('서울대학교 → 상위권 대학 로드맵 (표에 학교명이 없어도)', matchRoadmapGoal('서울대학교', rows) === '고려대 등 상위권 대학', String(matchRoadmapGoal('서울대학교', rows)));
  ok('경희대학교 + 한의예 → 의약계열 로드맵', matchRoadmapGoal('경희대학교', rows, '한의예과') === '의약계열', String(matchRoadmapGoal('경희대학교', rows, '한의예과')));
  ok('KAIST → 과기원 로드맵', matchRoadmapGoal('KAIST', rows) === 'KAIST 등 과기원');
  ok('목표 없음 → 매칭 없음', matchRoadmapGoal('', rows) === null);

  const own = resolveReportRoadmap({
    finalGoalSchool: '서울대학교', grade: '중3',
    roadmap: [
      { stage: '중3', label: '고입 선행', desc: '고입 선행 학습', status: 'current' },
      { stage: '고1', label: '내신 대비', desc: '', status: 'upcoming' },
      { stage: '고2', label: '', desc: '', status: 'upcoming' },
    ],
  }, rows);
  ok('담임이 입력한 로드맵이 있으면 그것을 리포트에 사용', own?.source === 'student' && own.steps.length === 2, JSON.stringify(own));
  ok('담임 로드맵의 현재 단계 표시', own?.currentIdx === 0 && own.steps[0].content === '고입 선행 — 고입 선행 학습');
  const tpl = resolveReportRoadmap({ finalGoalSchool: '고려대학교', grade: '중1', roadmap: [{ stage: '중1', label: '', desc: '' }] }, rows);
  ok('담임 로드맵이 비어 있으면 본사 표로 대체', tpl?.source === 'template' && tpl.currentIdx === 1, JSON.stringify(tpl?.source));

  ok('일시 조립 (달력 값 → 서버 형식)', formatSlot('2026-10-07', '19:30') === '2026.10.07(수) 19:30', formatSlot('2026-10-07', '19:30'));
  ok('일시 분해 (서버 형식 → 달력 값)', parseSlot('2026.10.07(수) 19:30').date === '2026-10-07');
}

// ── 1. 명칭 수정 (학부모) ───────────────────────────────────
async function parentNames(fx: Fx, browser: Browser) {
  console.log('\n[1] 학부모 화면 명칭');
  const p = await signIn(browser, fx.parU);
  await p.goto(`${BASE}/parent`, { waitUntil: 'networkidle' });
  await p.waitForSelector('text=안녕하세요', { timeout: 60_000 });
  await shot(p, '1-parent-header');
  ok('JONGNO → JONGRO (학부모 화면)', await p.locator('text=/JONGRO M-SCHOOL/i').count() > 0 && await p.locator('text=/JONGNO/i').count() === 0);
  ok('"V3학부모님, 안녕하세요." 로 표시', await p.locator('text=V3학부모님, 안녕하세요.').count() > 0);

  // 4. 리포트 안 명칭
  await p.locator('text=2026년 5월 학습 리포트').click();
  await p.waitForSelector('text=월간 학습 리포트', { timeout: 30_000 });
  await p.waitForTimeout(1500);
  await shot(p, '4-parent-report');
  ok('JONGNO → JONGRO (학부모 리포트)', await p.locator('text=/JONGRO M-SCHOOL · Monthly Report/i').count() > 0 && await p.locator('text=/JONGNO/i').count() === 0);
  await p.context().close();
}

// ── 2. 학생 추가 시 학부모 연결 + 추가문의 2. 목표 선택 ─────
async function registerWithParent(fx: Fx, browser: Browser) {
  console.log('\n[2] 학생 등록 시 학부모 연결 · 목표 DB 선택');
  const p = await signIn(browser, fx.insU);
  await p.goto(`${BASE}/students/new`, { waitUntil: 'networkidle' });
  await p.waitForSelector('text=학부모 연결', { timeout: 30_000 });
  await p.waitForSelector(`[data-parent-id="${fx.parentId}"]`, { timeout: 30_000 });
  ok('학생 등록 화면에 "학부모 연결" 목록 노출', true);
  ok('학부모 행에 기존 자녀 표시', await p.locator(`[data-parent-id="${fx.parentId}"]`).locator('text=V3가람').count() > 0);

  await p.locator('input[placeholder="김민준"]').fill('V3다온');
  await p.locator('select').filter({ hasText: '강사 선택' }).selectOption(fx.instructorId);
  // 목표 학교를 입시 전형 DB 에서 고른다
  const schoolSel = p.getByLabel('최종 목표 학교');
  ok('최종 목표 학교가 선택 목록으로 노출', (await schoolSel.evaluate(el => el.tagName)) === 'SELECT');
  await schoolSel.selectOption(SCHOOL);
  await p.getByLabel('최종 목표 계열/학과').selectOption('공학계열');
  await p.getByLabel('최종 목표 모집시기').selectOption('수시');
  await p.locator(`[data-parent-id="${fx.parentId}"] input[type="checkbox"]`).check();
  await shot(p, '2-register-form');
  await p.getByRole('button', { name: /학생 등록/ }).last().click();
  await p.waitForURL(u => u.pathname === '/instructor', { timeout: 30_000 });
  ok('강사가 등록하면 강사 화면으로 돌아감', p.url().endsWith('/instructor'));

  const created = await prisma.student.findFirst({ where: { name: 'V3다온', branchId: fx.branchId }, include: { parents: { select: { id: true } } } });
  ok('등록한 학생에 학부모가 연결됨', !!created && created.parents.some(x => x.id === fx.parentId), JSON.stringify(created?.parents));
  ok('목표가 DB 선택값으로 저장됨', created?.finalGoalSchool === SCHOOL && created?.finalGoalDetail === '공학계열' && created?.finalGoalTrack === '수시',
    `${created?.finalGoalSchool}/${created?.finalGoalDetail}/${created?.finalGoalTrack}`);
  const kids = (await api(fx.par, `/api/students?parentId=${fx.parentId}`)).data;
  ok('학부모 계정에서 새 자녀가 보임 (2명)', Array.isArray(kids) && kids.length === 2, `${kids?.length}명`);

  // 다른 지점 학부모 / 학부모가 아닌 계정은 연결 불가
  if (fx.otherParentId) {
    const r = await post(fx.ins, '/api/students', { name: 'V3차단', grade: '중1', school: 'X', instructorId: fx.instructorId, parentIds: [fx.otherParentId] });
    ok('다른 지점 학부모 연결 시도 → 400', r.status === 400, `status=${r.status}`);
  }
  const r2 = await post(fx.ins, '/api/students', { name: 'V3차단2', grade: '중1', school: 'X', instructorId: fx.instructorId, parentIds: [fx.instructorId] });
  ok('학부모가 아닌 계정 연결 시도 → 400', r2.status === 400, `status=${r2.status}`);
  const parList = await api(fx.par, '/api/parents');
  ok('학부모가 학부모 목록 API 호출 → 403', parList.status === 403, `status=${parList.status}`);
  await p.context().close();
}

// ── 3·5. 상담 일시 달력 선택 · "예약 취소" ──────────────────
async function appointmentCalendar(fx: Fx, browser: Browser) {
  console.log('\n[3·5] 상담 일시 달력 선택 · 예약 취소 명칭');
  const today = new Date();
  const d = (n: number) => { const x = new Date(today); x.setDate(today.getDate() + n); return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}-${String(x.getDate()).padStart(2, '0')}`; };
  const slots = [formatSlot(d(2), '15:00'), formatSlot(d(3), '16:00'), formatSlot(d(4), '17:00')];
  const book = await post(fx.par, `/api/students/${fx.studentA}/appointments`, { type: 'phone', slot1: slots[0], slot2: slots[1], slot3: slots[2], requestedBy: 'V3학부모' });
  ok('학부모 상담 예약 요청', book.status === 201, `status=${book.status}`);

  const p = await signIn(browser, fx.insU);
  await p.goto(`${BASE}/instructor`, { waitUntil: 'networkidle' });
  await p.waitForSelector('text=상담 예약 요청', { timeout: 60_000 });
  await p.locator('text=상담 예약 요청').scrollIntoViewIfNeeded();
  await p.waitForTimeout(1000);
  ok('직접 입력칸이 달력(date)·시간(time) 선택으로 바뀜',
    await p.getByLabel('직접 선택 날짜').first().getAttribute('type') === 'date' && await p.getByLabel('직접 선택 시간').first().getAttribute('type') === 'time');
  await p.getByRole('button', { name: new RegExp(slots[0].replace(/[.()]/g, '\\$&') + '\\s*확정') }).first().click();
  await p.waitForTimeout(3000);

  await p.getByRole('button', { name: /일시 변경/ }).first().click();
  await p.waitForTimeout(800);
  const dateIn = p.getByLabel('직접 선택 날짜').first();
  ok('일시 변경 시 확정된 날짜가 달력에 미리 채워짐', (await dateIn.inputValue()) === d(2), await dateIn.inputValue());
  await dateIn.fill(d(5));
  await p.getByLabel('직접 선택 시간').first().fill('19:30');
  await shot(p, '3-calendar-picker');
  ok('"거절로 변경" 대신 "예약 취소" 버튼', await p.getByRole('button', { name: /예약 취소/ }).count() > 0 && await p.getByRole('button', { name: /거절로 변경/ }).count() === 0);
  await p.getByRole('button', { name: /이 일시로 확정/ }).first().click();
  await p.waitForTimeout(3000);
  const appts = (await api(fx.ins, `/api/instructors/${fx.instructorId}/appointments`)).data;
  const mine = appts.find((a: { student: { id: string } }) => a.student.id === fx.studentA);
  ok('달력에서 고른 일시로 확정 (서버 형식)', mine?.confirmedSlot === formatSlot(d(5), '19:30'), mine?.confirmedSlot);

  await p.getByRole('button', { name: /일시 변경/ }).first().click();
  await p.waitForTimeout(800);
  await p.getByRole('button', { name: /예약 취소/ }).first().click();
  await p.waitForTimeout(3000);
  const after = (await api(fx.ins, `/api/instructors/${fx.instructorId}/appointments`)).data.find((a: { student: { id: string } }) => a.student.id === fx.studentA);
  ok('"예약 취소" 누르면 예약이 취소(거절) 상태로', after?.status === 'declined', after?.status);
  await p.context().close();
}

// ── 4. 리포트: 학생 선택 · 미리보기 삭제 / 상담 학생 선택 ───
async function reportAndCounseling(fx: Fx, browser: Browser) {
  console.log('\n[4] 리포트 학생 선택 · 미리보기 삭제 · 상담 학생 선택');
  const p = await signIn(browser, fx.insU);
  await p.goto(`${BASE}/instructor`, { waitUntil: 'networkidle' });
  await p.waitForSelector('text=담당 학생', { timeout: 60_000 });
  await p.waitForTimeout(1500);
  await p.getByRole('button', { name: /학부모 리포트 생성/ }).click();
  await p.waitForTimeout(800);
  await p.locator('div.fixed.inset-0').getByRole('button', { name: /V3가람/ }).first().click();
  await p.waitForSelector('text=월간 학습 리포트', { timeout: 30_000 });
  await p.waitForTimeout(2500);
  const sel = p.getByLabel('리포트 대상 학생');
  ok('리포트 모달 헤더에 "학생 선택" 노출', await sel.count() > 0);
  ok('"학부모 화면 미리보기" 버튼 삭제', await p.getByRole('button', { name: /학부모 화면 미리보기/ }).count() === 0);
  ok('리포트 안 JONGRO 표기', await p.locator('text=/JONGRO M-SCHOOL · Monthly Report/i').count() > 0);
  // 학생 A 는 담임 로드맵이 아직 없으므로 서울대 → 상위권 대학 표가 나와야 한다 (표가 있을 때)
  await shot(p, '4-report-student-a');
  await sel.selectOption(fx.studentB);
  await p.waitForTimeout(2500);
  ok('학생을 바꾸면 리포트 본문도 그 학생으로', await p.locator('text=V3나래 학생').count() > 0);
  await shot(p, '4-report-student-b');
  await p.getByRole('button', { name: /^취소$/ }).last().click();
  await p.waitForTimeout(800);

  // 상담 기록 — 학생 선택
  await p.getByRole('button', { name: /상담 기록 \+/ }).click();
  await p.waitForTimeout(800);
  const cs = p.getByLabel('상담 학생');
  ok('상담 기록 모달에 학생 선택 노출', await cs.count() > 0);
  await cs.selectOption(fx.studentB);
  await p.locator('textarea[placeholder^="상담에서 논의된"]').fill('V3 상담 — 학생 선택 확인');
  await shot(p, '4-counseling-student');
  await p.getByRole('button', { name: /상담 기록 저장/ }).click();
  await p.waitForTimeout(3000);
  const cB = (await api(fx.ins, `/api/students/${fx.studentB}/counselings`)).data;
  const cA = (await api(fx.ins, `/api/students/${fx.studentA}/counselings`)).data;
  ok('상담이 고른 학생(B)에게 저장됨', Array.isArray(cB) && cB.some((c: { summary: string }) => c.summary.includes('학생 선택 확인')));
  ok('목록 첫 학생(A)에게는 저장되지 않음', Array.isArray(cA) && !cA.some((c: { summary: string }) => c.summary.includes('학생 선택 확인')));
  await p.context().close();
}

// ── 6. 모의고사 점수 수정 버튼 ──────────────────────────────
async function examEdit(fx: Fx, browser: Browser) {
  console.log('\n[6] 모의고사 점수 수정');
  const p = await signIn(browser, fx.dirU);
  await p.goto(`${BASE}/director`, { waitUntil: 'networkidle' });
  await p.waitForSelector('text=학생 변경', { timeout: 60_000 });
  await p.waitForTimeout(1500);
  await p.locator('text=학생 변경').click();
  await p.waitForTimeout(1000);
  await p.locator('div.fixed.inset-0').getByRole('button', { name: /V3가람/ }).first().click();
  await p.waitForTimeout(2500);
  await p.locator('text=전국 모의고사 누적 현황').scrollIntoViewIfNeeded();
  const editBtns = p.getByRole('button', { name: /^수정$/ });
  ok('각 모의고사 행에 "수정" 버튼 (2회)', await editBtns.count() === 2, `${await editBtns.count()}개`);
  await editBtns.first().click();
  await p.waitForTimeout(500);
  await p.getByLabel('국어 점수').fill('99');
  await p.getByLabel('전국 위치').fill('상위 3%');
  await shot(p, '6-exam-edit');
  await p.getByRole('button', { name: /^저장$/ }).first().click();
  await p.waitForTimeout(3000);
  const exams = await prisma.mockExam.findMany({ where: { studentId: fx.studentA }, orderBy: { createdAt: 'asc' } });
  ok('국어 점수 수정 저장', exams[0].korean === 99, `korean=${exams[0].korean}`);
  ok('종합(평균) 재계산 (99+95+90+90+90)/5 = 92.8', exams[0].avg === 92.8, `avg=${exams[0].avg}`);
  ok('전국 위치 수정 저장', exams[0].percentile === '상위 3%', `${exams[0].percentile}`);
  await shot(p, '6-exam-after');

  // 다른 학생 경로로 이 성적을 고치려 하면 막혀야 한다
  const cross = await api(fx.dir, `/api/students/${fx.studentB}/mock-exams/${exams[0].id}`, { method: 'PUT', body: JSON.stringify({ korean: 1 }) });
  ok('다른 학생 경로로 성적 수정 시도 → 404', cross.status === 404, `status=${cross.status}`);
  const smuggle = await api(fx.dir, `/api/students/${fx.studentA}/mock-exams/${exams[0].id}`, { method: 'PUT', body: JSON.stringify({ studentId: fx.studentB, korean: 98 }) });
  const moved = await prisma.mockExam.findUnique({ where: { id: exams[0].id } });
  ok('본문의 studentId 는 무시됨 (성적이 다른 학생으로 옮겨지지 않음)', smuggle.status === 200 && moved?.studentId === fx.studentA, `status=${smuggle.status}`);
  const parEdit = await api(fx.par, `/api/students/${fx.studentA}/mock-exams/${exams[0].id}`, { method: 'PUT', body: JSON.stringify({ korean: 10 }) });
  ok('학부모가 성적 수정 시도 → 403', parEdit.status === 403, `status=${parEdit.status}`);
  await p.context().close();
}

// ── 7. 현황 입력: 세특·학생부 기록란, 종합 점수(평균) / 추가문의 3. 로드맵 ─
async function statusInput(fx: Fx, browser: Browser) {
  console.log('\n[7] 현황 입력 — 종합점수(평균) · 세특/학생부 기록 · 로드맵 반영');
  const p = await signIn(browser, fx.insU);
  await p.goto(`${BASE}/instructor`, { waitUntil: 'networkidle' });
  await p.waitForSelector(`[data-student-id="${fx.studentA}"]`, { timeout: 60_000 });
  await p.locator(`[data-student-id="${fx.studentA}"]`).getByRole('button', { name: /^입력$/ }).click();
  await p.waitForSelector('text=바꿀 부분만', { timeout: 30_000 });
  await p.waitForTimeout(2000);
  const nums = p.locator('section:has-text("과목별 목표점수") input[type="number"]');
  const targets = [100, 100, 100, 95, 96];
  for (let i = 0; i < 5; i++) await nums.nth(i).fill(String(targets[i]));
  // (100+100+100+95+96)/5 = 98.2
  ok('종합점수(평균) 자동 계산 (491/5 = 98.2)', (await p.getByTestId('target-average').innerText()).trim() === '98.2', await p.getByTestId('target-average').innerText());

  // 로드맵 — "현재"를 고르지 않고 내용만 적어도 저장되어야 한다 (예전엔 버려졌다)
  const row = (stage: string) => p.locator(`div.grid:has(> div:text-is("${stage}"))`);
  await row('중3').locator('input').nth(0).fill('고입 선행');
  await row('중3').locator('input').nth(1).fill('고입 선행 학습');
  await row('고1').locator('input').nth(0).fill('내신 대비');
  await p.getByLabel('세특사항').fill('수학 — 함수 탐구 보고서 작성');
  await p.getByLabel('학생부 특이사항').fill('학급 부회장');
  await p.getByLabel('세특사항').scrollIntoViewIfNeeded();
  await shot(p, '7-status-input');
  await p.getByRole('button', { name: /저장/ }).last().click();
  await p.waitForTimeout(3500);
  const s = await prisma.student.findUnique({ where: { id: fx.studentA } });
  ok('세특사항 저장', s?.recordSpecialNotes === '수학 — 함수 탐구 보고서 작성', String(s?.recordSpecialNotes));
  ok('학생부 특이사항 저장', s?.recordRemarks === '학급 부회장', String(s?.recordRemarks));
  const rm = (s?.roadmap ?? []) as { stage: string; label: string }[];
  ok('"현재" 미선택이어도 로드맵 내용 저장', rm.some(r => r.stage === '중3' && r.label === '고입 선행'), JSON.stringify(rm).slice(0, 120));

  // 다시 열면 채워져 있어야 한다
  await p.locator(`[data-student-id="${fx.studentA}"]`).getByRole('button', { name: /^입력$/ }).click();
  await p.waitForSelector('text=바꿀 부분만', { timeout: 30_000 });
  await p.waitForTimeout(2000);
  ok('다시 열면 세특사항이 채워져 있음', (await p.getByLabel('세특사항').inputValue()) === '수학 — 함수 탐구 보고서 작성');
  await p.getByRole('button', { name: /^취소$/ }).last().click();
  await p.waitForTimeout(800);

  // 학생 상세에서도 확인
  await p.locator(`[data-student-id="${fx.studentA}"]`).getByRole('button', { name: /^보기$/ }).click();
  await p.waitForTimeout(2500);
  ok('학생 상세에 학생부 기록 노출', await p.locator('text=학급 부회장').count() > 0);
  ok('학생 상세(강사)에서도 모의고사 수정 버튼 노출', await p.getByRole('button', { name: /^수정$/ }).count() > 0);
  await p.getByRole('button', { name: /^닫기$/ }).first().click();
  await p.waitForTimeout(800);

  // 추가문의 3 — 리포트에 담임 로드맵이 나와야 한다
  await p.getByRole('button', { name: /학부모 리포트 생성/ }).click();
  await p.waitForTimeout(800);
  await p.locator('div.fixed.inset-0').getByRole('button', { name: /V3가람/ }).first().click();
  await p.waitForSelector('text=월간 학습 리포트', { timeout: 30_000 });
  await p.waitForTimeout(2500);
  await p.locator('text=학년별 학습 로드맵').scrollIntoViewIfNeeded().catch(() => {});
  await shot(p, '7-report-roadmap');
  ok('리포트에 담임이 입력한 로드맵 노출', await p.locator('text=고입 선행 — 고입 선행 학습').count() > 0);
  const pdf = await api(fx.ins, `/api/students/${fx.studentA}/reports/pdf?examIdx=-1&includeGrades=1`);
  ok('로드맵이 들어간 리포트 PDF 생성', pdf.status === 200, `status=${pdf.status}`);
  await p.context().close();
}

// ── 8·9. 학교 정보 수정 · 레이아웃 / 추가문의 1. 전형 보기 ───
async function admissionAdmin(fx: Fx, browser: Browser) {
  console.log('\n[8·9] 입시 DB — 전형 단위 목록 · 편집 바로가기 · 학교명 수정 · 전체 삭제');
  const p = await signIn(browser, process.env.ADMIN_USERNAME!, process.env.ADMIN_PASSWORD!);
  await p.goto(`${BASE}/admin/hq`, { waitUntil: 'networkidle' });
  await p.waitForSelector('text=입시 기준 마스터', { timeout: 60_000 });
  await p.locator('input[placeholder="학교 · 계열 · 전형 검색"]').fill(TAG);
  await p.waitForTimeout(800);
  await shot(p, '9-hq-list');
  const heads = (await p.locator('table').first().locator('thead th').allInnerTexts()).map(t => t.trim()).filter(Boolean);
  ok('목록 열: 학교 · 모집시기 · 계열 · 전형명 … 수정', ['학교', '모집시기', '계열', '전형명'].every((h, i) => heads[i] === h) && heads.includes('수정'), heads.join(' | '));
  const trackRow = p.locator('tr[data-track-row]').filter({ hasText: 'V3논술전형' });
  ok('전형 한 줄에 학교·모집시기·계열·전형명 표시', await trackRow.count() === 1 && (await trackRow.innerText()).includes('공학계열') && (await trackRow.innerText()).includes('수시'));
  await trackRow.getByRole('button', { name: /편집/ }).click();
  await p.waitForTimeout(800);
  ok('편집 → 전형 수정 화면이 바로 열림', await p.locator(`text=전형 수정 — ${SCHOOL}`).count() > 0);
  await shot(p, '9-track-edit');
  await p.getByRole('button', { name: /^취소$/ }).last().click();
  await p.waitForTimeout(500);

  // 8. 학교명 수정 — 같은 이름의 학교가 이미 있으면 합치기 제안
  await p.getByRole('button', { name: SCHOOL, exact: true }).first().click();
  await p.waitForSelector('text=학교 정보 수정', { timeout: 10_000 });
  ok('학교 정보 수정에 "전체 삭제" 버튼', await p.getByRole('button', { name: /전체 삭제/ }).count() > 0);
  await p.locator('input[placeholder="예: 고려대학교"]').fill(SCHOOL_DUP);
  await p.getByRole('button', { name: /^확인$/ }).click();
  await p.waitForTimeout(2000);
  await shot(p, '8-duplicate-merge');
  ok('같은 이름 학교가 있으면 500 대신 안내 + 합치기 제안', await p.locator('text=이미 등록되어 있습니다').count() > 0 && await p.getByRole('button', { name: /으로 합치기/ }).count() > 0);
  await p.getByRole('button', { name: /으로 합치기/ }).click();
  await p.waitForTimeout(2500);
  const merged = await prisma.admissionSchool.findMany({ where: { name: { startsWith: `E2E연세대학교${TAG}` } }, include: { tracks: true } });
  ok('합치기 → 학교 1개만 남고 이름은 "(서울)"', merged.length === 1 && merged[0].name === SCHOOL_DUP, merged.map(m => m.name).join(','));
  ok('합치기 → 전형이 옮겨감', merged[0]?.tracks.length === 1 && merged[0].typesCount === 1, `${merged[0]?.tracks.length}건`);

  // 겹치지 않는 이름으로는 바로 수정된다
  const renamed = `${SCHOOL} (신촌)`;
  const ren = await api(fx.admin, `/api/admin/admission-schools/${merged[0].id}`, { method: 'PATCH', body: JSON.stringify({ name: renamed }) });
  ok('학교명 수정 (연세대학교 → 연세대학교 (신촌))', ren.status === 200 && ren.data?.name === renamed, `status=${ren.status}`);

  // 전체 삭제
  await p.reload({ waitUntil: 'networkidle' });
  await p.waitForSelector('text=입시 기준 마스터', { timeout: 60_000 });
  await p.locator('input[placeholder="학교 · 계열 · 전형 검색"]').fill(TAG);
  await p.waitForTimeout(800);
  await p.getByRole('button', { name: renamed, exact: true }).first().click();
  await p.waitForSelector('text=학교 정보 수정', { timeout: 10_000 });
  await p.getByRole('button', { name: /전체 삭제/ }).click();
  await p.waitForTimeout(400);
  ok('전체 삭제는 한 번 더 확인', await p.getByRole('button', { name: /삭제 확인/ }).count() > 0);
  await shot(p, '8-delete-confirm');
  await p.getByRole('button', { name: /삭제 확인/ }).click();
  await p.waitForTimeout(2500);
  const left = await prisma.admissionSchool.count({ where: { name: { startsWith: `E2E연세대학교${TAG}` } } });
  const leftTracks = await prisma.admissionTrack.count({ where: { name: 'V3논술전형' } });
  ok('전체 삭제 → 학교와 전형 모두 삭제', left === 0 && leftTracks === 0, `학교 ${left} / 전형 ${leftTracks}`);
  const dirDel = await api(fx.dir, `/api/admin/admission-schools/${merged[0].id}`, { method: 'DELETE' });
  ok('원장이 학교 삭제 API 호출 → 403', dirDel.status === 403, `status=${dirDel.status}`);
  await p.context().close();
}

async function admissionView(fx: Fx, browser: Browser) {
  console.log('\n[추가문의 1] 원장·강사 전형 보기');
  for (const [who, user] of [['원장', fx.dirU], ['강사', fx.insU]] as const) {
    const p = await signIn(browser, user);
    await p.goto(`${BASE}/instructor`, { waitUntil: 'networkidle' }).catch(() => {});
    ok(`${who} 상단바에 "입시 전형" 메뉴`, await p.getByRole('link', { name: /입시 전형/ }).count() > 0);
    await p.goto(`${BASE}/admissions`, { waitUntil: 'networkidle' });
    await p.waitForSelector('text=입시 전형 보기', { timeout: 30_000 });
    await p.locator('input[placeholder="학교 · 계열 · 전형 검색"]').fill(TAG);
    await p.waitForTimeout(800);
    const row = p.locator('tr').filter({ hasText: 'V3논술전형' });
    ok(`${who}: 학교·모집시기·계열/학과·전형명·전형유형 목록`, await row.count() === 1 && (await row.innerText()).includes('논술위주'));
    await row.getByRole('button', { name: /자세히보기/ }).click();
    await p.waitForTimeout(800);
    ok(`${who}: 자세히보기 → 전형 상세 (읽기 전용)`, await p.locator(`text=전형 상세 — ${SCHOOL}`).count() > 0 && await p.locator('text=1단계 내신 + 논술').count() > 0);
    ok(`${who}: 상세 화면에 저장 버튼 없음`, await p.getByRole('button', { name: /^저장$/ }).count() === 0);
    await shot(p, `extra1-${who}-detail`);
    await p.context().close();
  }
  const parent = await api(fx.par, '/api/admission/catalog');
  ok('학부모가 전형 DB 조회 → 403', parent.status === 403, `status=${parent.status}`);
}

async function editGoalPicker(fx: Fx, browser: Browser) {
  console.log('\n[추가문의 2] 학생 정보 수정 — 목표 DB 선택');
  const p = await signIn(browser, fx.dirU);
  await p.goto(`${BASE}/director`, { waitUntil: 'networkidle' });
  await p.waitForSelector('text=학생 변경', { timeout: 60_000 });
  await p.waitForTimeout(1500);
  await p.locator('text=학생 변경').click();
  await p.waitForTimeout(1000);
  await p.locator('div.fixed.inset-0').getByRole('button', { name: /V3나래/ }).first().click();
  await p.waitForTimeout(2500);
  await p.getByRole('button', { name: /학생 정보 수정/ }).click();
  await p.waitForSelector('text=입시 전형 DB 에서 선택', { timeout: 20_000 });
  await p.waitForTimeout(1500);
  // 기존 목표(고려대학교)는 DB 에 없으므로 "직접 입력" 값으로 보존된다
  const sel = p.getByLabel('최종 목표 학교');
  ok('DB 에 없는 기존 목표도 그대로 보존', (await sel.inputValue()) === '고려대학교', await sel.inputValue());
  await sel.selectOption(SCHOOL);
  await p.getByLabel('최종 목표 계열/학과').selectOption('공학계열');
  await p.getByLabel('최종 목표 모집시기').selectOption('수시');
  await shot(p, 'extra2-goal-picker');
  await p.getByRole('button', { name: /^저장$/ }).click();
  await p.waitForSelector('text=저장했습니다', { timeout: 30_000 });
  const s = await prisma.student.findUnique({ where: { id: fx.studentB } });
  ok('학생 정보 수정에서 목표를 DB 에서 골라 저장', s?.finalGoalSchool === SCHOOL && s?.finalGoalDetail === '공학계열' && s?.finalGoalTrack === '수시',
    `${s?.finalGoalSchool}/${s?.finalGoalDetail}/${s?.finalGoalTrack}`);
  await p.context().close();
}

async function seedAdmission(fx: Fx) {
  const sch = await post(fx.admin, '/api/admin/admission-schools', { name: SCHOOL, dept: '공학계열 외', year: new Date().getFullYear() + 1, status: 'VERIFIED' });
  await post(fx.admin, `/api/admin/admission-schools/${sch.data.id}/tracks`, {
    name: 'V3논술전형', period: '수시', type: '논술위주', method: '1단계 내신 + 논술', status: 'VERIFIED',
  });
  await api(fx.admin, `/api/admin/admission-schools/${sch.data.id}/tracks/${(await api(fx.admin, `/api/admin/admission-schools/${sch.data.id}/tracks`)).data[0].id}`, {
    method: 'PATCH', body: JSON.stringify({ dept: '공학계열' }),
  });
  // 이름이 겹칠 학교 (전형 없음) — 학교명 수정 시 합치기 검사용
  await post(fx.admin, '/api/admin/admission-schools', { name: SCHOOL_DUP, year: new Date().getFullYear() + 1, status: 'VERIFIED' });
}

async function main() {
  console.log(`대상: ${BASE}\n산출물: ${ARTIFACTS}`);
  unitChecks();
  let browser: Browser | null = null;
  try {
    console.log('\n[준비] 테스트 지점·계정·학생·입시 DB 생성');
    const fx = await fixture();
    await seedAdmission(fx);
    browser = await chromium.launch({ channel: 'chrome', headless: !HEADED, slowMo: HEADED ? 250 : 0 });
    await parentNames(fx, browser);
    await registerWithParent(fx, browser);
    await appointmentCalendar(fx, browser);
    await reportAndCounseling(fx, browser);
    await examEdit(fx, browser);
    await statusInput(fx, browser);
    await editGoalPicker(fx, browser);
    await admissionView(fx, browser);
    await admissionAdmin(fx, browser);
  } catch (e) {
    if (lastPage) await shot(lastPage, 'failure').catch(() => {});
    throw e;
  } finally {
    if (browser) await browser.close();
    console.log('\n[정리]');
    await cleanup().catch(e => console.error('  정리 실패 — 수동 확인 필요:', e.message));
    await prisma.$disconnect();
  }
  console.log(`\n결과: ${pass} 통과 / ${fail} 실패`);
  if (fail > 0) process.exit(1);
}

main().catch(e => { console.error('\n실행 실패:', e); process.exit(1); });
