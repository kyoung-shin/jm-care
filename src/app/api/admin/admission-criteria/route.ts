import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getCurrentAppUser, getSessionUserId } from '@/lib/auth';
import { parseCsv, findHeaderRow, toRecords, cell, num } from '@/lib/csv';

export const runtime = 'nodejs';

/** 판정 기준표 조회 — 리포트에서도 쓰므로 로그인한 사용자면 읽을 수 있다 */
export async function GET() {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const rows = await prisma.admissionCriteria.findMany({
    orderBy: [{ percentile: 'desc' }, { sortOrder: 'asc' }],
  });
  return NextResponse.json(rows);
}

/**
 * 학교별 기준(판정 기준표) CSV 업로드.
 * 표 전체를 갈아 끼운다 — 구간표라 부분 갱신보다 통째 교체가 맞다.
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

    const rows = parseCsv(await file.text());
    // 헤더 첫 칸이 "목표대비 판정기준" (줄바꿈 포함)
    const headerIdx = findHeaderRow(rows, '목표대비');
    if (headerIdx < 0) {
      return NextResponse.json(
        { error: '헤더를 찾지 못했습니다. 첫 칸이 "목표대비 판정기준"인 행이 있어야 합니다' },
        { status: 400 }
      );
    }
    const records = toRecords(rows, headerIdx);

    const parsed: { verdict: string; percentile: number; tierLabel: string; sortOrder: number }[] = [];
    const skipped: string[] = [];
    records.forEach((r, i) => {
      const verdict = cell(r['목표대비판정기준']);
      const percentile = num(r['현재성적(백분위)']);
      const tierLabel = cell(r['전국성적(백분위)']);
      if (percentile === null || !tierLabel) {
        // 백분위나 라인이 비어 있는 행은 기준으로 쓸 수 없다
        if (verdict) skipped.push(`${headerIdx + 2 + i}행 (${verdict})`);
        return;
      }
      parsed.push({ verdict: verdict ?? '', percentile, tierLabel, sortOrder: i });
    });

    if (parsed.length === 0) {
      return NextResponse.json({ error: '등록할 기준 행이 없습니다' }, { status: 400 });
    }

    // 같은 백분위가 여러 번 나오면 첫 행을 쓴다
    const byPercentile = new Map<number, typeof parsed[number]>();
    for (const p of parsed) if (!byPercentile.has(p.percentile)) byPercentile.set(p.percentile, p);
    const finalRows = [...byPercentile.values()].sort((a, b) => b.percentile - a.percentile);

    await prisma.$transaction([
      prisma.admissionCriteria.deleteMany({}),
      prisma.admissionCriteria.createMany({ data: finalRows }),
    ]);

    return NextResponse.json({
      mode: 'replace',
      count: finalRows.length,
      rowCount: records.length,
      skipped,
      tiers: finalRows.map(r => `${r.percentile} · ${r.tierLabel}`),
    });
  } catch (e) {
    console.error('[criteria import]', e);
    return NextResponse.json({ error: 'CSV 처리 중 오류가 발생했습니다' }, { status: 500 });
  }
}
