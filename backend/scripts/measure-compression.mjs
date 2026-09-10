/**
 * 압축 전/후 크기 실측 — 실 API 없이 픽스처로 산출.
 *
 * 왜 픽스처: 이 환경은 네트워크가 없어 실 DB(Supabase)·실 API 호출 불가.
 * 지침 Q3 게이트는 "실 API 호출 or 픽스처" 를 허용 — 픽스처는 실 데이터 규모를 시뮬레이션한다.
 *
 * 실측 값과 비교:
 *   - get_standings 모드 B 6대회 라인은 사용자 실측 76KB 를 기준으로 (한 대회당 ~12KB, 20팀 순위).
 *   - list_matches 10개는 실 6대회 평균 항목 크기 * 10.
 *   - get_player 는 5시즌 5경기 대회 스탯 * 3 시즌 = 대략 5.8KB (사용자 실측).
 *
 * 실행:
 *   node scripts/measure-compression.mjs
 */
import { compressForModel } from '../dist/assistant/response-compaction.js';

const KB = 1024;

function bytes(obj) {
  return Buffer.byteLength(JSON.stringify(obj), 'utf8');
}

function approxTokens(b) {
  // 대략 4 chars per token (영문 기준 · 한글 섞이면 더 짧아짐)
  return Math.round(b / 4);
}

/* ─── 픽스처 생성 헬퍼 ─── */

function fakeTeam(id) {
  return {
    ref: `${id}-team-${id}`,
    apiId: id,
    displayName: `Team ${id} Full Name`,
    shortDisplayName: `T${id}`,
    originalName: `Team ${id} Full Name`,
    code: `T${id}`,
    country: 'England',
    founded: 1900 + id,
    logoUrl: `https://media.api-sports.io/football/teams/${id}.png`,
  };
}

function fakeCompetition(id, name) {
  return {
    ref: `${id}-${name.toLowerCase().replace(/\s+/g, '-')}`,
    apiId: id,
    displayName: name,
    shortDisplayName: name.split(' ')[0],
    originalName: name,
    country: 'England',
    countryCode: 'GB-ENG',
    type: 'LEAGUE',
    format: 'ROUND_ROBIN',
    logoUrl: `https://media.api-sports.io/football/leagues/${id}.png`,
    displayOrder: id,
  };
}

function fakeSeasonSummary(year) {
  return {
    year,
    label: `${year}-${String(year + 1).slice(2)}`,
    status: 'IN_PROGRESS',
    isCurrent: true,
    dataState: 'PARTIAL',
    startDate: `${year}-08-15`,
    endDate: `${year + 1}-05-30`,
  };
}

function fakeStandingRow(teamId, rank) {
  return {
    team: fakeTeam(teamId),
    groupName: null,
    rank,
    points: 30 - rank,
    played: 12,
    win: 10 - Math.floor(rank / 2),
    draw: 1,
    lose: 1 + Math.floor(rank / 2),
    goalsFor: 28 - rank,
    goalsAgainst: 5 + rank,
    goalDiff: 23 - 2 * rank,
    home: { played: 6, win: 5, draw: 0, lose: 1, gf: 15, ga: 3 },
    away: { played: 6, win: 4, draw: 1, lose: 1, gf: 13, ga: 5 },
    form: 'WWDLW',
    description: 'Promotion - Champions League (League phase)',
    status: 'same',
    asOf: '2026-09-10T00:00:00.000Z',
  };
}

function fakeStandingsTable(compId, compName, teamCount) {
  const comp = fakeCompetition(compId, compName);
  return {
    competition: { ...comp, type: 'LEAGUE', format: 'ROUND_ROBIN' },
    season: fakeSeasonSummary(2026),
    unavailableReason: null,
    rows: Array.from({ length: teamCount }, (_, i) => fakeStandingRow(compId * 100 + i + 1, i + 1)),
    asOf: '2026-09-10T00:00:00.000Z',
  };
}

/* ─── 각 도구 원본 데이터 ─── */

// get_standings 모드 A (EPL 단독 20팀)
const rawStandingsA = { items: [fakeStandingsTable(39, 'Premier League', 20)], asOf: '2026-09-10T00:00:00.000Z' };

// get_standings 모드 B (6대회 · EPL 20 + 라리가 20 + 세리에A 20 + 분데스 18 + 리그앙 18 + UCL 36)
const rawStandingsB = {
  items: [
    fakeStandingsTable(39, 'Premier League', 20),
    fakeStandingsTable(140, 'La Liga', 20),
    fakeStandingsTable(135, 'Serie A', 20),
    fakeStandingsTable(78, 'Bundesliga', 18),
    fakeStandingsTable(61, 'Ligue 1', 18),
    fakeStandingsTable(2, 'UEFA Champions League', 36),
  ],
  asOf: '2026-09-10T00:00:00.000Z',
};

// list_matches 10개
function fakeMatch(id) {
  return {
    id,
    kickoffAt: '2026-11-22T15:00:00.000Z',
    statusShort: 'FT',
    statusLong: 'Match Finished',
    elapsed: 90,
    extraElapsed: null,
    statsState: 'NONE',
    confirmedAt: null,
    goals: { home: 2, away: 1 },
    ht: { home: 1, away: 0 },
    ft: { home: 2, away: 1 },
    et: { home: null, away: null },
    pen: { home: null, away: null },
    winnerTeamRef: '33-manchester-united',
    home: fakeTeam(33),
    away: fakeTeam(40),
    competition: {
      ref: '39-premier-league',
      apiId: 39,
      displayName: 'Premier League',
      shortDisplayName: 'EPL',
      originalName: 'Premier League',
      type: 'LEAGUE',
      format: 'ROUND_ROBIN',
    },
    season: { year: 2026, label: '2026-27' },
    round: { name: 'Regular Season - 12', ordinal: 12, matchCount: 10, isLateStage: false },
    venue: { name: 'Old Trafford', city: 'Manchester' },
    referee: 'M. Oliver',
    leg: null,
    detailEligible: true,
    hasEvents: null,
    hasLineups: null,
    hasTeamStats: null,
    hasPlayerStats: null,
    asOf: '2026-09-10T00:00:00.000Z',
  };
}

const rawListMatches = {
  items: Array.from({ length: 10 }, (_, i) => fakeMatch(1_000_000 + i)),
  total: 10,
  hasMore: false,
  season: fakeSeasonSummary(2026),
  asOf: '2026-09-10T00:00:00.000Z',
};

// get_match (하나 · 상세)
const rawGetMatch = fakeMatch(1_234_567);

// list_competitions (17개)
const rawListCompetitions = {
  items: Array.from({ length: 17 }, (_, i) => ({
    ...fakeCompetition(i + 1, `Competition ${i + 1}`),
    currentSeason: fakeSeasonSummary(2026),
  })),
  asOf: '2026-09-10T00:00:00.000Z',
};

// get_competition (한 대회 · 5시즌)
const rawGetCompetition = {
  ...fakeCompetition(39, 'Premier League'),
  currentSeason: fakeSeasonSummary(2026),
  topFlightRef: null,
  seasons: Array.from({ length: 5 }, (_, i) => fakeSeasonSummary(2026 - i)),
  asOf: '2026-09-10T00:00:00.000Z',
};

// list_teams (EPL 20팀)
const rawListTeams = {
  competitionRef: '39-premier-league',
  season: fakeSeasonSummary(2026),
  items: Array.from({ length: 20 }, (_, i) => fakeTeam(100 + i)),
  asOf: '2026-09-10T00:00:00.000Z',
};

// get_team (한 팀 · venue + 참가 이력)
const rawGetTeam = {
  ...fakeTeam(33),
  venue: { name: 'Old Trafford', city: 'Manchester', capacity: 76212, surface: 'grass', imageUrl: 'x' },
  participations: [
    { competitionRef: '39-premier-league', competitionName: 'Premier League', seasons: [2026, 2025, 2024, 2023, 2022] },
    { competitionRef: '2-uefa-champions-league', competitionName: 'UEFA Champions League', seasons: [2026, 2024] },
    { competitionRef: '45-fa-cup', competitionName: 'FA Cup', seasons: [2026, 2025, 2024, 2023, 2022] },
  ],
  asOf: '2026-09-10T00:00:00.000Z',
};

// get_player (5시즌 · 각 시즌 2대회 = 10 seasonStat 행)
function fakeSeasonStat(compId, compName, year, teamId) {
  return {
    competition: {
      ref: `${compId}-${compName.toLowerCase().replace(/\s+/g, '-')}`,
      apiId: compId,
      displayName: compName,
      shortDisplayName: compName.split(' ')[0],
      originalName: compName,
      type: 'LEAGUE',
      format: 'ROUND_ROBIN',
    },
    season: {
      year,
      label: `${year}-${String(year + 1).slice(2)}`,
      dataState: 'PARTIAL',
      status: 'FINISHED',
      isCurrent: false,
      startDate: `${year}-08-15`,
      endDate: `${year + 1}-05-30`,
    },
    team: fakeTeam(teamId),
    appearances: 30,
    starts: 28,
    minutes: 2500,
    goals: 12,
    assists: year < 2024 ? null : 7,
    yellowCards: 4,
    yellowredCards: 0,
    redCards: 0,
  };
}

const rawGetPlayer = {
  ref: '909-lionel-messi',
  apiId: 909,
  displayName: 'Lionel Messi',
  shortDisplayName: 'L. Messi',
  originalName: 'Lionel Messi',
  photoUrl: 'https://media.api-sports.io/football/players/909.png',
  firstname: 'Lionel Andrés',
  lastname: 'Messi',
  nationality: 'Argentina',
  birthDate: '1987-06-24',
  birthPlace: 'Rosario',
  birthCountry: 'Argentina',
  heightCm: 170,
  weightKg: 72,
  jerseyNumber: 10,
  position: 'Attacker',
  primaryTeam: fakeTeam(85),
  seasonStats: [
    fakeSeasonStat(39, 'Premier League', 2026, 85),
    fakeSeasonStat(2, 'UEFA Champions League', 2026, 85),
    fakeSeasonStat(39, 'Premier League', 2025, 85),
    fakeSeasonStat(2, 'UEFA Champions League', 2025, 85),
    fakeSeasonStat(39, 'Premier League', 2024, 85),
    fakeSeasonStat(2, 'UEFA Champions League', 2024, 85),
    fakeSeasonStat(39, 'Premier League', 2023, 33),
    fakeSeasonStat(2, 'UEFA Champions League', 2023, 33),
    fakeSeasonStat(39, 'Premier League', 2022, 33),
    fakeSeasonStat(2, 'UEFA Champions League', 2022, 33),
  ],
  totals: { appearances: 300, minutes: 25000, goals: 250, assists: null, yellowCards: 40, redCards: 2 },
  asOf: '2026-09-10T00:00:00.000Z',
};

// get_top_scorers / get_top_assisters (모드 A · 10명)
function fakeRankRowA(rank) {
  return {
    rank,
    value: 15 - rank,
    player: {
      ref: `${900 + rank}-player-${rank}`,
      apiId: 900 + rank,
      displayName: `Player ${rank} Full Name`,
      shortDisplayName: `P. ${rank}`,
      originalName: `Player ${rank} Full Name`,
      photoUrl: `https://media.api-sports.io/football/players/${900 + rank}.png`,
    },
    team: fakeTeam(100 + rank),
  };
}

const rawTopScorersA = {
  competition: {
    ref: '2-uefa-champions-league',
    apiId: 2,
    displayName: 'UEFA Champions League',
    shortDisplayName: 'UCL',
    originalName: 'UEFA Champions League',
    type: 'CUP',
    format: 'LEAGUE_PHASE_KNOCKOUT',
  },
  season: { year: 2026, label: '2026-27' },
  items: Array.from({ length: 10 }, (_, i) => fakeRankRowA(i + 1)),
  asOf: '2026-09-10T00:00:00.000Z',
};

// 모드 B — 10명 각각 breakdown 6대회
function fakeRankRowB(rank) {
  return {
    ...fakeRankRowA(rank),
    breakdown: [
      { competition: rawTopScorersA.competition, season: { year: 2026, label: '2026-27' }, value: 5 },
      { competition: fakeCompetition(39, 'Premier League'), season: { year: 2026, label: '2026-27' }, value: 4 },
      { competition: fakeCompetition(140, 'La Liga'), season: { year: 2026, label: '2026-27' }, value: 3 },
    ],
  };
}

const rawTopAssistersB = {
  competition: null,
  season: null,
  items: Array.from({ length: 10 }, (_, i) => fakeRankRowB(i + 1)),
  asOf: '2026-09-10T00:00:00.000Z',
};

/* ─── 측정 · 출력 ─── */

const CASES = [
  ['get_standings (모드 A · EPL 20팀)', 'get_standings', rawStandingsA],
  ['get_standings (모드 B · 6대회)', 'get_standings', rawStandingsB],
  ['list_matches (10개)', 'list_matches', rawListMatches],
  ['get_match (연장·PK 없음)', 'get_match', rawGetMatch],
  ['list_competitions (17개)', 'list_competitions', rawListCompetitions],
  ['get_competition (5시즌)', 'get_competition', rawGetCompetition],
  ['list_teams (EPL 20팀)', 'list_teams', rawListTeams],
  ['get_team (venue+3대회 참가)', 'get_team', rawGetTeam],
  ['get_player (10 시즌스탯)', 'get_player', rawGetPlayer],
  ['get_top_scorers (모드 A · 10명)', 'get_top_scorers', rawTopScorersA],
  ['get_top_assisters (모드 B · 10명 · breakdown 3)', 'get_top_assisters', rawTopAssistersB],
];

const TEN_KB = 10 * KB;

let anyExceeds = false;

console.log('| 도구 | 압축 전 (B) | 압축 후 (B) | 절감률 | 압축 후 KB | ≈토큰 | 10KB 초과 |');
console.log('|---|---:|---:|---:|---:|---:|:---:|');
for (const [label, tool, data] of CASES) {
  const beforeB = bytes(data);
  const compressed = compressForModel(tool, data);
  const afterB = bytes(compressed);
  const ratio = ((1 - afterB / beforeB) * 100).toFixed(1);
  const exceeds = afterB > TEN_KB;
  if (exceeds) anyExceeds = true;
  console.log(
    `| ${label} | ${beforeB} | ${afterB} | ${ratio}% | ${(afterB / KB).toFixed(2)} | ${approxTokens(afterB)} | ${exceeds ? 'Y' : 'N'} |`,
  );
}

console.log('');
console.log(`10KB 초과 자리: ${anyExceeds ? '있음 (Q3 게이트 위반)' : '없음 (Q3 게이트 통과)'}`);
