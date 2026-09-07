/**
 * 수집 대상 대회 카탈로그 — INGESTION_STRATEGY 2장.
 * 전체 800개 카탈로그를 DB 에 넣지 않고 여기 있는 것만 넣는다 (SCHEMA_DESIGN 3-1).
 * ID 는 전수 조사(docs/CUPS_INVENTORY.md · API_INVENTORY.md)에서 실측한 값.
 */
import { CompetitionFormat, CompetitionType } from '../../generated/prisma/client.js';

export interface CatalogEntry {
  apiId: number;
  name: string;
  /** 칩·모바일용 짧은 표기 (프론트 mocks 의 shortName 과 맞춤). 스키마에 컬럼을 두지 않고 코드 상수로 둔다 */
  shortName: string;
  type: CompetitionType;
  format: CompetitionFormat;
  /** 컵 → 그 나라 1부 리그 apiId. 컷오프 판정의 근거 */
  topFlightApiId?: number;
  displayOrder: number;
}

/** 최근 5시즌 (INGESTION_STRATEGY 1장). 시즌 값은 API-Football 기준 = 시작 연도 */
export const SEASON_YEARS = [2022, 2023, 2024, 2025, 2026] as const;

export const COMPETITIONS: readonly CatalogEntry[] = [
  // ── 리그 5 + UCL ──
  { apiId: 39,  name: 'Premier League',        shortName: 'EPL',               type: CompetitionType.LEAGUE, format: CompetitionFormat.ROUND_ROBIN, displayOrder: 10 },
  { apiId: 140, name: 'LaLiga',                shortName: 'LaLiga',            type: CompetitionType.LEAGUE, format: CompetitionFormat.ROUND_ROBIN, displayOrder: 20 },
  { apiId: 78,  name: 'Bundesliga',            shortName: 'BL',                type: CompetitionType.LEAGUE, format: CompetitionFormat.ROUND_ROBIN, displayOrder: 30 },
  { apiId: 135, name: 'Serie A',               shortName: 'SA',                type: CompetitionType.LEAGUE, format: CompetitionFormat.ROUND_ROBIN, displayOrder: 40 },
  { apiId: 61,  name: 'Ligue 1',               shortName: 'L1',                type: CompetitionType.LEAGUE, format: CompetitionFormat.ROUND_ROBIN, displayOrder: 50 },
  // 2024-25 부터 리그 페이즈. 그 이전 시즌은 조별리그였으나 순위표 구조는 같다
  { apiId: 2,   name: 'UEFA Champions League', shortName: 'UCL',               type: CompetitionType.CUP,    format: CompetitionFormat.LEAGUE_PHASE_KNOCKOUT, displayOrder: 60 },

  // ── 국내 컵 6 — 컷오프 대상 ──
  { apiId: 45,  name: 'FA Cup',                shortName: 'FA Cup',            type: CompetitionType.CUP, format: CompetitionFormat.KNOCKOUT, topFlightApiId: 39,  displayOrder: 110 },
  { apiId: 48,  name: 'League Cup',            shortName: 'EFL Cup',           type: CompetitionType.CUP, format: CompetitionFormat.KNOCKOUT, topFlightApiId: 39,  displayOrder: 120 },
  { apiId: 143, name: 'Copa del Rey',          shortName: 'Copa del Rey',      type: CompetitionType.CUP, format: CompetitionFormat.KNOCKOUT, topFlightApiId: 140, displayOrder: 130 },
  { apiId: 81,  name: 'DFB Pokal',             shortName: 'DFB-Pokal',         type: CompetitionType.CUP, format: CompetitionFormat.KNOCKOUT, topFlightApiId: 78,  displayOrder: 140 },
  { apiId: 137, name: 'Coppa Italia',          shortName: 'Coppa Italia',      type: CompetitionType.CUP, format: CompetitionFormat.KNOCKOUT, topFlightApiId: 135, displayOrder: 150 },
  { apiId: 66,  name: 'Coupe de France',       shortName: 'Coupe de France',   type: CompetitionType.CUP, format: CompetitionFormat.KNOCKOUT, topFlightApiId: 61,  displayOrder: 160 },

  // ── 슈퍼컵 5 — 시즌당 1~4경기, 비용 없음 (INGESTION_STRATEGY 2-3) ──
  { apiId: 528, name: 'Community Shield',      shortName: 'Community Shield',  type: CompetitionType.SUPER_CUP, format: CompetitionFormat.KNOCKOUT, topFlightApiId: 39,  displayOrder: 210 },
  { apiId: 556, name: 'Supercopa de España',   shortName: 'Supercopa',         type: CompetitionType.SUPER_CUP, format: CompetitionFormat.KNOCKOUT, topFlightApiId: 140, displayOrder: 220 },
  { apiId: 529, name: 'DFL-Supercup',          shortName: 'DFL-Supercup',      type: CompetitionType.SUPER_CUP, format: CompetitionFormat.KNOCKOUT, topFlightApiId: 78,  displayOrder: 230 },
  { apiId: 547, name: 'Supercoppa Italiana',   shortName: 'Supercoppa',        type: CompetitionType.SUPER_CUP, format: CompetitionFormat.KNOCKOUT, topFlightApiId: 135, displayOrder: 240 },
  { apiId: 526, name: 'Trophée des Champions', shortName: 'Trophée',           type: CompetitionType.SUPER_CUP, format: CompetitionFormat.KNOCKOUT, topFlightApiId: 61,  displayOrder: 250 },
];

export const COMPETITION_BY_API_ID = new Map(COMPETITIONS.map((c) => [c.apiId, c]));
