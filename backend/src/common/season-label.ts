/** API-Football 시즌 값(시작 연도) → 표시 라벨. 2026 → "2026-27" */
export function seasonLabel(year: number): string {
  return `${year}-${String((year + 1) % 100).padStart(2, '0')}`;
}
