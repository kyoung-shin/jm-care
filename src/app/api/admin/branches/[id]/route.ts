import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getCurrentAppUser } from '@/lib/auth';

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentAppUser();
    if (user?.role !== 'ADMIN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const { id } = await params;
    const { name, region, status } = await req.json();

    const data: { name?: string; region?: string | null; status?: 'ACTIVE' | 'PREPARING' | 'CLOSING' } = {};
    if (typeof name === 'string' && name.trim()) data.name = name;
    if (typeof region === 'string' || region === null) data.region = region || null;
    if (status && ['ACTIVE', 'PREPARING', 'CLOSING'].includes(status)) data.status = status;

    const branch = await prisma.branch.update({ where: { id }, data });
    return NextResponse.json(branch);
  } catch (e) {
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
