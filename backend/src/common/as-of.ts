/**
 * 데이터 기준 시각 (설계검토 C-1) — 목록이면 행들의 갱신 시각 중 최신, 단건이면 그 행의 갱신 시각.
 * 아무 행도 없으면 null 대신 지금 시각을 준다: "조회는 됐고 비어 있다" 도 기준 시각이 있다.
 */
export function latestOf(...dates: (Date | null | undefined)[]): string {
  let max = 0;
  for (const d of dates) if (d && d.getTime() > max) max = d.getTime();
  return new Date(max || Date.now()).toISOString();
}

/**
 * 데이터 기준 시각 (역방향) — 여러 갈래를 합쳐 보여줄 때 "가장 오래된 갱신" 이 그 화면의 신선도다.
 * `MatchFullDetailDto` 처럼 lineups·events·teamStats·playerStats 를 한 응답에 담을 때 각 갈래의
 * 최신 갱신 시각들 중 가장 오래된 값이 그 응답 전체의 데이터 기준이다.
 *
 * 유효한 값이 하나도 없으면 latestOf 와 마찬가지로 지금 시각을 준다 — "빈 응답" 도 기준 시각이 있다.
 */
export function earliestOf(...dates: (Date | null | undefined)[]): string {
  const valid: Date[] = [];
  for (const d of dates) if (d) valid.push(d);
  if (valid.length === 0) return new Date().toISOString();
  let min = valid[0].getTime();
  for (let i = 1; i < valid.length; i++) {
    const t = valid[i].getTime();
    if (t < min) min = t;
  }
  return new Date(min).toISOString();
}
