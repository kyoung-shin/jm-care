import { NextRequest, NextResponse } from 'next/server';
import { getCurrentAppUser } from '@/lib/auth';
import { prisma } from '@/lib/db';
import type { Role } from '@/generated/prisma/client';

const VALID_ROLES: Role[] = ['PENDING', 'ADMIN', 'DIRECTOR', 'INSTRUCTOR', 'PARENT', 'STUDENT'];
const STAFF_ROLES = ['ADMIN', 'DIRECTOR', 'INSTRUCTOR'];

// 화면에 필요한 필드만 내려보낸다. passwordHash 는 절대 포함하지 않는다.
const PUBLIC_USER_FIELDS = {
  id: true,
  name: true,
  role: true,
  phone: true,
  email: true,
  branchId: true,
  createdAt: true,
  branch: { select: { id: true, name: true } },
  _count: { select: { students: true } },
} as const;

/**
 * 직원 명부 조회. 강사 선택 드롭다운·모달에서 쓴다.
 *
 *   ADMIN               전체
 *   DIRECTOR·INSTRUCTOR 본인 지점
 *   그 외                조회 불가
 */
export async function GET(req: NextRequest) {
  const caller = await getCurrentAppUser();
  if (!caller) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!STAFF_ROLES.includes(caller.role)) {
    return NextResponse.json({ error: '회원 목록을 볼 권한이 없습니다' }, { status: 403 });
  }

  const roleParam = req.nextUrl.searchParams.get('role');
  const role = roleParam && VALID_ROLES.includes(roleParam as Role) ? (roleParam as Role) : null;
  const branchId = req.nextUrl.searchParams.get('branchId');

  // 본사가 아니면 본인 지점으로 고정한다. 화면이 넘긴 branchId 는 그 안에서만 좁힐 수 있다.
  const scope = caller.role === 'ADMIN' ? {} : { branchId: caller.branchId ?? '__none__' };

  try {
    const users = await prisma.user.findMany({
      where: {
        AND: [
          scope,
          {
            ...(role ? { role } : {}),
            ...(branchId ? { branchId } : {}),
          },
        ],
      },
      select: PUBLIC_USER_FIELDS,
      orderBy: { createdAt: 'desc' },
    });
    return NextResponse.json(users);
  } catch {
    return NextResponse.json({ error: '회원 목록을 불러오지 못했습니다' }, { status: 500 });
  }
}

// POST 는 제거했다. 요청 본문을 그대로 prisma.user.create 에 넘기고 있어
// 로그인한 누구나 role: 'ADMIN' 계정을 만들 수 있었고, 호출하는 화면도 없었다.
// 계정 생성은 /api/auth/signup → 승인 흐름을 쓴다.
