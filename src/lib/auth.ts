import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { SESSION_COOKIE, verifySessionToken } from '@/lib/session';

export async function getSessionUserId(): Promise<string | null> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  return verifySessionToken(token);
}

export async function getCurrentAppUser() {
  const userId = await getSessionUserId();
  if (!userId) return null;
  return prisma.user.findUnique({ where: { id: userId }, include: { branch: true } });
}

type StudentScope = {
  id: string;
  branchId: string;
  instructorId: string;
  parents: { id: string }[];
};

export type StudentAccess =
  | {
      ok: true;
      user: NonNullable<Awaited<ReturnType<typeof getCurrentAppUser>>>;
      student: StudentScope;
      /** 학생 기록을 수정할 수 있는 직원인지 (본사·원장·강사) */
      canWrite: boolean;
    }
  | { ok: false; status: 401 | 403 | 404; error: string };

const STAFF_ROLES = ['ADMIN', 'DIRECTOR', 'INSTRUCTOR'];

/**
 * 한 학생의 정보에 접근할 수 있는지 판정한다.
 *
 *   ADMIN       전체
 *   DIRECTOR    본인 지점 학생
 *   INSTRUCTOR  본인 지점 학생 (강사 화면이 지점 단위로 동작한다)
 *   PARENT      본인 자녀
 *   STUDENT     본인 프로필
 *   PENDING     없음
 */
export async function authorizeStudentAccess(studentId: string): Promise<StudentAccess> {
  const user = await getCurrentAppUser();
  if (!user) return { ok: false, status: 401, error: 'Unauthorized' };

  const student = await prisma.student.findUnique({
    where: { id: studentId },
    select: { id: true, branchId: true, instructorId: true, parents: { select: { id: true } } },
  });
  if (!student) return { ok: false, status: 404, error: '학생을 찾을 수 없습니다' };

  let allowed = false;
  switch (user.role) {
    case 'ADMIN':
      allowed = true;
      break;
    case 'DIRECTOR':
    case 'INSTRUCTOR':
      allowed = !!user.branchId && student.branchId === user.branchId;
      break;
    case 'PARENT':
      allowed = student.parents.some(p => p.id === user.id);
      break;
    case 'STUDENT':
      allowed = user.studentProfileId === student.id;
      break;
    default:
      allowed = false;
  }

  if (!allowed) return { ok: false, status: 403, error: '이 학생의 정보를 볼 권한이 없습니다' };
  return { ok: true, user, student, canWrite: STAFF_ROLES.includes(user.role) };
}

/** 권한 판정 실패를 그대로 응답으로 바꾼다 */
export function studentAccessError(access: Extract<StudentAccess, { ok: false }>) {
  return NextResponse.json({ error: access.error }, { status: access.status });
}

/** 학생 기록 수정 권한이 없을 때의 응답 */
export function writeForbidden() {
  return NextResponse.json({ error: '학생 기록을 수정할 권한이 없습니다' }, { status: 403 });
}

/**
 * 학생 목록 조회에 씌울 범위 조건.
 * 호출자가 볼 수 있는 학생만 남기고, 화면이 넘긴 필터는 그 위에 얹는다.
 * null 을 돌려주면 볼 수 있는 학생이 없다는 뜻이다.
 */
export function studentListScope(
  user: NonNullable<Awaited<ReturnType<typeof getCurrentAppUser>>>
): Record<string, unknown> | null {
  switch (user.role) {
    case 'ADMIN':
      return {};
    case 'DIRECTOR':
    case 'INSTRUCTOR':
      return user.branchId ? { branchId: user.branchId } : null;
    case 'PARENT':
      return { parents: { some: { id: user.id } } };
    case 'STUDENT':
      return user.studentProfileId ? { id: user.studentProfileId } : null;
    default:
      return null;
  }
}
