// 성적 그래프의 Y축 범위를 실제 점수에 맞춰 잡는다.
// 0~100 고정이면 점수가 한 구간에 몰렸을 때(예: 85~92) 선이 눌려 변화가 안 보인다.
// 데이터가 퍼진 만큼만 축을 열어 그 구간을 확대해서 보여준다.

export interface ScoreDomain {
  domain: [number, number];
  ticks: number[];
}

const STEP = 5;          // 축 눈금 간격
const MIN_SPAN = 10;     // 너무 좁아 눈금이 뭉치지 않도록 하는 최소 범위
const ABS_MIN = 0;
const ABS_MAX = 100;

/**
 * 그래프에 실제로 그려지는 값들로 Y축 범위를 계산한다.
 * - 값이 몰려 있으면 그 주변만 확대 (90 근처 → 대략 80~100)
 * - 값이 넓게 퍼져 있으면 전체를 담되 여백만 둔다 (30~90 → 대략 20~100)
 * - 값이 없으면 0~100 으로 되돌린다.
 */
export function computeScoreDomain(values: Array<number | null | undefined>): ScoreDomain {
  const nums = values.filter((v): v is number => typeof v === 'number' && Number.isFinite(v));
  if (nums.length === 0) {
    return { domain: [ABS_MIN, ABS_MAX], ticks: buildTicks(ABS_MIN, ABS_MAX) };
  }

  const min = Math.min(...nums);
  const max = Math.max(...nums);
  const span = max - min;

  // 퍼진 정도에 비례해 여백을 주되, 점이 하나뿐이어도 최소 여백은 확보한다
  const pad = Math.max(span * 0.18, 4);

  let lo = Math.floor((min - pad) / STEP) * STEP;
  let hi = Math.ceil((max + pad) / STEP) * STEP;

  lo = Math.max(ABS_MIN, lo);
  hi = Math.min(ABS_MAX, hi);

  // 범위가 지나치게 좁으면 양쪽으로 벌린다 (한쪽이 0/100 에 막히면 반대쪽으로)
  while (hi - lo < MIN_SPAN) {
    if (lo > ABS_MIN) lo -= STEP;
    else if (hi < ABS_MAX) hi += STEP;
    else break;
  }

  return { domain: [lo, hi], ticks: buildTicks(lo, hi) };
}

function buildTicks(lo: number, hi: number): number[] {
  // 눈금이 8개를 넘지 않도록 간격을 키운다
  let step = STEP;
  while ((hi - lo) / step > 8) step += STEP;
  const ticks: number[] = [];
  for (let v = lo; v <= hi; v += step) ticks.push(v);
  // 마지막 눈금이 상한에 못 미치면 채우되, 간격이 어색하게 좁아지면 생략한다
  const last = ticks[ticks.length - 1];
  if (last !== hi && hi - last >= step / 2) ticks.push(hi);
  return ticks;
}

/** 목표선(기본 90점)이 현재 축 범위 안에 들어올 때만 그린다 */
export function isWithinDomain(value: number, domain: [number, number]): boolean {
  return value >= domain[0] && value <= domain[1];
}
