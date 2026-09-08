/**
 * API-Football v3 외부 응답 DTO — 원본 형태 그대로.
 * 내부 도메인과 섞지 않는다 (BACKEND_GUIDE: 외부 응답 DTO 와 내부 DTO 분리).
 * 필드는 docs/API_FIELDS_FULL.md 실측 기준. 오타(commited·appearences)도 여기선 그대로 둔다.
 */

export interface ApiEnvelope<T> {
  get: string;
  parameters: Record<string, string>;
  errors: Record<string, string> | string[];
  results: number;
  paging: { current: number; total: number };
  response: T;
}

export interface ApiStatus {
  account: { firstname: string; lastname: string; email: string };
  subscription: { plan: string; end: string; active: boolean };
  requests: { current: number; limit_day: number };
}

export interface ApiCoverage {
  fixtures: { events: boolean; lineups: boolean; statistics_fixtures: boolean; statistics_players: boolean };
  standings: boolean;
  players: boolean;
  top_scorers: boolean;
  top_assists: boolean;
  top_cards: boolean;
  injuries: boolean;
  predictions: boolean;
  odds: boolean;
}

export interface ApiLeagueSeason {
  year: number;
  start: string;
  end: string;
  current: boolean;
  coverage: ApiCoverage;
}

export interface ApiLeague {
  league: { id: number; name: string; type: 'League' | 'Cup'; logo: string };
  country: { name: string; code: string | null; flag: string | null };
  seasons: ApiLeagueSeason[];
}

export interface ApiTeam {
  team: {
    id: number;
    name: string;
    code: string | null;
    country: string | null;
    founded: number | null;
    national: boolean;
    logo: string | null;
  };
  venue: {
    id: number | null;
    name: string | null;
    address: string | null;
    city: string | null;
    capacity: number | null;
    surface: string | null;
    image: string | null;
  };
}

/** `/players/squads?team=` — 현재 스냅샷만 준다. season 파라미터가 없다 (실측) */
export interface ApiSquad {
  team: { id: number; name: string; logo: string | null };
  players: {
    id: number;
    name: string;
    /** 생년월일은 없다. 나이만 준다 — 프로필은 /players?id= 로 따로 받는다 (L1 #9) */
    age: number | null;
    number: number | null;
    position: string | null;
    photo: string | null;
  }[];
}

/** `/fixtures?league=&season=` — 시즌 전체 일정. 미래 경기도 status NS 로 함께 온다 */
export interface ApiFixture {
  fixture: {
    id: number;
    referee: string | null;
    timestamp: number;
    date: string;
    venue: { id: number | null; name: string | null; city: string | null };
    status: { long: string | null; short: string; elapsed: number | null; extra: number | null };
  };
  league: { id: number; season: number; round: string };
  teams: {
    home: { id: number; name: string; winner: boolean | null };
    away: { id: number; name: string; winner: boolean | null };
  };
  goals: { home: number | null; away: number | null };
  /** 연장·승부차기가 없었으면 null 이다. 0 이 아니다 — win_reason 판정에 쓴다 */
  score: {
    halftime: { home: number | null; away: number | null };
    fulltime: { home: number | null; away: number | null };
    extratime: { home: number | null; away: number | null };
    penalty: { home: number | null; away: number | null };
  };
}

export interface ApiStandingRow {
  rank: number;
  team: { id: number; name: string };
  points: number;
  goalsDiff: number;
  group: string;
  form: string | null;
  status: string | null;
  description: string | null;
  all: { played: number; win: number; draw: number; lose: number; goals: { for: number; against: number } };
  home: { played: number; win: number; draw: number; lose: number; goals: { for: number; against: number } };
  away: { played: number; win: number; draw: number; lose: number; goals: { for: number; against: number } };
}

/** `/standings?league=&season=` — standings 는 그룹별 배열의 배열이다 */
export interface ApiStandings {
  league: { id: number; season: number; standings: ApiStandingRow[][] };
}

/**
 * `/players?league=&season=&page=` 의 `statistics[]` 한 항목.
 * `/players/topscorers` · `topassists` · `topyellowcards` · `topredcards` 도 **같은 구조**를 준다
 * (실측) — 그래서 타입을 공유한다.
 *
 * 실측상 거의 모든 숫자 필드가 `number | null` 이다. 0 과 null 의 구분은
 * `l6/player-stats.mapper.ts` 한 곳에서만 한다 (DATA_RULES 3장).
 * API 오타(`appearences` · `commited`)는 파일 규칙대로 그대로 둔다.
 */
export interface ApiPlayerSeasonStat {
  team: { id: number; name: string | null; logo: string | null };
  league: { id: number; name: string | null; country: string | null; logo: string | null; flag: string | null; season: number };
  games: {
    appearences: number | null;
    lineups: number | null;
    minutes: number | null;
    number: number | null;
    position: string | null;
    /** 문자열이다 — "7.062500". numeric 으로 캐스트해 저장한다 */
    rating: string | null;
    captain: boolean | null;
  };
  substitutes: { in: number | null; out: number | null; bench: number | null };
  shots: { total: number | null; on: number | null };
  goals: { total: number | null; conceded: number | null; assists: number | null; saves: number | null };
  passes: { total: number | null; key: number | null; accuracy: number | null };
  tackles: { total: number | null; blocks: number | null; interceptions: number | null };
  duels: { total: number | null; won: number | null };
  dribbles: { attempts: number | null; success: number | null; past: number | null };
  fouls: { drawn: number | null; committed: number | null };
  cards: { yellow: number | null; yellowred: number | null; red: number | null };
  penalty: { won: number | null; commited: number | null; scored: number | null; missed: number | null; saved: number | null };
}

/** `/players` · `/players/top*` 의 response 한 항목 */
export interface ApiPlayerSeason {
  player: {
    id: number;
    name: string;
    firstname: string | null;
    lastname: string | null;
    age: number | null;
    birth: { date: string | null; place: string | null; country: string | null };
    nationality: string | null;
    /** "190 cm" 또는 "190" — 문자열이다 */
    height: string | null;
    /** "84 kg" 또는 "84" */
    weight: string | null;
    injured: boolean;
    photo: string | null;
  };
  /**
   * **배열이다.** 이적 선수는 팀별 항목이 여럿이고, 다른 대회 항목이 섞여 올 수 있다
   * → `league.id` · `league.season` 으로 반드시 거른다.
   */
  statistics: ApiPlayerSeasonStat[];
}

/** `/teams/statistics?league=&season=&team=` — 팀 하나의 시즌 집계 */
export interface ApiTeamStatistics {
  league: { id: number; name: string | null; country: string | null; logo: string | null; flag: string | null; season: number };
  team: { id: number; name: string | null; logo: string | null };
  /** "WWDLW". 시즌 시작 전이면 null */
  form: string | null;
  fixtures: {
    played: { home: number | null; away: number | null; total: number | null };
    wins: { home: number | null; away: number | null; total: number | null };
    draws: { home: number | null; away: number | null; total: number | null };
    loses: { home: number | null; away: number | null; total: number | null };
  };
  goals: {
    for: { total: { home: number | null; away: number | null; total: number | null } };
    against: { total: { home: number | null; away: number | null; total: number | null } };
  };
  /** 최다 점수차 경기 — "4-0" 형태. 해당 경기가 없으면 null 이다 (0 이 아니다) */
  biggest: {
    streak: { wins: number | null; draws: number | null; loses: number | null };
    wins: { home: string | null; away: string | null };
    loses: { home: string | null; away: string | null };
    goals: { for: { home: number | null; away: number | null }; against: { home: number | null; away: number | null } };
  };
  clean_sheet: { home: number | null; away: number | null; total: number | null };
  failed_to_score: { home: number | null; away: number | null; total: number | null };
  penalty: {
    scored: { total: number | null; percentage: string | null };
    missed: { total: number | null; percentage: string | null };
    total: number | null;
  };
  /** 포메이션별 출전 횟수 — 표시 전용이라 jsonb 로 그대로 넣는다 */
  lineups: { formation: string; played: number }[];
  /** 시간대별 카드 분포 — 표시 전용이라 jsonb 로 그대로 넣는다 */
  cards: Record<string, unknown>;
}
