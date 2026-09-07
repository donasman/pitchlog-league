/**
 * 데이터 기준 시각 (설계검토 C-1) — 목록이면 행들의 갱신 시각 중 최신, 단건이면 그 행의 갱신 시각.
 * 아무 행도 없으면 null 대신 지금 시각을 준다: "조회는 됐고 비어 있다" 도 기준 시각이 있다.
 */
export function latestOf(...dates: (Date | null | undefined)[]): string {
  let max = 0;
  for (const d of dates) if (d && d.getTime() > max) max = d.getTime();
  return new Date(max || Date.now()).toISOString();
}
