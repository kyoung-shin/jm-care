import { NextRequest, NextResponse } from 'next/server';
import { getSessionUserId } from '@/lib/auth';
import { prisma } from '@/lib/db';
import type { Role } from '@/generated/prisma/client';

const VALID_ROLES: Role[] = ['PENDING', 'ADMIN', 'DIRECTOR', 'INSTRUCTOR', 'PARENT', 'STUDENT'];

export async function GET(req: NextRequest) {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const roleParam = req.nextUrl.searchParams.get('role');
  const role = roleParam && VALID_ROLES.includes(roleParam as Role) ? (roleParam as Role) : null;
  const branchId = req.nextUrl.searchParams.get('branchId');

  try {
    const users = await prisma.user.findMany({
      where: {
        ...(role ? { role } : {}),
        ...(branchId ? { branchId } : {}),
      },
      include: {
        branch: { select: { id: true, name: true } },
        _count: { select: { students: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
    return NextResponse.json(users);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const body = await req.json();
    const user = await prisma.user.create({ data: body });
    return NextResponse.json(user, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to create user' }, { status: 500 });
  }
}
