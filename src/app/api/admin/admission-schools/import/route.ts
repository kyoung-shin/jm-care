import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getCurrentAppUser } from '@/lib/auth';
import { parseCsv, findHeaderRow, toRecords, cell, num, int } from '@/lib/csv';

export const runtime = 'nodejs';

/**
 * 입시 전형 CSV 일괄 등록 — 기존 내용에 "추가"한다.
 * 이미 등록된 학교·전형은 지우지 않으며, 파일에 있는 항목만 더하거나 갱신한다.
 * 한 행이 "학교 + 전형 하나"라서 같은 학교는 묶어 한 번만 만들고 전형을 붙인다.
 * 같은 학교·연도·전형명·모집방법·계열은 덮어쓴다(같은 파일을 다시 올려도 중복이 쌓이지 않게).
 */
export async function POST(req: Request) {
  const caller = await getCurrentAppUser();
  if (caller?.role !== 'ADMIN') {
    return NextResponse.json({ error: '본사 관리자만 업로드할 수 있습니다' }, { status: 403 });
  }

  try {
    const form = await req.formData();
    const file = form.get('file');
    if (!(file instanceof File)) {
      return NextResponse.json({ error: 'CSV 파일을 선택해 주세요' }, { status: 400 });
    }
    const year = Number(form.get('year')) || new Date().getFullYear() + 1;

    const rows = parseCsv(await file.text());
    const headerIdx = findHeaderRow(rows, '학교');
    if (headerIdx < 0) {
      return NextResponse.json(
        { error: '헤더를 찾지 못했습니다. 첫 칸이 "학교"인 행이 있어야 합니다' },
        { status: 400 }
      );
    }
    const records = toRecords(rows, headerIdx);
    if (records.length === 0) {
      return NextResponse.json({ error: '등록할 행이 없습니다' }, { status: 400 });
    }

    const errors: string[] = [];
    let newSchools = 0;
    let newTracks = 0;
    let updatedTracks = 0;
    const seenSchools = new Map<string, string>();

    for (const [i, r] of records.entries()) {
      const line = headerIdx + 2 + i;
      const schoolName = cell(r['학교']);
      const trackName = cell(r['전형명']);
      if (!schoolName) { errors.push(`${line}행: 학교명이 비어 있습니다`); continue; }
      if (!trackName) { errors.push(`${line}행: 전형명이 비어 있습니다`); continue; }

      const verified = (r['확인'] ?? '').includes('검증완료');
      const status = verified ? 'VERIFIED' as const : 'DRAFT' as const;

      let schoolId = seenSchools.get(schoolName);
      if (!schoolId) {
        const before = await prisma.admissionSchool.findUnique({
          where: { name_year: { name: schoolName, year } },
          select: { id: true },
        });
        const school = await prisma.admissionSchool.upsert({
          where: { name_year: { name: schoolName, year } },
          update: {
            level: cell(r['학교급']),
            region: cell(r['지역']),
            dept: cell(r['계열/전공']),
            source: cell(r['출처']),
            updatedBy: caller.name,
          },
          create: {
            name: schoolName,
            year,
            level: cell(r['학교급']),
            region: cell(r['지역']),
            dept: cell(r['계열/전공']),
            source: cell(r['출처']),
            updatedBy: caller.name,
            status: 'DRAFT',
          },
        });
        schoolId = school.id;
        seenSchools.set(schoolName, schoolId);
        if (!before) newSchools++;
      }

      const data = {
        schoolId,
        name: trackName,
        period: cell(r['모집방법']) ?? '수시',
        type: cell(r['전형유형']),
        method: cell(r['전형방법(요약)']),
        csatMinCriteria: cell(r['기준(수능최저)']),
        koreanHistory: cell(r['기준(한국사)']),
        dept: cell(r['계열/전공']),
        extraCriteria: cell(r['추가반영']),
        recordRatio: cell(r['반영비율(학생부)']),
        reflectKorean: cell(r['반영여부(국어)']),
        reflectMath: cell(r['반영여부(수학)']),
        reflectEnglish: cell(r['반영여부(영어)']),
        reflectSocial: cell(r['반영여부(사회)']),
        reflectScience: cell(r['반영여부(과학)']),
        reflectHistory: cell(r['반영여부(한국사)']),
        reflectRecord: cell(r['반영여부(내신)']),
        expectedGrade: num(r['에상입결(내신등급)'] ?? r['예상입결(내신등급)']),
        expectedStandard: int(r['에상입결(표준점수)'] ?? r['예상입결(표준점수)']),
        expectedPercentile: num(r['에상입결(백분위)'] ?? r['예상입결(백분위)']),
        verifiedAt: cell(r['검증일']),
        source: cell(r['출처']),
        updatedBy: caller.name,
        status,
      };

      // 같은 학교의 같은 전형명·모집방법·계열은 갱신한다
      const existing = await prisma.admissionTrack.findFirst({
        where: { schoolId, name: trackName, period: data.period, dept: data.dept },
        select: { id: true },
      });
      if (existing) { await prisma.admissionTrack.update({ where: { id: existing.id }, data }); updatedTracks++; }
      else { await prisma.admissionTrack.create({ data }); newTracks++; }
    }

    // 학교별 전형 수와 상태를 다시 계산한다
    for (const schoolId of seenSchools.values()) {
      const tracks = await prisma.admissionTrack.findMany({ where: { schoolId }, select: { status: true } });
      await prisma.admissionSchool.update({
        where: { id: schoolId },
        data: {
          typesCount: tracks.length,
          status: tracks.length > 0 && tracks.every(t => t.status === 'VERIFIED') ? 'VERIFIED' : 'DRAFT',
        },
      });
    }

    const totalSchools = await prisma.admissionSchool.count({ where: { year } });
    const totalTracks = await prisma.admissionTrack.count({ where: { school: { year } } });

    return NextResponse.json({
      mode: 'append',
      newSchools,
      newTracks,
      updatedTracks,
      totalSchools,
      totalTracks,
      rowCount: records.length,
      errors,
    });
  } catch (e) {
    console.error('[admission import]', e);
    return NextResponse.json({ error: 'CSV 처리 중 오류가 발생했습니다' }, { status: 500 });
  }
}
