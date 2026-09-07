/**
 * 라운드 분류와 수집 범위 판정 — 순수 함수 (INGESTION_STRATEGY 2-2)
 *
 * 라운드 **이름으로 자르지 않는다.** 대회마다 체계가 다르고(`5th Round` · `1/8-finals` ·
 * `Regular Season - 12`) 손으로 매핑표를 관리해야 한다. 경기 목록에서 계산한다.
 *
 *   경기 목록 수집 = 1부 팀이 처음 등장하는 라운드부터
 *   상세 수집      = (1부 팀 참가) OR (16강 이상)
 *
 * **1부 팀 집합**은 대회마다 다르다:
 *   리그  → 자기 참가팀 (모든 라운드가 1부다)
 *   컵    → 그 나라 1부 리그 참가팀
 *   UCL   → `top_flight_competition_id` 가 없다. 추적하는 5대 리그 참가팀 합집합을 쓴다.
 *           예선에 5대 리그 팀이 끼면 컷이 앞당겨지는데, 그 팀 경기는 보여줘야 하므로 맞는 동작이다.
 *
 * DB 를 섞지 않는 이유는 테스트다 — 컷 판정과 16강 판정을 표로 검증할 수 있어야 한다.
 */

/** `/fixtures` 응답에서 판정에 필요한 것만 */
export interface FixtureRef {
  /** `league.round` 원문 */
  round: string;
  homeApiTeamId: number;
  awayApiTeamId: number;
  /** ISO 8601 */
  kickoffAt: string;
}

export interface ScopeInput {
  /** `/fixtures/rounds` 응답 순서 그대로. 이 순서가 ordinal 이다 */
  roundNames: readonly string[];
  fixtures: readonly FixtureRef[];
  /** 이 대회의 1부 팀 (API team id) */
  topFlightApiTeamIds: ReadonlySet<number>;
}

export interface RoundScope {
  name: string;
  /** `/fixtures/rounds` 에서의 위치. 컷으로 잘려도 번호는 그대로 둔다 —
   *  나중에 앞 라운드를 백필로 채워 넣어도 번호를 다시 매기지 않아도 된다 */
  ordinal: number;
  teamCount: number;
  matchCount: number;
  firstKickoffAt: string | null;
  hasTopFlight: boolean;
  isLateStage: boolean;
  /** 이 라운드의 경기를 저장하는가 */
  included: boolean;
  /** 상세 4콜을 부를 대상인가 — (1부 팀 참가) OR (16강 이상) */
  detailEligible: boolean;
}

export interface ScopeResult {
  rounds: RoundScope[];
  /** 저장 시작 지점. null 이면 1부 팀이 한 라운드에도 없다 — 아무것도 저장하지 않는다 */
  cutOrdinal: number | null;
  /** 경기에는 있는데 `/fixtures/rounds` 목록에 없는 라운드 이름. 저장하지 않고 보고한다 */
  unknownRounds: string[];
}

/** 16강 이상 판정 기준. 팀 수만 보면 예선이 16강으로 잡힌다 (2-2) */
const LATE_STAGE_MAX_TEAMS = 16;

export function resolveRoundScope(input: ScopeInput): ScopeResult {
  const { roundNames, fixtures, topFlightApiTeamIds } = input;

  const indexByName = new Map(roundNames.map((n, i) => [n, i]));

  // 라운드별로 모은다
  const teams = roundNames.map(() => new Set<number>());
  const counts = roundNames.map(() => 0);
  const firstKickoff: (string | null)[] = roundNames.map(() => null);
  const unknown = new Set<string>();

  for (const f of fixtures) {
    const i = indexByName.get(f.round);
    if (i === undefined) {
      unknown.add(f.round);
      continue;
    }
    teams[i].add(f.homeApiTeamId);
    teams[i].add(f.awayApiTeamId);
    counts[i]++;
    if (firstKickoff[i] === null || f.kickoffAt < firstKickoff[i]!) firstKickoff[i] = f.kickoffAt;
  }

  const hasTopFlight = teams.map((set) => [...set].some((id) => topFlightApiTeamIds.has(id)));

  // 16강 이상: 마지막 라운드부터 역순으로 16팀 이하가 **연속되는 구간**만.
  // 경기가 아직 없는 라운드(추첨 전)는 팀 수 0이라 그냥 세면 구간이 끝까지 이어진다 —
  // 판정에서 빼되 연속은 끊지 않는다. 경기가 생기면 다시 계산된다.
  const isLateStage = roundNames.map(() => false);
  for (let i = roundNames.length - 1; i >= 0; i--) {
    if (counts[i] === 0) continue;
    if (teams[i].size > LATE_STAGE_MAX_TEAMS) break;
    isLateStage[i] = true;
  }

  const cutIndex = hasTopFlight.findIndex(Boolean);
  const cutOrdinal = cutIndex === -1 ? null : cutIndex;

  const rounds: RoundScope[] = roundNames.map((name, i) => ({
    name,
    ordinal: i,
    teamCount: teams[i].size,
    matchCount: counts[i],
    firstKickoffAt: firstKickoff[i],
    hasTopFlight: hasTopFlight[i],
    isLateStage: isLateStage[i],
    included: cutOrdinal !== null && i >= cutOrdinal,
    detailEligible: hasTopFlight[i] || isLateStage[i],
  }));

  return { rounds, cutOrdinal, unknownRounds: [...unknown].sort() };
}
