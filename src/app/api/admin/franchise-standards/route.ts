import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getCurrentAppUser } from '@/lib/auth';

export async function GET() {
  try {
    const user = await getCurrentAppUser();
    if (user?.role !== 'ADMIN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    const rows = await prisma.franchiseStandard.findMany();
    return NextResponse.json(rows);
  } catch (e) {
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const user = await getCurrentAppUser();
    if (user?.role !== 'ADMIN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const { items } = await req.json();
    if (!Array.isArray(items)) return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });

    const valid = items.filter(
      (it): it is { key: string; value: string } => typeof it?.key === 'string' && typeof it?.value === 'string'
    );

    await prisma.$transaction(
      valid.map(it =>
        prisma.franchiseStandard.upsert({
          where: { key: it.key },
          update: { value: it.value },
          create: { key: it.key, value: it.value },
        })
      )
    );

    return NextResponse.json({ success: true });
  } catch (e) {
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
