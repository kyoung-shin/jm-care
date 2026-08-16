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
    const { name, dept, year, typesCount, status, source } = await req.json();

    const data: {
      name?: string;
      dept?: string | null;
      year?: number;
      typesCount?: number;
      status?: 'VERIFIED' | 'REVIEW' | 'DRAFT';
      source?: string | null;
      updatedBy?: string;
    } = {};
    if (typeof name === 'string' && name.trim()) data.name = name.trim();
    if (typeof dept === 'string' || dept === null) data.dept = dept ? dept.trim() || null : null;
    if (year !== undefined) {
      const yearNum = Number(year);
      if (!Number.isInteger(yearNum)) return NextResponse.json({ error: '학년도를 올바르게 입력해 주세요' }, { status: 400 });
      data.year = yearNum;
    }
    if (typesCount !== undefined && Number.isInteger(Number(typesCount))) data.typesCount = Number(typesCount);
    if (status === 'VERIFIED' || status === 'REVIEW' || status === 'DRAFT') data.status = status;
    if (typeof source === 'string' || source === null) data.source = source ? source.trim() || null : null;
    data.updatedBy = user.name;

    const school = await prisma.admissionSchool.update({ where: { id }, data });
    return NextResponse.json(school);
  } catch (e) {
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
