import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET() {
  const branches = await prisma.branch.findMany({
    select: { id: true, name: true, users: { where: { role: 'DIRECTOR' }, select: { id: true }, take: 1 } },
    orderBy: { name: 'asc' },
  });
  const result = branches.map(({ users, ...b }) => ({ ...b, hasDirector: users.length > 0 }));
  return NextResponse.json(result);
}
