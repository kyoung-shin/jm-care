import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getCurrentAppUser } from '@/lib/auth';

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string; trackId: string }> }
) {
  try {
    const user = await getCurrentAppUser();
    if (user?.role !== 'ADMIN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const { id, trackId } = await params;
    const existing = await prisma.admissionTrack.findUnique({ where: { id: trackId } });
    if (!existing || existing.schoolId !== id) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const {
      name, period, type, method, csatMinCriteria, koreanHistory,
      targetGrade, targetCsatMinRate, targetRecordCount, status, source,
    } = await req.json();

    const data: {
      name?: string; period?: string; type?: string | null; method?: string | null;
      csatMinCriteria?: string | null; koreanHistory?: string | null;
      targetGrade?: number | null; targetCsatMinRate?: number | null; targetRecordCount?: number | null;
      status?: 'VERIFIED' | 'REVIEW' | 'DRAFT'; source?: string | null; updatedBy?: string;
    } = {};
    if (typeof name === 'string' && name.trim()) data.name = name.trim();
    if (typeof period === 'string' && period.trim()) data.period = period.trim();
    if (typeof type === 'string' || type === null) data.type = type ? type.trim() || null : null;
    if (typeof method === 'string' || method === null) data.method = method ? method.trim() || null : null;
    if (typeof csatMinCriteria === 'string' || csatMinCriteria === null) data.csatMinCriteria = csatMinCriteria ? csatMinCriteria.trim() || null : null;
    if (typeof koreanHistory === 'string' || koreanHistory === null) data.koreanHistory = koreanHistory ? koreanHistory.trim() || null : null;
    if (targetGrade !== undefined) data.targetGrade = targetGrade !== '' && !Number.isNaN(Number(targetGrade)) ? Number(targetGrade) : null;
    if (targetCsatMinRate !== undefined) data.targetCsatMinRate = targetCsatMinRate !== '' && Number.isInteger(Number(targetCsatMinRate)) ? Number(targetCsatMinRate) : null;
    if (targetRecordCount !== undefined) data.targetRecordCount = targetRecordCount !== '' && Number.isInteger(Number(targetRecordCount)) ? Number(targetRecordCount) : null;
    if (status === 'VERIFIED' || status === 'REVIEW' || status === 'DRAFT') data.status = status;
    if (typeof source === 'string' || source === null) data.source = source ? source.trim() || null : null;
    data.updatedBy = user.name;

    const track = await prisma.admissionTrack.update({ where: { id: trackId }, data });
    return NextResponse.json(track);
  } catch (e) {
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string; trackId: string }> }
) {
  try {
    const user = await getCurrentAppUser();
    if (user?.role !== 'ADMIN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const { id, trackId } = await params;
    const existing = await prisma.admissionTrack.findUnique({ where: { id: trackId } });
    if (!existing || existing.schoolId !== id) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    await prisma.admissionTrack.delete({ where: { id: trackId } });
    return NextResponse.json({ success: true });
  } catch (e) {
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
