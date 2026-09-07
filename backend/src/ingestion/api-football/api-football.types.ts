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
