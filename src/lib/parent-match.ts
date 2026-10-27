// 학생 가입 신청에 적힌 학부모 정보와 학부모 계정을 맞춰 보는 규칙.
// 연락처(숫자만 비교)가 같으면 일치로 본다. 연락처가 없을 때만 이름으로 맞춘다.

export function phoneDigits(v?: string | null): string {
  return (v ?? '').replace(/\D/g, '');
}

export function parentMatches(
  info: { parentName?: string | null; parentPhone?: string | null },
  parent: { name: string; phone?: string | null }
): boolean {
  const want = phoneDigits(info.parentPhone);
  const have = phoneDigits(parent.phone);
  if (want.length >= 9 && have.length >= 9) return want === have;
  const name = (info.parentName ?? '').trim();
  return !!name && !want && name === parent.name.trim();
}
