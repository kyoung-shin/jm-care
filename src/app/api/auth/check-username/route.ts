import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const username = searchParams.get('username') || '';

  if (username.length < 3) {
    return NextResponse.json({ error: 'Username must be at least 3 characters' }, { status: 400 });
  }

  const existing = await prisma.user.findUnique({ where: { username } });
  return NextResponse.json({ available: !existing });
}
