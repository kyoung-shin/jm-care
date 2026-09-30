import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getCurrentAppUser, getSessionUserId } from '@/lib/auth';
import { parseCsv, findHeaderRow, cell } from '@/lib/csv';

export const runtime = 'nodejs';

/** 목표별 학년 로드맵 조회 — 리포트에서도 쓴다 */
export async function GET() {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const rows = await prisma.goalRoadmapTemplate.findMany({
    orderBy: [{ sortOrder: 'asc' }, { goal: 'asc' }],
  });
  return NextResponse.json(rows);
}

/**
 * 학년별 공부내용 CSV 업로드.
 * 표가 "목표 × 학년" 교차표라, 한 칸을 한 행(goal, stage, content)으로 펼쳐 저장한다.
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
    const headerIdx = findHeaderRow(rows, '목표');
    if (headerIdx < 0) {
      return NextResponse.json(
        { error: '헤더를 찾지 못했습니다. 첫 칸이 "목표"로 시작하는 행이 있어야 합니다' },
        { status: 400 }
      );
    }

    // 헤더의 2번째 칸부터가 학년 구간이다 (초등 고학년 / 중1 / 중2 / 중3 ...)
    const stages = rows[headerIdx].slice(1).map(h => (h ?? '').trim());
    const entries: { goal: string; stage: string; content: string; sortOrder: number }[] = [];
    let order = 0;

    for (let i = headerIdx + 1; i < rows.length; i++) {
      const r = rows[i];
      if (!r || !(r[0] ?? '').trim()) continue;
      const goal = r[0].trim();
      stages.forEach((stage, j) => {
        if (!stage) return;
        const content = cell(r[j + 1]);
        if (!content) return;
        entries.push({ goal, stage, content, sortOrder: order++ });
      });
    }

    if (entries.length === 0) {
      return NextResponse.json({ error: '등록할 로드맵 내용이 없습니다' }, { status: 400 });
    }

    // 목표·학년 조합이 키라서 통째로 갈아 끼운다
    await prisma.$transaction([
      prisma.goalRoadmapTemplate.deleteMany({}),
      prisma.goalRoadmapTemplate.createMany({ data: entries }),
    ]);

    const goals = [...new Set(entries.map(e => e.goal))];
    return NextResponse.json({ mode: 'replace', count: entries.length, goals, stages: stages.filter(Boolean) });
  } catch (e) {
    console.error('[roadmap import]', e);
    return NextResponse.json({ error: 'CSV 처리 중 오류가 발생했습니다' }, { status: 500 });
  }
}
