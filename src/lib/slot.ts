// 상담 예약 일시 문자열 "2026.09.28(월) 14:00" 과 날짜·시간 입력칸 값 사이의 변환.
// 서버(api/appointments)가 이 형식만 받으므로 화면 어디서든 이 함수로 조립한다.

const DAY_LABELS = ['일', '월', '화', '수', '목', '금', '토'];

export function todayStr(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

// "2026.09.28(월) 14:00" → { date: '2026-09-28', time: '14:00' } (입력칸 채우기용)
export function parseSlot(slot?: string | null): { date: string; time: string } {
  const m = (slot ?? '').match(/^(\d{4})\.(\d{2})\.(\d{2})\([월화수목금토일]\)\s+(\d{1,2}:\d{2})$/);
  if (!m) return { date: '', time: '' };
  const [, y, mo, d, t] = m;
  return { date: `${y}-${mo}-${d}`, time: t.padStart(5, '0') };
}

export function formatSlot(date: string, time: string): string {
  if (!date || !time) return '';
  const d = new Date(`${date}T00:00:00`);
  const label = `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}(${DAY_LABELS[d.getDay()]})`;
  return `${label} ${time}`;
}
