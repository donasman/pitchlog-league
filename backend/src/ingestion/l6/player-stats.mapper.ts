/**
 * L6 매핑 — 순수 함수. **null 규칙이 여기 한 곳에만 있다** (DATA_RULES 3장).
 *
 * `round-scope.ts` · `squad-diff.ts` 와 같은 자리다 — DB 도 API 클라이언트도 모른다.
 * 이유는 테스트다: "assists 는 null 을 지키고 shots 는 0 으로 접는다" 를 표로 검증할 수 있어야 한다
 * (`player-stats.mapper.spec.ts`).
 *
 * ## 왜 이 셋만 null 인가 (2026-09-08 결정 · 마이그레이션 20260908090000)
 * 근거는 `API_FIELDS_FULL.md` 의 `/players` "null 로 온 필드" 목록이다 (2026 · 2020 · 2015 실측).
 *   · `goals.assists` · `cards.yellowred` — **2026 목록에는 없고 2020·2015 목록에만 있다.**
 *     최신 시즌은 값을 주는데 과거 시즌만 null 이면 "0회" 가 아니라 **커버리지 없음**이다.
 *     0 으로 접으면 "도움 0인 시즌" 과 구분이 사라진다.
 *   · `passes.key` — 세 시즌 **모두** null 로 오는데 3-1(null→0) 목록에도 3-2(null 유지) 목록에도
 *     없어 규칙 자체가 미정의였다 → 안전한 쪽을 고른다.
 *
 * `shots.*` · `tackles.*` · `duels.*` · `dribbles.success` 도 2026 에 null 로 오지만
 * **DATA_RULES 3-1** 이 이미 "null→0" 으로 규정한 필드라 그대로 `?? 0` 이다. 카드·페널티도 같다.
 * `rating` 은 3-2 그대로 null 을 지킨다 — 0점과 평점 없음은 다르다.
 */
import type { ApiPlayerSeason, ApiPlayerSeasonStat, ApiTeamStatistics } from '../api-football/api-football.types.js';

/**
 * `players` upsert 행. 컬럼명은 `schema.prisma` 의 `Player` @map 값 그대로다.
 * type 별칭으로 둔다 — interface 는 `Record<string, unknown>` 에 대입되지 않아 `batchUpsert` 가 거른다.
 */
export type PlayerProfileRow = {
  api_player_id: number;
  name: string;
  firstname: string | null;
  lastname: string | null;
  birth_date: string | null;
  birth_place: string | null;
  birth_country: string | null;
  nationality: string | null;
  height_cm: number | null;
  weight_kg: number | null;
  photo_url: string | null;
  /** 프로필이 실제로 채워졌을 때만 값이 있다 — 아래 주석 참고 */
  profile_fetched_at: string | null;
};

export type PlayerSeasonStatRow = {
  player_id: number;
  team_id: number;
  competition_season_id: number;
  appearances: number;
  lineups_count: number;
  minutes: number;
  goals: number;
  assists: number | null;
  yellow_cards: number;
  yellowred_cards: number | null;
  red_cards: number;
  /** API 가 준 문자열 그대로. PG 가 numeric 으로 캐스트한다 — 우리가 반올림하지 않는다 */
  rating_avg: string | null;
  shots_total: number;
  shots_on: number;
  passes_key: number | null;
  tackles_total: number;
  interceptions: number;
  duels_total: number;
  duels_won: number;
  dribbles_success: number;
  source: string;
  as_of: string;
};

export type TeamSeasonStatRow = {
  competition_season_id: number;
  team_id: number;
  form: string | null;
  played_home: number;
  played_away: number;
  played_total: number;
  wins_home: number;
  wins_away: number;
  draws_home: number;
  draws_away: number;
  loses_home: number;
  loses_away: number;
  goals_for_home: number;
  goals_for_away: number;
  goals_against_home: number;
  goals_against_away: number;
  biggest_win_home: string | null;
  biggest_win_away: string | null;
  biggest_lose_home: string | null;
  biggest_lose_away: string | null;
  clean_sheet_total: number;
  failed_to_score_total: number;
  penalty_scored: number;
  penalty_missed: number;
  formations: unknown;
  cards: unknown;
  as_of: string;
};

/** 랭킹 4종. 값이 어느 필드에서 오는지가 카테고리의 정의다 */
export type RankingCategoryKey = 'SCORERS' | 'ASSISTS' | 'YELLOW_CARDS' | 'RED_CARDS';

/**
 * `"190 cm"` · `"190"` · `null` → `190` · `190` · `null`.
 * 숫자로 안 읽히면 null 이다 — NaN 을 컬럼에 넣지 않는다.
 */
export function parseMeasure(value: string | null | undefined): number | null {
  if (value === null || value === undefined) return null;
  const n = Number.parseInt(String(value), 10);
  return Number.isNaN(n) ? null : n;
}

/**
 * 이 대회시즌의 항목만. `statistics[]` 에는 다른 대회·다른 시즌이 섞여 온다.
 * 이적 선수는 팀별로 여러 항목이 남는다 — 그게 정상이다 (unique 가 `(player, team, cs)`).
 */
export function pickSeasonStats(
  entry: ApiPlayerSeason,
  apiCompetitionId: number,
  seasonYear: number,
): ApiPlayerSeasonStat[] {
  return (entry.statistics ?? []).filter(
    (st) => st?.league?.id === apiCompetitionId && st.league.season === seasonYear,
  );
}

/**
 * `players` 프로필 행.
 *
 * ⚠ `profile_fetched_at` 은 **`birth.date` 나 `nationality` 중 하나라도 있을 때만** 세운다.
 * 빈 프로필로 세우면 L1 #9(`/players?id=` 프로필 보강)가 그 선수를 "이미 받았다" 고 보고 영영 건너뛴다.
 */
export function toPlayerProfileRow(p: ApiPlayerSeason['player'], nowIso: string): PlayerProfileRow {
  const birthDate = p.birth?.date ?? null;
  const nationality = p.nationality ?? null;
  const filled = birthDate !== null || nationality !== null;
  return {
    api_player_id: p.id,
    name: p.name,
    firstname: p.firstname ?? null,
    lastname: p.lastname ?? null,
    birth_date: birthDate,
    birth_place: p.birth?.place ?? null,
    birth_country: p.birth?.country ?? null,
    nationality,
    height_cm: parseMeasure(p.height),
    weight_kg: parseMeasure(p.weight),
    photo_url: p.photo ?? null,
    profile_fetched_at: filled ? nowIso : null,
  };
}

/** 한 `statistics[]` 항목 → `player_season_stats` 한 행. null 규칙 전량이 여기다 */
export function toPlayerSeasonStatRow(
  st: ApiPlayerSeasonStat,
  ids: { playerId: number; teamId: number; competitionSeasonId: number },
  nowIso: string,
): PlayerSeasonStatRow {
  return {
    player_id: ids.playerId,
    team_id: ids.teamId,
    competition_season_id: ids.competitionSeasonId,
    // 출전 — appearences·lineups 는 세 시즌 어느 null 목록에도 없다.
    // minutes 는 2026 목록에만 있는데(과거 시즌엔 값이 온다) 무출전 레코드의 0 이라 접는 게 맞다
    appearances: st.games?.appearences ?? 0,
    lineups_count: st.games?.lineups ?? 0,
    minutes: st.games?.minutes ?? 0,
    goals: st.goals?.total ?? 0,
    // ★ null 유지 — 2020·2015 목록에만 있다 = 과거 시즌 커버리지 없음 (파일 머리말)
    assists: st.goals?.assists ?? null,
    // 3-1 — 카드는 null → 0
    yellow_cards: st.cards?.yellow ?? 0,
    // ★ null 유지 — 3-1 과 충돌하나 시즌 집계는 3-2 로 본다 (2026-09-08)
    yellowred_cards: st.cards?.yellowred ?? null,
    red_cards: st.cards?.red ?? 0,
    // 3-2 — 평점 0점과 평점 없음은 다르다. 문자열 그대로 넘겨 PG 가 numeric 으로 캐스트한다
    rating_avg: st.games?.rating ?? null,
    // 3-1 — 슈팅
    shots_total: st.shots?.total ?? 0,
    shots_on: st.shots?.on ?? 0,
    // ★ null 유지 — 세 시즌 모두 null 인데 3-1·3-2 어디에도 없다 (규칙 미정의 → 안전한 쪽)
    passes_key: st.passes?.key ?? null,
    // 3-1 — 태클 · 듀얼 · 드리블
    tackles_total: st.tackles?.total ?? 0,
    interceptions: st.tackles?.interceptions ?? 0,
    duels_total: st.duels?.total ?? 0,
    duels_won: st.duels?.won ?? 0,
    dribbles_success: st.dribbles?.success ?? 0,
    // 전용 엔드포인트가 준 공식값이다 — 우리 집계가 아니다 (SCHEMA_DESIGN 원칙 ①)
    source: 'API',
    as_of: nowIso,
  };
}

/**
 * 랭킹 값. `rank` 는 **API 응답에 없다** — 호출자가 필터 후 배열 인덱스+1 로 매긴다.
 * null 이면 그 행을 버린다 (0 으로 접으면 "0골 득점왕" 이 생긴다).
 */
export function rankingValueOf(st: ApiPlayerSeasonStat, category: RankingCategoryKey): number | null {
  switch (category) {
    case 'SCORERS':
      return st.goals?.total ?? null;
    case 'ASSISTS':
      return st.goals?.assists ?? null;
    case 'YELLOW_CARDS':
      return st.cards?.yellow ?? null;
    case 'RED_CARDS':
      return st.cards?.red ?? null;
  }
}

/**
 * `/teams/statistics` → `team_season_stats` 한 행.
 * `biggest_*` 는 실측에 null 이 온다 — "해당 경기 없음" 이라 0 으로 접지 않는다(애초에 문자열이다).
 * `formations` · `cards` 는 표시 전용이라 API 모양 그대로 jsonb 에 넣는다.
 */
export function toTeamSeasonStatRow(
  s: ApiTeamStatistics,
  ids: { competitionSeasonId: number; teamId: number },
  nowIso: string,
): TeamSeasonStatRow {
  const f = s.fixtures;
  const g = s.goals;
  return {
    competition_season_id: ids.competitionSeasonId,
    team_id: ids.teamId,
    form: s.form ?? null,
    played_home: f?.played?.home ?? 0,
    played_away: f?.played?.away ?? 0,
    played_total: f?.played?.total ?? 0,
    wins_home: f?.wins?.home ?? 0,
    wins_away: f?.wins?.away ?? 0,
    draws_home: f?.draws?.home ?? 0,
    draws_away: f?.draws?.away ?? 0,
    loses_home: f?.loses?.home ?? 0,
    loses_away: f?.loses?.away ?? 0,
    goals_for_home: g?.for?.total?.home ?? 0,
    goals_for_away: g?.for?.total?.away ?? 0,
    goals_against_home: g?.against?.total?.home ?? 0,
    goals_against_away: g?.against?.total?.away ?? 0,
    biggest_win_home: s.biggest?.wins?.home ?? null,
    biggest_win_away: s.biggest?.wins?.away ?? null,
    biggest_lose_home: s.biggest?.loses?.home ?? null,
    biggest_lose_away: s.biggest?.loses?.away ?? null,
    clean_sheet_total: s.clean_sheet?.total ?? 0,
    failed_to_score_total: s.failed_to_score?.total ?? 0,
    // 3-1 — 페널티
    penalty_scored: s.penalty?.scored?.total ?? 0,
    penalty_missed: s.penalty?.missed?.total ?? 0,
    formations: s.lineups ?? null,
    cards: s.cards ?? null,
    as_of: nowIso,
  };
}
