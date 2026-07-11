import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/db';
import { createSessionToken, SESSION_COOKIE } from '@/lib/session';

export async function POST(req: Request) {
  try {
    const { username, password, name, phone, email, requestedRole, branchId, reason } = await req.json();

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

    const passwordHash = await bcrypt.hash(password, 10);

    const user = await prisma.$transaction(async tx => {
      const created = await tx.user.create({
        data: { username, passwordHash, name, phone, email: email || null, role: 'PENDING', branchId },
      });
      await tx.pendingUser.create({
        data: { userId: created.id, name, email: email || null, phone, requestedRole, branchId, reason },
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
