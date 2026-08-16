import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getCurrentAppUser } from '@/lib/auth';

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentAppUser();
    if (user?.role !== 'ADMIN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const { id } = await params;
    const tracks = await prisma.admissionTrack.findMany({ where: { schoolId: id }, orderBy: { updatedAt: 'desc' } });
    return NextResponse.json(tracks);
  } catch (e) {
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentAppUser();
    if (user?.role !== 'ADMIN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const { id } = await params;
    const school = await prisma.admissionSchool.findUnique({ where: { id } });
    if (!school) return NextResponse.json({ error: 'School not found' }, { status: 404 });

    const {
      name, period, type, method, csatMinCriteria, koreanHistory,
      targetGrade, targetCsatMinRate, targetRecordCount, status, source,
    } = await req.json();

    if (typeof name !== 'string' || !name.trim()) {
      return NextResponse.json({ error: '전형명을 입력해 주세요' }, { status: 400 });
    }
    if (typeof period !== 'string' || !period.trim()) {
      return NextResponse.json({ error: '모집시기를 선택해 주세요' }, { status: 400 });
    }

    const track = await prisma.admissionTrack.create({
      data: {
        schoolId: id,
        name: name.trim(),
        period: period.trim(),
        type: typeof type === 'string' && type.trim() ? type.trim() : null,
        method: typeof method === 'string' && method.trim() ? method.trim() : null,
        csatMinCriteria: typeof csatMinCriteria === 'string' && csatMinCriteria.trim() ? csatMinCriteria.trim() : null,
        koreanHistory: typeof koreanHistory === 'string' && koreanHistory.trim() ? koreanHistory.trim() : null,
        targetGrade: targetGrade !== undefined && targetGrade !== '' && !Number.isNaN(Number(targetGrade)) ? Number(targetGrade) : null,
        targetCsatMinRate: targetCsatMinRate !== undefined && targetCsatMinRate !== '' && Number.isInteger(Number(targetCsatMinRate)) ? Number(targetCsatMinRate) : null,
        targetRecordCount: targetRecordCount !== undefined && targetRecordCount !== '' && Number.isInteger(Number(targetRecordCount)) ? Number(targetRecordCount) : null,
        status: status === 'VERIFIED' || status === 'REVIEW' ? status : 'DRAFT',
        source: typeof source === 'string' && source.trim() ? source.trim() : null,
        updatedBy: user.name,
      },
    });
    return NextResponse.json(track, { status: 201 });
  } catch (e) {
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
