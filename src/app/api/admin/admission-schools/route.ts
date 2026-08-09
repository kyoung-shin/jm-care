import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getCurrentAppUser } from '@/lib/auth';

export async function GET() {
  try {
    const user = await getCurrentAppUser();
    if (user?.role !== 'ADMIN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    const schools = await prisma.admissionSchool.findMany({ orderBy: { updatedAt: 'desc' } });
    return NextResponse.json(schools);
  } catch (e) {
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const user = await getCurrentAppUser();
    if (user?.role !== 'ADMIN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const { name, dept, year, typesCount, status, source } = await req.json();
    if (typeof name !== 'string' || !name.trim()) {
      return NextResponse.json({ error: '학교 이름을 입력해 주세요' }, { status: 400 });
    }
    const yearNum = Number(year);
    if (!Number.isInteger(yearNum)) {
      return NextResponse.json({ error: '학년도를 올바르게 입력해 주세요' }, { status: 400 });
    }

    const school = await prisma.admissionSchool.create({
      data: {
        name: name.trim(),
        dept: typeof dept === 'string' && dept.trim() ? dept.trim() : null,
        year: yearNum,
        typesCount: Number.isInteger(Number(typesCount)) ? Number(typesCount) : 0,
        status: status === 'VERIFIED' || status === 'REVIEW' ? status : 'DRAFT',
        source: typeof source === 'string' && source.trim() ? source.trim() : null,
        updatedBy: user.name,
      },
    });
    return NextResponse.json(school, { status: 201 });
  } catch (e) {
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
