import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/db';
import { createSessionToken, SESSION_COOKIE } from '@/lib/session';

export async function POST(req: Request) {
  try {
    const { username, password, name, phone, email, requestedRole, branchId, reason, parentName, parentPhone } = await req.json();

    if (!['DIRECTOR', 'INSTRUCTOR', 'PARENT', 'STUDENT'].includes(requestedRole)) {
      return NextResponse.json({ error: 'Invalid role' }, { status: 400 });
    }
    if (!branchId) {
      return NextResponse.json({ error: 'Branch is required' }, { status: 400 });
    }
    if (!name) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 });
    }
    if (typeof username !== 'string' || username.length < 3) {
      return NextResponse.json({ error: 'Username must be at least 3 characters' }, { status: 400 });
    }
    if (typeof password !== 'string' || password.length < 8) {
      return NextResponse.json({ error: 'Password must be at least 8 characters' }, { status: 400 });
    }

    const existing = await prisma.user.findUnique({ where: { username } });
    if (existing) {
      return NextResponse.json({ error: 'Username already taken' }, { status: 409 });
    }

    if (requestedRole === 'DIRECTOR') {
      const existingDirector = await prisma.user.findFirst({ where: { branchId, role: 'DIRECTOR' } });
      if (existingDirector) {
        return NextResponse.json({ error: '이미 원장이 있는 지점입니다' }, { status: 409 });
      }
    }

    // 학부모 정보는 학생 신청에서만 받는다 (승인 시 학부모 계정과 맞춰 보는 용도)
    const clean = (v: unknown) => (typeof v === 'string' && v.trim() ? v.trim().slice(0, 50) : null);
    const parentInfo = requestedRole === 'STUDENT'
      ? { parentName: clean(parentName), parentPhone: clean(parentPhone) }
      : {};

    const passwordHash = await bcrypt.hash(password, 10);

    const user = await prisma.$transaction(async tx => {
      const created = await tx.user.create({
        data: { username, passwordHash, name, phone, email: email || null, role: 'PENDING', branchId },
      });
      await tx.pendingUser.create({
        data: { userId: created.id, name, email: email || null, phone, requestedRole, branchId, reason, ...parentInfo },
      });
      return created;
    });

    const token = await createSessionToken(user.id);
    const store = await cookies();
    store.set(SESSION_COOKIE, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 30,
    });

    return NextResponse.json({ success: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
