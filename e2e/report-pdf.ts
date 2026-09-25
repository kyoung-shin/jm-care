/**
 * 리포트 PDF 다운로드 E2E — 실제 Chrome 으로 버튼을 눌러 파일이 받아지는지 확인한다.
 *
 *   npm run e2e:pdf                    배포본(기본) 대상, 헤드리스
 *   E2E_HEADED=1 npm run e2e:pdf       브라우저 창을 띄워서 동작을 눈으로 확인
 *   E2E_BASE_URL=http://localhost:3000 npm run e2e:pdf
 *
 * 검사 대상 버튼 3개 (모두 ReportModal 안에 있다)
 *   1. 학부모 모달 헤더  "PDF로 저장"   — /parent
 *   2. 원장 검수 바      "PDF 내려받기" — /director, /instructor
 *   3. 학부모 모달 하단  "PDF 저장"     — /parent
 *
 * 테스트용 지점/계정/학생을 직접 만들고 끝나면 지운다. 이름이 'ZZ_자동검증_' 으로
 * 시작하는 지점만 건드리므로 실제 운영 데이터에는 영향이 없다.
 * DATABASE_URL 이 가리키는 DB 에 쓰기가 발생하니 운영 DB 로 돌릴 때는 유의할 것.
 */
import { chromium, type Browser, type Page, type BrowserContext } from 'playwright';
import { PDFDocument } from 'pdf-lib';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { prisma } from '../src/lib/db';

const BASE = process.env.E2E_BASE_URL ?? 'https://jm-care.vercel.app';
const HEADED = process.env.E2E_HEADED === '1';
const TAG = 'e2e' + Date.now().toString().slice(-6);
const PW = 'E2e!' + Math.random().toString(36).slice(2, 10);
const BRANCH_NAME = `ZZ_자동검증_${TAG}`;
const ARTIFACTS = fs.mkdtempSync(path.join(os.tmpdir(), 'jmcare-e2e-'));

// 금주 일정에 표시되는지 봐야 하므로 이번 주 평일로 슬롯을 만든다
const DAY_LABELS = ['일', '월', '화', '수', '목', '금', '토'];
function weekdaySlot(offsetFromMonday: number, time: string) {
  const today = new Date();
  const dow = today.getDay();
  const monday = new Date(today);
  monday.setDate(today.getDate() + (dow === 0 ? -6 : 1 - dow));
  const d = new Date(monday);
  d.setDate(monday.getDate() + offsetFromMonday);
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}.${p(d.getMonth() + 1)}.${p(d.getDate())}(${DAY_LABELS[d.getDay()]}) ${time}`;
}
const SLOTS = [weekdaySlot(1, '14:00'), weekdaySlot(2, '16:00'), weekdaySlot(3, '10:30')];

let pass = 0;
let fail = 0;
let lastPage: Page | null = null;
const ok = (name: string, cond: boolean, detail = '') => {
  if (cond) { pass++; console.log(`  PASS  ${name}`); }
  else { fail++; console.log(`  FAIL  ${name}${detail ? ` — ${detail}` : ''}`); }
};

// ── 픽스처 생성용 HTTP 헬퍼 ────────────────────────────────
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
  try { data = await res.json(); } catch { /* PDF 등 비 JSON 응답 */ }
  return { status: res.status, data };
}

const signup = (j: Jar, username: string, name: string, role: string, branchId: string) =>
  api(j, '/api/auth/signup', { method: 'POST', body: JSON.stringify({
    username, password: PW, name, phone: '01000000000', requestedRole: role, branchId, reason: 'E2E',
  }) });

const login = (j: Jar, username: string, password = PW) =>
  api(j, '/api/auth/login', { method: 'POST', body: JSON.stringify({ username, password }) });

interface PendingRow { userId: string; name: string }
interface Fixture {
  branchId: string;
  studentId: string;
  /** 승인 이후에 등록된 형제 — 자녀 추가 연결 확인용 */
  siblingId: string;
  insU: string;
  instructorId: string;
  dirU: string;
  parU: string;
  /** 다른 지점 학생 — 권한 차단 확인용 */
  otherStudentId: string | null;
  /** 다른 지점 강사 — 권한 차단 확인용 */
  otherInstructorId: string | null;
}

async function createFixture(): Promise<Fixture> {
  const adminUser = process.env.ADMIN_USERNAME;
  const adminPass = process.env.ADMIN_PASSWORD;
  if (!adminUser || !adminPass) throw new Error('ADMIN_USERNAME / ADMIN_PASSWORD 가 필요합니다 (.env.local)');

  const admin = jar();
  if ((await login(admin, adminUser, adminPass)).status !== 200) throw new Error('관리자 로그인 실패');

  const branch = await api(admin, '/api/admin/branches', { method: 'POST', body: JSON.stringify({ name: BRANCH_NAME, region: 'QA', status: 'PREPARING' }) });
  const branchId = (branch.data as { id: string }).id;

  // 원장 — 본사 승인 필요
  const dirU = `${TAG}_dir`;
  await signup(jar(), dirU, 'E2E원장', 'DIRECTOR', branchId);
  const pending = await api(admin, '/api/admin/pending-users');
  const dirPending = (pending.data as PendingRow[]).find(p => p.name === 'E2E원장')!;
  await api(admin, `/api/admin/users/${dirPending.userId}/approve`, { method: 'POST' });
  const dir = jar();
  await login(dir, dirU);

  // 강사 — 원장 승인
  const insU = `${TAG}_ins`;
  await signup(jar(), insU, 'E2E강사', 'INSTRUCTOR', branchId);
  let queue = await api(dir, '/api/director/pending-users');
  const insPending = (queue.data as PendingRow[]).find(p => p.name === 'E2E강사')!;
  await api(dir, `/api/director/users/${insPending.userId}/approve`, { method: 'POST', body: JSON.stringify({ studentIds: [] }) });
  const ins = jar();
  await login(ins, insU);
  const instructorId = ((await api(ins, '/api/auth/me')).data as { id: string }).id;

  // 중2 학생 — 사회 포함 5과목, 점수를 80점대에 몰아 Y축 확대가 드러나게 한다
  const student = await api(dir, '/api/students', { method: 'POST', body: JSON.stringify({
    name: 'E2E민준', initial: 'E', grade: '중2', school: 'E2E중학교', instructorId,
    finalGoalSchool: '고려대학교', finalGoalDetail: '공학계열', finalGoalTrack: '수시·정시',
  }) });
  const studentId = (student.data as { id: string }).id;

  const exams = [
    { name: '1차', date: '2025.06.14', korean: 86, english: 88, math: 84, social: 87, science: 85 },
    { name: '2차', date: '2025.09.13', korean: 88, english: 89, math: 87, social: 88, science: 86 },
    { name: '3차', date: '2025.12.13', korean: 90, english: 91, math: 89, social: 90, science: 88 },
    { name: '4차', date: '2026.03.14', korean: 92, english: 93, math: 91, social: 91, science: 90 },
  ];
  for (let i = 0; i < exams.length; i++) {
    const e = exams[i];
    const vals = [e.korean, e.english, e.math, e.social, e.science];
    await api(dir, `/api/students/${studentId}/mock-exams`, { method: 'POST', body: JSON.stringify({
      ...e, avg: +(vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(1), percentile: `상위 ${30 - i * 5}.0%`,
    }) });
  }

  // 학부모 — 자녀 연결 후 승인 (이 시점에 동생은 아직 없다)
  const parU = `${TAG}_par`;
  await signup(jar(), parU, 'E2E학부모', 'PARENT', branchId);
  queue = await api(dir, '/api/director/pending-users');
  const parPending = (queue.data as PendingRow[]).find(p => p.name === 'E2E학부모')!;
  await api(dir, `/api/director/users/${parPending.userId}/approve`, { method: 'POST', body: JSON.stringify({ studentIds: [studentId] }) });

  // 학부모 화면에서 열람할 발송 리포트 2건 — 공개 범위를 다르게 저장한다
  await api(dir, `/api/students/${studentId}/reports`, { method: 'POST', body: JSON.stringify({
    period: '2026년 3월',
    message: 'E2E민준 학부모님, 담임 강사입니다. 이번 학기 성장 내용을 정리했습니다.',
    includeGrades: true,
    sentAt: new Date().toISOString(),
  }) });
  await api(dir, `/api/students/${studentId}/reports`, { method: 'POST', body: JSON.stringify({
    period: '2025년 12월',
    message: '백분위 비공개로 발송한 리포트입니다.',
    includeGrades: false,
    sentAt: new Date().toISOString(),
  }) });

  // 상담 기록 — 강사 화면에서 내용 확인이 되는지 보기 위해
  await api(dir, `/api/students/${studentId}/counselings`, { method: 'POST', body: JSON.stringify({
    date: '2026.03.20', type: '정기', topic: 'E2E 상담 주제',
    summary: 'E2E 상담 요약 본문입니다.',
    internalMemo: 'E2E 내부 메모', parentShare: 'E2E 학부모 공유',
    action: { name: 'E2E 액션', owner: 'E2E강사', deadline: '2026.05.31', status: 'in-progress' },
  }) });

  // 승인이 끝난 뒤에 등록되는 형제(동생)
  const sibling = await api(dir, '/api/students', { method: 'POST', body: JSON.stringify({
    name: 'E2E동생', initial: 'E', grade: '초5', school: 'E2E초등학교', instructorId,
  }) });
  const siblingId = (sibling.data as { id: string }).id;

  // 권한 차단 확인에 쓸 다른 지점 학생
  const all = await api(admin, '/api/students');
  const other = (all.data as { id: string; branchId: string }[] | null)?.find(s => s.branchId !== branchId) ?? null;
  const staff = await api(admin, '/api/users?role=INSTRUCTOR');
  const otherIns = (staff.data as { id: string; branchId: string | null }[] | null)?.find(u => u.branchId && u.branchId !== branchId) ?? null;

  return { branchId, studentId, siblingId, insU, instructorId, dirU, parU, otherStudentId: other?.id ?? null, otherInstructorId: otherIns?.id ?? null };
}

// 'ZZ_자동검증_' 지점과 거기 딸린 계정·학생·가입신청만 지운다
async function cleanup() {
  const branches = await prisma.branch.findMany({ where: { name: { startsWith: 'ZZ_자동검증_' } }, select: { id: true } });
  if (branches.length === 0) return;
  const ids = branches.map(b => b.id);
  const users = await prisma.user.findMany({ where: { branchId: { in: ids } }, select: { id: true } });
  const students = await prisma.student.findMany({ where: { branchId: { in: ids } }, select: { id: true } });
  // 학생과의 1:1 / N:M 연결을 먼저 끊어야 학생을 지울 수 있다
  for (const u of users) {
    await prisma.user.update({ where: { id: u.id }, data: { studentProfileId: null, children: { set: [] } } });
  }
  await prisma.student.deleteMany({ where: { id: { in: students.map(s => s.id) } } });
  await prisma.pendingUser.deleteMany({ where: { branchId: { in: ids } } });
  await prisma.user.deleteMany({ where: { id: { in: users.map(u => u.id) } } });
  await prisma.branch.deleteMany({ where: { id: { in: ids } } });
  console.log(`  정리 완료 — 지점 ${ids.length}, 계정 ${users.length}, 학생 ${students.length}`);
}

// ── 브라우저 헬퍼 ──────────────────────────────────────────
let shotSeq = 0;
async function shot(page: Page, name: string) {
  lastPage = page;
  const file = path.join(ARTIFACTS, `${String(++shotSeq).padStart(2, '0')}-${name}.png`);
  await page.screenshot({ path: file });
  return file;
}

async function signIn(ctx: BrowserContext, username: string): Promise<Page> {
  const page = await ctx.newPage();
  await page.goto(`${BASE}/sign-in`, { waitUntil: 'networkidle' });
  await page.locator('input').first().fill(username);
  await page.locator('input[type="password"]').first().fill(PW);
  await page.locator('button[type="submit"], button:has-text("로그인")').first().click();
  await page.waitForURL(u => !u.pathname.includes('sign-in'), { timeout: 30_000 });
  return page;
}

/**
 * 원장 화면은 지점에서 가장 최근 등록된 학생을 먼저 띄운다.
 * 형제가 있으면 원하는 학생이 아닐 수 있으므로 학생 선택 모달로 지정한다.
 */
async function selectStudent(page: Page, name: string) {
  await page.waitForSelector('text=학생 변경', { timeout: 60_000 });
  await page.waitForTimeout(1500);
  if (await page.locator(`text=${name} ·`).count() === 0) {
    await page.locator('text=학생 변경').click();
    await page.waitForTimeout(1200);
    await page.getByRole('button', { name: new RegExp(name) }).first().click();
    await page.waitForTimeout(2500);
  }
  await page.waitForSelector(`text=${name}`, { timeout: 30_000 });
  await page.waitForTimeout(1500);
}

async function clickAndExpectPdf(page: Page, selector: ReturnType<Page['getByRole']>, label: string): Promise<string | null> {
  const [download] = await Promise.all([
    page.waitForEvent('download', { timeout: 90_000 }),
    selector.first().click(),
  ]);
  const name = download.suggestedFilename();
  const dest = path.join(ARTIFACTS, name);
  await download.saveAs(dest);
  const buf = fs.readFileSync(dest);
  const valid = buf.subarray(0, 5).toString('latin1') === '%PDF-'
    && buf.subarray(-1024).toString('latin1').includes('%%EOF');
  ok(`${label} → PDF 다운로드`, valid, `헤더=${buf.subarray(0, 5).toString('latin1')}`);
  ok(`${label} → 파일명에 학생명·기간 포함`, /E2E민준/.test(name) && /\d{4}년/.test(name), name);
  console.log(`        ${name}  ${(buf.length / 1024).toFixed(0)}KB`);
  return valid ? dest : null;
}

// ── 본 시나리오 ────────────────────────────────────────────
async function run(fx: Fixture, browser: Browser) {
  console.log('\n[원장] /director — 버튼 2 "PDF 내려받기"');
  const dirCtx = await browser.newContext({ viewport: { width: 1440, height: 950 }, acceptDownloads: true });
  const dp = await signIn(dirCtx, fx.dirU);
  await dp.goto(`${BASE}/director`, { waitUntil: 'networkidle' });
  await selectStudent(dp, 'E2E민준');

  // 그래프 Y축이 0~100 고정이 아니라 실제 점수 구간(84~93)으로 좁혀졌는지
  const chart = dp.locator('.recharts-wrapper').first();
  await chart.scrollIntoViewIfNeeded();
  await dp.waitForTimeout(800);
  const chartShot = await shot(dp, 'director-chart');
  // recharts 의 클래스 이름에 기대지 않고 SVG 안의 숫자 텍스트를 직접 읽는다.
  // X축 눈금은 '1차 (25.06)' 형태라 숫자만인 값은 Y축 눈금뿐이다.
  const yTicks: number[] = await chart.evaluate(el =>
    Array.from(el.querySelectorAll('text'))
      .map(t => (t.textContent ?? '').trim())
      .filter(t => /^\d+$/.test(t))
      .map(Number)
  );
  const yMin = yTicks.length ? Math.min(...yTicks) : NaN;
  const yMax = yTicks.length ? Math.max(...yTicks) : NaN;
  ok(
    `그래프 Y축이 점수 구간으로 확대됨 (${yMin}~${yMax}, 0~100 고정 아님)`,
    yTicks.length > 0 && yMin > 0,
    `눈금=[${yTicks.join(',')}] · ${chartShot}`,
  );
  ok('중2 → 과목에 "사회" 노출 (5과목)', await dp.locator('text=사회').count() > 0);

  await dp.getByRole('button', { name: /리포트/ }).first().click();
  await dp.waitForTimeout(2500);
  await shot(dp, 'director-modal');

  const btn2 = dp.getByRole('button', { name: /PDF 내려받기/ });
  ok('버튼 2 "PDF 내려받기" 존재', await btn2.count() > 0);
  const gradedByDirector = await clickAndExpectPdf(dp, btn2, '버튼 2 (최신 회차)');
  void gradedByDirector;

  // 회차를 1차로 바꾸면 다른 기간의 PDF 가 나와야 한다
  const picker = dp.locator('select').first();
  if (await picker.count() > 0) {
    await picker.selectOption({ index: 0 });
    await dp.waitForTimeout(1200);
    await clickAndExpectPdf(dp, btn2, '버튼 2 (1차 회차 선택)');
  }
  // ── 학생 정보 수정 ──
  console.log('\n[원장] 학생 정보 수정');
  await dp.goto(`${BASE}/director`, { waitUntil: 'networkidle' });
  await selectStudent(dp, 'E2E민준');
  const editBtn = dp.getByRole('button', { name: /학생 정보 수정/ });
  ok('"학생 정보 수정" 버튼 노출', await editBtn.count() > 0);
  await editBtn.first().click();
  await dp.waitForTimeout(2000);
  await shot(dp, 'director-student-edit');
  // 학교명을 바꿔 저장되는지 확인 (모달의 '학교' 입력칸)
  await dp.locator('label:has-text("학교") + input').fill('E2E수정중학교');
  await dp.getByRole('button', { name: /^저장$/ }).click();
  await dp.waitForSelector('text=저장했습니다', { timeout: 30_000 });
  await dp.waitForTimeout(1500);
  const detail = await (await dp.request.get(`${BASE}/api/students/${fx.studentId}`)).json();
  ok('학교명 수정이 저장됨', detail.school === 'E2E수정중학교', `school=${detail.school}`);
  ok('수정해도 지점은 그대로', detail.branchId === fx.branchId, `branchId=${detail.branchId}`);

  // 지점 이동은 이 경로로 막혀야 한다
  const moveAttempt = await dp.request.put(`${BASE}/api/students/${fx.studentId}`, {
    data: { branchId: 'branch_wonjung', name: 'E2E민준' },
  });
  const afterMove = await (await dp.request.get(`${BASE}/api/students/${fx.studentId}`)).json();
  ok('학생 수정으로 지점 이동 불가', afterMove.branchId === fx.branchId, `status=${moveAttempt.status()} branchId=${afterMove.branchId}`);

  // ── 형제·자매 자녀 추가 연결 ──
  console.log('\n[원장] 승인 후 형제 자녀 연결');
  await dp.goto(`${BASE}/director/users`, { waitUntil: 'networkidle' });
  await dp.waitForTimeout(2500);
  await dp.locator('text=학부모 자녀 연결').scrollIntoViewIfNeeded();
  await shot(dp, 'director-parent-link');
  ok('"학부모 자녀 연결" 섹션 노출', await dp.locator('text=학부모 자녀 연결').count() > 0);

  const before = await (await dp.request.get(`${BASE}/api/director/parents`)).json();
  ok('승인된 학부모가 목록에 보임', Array.isArray(before) && before.length === 1 && before[0].children.length === 1,
    `${Array.isArray(before) ? before.length : '?'}명 / 자녀 ${before?.[0]?.children?.length}`);

  // 동생을 눌러 추가하고 저장
  await dp.getByRole('button', { name: /E2E동생/ }).first().click();
  await dp.getByRole('button', { name: /연결 저장/ }).first().click();
  await dp.waitForSelector('text=저장했습니다', { timeout: 60_000 });
  await dp.waitForTimeout(1200);
  const after = await (await dp.request.get(`${BASE}/api/director/parents`)).json();
  const names = (after?.[0]?.children ?? []).map((c: { name: string }) => c.name).sort();
  ok('형제 추가 연결 저장됨 (자녀 2명)', names.length === 2 && names.includes('E2E동생') && names.includes('E2E민준'), names.join(','));
  await shot(dp, 'director-parent-link-after');

  // 다른 지점 학생은 연결할 수 없다
  if (fx.otherStudentId) {
    const bad = await dp.request.patch(`${BASE}/api/director/parents/${before[0].id}/children`, {
      data: { studentIds: [fx.studentId, fx.otherStudentId] },
    });
    ok('다른 지점 학생을 자녀로 연결 시도 → 400', bad.status() === 400, `status=${bad.status()}`);
  }

  // 원장은 본인 지점 밖으로 나갈 수 없다 — 다른 지점 branchId 를 넘겨도 교집합만 나온다
  if (fx.otherStudentId) {
    const leak = await dp.request.get(`${BASE}/api/students/${fx.otherStudentId}`);
    ok('원장이 다른 지점 학생 조회 → 403', leak.status() === 403, `status=${leak.status()}`);
  }
  const listed = await (await dp.request.get(`${BASE}/api/students`)).json();
  ok('원장 목록은 본인 지점만', Array.isArray(listed) && listed.every((s: { branchId: string }) => s.branchId === fx.branchId), `${Array.isArray(listed) ? listed.length : '?'}건`);

  // 회원 명부 — 지점 범위 + 비밀번호 해시 미노출
  const staff = await (await dp.request.get(`${BASE}/api/users?role=INSTRUCTOR`)).json();
  ok('원장이 보는 강사 명부는 본인 지점만',
    Array.isArray(staff) && staff.length > 0 && staff.every((u: { branchId: string }) => u.branchId === fx.branchId),
    `${Array.isArray(staff) ? staff.length : '?'}건`);
  ok('회원 명부 응답에 passwordHash 없음',
    Array.isArray(staff) && staff.every((u: Record<string, unknown>) => !('passwordHash' in u)),
    Array.isArray(staff) && staff[0] ? Object.keys(staff[0]).join(',') : '');
  // 다른 지점 branchId 를 넘겨도 범위를 벗어나지 못한다
  const crossBranch = await (await dp.request.get(`${BASE}/api/users?branchId=branch_wonjung`)).json();
  ok('원장이 다른 지점 branchId 로 조회 → 결과 없음', Array.isArray(crossBranch) && crossBranch.length === 0, `${Array.isArray(crossBranch) ? crossBranch.length : '?'}건`);

  if (fx.otherInstructorId) {
    const r = await dp.request.get(`${BASE}/api/instructors/${fx.otherInstructorId}/summary`);
    ok('원장이 다른 지점 강사 요약 조회 → 403', r.status() === 403, `status=${r.status()}`);
  }

  await dirCtx.close();

  console.log('\n[학부모] /parent — 버튼 1 "PDF로 저장", 버튼 3 "PDF 저장"');
  const parCtx = await browser.newContext({ viewport: { width: 1440, height: 950 }, acceptDownloads: true });
  const pp = await signIn(parCtx, fx.parU);
  await pp.goto(`${BASE}/parent`, { waitUntil: 'networkidle' });
  await pp.waitForTimeout(3000);
  await shot(pp, 'parent-dashboard');

  // 형제가 연결되면 자녀 전환 UI 가 나와야 하고, 전환해서 각자 화면을 볼 수 있어야 한다
  ok('자녀가 2명이면 자녀 선택 UI 노출', await pp.locator('text=자녀 선택').count() > 0);
  const siblingTab = pp.getByRole('button', { name: /E2E동생/ });
  ok('형제(E2E동생) 탭 노출', await siblingTab.count() > 0);
  if (await siblingTab.count() > 0) {
    await siblingTab.first().click();
    await pp.waitForTimeout(2500);
    ok('형제 화면으로 전환됨', await pp.locator('text=E2E동생').count() > 0);
    await shot(pp, 'parent-sibling');
  }
  // 리포트가 있는 첫째로 되돌린다
  await pp.getByRole('button', { name: /E2E민준/ }).first().click();
  await pp.waitForTimeout(2500);

  await pp.locator('text=월간 리포트').scrollIntoViewIfNeeded();
  ok('학부모 화면에 리포트 "열기" 노출', await pp.getByRole('button', { name: /열기/ }).count() > 0);
  // 백분위를 포함해 발송한 리포트를 지목해서 연다
  await pp.locator('text=2026년 3월 학습 리포트').click();
  await pp.waitForTimeout(2500);
  await shot(pp, 'parent-modal');

  const btn1 = pp.getByRole('button', { name: /PDF로 저장/ });
  ok('버튼 1 (헤더) "PDF로 저장" 존재', await btn1.count() > 0);
  const gradedPdf = await clickAndExpectPdf(pp, btn1, '버튼 1 (학부모 헤더)');

  const btn3 = pp.getByRole('button', { name: /^PDF 저장$/ });
  ok('버튼 3 (하단) "PDF 저장" 존재', await btn3.count() > 0);
  if (await btn3.count() > 0) await clickAndExpectPdf(pp, btn3, '버튼 3 (학부모 하단)');

  // ── 발송 시 고른 "백분위 제외" 가 학부모 PDF 에도 적용되는지 ──
  console.log('\n[학부모] 백분위 제외로 발송한 리포트');
  await pp.getByRole('button', { name: /^확인$/ }).first().click();
  await pp.waitForTimeout(1000);
  await pp.locator('text=2025년 12월 학습 리포트').scrollIntoViewIfNeeded();
  await pp.locator('text=2025년 12월 학습 리포트').click();
  await pp.waitForTimeout(2500);
  await shot(pp, 'parent-modal-no-grades');
  const noGradesPdf = await clickAndExpectPdf(pp, pp.getByRole('button', { name: /^PDF 저장$/ }), '백분위 제외 리포트');
  if (noGradesPdf && gradedPdf) {
    const subjectOf = async (f: string) => (await PDFDocument.load(fs.readFileSync(f))).getSubject() ?? '';
    const noGradesSubject = await subjectOf(noGradesPdf);
    const gradedSubject = await subjectOf(gradedPdf);
    ok(
      '백분위 포함으로 발송한 리포트 → PDF 도 백분위 포함',
      gradedSubject.includes('백분위 포함'),
      gradedSubject,
    );
    ok(
      '백분위 제외로 발송한 리포트 → 학부모 PDF 도 백분위 비공개',
      noGradesSubject.includes('비공개'),
      noGradesSubject,
    );
  }

  // ── 다른 지점 학생 리포트는 막혀야 한다 ──
  if (fx.otherStudentId) {
    const res = await pp.request.get(`${BASE}/api/students/${fx.otherStudentId}/reports/pdf`);
    ok('학부모가 다른 지점 학생 PDF 요청 → 403 차단', res.status() === 403, `status=${res.status()}`);
  } else {
    console.log('        (다른 지점 학생이 없어 권한 차단 검사는 건너뜀)');
  }
  const notFound = await pp.request.get(`${BASE}/api/students/does-not-exist/reports/pdf`);
  ok('없는 학생 → 404', notFound.status() === 404, `status=${notFound.status()}`);

  // ── /api/students/* 전체 스코핑 ──
  console.log('\n[권한] 학부모 세션으로 본 /api/students/*');
  const mine = await (await pp.request.get(`${BASE}/api/students`)).json();
  const mineIds = Array.isArray(mine) ? mine.map((s: { id: string }) => s.id).sort() : [];
  ok('학부모 목록에 연결된 자녀 2명(형제 포함)만 보임',
    mineIds.length === 2 && mineIds.includes(fx.studentId) && mineIds.includes(fx.siblingId),
    `${mineIds.length}건`);
  const sib = await pp.request.get(`${BASE}/api/students/${fx.siblingId}`);
  ok('학부모가 새로 연결된 형제 정보 조회 가능', sib.status() === 200, `status=${sib.status()}`);

  if (fx.otherStudentId) {
    for (const [label, p] of [
      ['상세', `/api/students/${fx.otherStudentId}`],
      ['모의고사', `/api/students/${fx.otherStudentId}/mock-exams`],
      ['상담', `/api/students/${fx.otherStudentId}/counselings`],
      ['리포트', `/api/students/${fx.otherStudentId}/reports`],
    ] as [string, string][]) {
      const r = await pp.request.get(BASE + p);
      ok(`다른 지점 학생 ${label} 조회 → 403`, r.status() === 403, `status=${r.status()}`);
    }
  }

  // 자녀 기록이라도 학부모는 쓰기 불가
  const writeAttempt = await pp.request.post(`${BASE}/api/students/${fx.studentId}/mock-exams`, {
    data: { name: '무단', date: '2026.01.01', korean: 100 },
  });
  ok('학부모가 자녀 성적 등록 시도 → 403', writeAttempt.status() === 403, `status=${writeAttempt.status()}`);

  const editAttempt = await pp.request.put(`${BASE}/api/students/${fx.studentId}`, { data: { name: '무단수정' } });
  ok('학부모가 학생 정보 수정 시도 → 403', editAttempt.status() === 403, `status=${editAttempt.status()}`);

  const linkAttempt = await pp.request.patch(`${BASE}/api/director/parents/${fx.studentId}/children`, { data: { studentIds: [] } });
  ok('학부모가 자녀 연결 API 호출 → 403', linkAttempt.status() === 403, `status=${linkAttempt.status()}`);

  // 강사 화면 검증에 쓸 상담 예약 요청을 학부모가 넣는다
  const book = await pp.request.post(`${BASE}/api/students/${fx.studentId}/appointments`, {
    data: { type: 'phone', slot1: SLOTS[0], slot2: SLOTS[1], slot3: SLOTS[2], requestedBy: 'E2E학부모' },
  });
  ok('학부모가 상담 예약 요청 → 201', book.status() === 201, `status=${book.status()}`);

  const dirList = await pp.request.get(`${BASE}/api/users?role=INSTRUCTOR`);
  ok('학부모가 회원 명부 조회 → 403', dirList.status() === 403, `status=${dirList.status()}`);

  if (fx.otherInstructorId) {
    const insSummary = await pp.request.get(`${BASE}/api/instructors/${fx.otherInstructorId}/summary`);
    ok('학부모가 강사 요약 조회 → 403', insSummary.status() === 403, `status=${insSummary.status()}`);
    const insWrite = await pp.request.post(`${BASE}/api/instructors/${fx.otherInstructorId}/schedule`, {
      data: { date: '01.01', day: '월', time: '10:00', type: '수업', label: '무단 등록' },
    });
    ok('학부모가 강사 일정 추가 시도 → 403', insWrite.status() === 403, `status=${insWrite.status()}`);
  }

  await parCtx.close();
}

async function runInstructor(fx: Fixture, browser: Browser) {
  console.log('\n[강사] /instructor — 학생 조회 · 상담 내용 · 예약/일정');
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 950 }, acceptDownloads: true });
  const ip = await signIn(ctx, fx.insU);
  await ip.goto(`${BASE}/instructor`, { waitUntil: 'networkidle' });
  await ip.waitForSelector('text=담당 학생', { timeout: 60_000 });
  await ip.waitForTimeout(2500);
  await shot(ip, 'instructor-dashboard');

  // 학생 데이터 "보기" — 수정만 가능하던 것을 조회까지
  const viewBtn = ip.getByRole('button', { name: /^보기$/ });
  ok('담당 학생에 "보기" 버튼 노출', await viewBtn.count() > 0);
  // 형제도 담당 학생이라 목록 순서가 바뀔 수 있다. 검사 대상 학생의 행을 지목한다.
  await ip.locator(`[data-student-id="${fx.studentId}"]`).getByRole('button', { name: /^보기$/ }).click();
  await ip.waitForTimeout(3000);
  await shot(ip, 'instructor-student-detail');
  ok('학생 상세에 목표 노출', await ip.locator('text=고려대학교').count() > 0);
  ok('학생 상세에 과목별 목표 대비 노출', await ip.locator('text=과목별 목표 대비').count() > 0);
  ok('학생 상세에 모의고사 추이 노출', await ip.locator('.recharts-wrapper').count() > 0);

  // 상담 내용 확인
  ok('상담 기록 섹션 노출', await ip.locator('text=상담 기록').count() > 0);
  ok('상담 주제 노출', await ip.locator('text=E2E 상담 주제').count() > 0);
  ok('상담 요약 본문 노출', await ip.locator('text=E2E 상담 요약 본문입니다.').count() > 0);
  ok('내부 메모 노출', await ip.locator('text=E2E 내부 메모').count() > 0);
  await ip.getByRole('button', { name: /^닫기$/ }).first().click();
  await ip.waitForTimeout(1200);

  // 상담 예약 확정 → 금주 일정 반영
  await ip.locator('text=상담 예약 요청').scrollIntoViewIfNeeded();
  await ip.waitForTimeout(800);
  ok('상담 예약 요청이 목록에 노출', await ip.locator('text=E2E민준').count() > 0);
  const firstSlotBtn = ip.getByRole('button', { name: new RegExp(escapeRe(SLOTS[0]) + '\\s*확정') });
  ok('요청 슬롯 확정 버튼 노출', await firstSlotBtn.count() > 0, SLOTS[0]);
  await firstSlotBtn.first().click();
  await ip.waitForTimeout(3500);
  await shot(ip, 'instructor-appointment-confirmed');

  const sched1 = await (await ip.request.get(`${BASE}/api/instructors/${fx.instructorId}/summary`)).json();
  const allItems = (s: { schedule: { items: { time: string; type: string; label: string }[] }[] }) =>
    s.schedule.flatMap(d => d.items);
  const confirmedItem = allItems(sched1).find(i => i.type === '상담' && i.label.includes('E2E민준'));
  ok('확정한 상담이 금주 일정에 표시됨', !!confirmedItem, `time=${confirmedItem?.time}`);
  ok('일정 시각이 확정 슬롯과 일치', confirmedItem?.time === '14:00', `time=${confirmedItem?.time}`);

  // 일시 변경
  const changeBtn = ip.getByRole('button', { name: /일시 변경/ });
  ok('확정 건에 "일시 변경" 버튼 노출', await changeBtn.count() > 0);
  await changeBtn.first().click();
  await ip.waitForTimeout(1000);
  await ip.getByRole('button', { name: new RegExp(escapeRe(SLOTS[1]) + '\\s*으로 변경') }).first().click();
  await ip.waitForTimeout(3500);
  const sched2 = await (await ip.request.get(`${BASE}/api/instructors/${fx.instructorId}/summary`)).json();
  const changed = allItems(sched2).filter(i => i.type === '상담' && i.label.includes('E2E민준'));
  ok('일시 변경이 금주 일정에도 반영됨', changed.length === 1 && changed[0].time === '16:00', `${changed.length}건 time=${changed[0]?.time}`);
  await shot(ip, 'instructor-appointment-changed');

  // 예약에서 만들어진 일정은 달력에서 직접 못 지운다
  const evs = await (await ip.request.get(`${BASE}/api/instructors/${fx.instructorId}/summary`)).json();
  const evId = (evs.schedule as { items: { id: string; type: string }[] }[])
    .flatMap(d => d.items).find(i => i.type === '상담')?.id;
  if (evId) {
    const del = await ip.request.delete(`${BASE}/api/instructors/${fx.instructorId}/schedule/${evId}`);
    ok('예약으로 생긴 일정은 달력에서 삭제 불가 → 400', del.status() === 400, `status=${del.status()}`);
  }

  // 거절로 되돌리면 일정에서도 내려간다
  await ip.getByRole('button', { name: /일시 변경/ }).first().click();
  await ip.waitForTimeout(800);
  await ip.getByRole('button', { name: /거절로 변경/ }).first().click();
  await ip.waitForTimeout(3500);
  const sched3 = await (await ip.request.get(`${BASE}/api/instructors/${fx.instructorId}/summary`)).json();
  ok('거절로 되돌리면 금주 일정에서 사라짐',
    allItems(sched3).filter(i => i.type === '상담' && i.label.includes('E2E민준')).length === 0);

  // 잘못된 형식은 거부
  const apptList = await (await ip.request.get(`${BASE}/api/instructors/${fx.instructorId}/appointments`)).json();
  const apptId = apptList?.[0]?.id;
  if (apptId) {
    const bad = await ip.request.patch(`${BASE}/api/appointments/${apptId}`, {
      data: { status: 'confirmed', confirmedSlot: '내일 오후' },
    });
    ok('잘못된 일시 형식 → 400', bad.status() === 400, `status=${bad.status()}`);
  }

  await ctx.close();
}

function escapeRe(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

async function main() {
  console.log(`대상: ${BASE}`);
  console.log(`산출물: ${ARTIFACTS}\n`);

  let browser: Browser | null = null;
  try {
    console.log('[준비] 테스트 지점·계정·학생 생성');
    const fx = await createFixture();
    console.log(`  지점 ${BRANCH_NAME} / 원장 ${fx.dirU} / 학부모 ${fx.parU}`);

    // 설치된 Google Chrome 을 그대로 쓴다 (별도 브라우저 다운로드 불필요)
    browser = await chromium.launch({ channel: 'chrome', headless: !HEADED, slowMo: HEADED ? 300 : 0 });
    await run(fx, browser);
    await runInstructor(fx, browser);
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
