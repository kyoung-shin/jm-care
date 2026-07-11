import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/db';
import { createSessionToken, SESSION_COOKIE } from '@/lib/session';

export async function POST(req: Request) {
  try {
    const { username, password } = await req.json();
    if (typeof username !== 'string' || typeof password !== 'string') {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({ where: { username } });
    if (!user || !user.passwordHash) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    const token = await createSessionToken(user.id);
    const store = await cookies();
    store.set(SESSION_COOKIE, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 30,
    });

    return NextResponse.json({ success: true, role: user.role });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
