import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getCurrentAppUser } from '@/lib/auth';
import { Prisma } from '@/generated/prisma/client';

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentAppUser();
    if (user?.role !== 'ADMIN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const { id } = await params;
    const { name, dept, year, typesCount, status, source, mergeInto } = await req.json();

    const current = await prisma.admissionSchool.findUnique({ where: { id } });
    if (!current) return NextResponse.json({ error: '학교를 찾을 수 없습니다' }, { status: 404 });

    // 같은 학년도에 바꾸려는 이름의 학교가 이미 있을 때, 사용자가 "합치기"를 고르면
    // 이 학교의 전형을 기존 학교로 옮기고 이 학교는 지운다.
    if (typeof mergeInto === 'string' && mergeInto) {
      const target = await prisma.admissionSchool.findUnique({ where: { id: mergeInto } });
      if (!target || target.id === id) {
        return NextResponse.json({ error: '합칠 학교를 찾을 수 없습니다' }, { status: 404 });
      }
      const merged = await prisma.$transaction(async tx => {
        await tx.admissionTrack.updateMany({ where: { schoolId: id }, data: { schoolId: target.id } });
        await tx.admissionSchool.delete({ where: { id } });
        const count = await tx.admissionTrack.count({ where: { schoolId: target.id } });
        return tx.admissionSchool.update({
          where: { id: target.id },
          data: { typesCount: count, updatedBy: user.name },
        });
      });
      return NextResponse.json({ ...merged, merged: true });
    }

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

    // 학교명+학년도는 유일해야 한다. 예전에는 겹치면 500 으로 끝나 "이름 수정이 안 된다"로 보였다.
    const nextName = data.name ?? current.name;
    const nextYear = data.year ?? current.year;
    if (nextName !== current.name || nextYear !== current.year) {
      const clash = await prisma.admissionSchool.findUnique({
        where: { name_year: { name: nextName, year: nextYear } },
        include: { _count: { select: { tracks: true } } },
      });
      if (clash && clash.id !== id) {
        const mine = await prisma.admissionTrack.count({ where: { schoolId: id } });
        return NextResponse.json(
          {
            error: `${nextYear}학년도에 '${nextName}' 학교가 이미 등록되어 있습니다`,
            code: 'DUPLICATE_NAME',
            existing: { id: clash.id, name: clash.name, year: clash.year, trackCount: clash._count.tracks },
            trackCount: mine,
          },
          { status: 409 }
        );
      }
    }

    const school = await prisma.admissionSchool.update({ where: { id }, data });
    return NextResponse.json(school);
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
      return NextResponse.json({ error: '같은 학년도에 같은 이름의 학교가 이미 있습니다', code: 'DUPLICATE_NAME' }, { status: 409 });
    }
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

/** 학교와 그 학교의 전형을 모두 지운다 (전형은 onDelete: Cascade) */
export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentAppUser();
    if (user?.role !== 'ADMIN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    const { id } = await params;
    const school = await prisma.admissionSchool.findUnique({ where: { id }, include: { _count: { select: { tracks: true } } } });
    if (!school) return NextResponse.json({ error: '학교를 찾을 수 없습니다' }, { status: 404 });
    await prisma.admissionSchool.delete({ where: { id } });
    return NextResponse.json({ success: true, deletedTracks: school._count.tracks });
  } catch (e) {
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
