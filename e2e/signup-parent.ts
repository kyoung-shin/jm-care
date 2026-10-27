/**
 * 학생 가입 신청 시 학부모 매칭 E2E.
 *
 *   npm run e2e:signup-parent
 *   E2E_BASE_URL=http://localhost:3000 npm run e2e:signup-parent
 *
 * 1. 학생이 가입 신청 화면에서 학부모 이름·연락처를 적는다
 * 2. 원장 승인 화면에 그 정보와, 연락처가 일치하는 학부모가 미리 체크되어 나온다
 * 3. 승인하면 학생 프로필에 학부모가 연결된다
 * 4. 반대 순서(학생 먼저 승인 → 학부모 나중 가입)면 학부모 승인 카드에서 자녀가 미리 선택된다
 *
 * report-pdf.ts 와 같은 'ZZ_자동검증_' 지점만 만들고 끝나면 지운다.
 */
import { chromium, type Browser, type Page } from 'playwright';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { prisma } from '../src/lib/db';
import { parentMatches, phoneDigits } from '../src/lib/parent-match';

const BASE = process.env.E2E_BASE_URL ?? 'https://jm-care.vercel.app';
const HEADED = process.env.E2E_HEADED === '1';
const TAG = 'v4' + Date.now().toString().slice(-6);
const PW = 'E2e!' + Math.random().toString(36).slice(2, 10);
const BRANCH_NAME = `ZZ_자동검증_${TAG}`;
const ARTIFACTS = fs.mkdtempSync(path.join(os.tmpdir(), 'jmcare-signup-parent-'));
// 운영 DB 의 실제 연락처와 겹치지 않게 실행마다 바뀌는 번호를 쓴다
const tail = TAG.slice(-4);
const PARENT_PHONE = `010-77${tail.slice(0, 2)}-${tail}`;
const LATE_PARENT_PHONE = `010-66${tail.slice(0, 2)}-${tail}`;

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
const signup = (username: string, name: string, role: string, branchId: string, extra: Record<string, unknown> = {}) =>
  post(jar(), '/api/auth/signup', { username, password: PW, name, phone: '01000000000', requestedRole: role, branchId, reason: 'E2E', ...extra });
const login = (j: Jar, username: string, password = PW) => post(j, '/api/auth/login', { username, password });
const pendingOf = async (dir: Jar, name: string) =>
  (await api(dir, '/api/director/pending-users')).data.find((p: { name: string }) => p.name === name);

async function shot(page: Page, name: string) {
  lastPage = page;
  await page.screenshot({ path: path.join(ARTIFACTS, `${name}.png`) });
}

async function cleanup() {
  const branches = await prisma.branch.findMany({ where: { name: { startsWith: 'ZZ_자동검증_' } }, select: { id: true } });
  const ids = branches.map(b => b.id);
  if (ids.length === 0) return;
  const users = await prisma.user.findMany({ where: { branchId: { in: ids } }, select: { id: true } });
  const students = await prisma.student.findMany({ where: { branchId: { in: ids } }, select: { id: true } });
  for (const u of users) await prisma.user.update({ where: { id: u.id }, data: { studentProfileId: null, children: { set: [] } } });
  await prisma.student.deleteMany({ where: { id: { in: students.map(s => s.id) } } });
  await prisma.pendingUser.deleteMany({ where: { branchId: { in: ids } } });
  await prisma.user.deleteMany({ where: { id: { in: users.map(u => u.id) } } });
  await prisma.branch.deleteMany({ where: { id: { in: ids } } });
  console.log(`  정리 완료 — 지점 ${ids.length}, 계정 ${users.length}, 학생 ${students.length}`);
}

function unitChecks() {
  console.log('\n[로직] 연락처 매칭');
  ok('하이픈 유무와 무관하게 연락처 비교', parentMatches({ parentPhone: '01012345678' }, { name: 'x', phone: '010-1234-5678' }));
  ok('연락처가 다르면 이름이 같아도 불일치', !parentMatches({ parentName: '김엄마', parentPhone: '010-1111-2222' }, { name: '김엄마', phone: '010-3333-4444' }));
  ok('연락처를 안 적었으면 이름으로 매칭', parentMatches({ parentName: '김엄마' }, { name: '김엄마', phone: '010-3333-4444' }));
  ok('아무것도 안 적었으면 매칭 없음', !parentMatches({}, { name: '김엄마', phone: '010-3333-4444' }));
  ok('숫자만 추출', phoneDigits('010-12 34.5678') === '01012345678');
}

async function main() {
  console.log(`대상: ${BASE}\n산출물: ${ARTIFACTS}`);
  unitChecks();
  let browser: Browser | null = null;
  try {
    // ── 준비: 지점·원장·강사·학생 프로필·승인된 학부모 ──
    console.log('\n[준비]');
    const admin = jar();
    if ((await login(admin, process.env.ADMIN_USERNAME!, process.env.ADMIN_PASSWORD!)).status !== 200) throw new Error('관리자 로그인 실패');
    const branchId = (await post(admin, '/api/admin/branches', { name: BRANCH_NAME, region: 'QA', status: 'PREPARING' })).data.id;
    const dirU = `${TAG}_dir`;
    await signup(dirU, 'V4원장', 'DIRECTOR', branchId);
    const dp = (await api(admin, '/api/admin/pending-users')).data.find((p: { name: string }) => p.name === 'V4원장');
    await post(admin, `/api/admin/users/${dp.userId}/approve`, {});
    const dir = jar(); await login(dir, dirU);
    await signup(`${TAG}_ins`, 'V4강사', 'INSTRUCTOR', branchId);
    const ip = await pendingOf(dir, 'V4강사');
    await post(dir, `/api/director/users/${ip.userId}/approve`, { studentIds: [] });
    const mk = async (name: string) => (await post(dir, '/api/students', { name, grade: '중2', school: 'V4중', instructorId: ip.userId })).data.id as string;
    const s1 = await mk('V4하늘');
    const sibling = await mk('V4바다');
    const s3 = await mk('V4구름');
    const s4 = await mk('V4별');

    // 이미 승인된 학부모 (형 V4바다의 부모)
    await signup(`${TAG}_par`, 'V4학부모', 'PARENT', branchId, { phone: PARENT_PHONE });
    const pp = await pendingOf(dir, 'V4학부모');
    await post(dir, `/api/director/users/${pp.userId}/approve`, { studentIds: [sibling] });
    const parentId = pp.userId as string;
    console.log(`  지점 ${BRANCH_NAME} / 학부모 연락처 ${PARENT_PHONE}`);

    browser = await chromium.launch({ channel: 'chrome', headless: !HEADED, slowMo: HEADED ? 250 : 0 });

    // ── 1. 학생 가입 신청 화면 ──
    console.log('\n[1] 학생 가입 신청 — 학부모 정보 입력');
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 1100 } });
    const sp = await ctx.newPage();
    lastPage = sp;
    await sp.goto(`${BASE}/sign-up`, { waitUntil: 'networkidle' });
    const stuU = `${TAG}_stu`;
    await sp.locator('input[placeholder="3자 이상"]').fill(stuU);
    await sp.getByRole('button', { name: '중복확인' }).click();
    await sp.waitForSelector('text=사용 가능한 아이디입니다', { timeout: 20_000 });
    await sp.locator('input[placeholder="이름을 입력하세요"]').fill('V4하늘');
    await sp.locator('input[placeholder="8자 이상"]').fill(PW);
    await sp.locator('input[placeholder="비밀번호 재입력"]').fill(PW);
    await sp.locator('input[placeholder="010-0000-0000"]').fill('010-2222-3333');
    await sp.locator('select').selectOption({ label: BRANCH_NAME });
    ok('학생 외 역할에는 학부모 정보 칸 없음', await sp.getByLabel('학부모 연락처').count() === 0);
    await sp.getByRole('button', { name: /^학생/ }).click();
    ok('학생 역할을 고르면 학부모 정보 칸 노출', await sp.getByLabel('학부모 연락처').count() === 1);
    await sp.getByLabel('학부모 이름').fill('V4학부모');
    // 하이픈 없이 적어도 학부모 계정(하이픈 포함)과 맞아야 한다
    await sp.getByLabel('학부모 연락처').fill(PARENT_PHONE.replace(/-/g, ''));
    await shot(sp, '1-signup-student');
    await sp.getByRole('button', { name: /가입 신청하기/ }).click();
    await sp.waitForURL(u => u.pathname === '/pending', { timeout: 30_000 });
    ok('가입 신청 완료 → 승인 대기 화면', sp.url().endsWith('/pending'));
    await ctx.close();
    const saved = await prisma.pendingUser.findFirst({ where: { branchId, name: 'V4하늘' } });
    ok('신청서에 학부모 정보 저장', saved?.parentName === 'V4학부모' && saved?.parentPhone === PARENT_PHONE.replace(/-/g, ''),
      `${saved?.parentName}/${saved?.parentPhone}`);

    // ── 2. 원장 승인 화면 ──
    console.log('\n[2] 원장 승인 — 학부모 자동 매칭');
    const dctx = await browser.newContext({ viewport: { width: 1280, height: 1100 } });
    const d = await dctx.newPage();
    lastPage = d;
    await d.goto(`${BASE}/sign-in`, { waitUntil: 'networkidle' });
    await d.locator('input').first().fill(dirU);
    await d.locator('input[type="password"]').first().fill(PW);
    await d.locator('button[type="submit"]').first().click();
    await d.waitForURL(u => !u.pathname.includes('sign-in'), { timeout: 30_000 });
    await d.goto(`${BASE}/director/users`, { waitUntil: 'networkidle' });
    await d.waitForSelector('text=V4하늘', { timeout: 60_000 });
    await d.waitForTimeout(1500);
    const card = d.locator('div.border.rounded-xl').filter({ has: d.locator(`[data-parent-link="${saved!.userId}"]`) });
    ok('학생 카드에 학생이 적은 학부모 정보 표시', await card.locator('text=학생이 적은 학부모').count() > 0);
    const parentBtn = card.locator(`[data-parent-link="${saved!.userId}"]`).getByRole('button', { name: /V4학부모/ });
    ok('연락처가 일치하는 학부모에 "일치" 표시', (await parentBtn.innerText()).includes('일치'), await parentBtn.innerText());
    ok('일치하는 학부모가 미리 선택됨', (await parentBtn.getAttribute('class'))?.includes('bg-slate-900') ?? false);
    await card.getByRole('button', { name: /V4하늘 · 중2/ }).click();
    await card.scrollIntoViewIfNeeded();
    await shot(d, '2-approve-student-card');
    await card.getByRole('button', { name: /^승인$/ }).click();
    await d.waitForSelector(`[data-parent-link="${saved!.userId}"]`, { state: 'detached', timeout: 60_000 });

    const stuUser = await prisma.user.findUnique({ where: { username: stuU } });
    ok('학생 계정 승인 + 프로필 연결', stuUser?.role === 'STUDENT' && stuUser.studentProfileId === s1, `${stuUser?.role}/${stuUser?.studentProfileId}`);
    const prof = await prisma.student.findUnique({ where: { id: s1 }, include: { parents: { select: { id: true } } } });
    ok('학생 프로필에 학부모 연결', !!prof?.parents.some(x => x.id === parentId), JSON.stringify(prof?.parents));
    const parentKids = await prisma.user.findUnique({ where: { id: parentId }, include: { children: { select: { id: true } } } });
    ok('학부모의 기존 자녀(형)는 그대로 유지', parentKids?.children.length === 2 && parentKids.children.some(c => c.id === sibling),
      `${parentKids?.children.length}명`);
    const par = jar(); await login(par, `${TAG}_par`);
    const kids = (await api(par, `/api/students?parentId=${parentId}`)).data;
    ok('학부모 화면에서 새 자녀가 보임', Array.isArray(kids) && kids.some((k: { id: string }) => k.id === s1), `${kids?.length}명`);

    // ── 3. 반대 순서: 학생 먼저 승인, 학부모 나중 가입 ──
    console.log('\n[3] 학생 먼저 → 학부모 나중 가입');
    await signup(`${TAG}_stu2`, 'V4구름', 'STUDENT', branchId, { parentName: 'V4늦은학부모', parentPhone: LATE_PARENT_PHONE });
    const st2 = await pendingOf(dir, 'V4구름');
    ok('일치하는 학부모가 없으면 후보 없음', Array.isArray(st2.suggestedParentIds) && st2.suggestedParentIds.length === 0);
    const a2 = await post(dir, `/api/director/users/${st2.userId}/approve`, { studentIds: [s3], parentIds: [] });
    ok('학부모 없이도 학생 승인 가능', a2.status === 200, `status=${a2.status}`);
    await signup(`${TAG}_par2`, 'V4늦은학부모', 'PARENT', branchId, { phone: LATE_PARENT_PHONE });
    const p2 = await pendingOf(dir, 'V4늦은학부모');
    ok('학부모 신청에 자녀 후보(V4구름) 제안', Array.isArray(p2.suggestedStudentIds) && p2.suggestedStudentIds.includes(s3), JSON.stringify(p2.suggestedStudentIds));

    await d.reload({ waitUntil: 'networkidle' });
    await d.waitForSelector('text=V4늦은학부모', { timeout: 60_000 });
    await d.waitForTimeout(1500);
    const pcard = d.locator('div.border.rounded-xl').filter({ hasText: 'V4늦은학부모' }).first();
    ok('학부모 카드에 "자녀를 미리 선택했습니다" 안내', await pcard.locator('text=자녀를 미리 선택했습니다').count() > 0);
    ok('학부모 카드에 V4구름 미리 선택', (await pcard.getByRole('button', { name: /V4구름 · 중2/ }).getAttribute('class'))?.includes('bg-slate-900') ?? false);
    await pcard.scrollIntoViewIfNeeded();
    await shot(d, '3-approve-parent-card');
    await pcard.getByRole('button', { name: /^승인$/ }).click();
    await d.waitForTimeout(3000);
    const late = await prisma.user.findUnique({ where: { id: p2.userId }, include: { children: { select: { id: true } } } });
    ok('학부모 승인 → 미리 선택된 자녀 연결', late?.role === 'PARENT' && late.children.some(c => c.id === s3), JSON.stringify(late?.children));

    // ── 4. 연락처가 맞지 않을 때 ──
    console.log('\n[4] 일치하는 학부모가 없을 때');
    await signup(`${TAG}_stu3`, 'V4별', 'STUDENT', branchId, { parentName: '모르는분', parentPhone: '010-0000-1111' });
    await d.reload({ waitUntil: 'networkidle' });
    await d.waitForSelector('text=V4별', { timeout: 60_000 });
    await d.waitForTimeout(1500);
    const st3 = await pendingOf(dir, 'V4별');
    const ncard = d.locator('div.border.rounded-xl').filter({ has: d.locator(`[data-parent-link="${st3.userId}"]`) });
    ok('일치 실패 시 "직접 골라 주세요" 안내', await ncard.locator('text=찾지 못했습니다').count() > 0);
    ok('일치 실패 시 미리 선택 없음', await ncard.locator(`[data-parent-link="${st3.userId}"] button.bg-slate-900`).count() === 0);
    await shot(d, '4-no-match');

    // ── 5. 권한·검증 ──
    console.log('\n[5] 검증');
    const other = await prisma.user.findFirst({ where: { role: 'PARENT', branchId: { not: branchId } }, select: { id: true } });
    if (other) {
      const r = await post(dir, `/api/director/users/${st3.userId}/approve`, { studentIds: [s4], parentIds: [other.id] });
      ok('다른 지점 학부모 연결 시도 → 400', r.status === 400, `status=${r.status}`);
    }
    const r2 = await post(dir, `/api/director/users/${st3.userId}/approve`, { studentIds: [s4], parentIds: [ip.userId] });
    ok('학부모가 아닌 계정 연결 시도 → 400', r2.status === 400, `status=${r2.status}`);
    const stillPending = await prisma.pendingUser.findFirst({ where: { userId: st3.userId } });
    ok('검증 실패 시 승인되지 않음', stillPending?.status === 'PENDING', stillPending?.status);
    await signup(`${TAG}_par3`, 'V4다른학부모', 'PARENT', branchId, { parentName: '무시', parentPhone: '010-1111-1111' });
    const p3 = await pendingOf(dir, 'V4다른학부모');
    const r3 = await post(dir, `/api/director/users/${p3.userId}/approve`, { studentIds: [s4], parentIds: [parentId] });
    ok('학부모 신청에 parentIds 를 보내면 → 400', r3.status === 400, `status=${r3.status}`);
    const p3row = await prisma.pendingUser.findFirst({ where: { userId: p3.userId } });
    ok('학생이 아닌 신청에는 학부모 정보를 저장하지 않음', p3row?.parentName === null && p3row?.parentPhone === null);
    const parentTries = await api(par, '/api/director/pending-users');
    ok('학부모가 가입 승인 목록 조회 → 403', parentTries.status === 403, `status=${parentTries.status}`);
    await dctx.close();
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
