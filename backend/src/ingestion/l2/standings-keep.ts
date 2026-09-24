/**
 * L2 순위 수집 — "이번 응답에서 살아남을 (team_id, group_name) 키" 계산 (순수 함수).
 *
 * collectStandings 가 응답을 upsert 한 뒤, **이 함수가 반환한 키 집합에 없는 행**은
 * 같은 competition_season_id 안에서 DELETE 한다. 그래야 외부 API 가 조 이름을 바꿔도
 * 옛 group_name 행이 영구 잔존하지 않는다 (2026-09-23 UCL "League Phase" 36행 잔존 사고).
 *
 * 순수 함수로 뽑는 이유는 두 가지:
 *   - DB 없이 유닛 테스트로 잠근다 (조 이름 바뀜 · 동일 · 빈 응답)
 *   - collectStandings 는 batchUpsert 와 트랜잭션 결합 코드라 여기서 로직을 다시 다루지 않는다
 */

export interface StandingKeepRow {
  team_id: number;
  group_name: string;
}

export interface StandingKeepKey {
  teamId: number;
  groupName: string;
}

/**
 * 이번 응답의 rows 에서 dedupe 된 (team_id, group_name) 목록.
 * rows 순서를 유지하며 처음 등장한 튜플만 반환한다.
 */
export function standingKeepKeys(rows: readonly StandingKeepRow[]): StandingKeepKey[] {
  const seen = new Set<string>();
  const out: StandingKeepKey[] = [];
  for (const r of rows) {
    const key = `${r.team_id}${r.group_name}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({ teamId: r.team_id, groupName: r.group_name });
  }
  return out;
}
