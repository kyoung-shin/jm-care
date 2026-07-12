import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getCurrentAppUser } from '@/lib/auth';

export async function GET() {
  try {
    const user = await getCurrentAppUser();
    if (user?.role !== 'ADMIN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    const branches = await prisma.branch.findMany({
      include: {
        _count: { select: { users: true, students: true } },
        users: { where: { role: { in: ['DIRECTOR', 'INSTRUCTOR'] } }, select: { name: true, role: true } },
      },
    });
    const result = branches.map(({ users, ...b }) => ({
      ...b,
      directorName: users.find(u => u.role === 'DIRECTOR')?.name ?? null,
      instructorCount: users.filter(u => u.role === 'INSTRUCTOR').length,
    }));
    return NextResponse.json(result);
  } catch (e) {
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const user = await getCurrentAppUser();
    if (user?.role !== 'ADMIN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    const { name, region, status } = await req.json();
    const branch = await prisma.branch.create({
      data: {
        name,
        region: region || null,
        ...(status && ['ACTIVE', 'PREPARING', 'CLOSING'].includes(status) ? { status } : {}),
      },
    });
    return NextResponse.json(branch, { status: 201 });
  } catch (e) {
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
