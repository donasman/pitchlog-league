/**
 * L2 라운드 · 경기 · 순위 — 쓰기 불변식 (BACKEND_FEATURES #13·#15, INGESTION_STRATEGY 2-2)
 *
 * 컷 판정 자체는 `src/ingestion/l2/round-scope.spec.ts` 가 DB 없이 표로 검증한다.
 * 여기서는 DB 에 실제로 쓸 때만 드러나는 것을 본다:
 *   - 컷 앞 라운드는 라운드도 경기도 저장되지 않는다
 *   - ordinal 은 잘려도 원래 번호를 유지한다 (나중에 앞 라운드를 백필해도 다시 안 매긴다)
 *   - 목록에 없는 라운드·DB 에 없는 팀은 보고만 하고 건너뛴다
 *   - 재실행이 멱등이고 스코어는 갱신된다
 *   - **재실행이 L3~L5 의 것을 지우지 않는다** (has_*, detail_checked_at, data_version)
 *   - 순위 group_name 이 NULL 이 아니다 (NULL 이면 unique 인덱스가 중복을 통과시킨다)
 *   - 끝난 뒤 고아 행이 없다
 *
 * 7~12 는 **전 시즌 모드**(`--all-seasons` · `--season=`)를 본다. 그 중 8번이 핵심이다:
 * 1부 팀 집합을 `isCurrent` 로 뽑으면 과거 시즌 컵이 현재 시즌 참가팀으로 판정돼
 * **컷이 안 잡히고 그 시즌이 통째로 0건**이 된다. 예외도 아니고 로그에 경고 한 줄만 남는다.
 *
 * 이 파일은 도메인 테이블에 가짜 행을 쓴다 — 로컬 DB 나 CI 에서만 돈다.
 *
 * ## 끝나면 반드시 치운다
 * `l0.e2e-spec.ts` 는 대회시즌·팀·참가를 **전역으로** 센다 (09-07 CI 에서 실제로 깨졌다).
 * 파일 실행 순서에 기대지 않고 afterAll 에서 되돌린다.
 */
import 'dotenv/config';
import { Test } from '@nestjs/testing';
import type { INestApplicationContext } from '@nestjs/common';
import { PrismaService } from '../src/prisma/prisma.service.js';
import { IntegrityService } from '../src/prisma/integrity.service.js';
import { ApiFootballClient } from '../src/ingestion/api-football/api-football.client.js';
import { L2Service } from '../src/ingestion/l2/l2.service.js';
import { ApiQuotaExhaustedError } from '../src/ingestion/api-football/api-football.errors.js';
import { CompetitionFormat, CompetitionType } from '../src/generated/prisma/client.js';
import type { ApiEnvelope, ApiFixture, ApiStandingRow } from '../src/ingestion/api-football/api-football.types.js';

/** 카탈로그·다른 e2e 와 겹치지 않는 대역 (l1 은 990_xxx 를 쓴다) */
const LEAGUE_API_ID = 991_140;
const CUP_API_ID = 991_143;
const SEASON_YEAR = 2026;

/** 1부 리그 팀 — 컵의 "1부 팀 집합"이 된다 */
const TF = [992_001, 992_002, 992_003, 992_004];
/** 컵 하부 팀 991_001 ~ 991_020 */
const KO = Array.from({ length: 20 }, (_, i) => 991_001 + i);
/** 일부러 DB 에 만들지 않는 팀 — missingTeams 보고 경로 */
const MISSING_TEAM = 991_999;
const VENUE_API_ID = 993_001;

/**
 * ── 시즌 확장 픽스처 (995_xxx) ──
 * 위 991~994 대역과 겹치지 않게 둔다. 시즌 3개(2026 현재 · 2025 · 2024)를 만들고
 * **시즌마다 1부 참가팀을 다르게** 해서 `isCurrent` 회귀(8번)를 잡는다.
 */
const S_LEAGUE_API_ID = 995_140;
const S_CUP_API_ID = 995_143;
const SEASONS_ALL = [2026, 2025, 2024];

const S_A = 995_001;
const S_B = 995_002;
const S_C = 995_003;
const S_D = 995_004;
/** 2024 에만 1부인 팀 — 버그 코드는 이 팀을 1부로 보지 못한다 */
const S_E = 995_005;
const S_F = 995_006;
/** 어느 시즌에도 1부가 아닌 컵 하부 팀 */
const S_LOW = [995_011, 995_012, 995_013, 995_014];
const S_TEAMS = [S_A, S_B, S_C, S_D, S_E, S_F, ...S_LOW];

const S_LEAGUE_ENTRIES: Record<number, number[]> = {
  2026: [S_A, S_B, S_C, S_D],
  2025: [S_A, S_B, S_C, S_D],
  2024: [S_A, S_B, S_E, S_F],
};
/** 시즌별 컵 2라운드의 1부 팀. 2024 만 S_E — 2026 참가팀으로 판정하면 컷이 안 잡힌다 */
const S_CUP_TOP_TEAM: Record<number, number> = { 2026: S_C, 2025: S_C, 2024: S_E };

const S_LEAGUE_ROUNDS = ['Season League - 1'];
const S_CUP_ROUNDS = ['Season Cup R1', 'Season Cup R2'];

/**
 * top_flight 가 **없는** 녹아웃 대회 = UCL 폴백 경로. `topFlightCompetitionId === null` 이라
 * 1부 집합을 "추적 ROUND_ROBIN 대회의 같은 시즌 참가팀 합집합" 으로 잡는다.
 * 컵 경로(S_CUP)와 코드가 다르므로 따로 회귀 테스트가 필요하다 (13번).
 */
const S_UCL_API_ID = 995_200;
const S_UCL_ROUNDS = ['Season UCL R1', 'Season UCL R2'];

/** `SEASON_YEARS` 밖의 연도 — L0 가 `/leagues?id=` 로 끌어온 옛 시즌을 흉내낸다 (15번) */
const OUT_OF_RANGE_YEAR = 1992;

const LEAGUE_ROUNDS = ['Regular Season - 1', 'Regular Season - 2'];
const CUP_ROUNDS = ['Preliminary Round', 'Round of 16', 'Quarter-finals'];
/** `/fixtures` 에는 있는데 `/fixtures/rounds` 에는 없는 라운드 */
const UNLISTED_ROUND = 'Play-off Round';

let nextFixtureId = 994_000;
const fx = (
  league: number,
  round: string,
  home: number,
  away: number,
  opts: { goals?: [number, number]; venue?: boolean } = {},
): ApiFixture => {
  const id = nextFixtureId++;
  const finished = opts.goals !== undefined;
  const gh = opts.goals ? opts.goals[0] : null;
  const ga = opts.goals ? opts.goals[1] : null;
  return {
    fixture: {
      id,
      referee: finished ? 'Ref Testerson' : null,
      timestamp: 1_770_000_000 + id,
      date: new Date(1_770_000_000_000 + id * 3_600_000).toISOString(),
      venue: opts.venue ? { id: VENUE_API_ID, name: 'Fixture Arena', city: 'Testville' } : { id: null, name: null, city: null },
      status: finished
        ? { long: 'Match Finished', short: 'FT', elapsed: 90, extra: null }
        : { long: 'Not Started', short: 'NS', elapsed: null, extra: null },
    },
    league: { id: league, season: SEASON_YEAR, round },
    teams: {
      home: { id: home, name: `Team ${home}`, winner: opts.goals ? opts.goals[0] > opts.goals[1] : null },
      away: { id: away, name: `Team ${away}`, winner: opts.goals ? opts.goals[1] > opts.goals[0] : null },
    },
    goals: { home: gh, away: ga },
    score: {
      halftime: { home: finished ? 0 : null, away: finished ? 0 : null },
      fulltime: { home: gh, away: ga },
      extratime: { home: null, away: null },
      penalty: { home: null, away: null },
    },
  };
};

/** 짝을 이어 붙인다: [a,b,c,d] → (a,b) (c,d) */
const pairs = (ids: readonly number[]): [number, number][] => {
  const out: [number, number][] = [];
  for (let i = 0; i + 1 < ids.length; i += 2) out.push([ids[i], ids[i + 1]]);
  return out;
};

const standingRow = (rank: number, apiTeamId: number, group: string): ApiStandingRow => ({
  rank,
  team: { id: apiTeamId, name: `Team ${apiTeamId}` },
  points: 10 - rank,
  goalsDiff: 5 - rank,
  // 빈 문자열 — 서비스가 대회 이름으로 채워야 한다 (NULL 이면 unique 인덱스가 무력해진다)
  group,
  form: 'WWD',
  status: 'same',
  description: null,
  all: { played: 2, win: 1, draw: 1, lose: 0, goals: { for: 3, against: 1 } },
  home: { played: 1, win: 1, draw: 0, lose: 0, goals: { for: 2, against: 0 } },
  away: { played: 1, win: 0, draw: 1, lose: 0, goals: { for: 1, against: 1 } },
});

class FakeApiFootballClient {
  calls: string[] = [];
  rounds = new Map<number, string[]>();
  fixtures = new Map<number, ApiFixture[]>();
  standings = new Map<number, ApiStandingRow[][]>();
  /** 시즌별 응답 — 키 `${league}:${season}`. 없으면 위 리그 단위 맵으로 떨어진다 */
  seasonRounds = new Map<string, string[]>();
  seasonFixtures = new Map<string, ApiFixture[]>();
  /** 이 `${league}:${season}` 은 던진다 — 한 시즌 실패가 나머지를 막지 않는지 본다 */
  failKeys = new Set<string>();
  /** 이 `${league}:${season}` 은 **일일 한도 소진**으로 던진다 — 루프가 끊기는지 본다 */
  quotaKeys = new Set<string>();

  get callCount(): number {
    return this.calls.length;
  }

  async get<T>(path: string, query: Record<string, string | number> = {}): Promise<ApiEnvelope<T>> {
    const league = Number(query.league);
    const season = Number(query.season);
    const key = `${league}:${season}`;
    this.calls.push(`${path}?league=${league}&season=${season}`);
    if (this.quotaKeys.has(key)) throw new ApiQuotaExhaustedError(`${path}?league=${league}&season=${season}`);
    if (this.failKeys.has(key)) throw new Error(`가짜 실패 ${key}`);
    let response: unknown;
    if (path === '/fixtures/rounds') response = this.seasonRounds.get(key) ?? this.rounds.get(league) ?? [];
    else if (path === '/fixtures') response = this.seasonFixtures.get(key) ?? this.fixtures.get(league) ?? [];
    else if (path === '/standings') {
      const groups = this.standings.get(league);
      response = groups ? [{ league: { id: league, season: Number(query.season), standings: groups } }] : [];
    } else throw new Error(`가짜 클라이언트가 모르는 경로: ${path}`);
    const n = Array.isArray(response) ? response.length : 1;
    return { get: path, parameters: {}, errors: [], results: n, paging: { current: 1, total: 1 }, response: response as T };
  }
}

describe('L2 라운드·경기·순위 (e2e, 가짜 API)', () => {
  let app: INestApplicationContext;
  let prisma: PrismaService;
  let l2: L2Service;
  let fake: FakeApiFootballClient;
  let leagueCsId: number;
  let cupCsId: number;
  /** 시즌 확장 픽스처의 대회시즌 id — 연도로 찾는다 */
  const sLeagueCsId: Record<number, number> = {};
  const sCupCsId: Record<number, number> = {};
  const sUclCsId: Record<number, number> = {};
  const extraCsIds: number[] = [];
  const teamIdByApi = new Map<number, number>();

  beforeAll(async () => {
    const host = new URL(process.env.DATABASE_URL ?? 'postgresql://x/').hostname;
    const local = ['localhost', '127.0.0.1', '::1'].includes(host);
    if (!local && !process.env.CI && process.env.E2E_ALLOW_REMOTE_DB !== '1') {
      throw new Error(`l2 e2e 는 가짜 데이터를 쓰므로 원격 DB(${host})에서는 돌리지 않는다 — 로컬 Postgres 를 쓰거나 E2E_ALLOW_REMOTE_DB=1`);
    }
    const { AppModule } = await import('../src/app.module.js');
    fake = new FakeApiFootballClient();
    const mod = await Test.createTestingModule({ imports: [AppModule] }).overrideProvider(ApiFootballClient).useValue(fake).compile();
    app = await mod.init();
    prisma = app.get(PrismaService);
    l2 = app.get(L2Service);

    await prisma.season.upsert({ where: { year: SEASON_YEAR }, create: { year: SEASON_YEAR }, update: {} });
    const season = await prisma.season.findUniqueOrThrow({ where: { year: SEASON_YEAR } });

    for (const apiTeamId of [...TF, ...KO]) {
      const team = await prisma.team.upsert({
        where: { apiTeamId },
        create: { apiTeamId, name: `Team ${apiTeamId}`, country: 'Testland' },
        update: {},
      });
      teamIdByApi.set(apiTeamId, team.id);
    }

    // 1부 리그 — 참가팀이 곧 컵의 "1부 팀 집합"이다
    const league = await prisma.competition.upsert({
      where: { apiCompetitionId: LEAGUE_API_ID },
      create: {
        apiCompetitionId: LEAGUE_API_ID, name: 'L2 Fixture League', country: 'Testland',
        type: CompetitionType.LEAGUE, format: CompetitionFormat.ROUND_ROBIN, isTracked: true, displayOrder: 91,
      },
      update: { isTracked: true, displayOrder: 91, format: CompetitionFormat.ROUND_ROBIN },
    });
    // 컵 — top_flight 를 위 리그로 지정한다. 이러면 1부 팀 집합이 결정적이다
    const cup = await prisma.competition.upsert({
      where: { apiCompetitionId: CUP_API_ID },
      create: {
        apiCompetitionId: CUP_API_ID, name: 'L2 Fixture Cup', country: 'Testland',
        type: CompetitionType.CUP, format: CompetitionFormat.KNOCKOUT, isTracked: true, displayOrder: 92,
        topFlightCompetitionId: league.id,
      },
      update: { isTracked: true, displayOrder: 92, format: CompetitionFormat.KNOCKOUT, topFlightCompetitionId: league.id },
    });

    leagueCsId = (await prisma.competitionSeason.upsert({
      where: { competitionId_seasonId: { competitionId: league.id, seasonId: season.id } },
      create: { competitionId: league.id, seasonId: season.id, apiSeasonValue: SEASON_YEAR, isCurrent: true },
      update: { isCurrent: true },
    })).id;
    cupCsId = (await prisma.competitionSeason.upsert({
      where: { competitionId_seasonId: { competitionId: cup.id, seasonId: season.id } },
      create: { competitionId: cup.id, seasonId: season.id, apiSeasonValue: SEASON_YEAR, isCurrent: true },
      update: { isCurrent: true },
    })).id;

    for (const apiTeamId of TF) {
      const teamId = teamIdByApi.get(apiTeamId) as number;
      const exists = await prisma.competitionEntry.findFirst({ where: { competitionSeasonId: leagueCsId, teamId } });
      if (!exists) await prisma.competitionEntry.create({ data: { competitionSeasonId: leagueCsId, teamId } });
    }

    // ── 리그: 2라운드 × 2경기, 전부 1부 팀 → 컷은 0번
    fake.rounds.set(LEAGUE_API_ID, [...LEAGUE_ROUNDS]);
    fake.fixtures.set(LEAGUE_API_ID, [
      fx(LEAGUE_API_ID, LEAGUE_ROUNDS[0], TF[0], TF[1], { goals: [2, 1], venue: true }),
      fx(LEAGUE_API_ID, LEAGUE_ROUNDS[0], TF[2], TF[3], { goals: [0, 0] }),
      fx(LEAGUE_API_ID, LEAGUE_ROUNDS[1], TF[1], TF[2]),
      fx(LEAGUE_API_ID, LEAGUE_ROUNDS[1], TF[3], TF[0]),
    ]);
    fake.standings.set(LEAGUE_API_ID, [TF.map((t, i) => standingRow(i + 1, t, ''))]);

    // ── 컵: 예선(20팀·1부 없음) → 16강(16팀·1부 1팀) → 8강(8팀, 1부 없음)
    //    컷 = 16강(ordinal 1). 8강은 1부가 없어도 16강 이상이라 상세 대상이다
    fake.rounds.set(CUP_API_ID, [...CUP_ROUNDS]);
    fake.fixtures.set(CUP_API_ID, [
      ...pairs(KO).map(([h, a]) => fx(CUP_API_ID, CUP_ROUNDS[0], h, a, { goals: [1, 0] })),
      fx(CUP_API_ID, CUP_ROUNDS[1], TF[0], KO[0], { goals: [3, 0], venue: true }),
      ...pairs(KO.slice(1, 15)).map(([h, a]) => fx(CUP_API_ID, CUP_ROUNDS[1], h, a, { goals: [1, 1] })),
      ...pairs(KO.slice(0, 6)).map(([h, a]) => fx(CUP_API_ID, CUP_ROUNDS[2], h, a)),
      // DB 에 없는 팀 — 이 경기 하나만 건너뛰어야 한다
      fx(CUP_API_ID, CUP_ROUNDS[2], KO[6], MISSING_TEAM),
      // rounds 목록에 없는 라운드 — 보고만 하고 저장하지 않는다
      fx(CUP_API_ID, UNLISTED_ROUND, KO[0], KO[1]),
    ]);

    // ── 시즌 확장 픽스처 (995_xxx) — 2026 · 2025 · 2024
    for (const apiTeamId of S_TEAMS) {
      const team = await prisma.team.upsert({
        where: { apiTeamId },
        create: { apiTeamId, name: `Team ${apiTeamId}`, country: 'Testland' },
        update: {},
      });
      teamIdByApi.set(apiTeamId, team.id);
    }

    const sLeague = await prisma.competition.upsert({
      where: { apiCompetitionId: S_LEAGUE_API_ID },
      create: {
        apiCompetitionId: S_LEAGUE_API_ID, name: 'L2 Season League', country: 'Testland',
        type: CompetitionType.LEAGUE, format: CompetitionFormat.ROUND_ROBIN, isTracked: true, displayOrder: 93,
      },
      update: { isTracked: true, displayOrder: 93, format: CompetitionFormat.ROUND_ROBIN },
    });
    const sCup = await prisma.competition.upsert({
      where: { apiCompetitionId: S_CUP_API_ID },
      create: {
        apiCompetitionId: S_CUP_API_ID, name: 'L2 Season Cup', country: 'Testland',
        type: CompetitionType.CUP, format: CompetitionFormat.KNOCKOUT, isTracked: true, displayOrder: 94,
        topFlightCompetitionId: sLeague.id,
      },
      update: { isTracked: true, displayOrder: 94, format: CompetitionFormat.KNOCKOUT, topFlightCompetitionId: sLeague.id },
    });
    // top_flight 없음 = UCL 폴백 경로. 1부 집합은 추적 ROUND_ROBIN 대회의 **같은 시즌** 참가팀 합집합이다
    const sUcl = await prisma.competition.upsert({
      where: { apiCompetitionId: S_UCL_API_ID },
      create: {
        apiCompetitionId: S_UCL_API_ID, name: 'L2 Season UCL', country: 'Testland',
        type: CompetitionType.CUP, format: CompetitionFormat.KNOCKOUT, isTracked: true, displayOrder: 95,
      },
      update: { isTracked: true, displayOrder: 95, format: CompetitionFormat.KNOCKOUT, topFlightCompetitionId: null },
    });

    for (const year of SEASONS_ALL) {
      await prisma.season.upsert({ where: { year }, create: { year }, update: {} });
      const s = await prisma.season.findUniqueOrThrow({ where: { year } });
      const isCurrent = year === SEASON_YEAR;

      const lcs = await prisma.competitionSeason.upsert({
        where: { competitionId_seasonId: { competitionId: sLeague.id, seasonId: s.id } },
        create: { competitionId: sLeague.id, seasonId: s.id, apiSeasonValue: year, isCurrent },
        update: { isCurrent },
      });
      const ccs = await prisma.competitionSeason.upsert({
        where: { competitionId_seasonId: { competitionId: sCup.id, seasonId: s.id } },
        create: { competitionId: sCup.id, seasonId: s.id, apiSeasonValue: year, isCurrent },
        update: { isCurrent },
      });
      const ucs = await prisma.competitionSeason.upsert({
        where: { competitionId_seasonId: { competitionId: sUcl.id, seasonId: s.id } },
        create: { competitionId: sUcl.id, seasonId: s.id, apiSeasonValue: year, isCurrent },
        update: { isCurrent },
      });
      sLeagueCsId[year] = lcs.id;
      sCupCsId[year] = ccs.id;
      sUclCsId[year] = ucs.id;
      extraCsIds.push(lcs.id, ccs.id, ucs.id);

      // 참가팀 — 2024 만 {A,B,E,F} 다
      for (const apiTeamId of S_LEAGUE_ENTRIES[year]) {
        const teamId = teamIdByApi.get(apiTeamId) as number;
        const exists = await prisma.competitionEntry.findFirst({ where: { competitionSeasonId: lcs.id, teamId } });
        if (!exists) await prisma.competitionEntry.create({ data: { competitionSeasonId: lcs.id, teamId } });
      }

      const entries = S_LEAGUE_ENTRIES[year];
      fake.seasonRounds.set(`${S_LEAGUE_API_ID}:${year}`, [...S_LEAGUE_ROUNDS]);
      fake.seasonFixtures.set(`${S_LEAGUE_API_ID}:${year}`, [
        fx(S_LEAGUE_API_ID, S_LEAGUE_ROUNDS[0], entries[0], entries[1], { goals: [1, 0] }),
        fx(S_LEAGUE_API_ID, S_LEAGUE_ROUNDS[0], entries[2], entries[3], { goals: [2, 2] }),
      ]);

      // 컵: R1 은 하부 팀만(1부 없음) · R2 에만 그 시즌의 1부 팀이 나온다 → 컷은 R2
      fake.seasonRounds.set(`${S_CUP_API_ID}:${year}`, [...S_CUP_ROUNDS]);
      fake.seasonFixtures.set(`${S_CUP_API_ID}:${year}`, [
        fx(S_CUP_API_ID, S_CUP_ROUNDS[0], S_LOW[0], S_LOW[1], { goals: [1, 0] }),
        fx(S_CUP_API_ID, S_CUP_ROUNDS[0], S_LOW[2], S_LOW[3], { goals: [0, 1] }),
        fx(S_CUP_API_ID, S_CUP_ROUNDS[1], S_CUP_TOP_TEAM[year], S_LOW[0], { goals: [3, 1] }),
      ]);

      // UCL 폴백도 같은 구조 — R2 에만 그 시즌의 1부 팀이 나온다
      fake.seasonRounds.set(`${S_UCL_API_ID}:${year}`, [...S_UCL_ROUNDS]);
      fake.seasonFixtures.set(`${S_UCL_API_ID}:${year}`, [
        fx(S_UCL_API_ID, S_UCL_ROUNDS[0], S_LOW[0], S_LOW[1], { goals: [2, 0] }),
        fx(S_UCL_API_ID, S_UCL_ROUNDS[0], S_LOW[2], S_LOW[3], { goals: [1, 2] }),
        fx(S_UCL_API_ID, S_UCL_ROUNDS[1], S_CUP_TOP_TEAM[year], S_LOW[1], { goals: [4, 0] }),
      ]);
    }

    // `SEASON_YEARS` 밖의 대회시즌 — L0 가 시즌 없이 `/leagues?id=` 를 부르면 이런 행이 생긴다.
    // 전 시즌 모드가 이걸 집으면 안 된다 (15번). 참가팀도 가짜 응답도 두지 않는다
    await prisma.season.upsert({ where: { year: OUT_OF_RANGE_YEAR }, create: { year: OUT_OF_RANGE_YEAR }, update: {} });
    const oldSeason = await prisma.season.findUniqueOrThrow({ where: { year: OUT_OF_RANGE_YEAR } });
    const oldCs = await prisma.competitionSeason.upsert({
      where: { competitionId_seasonId: { competitionId: sLeague.id, seasonId: oldSeason.id } },
      create: { competitionId: sLeague.id, seasonId: oldSeason.id, apiSeasonValue: OUT_OF_RANGE_YEAR, isCurrent: false },
      update: { isCurrent: false },
    });
    extraCsIds.push(oldCs.id);
  }, 180_000);

  afterAll(async () => {
    if (prisma) {
      try {
        await cleanupFixture();
      } catch (cause) {
        console.warn('[l2 e2e] 픽스처 정리 실패 — 다음 e2e 가 영향을 받을 수 있다:', cause);
      }
    }
    await app?.close();
  });

  /** 자식부터 지운다. relationMode="prisma" 의 Restrict 는 자식이 남으면 부모 삭제를 막는다 */
  const cleanupFixture = async () => {
    // l0.e2e 가 대회시즌·참가를 **전역으로** 센다 — 995 대역까지 하나도 남기지 않는다
    const csIds = [leagueCsId, cupCsId, ...extraCsIds].filter((id): id is number => typeof id === 'number');
    if (csIds.length > 0) {
      await prisma.standing.deleteMany({ where: { competitionSeasonId: { in: csIds } } });
      await prisma.match.deleteMany({ where: { competitionSeasonId: { in: csIds } } });
      await prisma.competitionRound.deleteMany({ where: { competitionSeasonId: { in: csIds } } });
      await prisma.backfillJob.deleteMany({ where: { competitionSeasonId: { in: csIds } } });
      await prisma.competitionEntry.deleteMany({ where: { competitionSeasonId: { in: csIds } } });
      // 시즌 단위 wrap 이 남긴 행 — FK 는 없지만 죽은 id 를 가리키게 두지 않는다
      await prisma.ingestionRun.deleteMany({ where: { competitionSeasonId: { in: csIds } } });
      await prisma.competitionSeason.deleteMany({ where: { id: { in: csIds } } });
    }
    // 컵이 리그를 top_flight 로 참조한다 — 참조를 끊고 지운다
    await prisma.competition.updateMany({ where: { apiCompetitionId: { in: [CUP_API_ID, S_CUP_API_ID] } }, data: { topFlightCompetitionId: null } });
    await prisma.competition.deleteMany({
      where: { apiCompetitionId: { in: [LEAGUE_API_ID, CUP_API_ID, S_LEAGUE_API_ID, S_CUP_API_ID, S_UCL_API_ID] } },
    });
    await prisma.venue.deleteMany({ where: { apiVenueId: VENUE_API_ID } });
    const ids = [...teamIdByApi.values()];
    if (ids.length > 0) await prisma.team.deleteMany({ where: { id: { in: ids } } });
  };

  const resultFor = (summary: Awaited<ReturnType<L2Service['run']>>, name: string) => {
    const r = summary.competitions.find((c) => c.name === name);
    if (!r) throw new Error(`${name} 결과가 없다`);
    return r;
  };

  const roundsOf = (csId: number) =>
    prisma.competitionRound.findMany({
      where: { competitionSeasonId: csId },
      orderBy: { ordinal: 'asc' },
      select: { id: true, name: true, ordinal: true, teamCount: true, matchCount: true, isLateStage: true, hasTopFlight: true },
    });

  const matchCountOf = (csId: number) => prisma.match.count({ where: { competitionSeasonId: csId } });

  it('1. 컵 — 컷 앞 라운드는 라운드도 경기도 저장되지 않는다', async () => {
    const summary = await l2.run();
    const cup = resultFor(summary, 'L2 Fixture Cup');

    expect(cup.cutRound).toBe('Round of 16');
    expect(cup.droppedRounds).toBe(1);
    expect(cup.unknownRounds).toEqual([UNLISTED_ROUND]);
    expect(cup.missingTeams).toEqual([MISSING_TEAM]);

    const rounds = await roundsOf(cupCsId);
    expect(rounds.map((r) => r.name)).toEqual(['Round of 16', 'Quarter-finals']);
    // 잘려도 번호는 원래 자리를 지킨다 — 나중에 예선을 백필해도 다시 매기지 않는다
    expect(rounds.map((r) => r.ordinal)).toEqual([1, 2]);
    expect(rounds.map((r) => r.hasTopFlight)).toEqual([true, false]);
    expect(rounds.map((r) => r.isLateStage)).toEqual([true, true]);
    expect(rounds[0].teamCount).toBe(16);
    expect(rounds[0].matchCount).toBe(8);

    // 16강 8 + 8강 4 − DB 에 없는 팀 1 = 11. 예선 10 과 목록 밖 1 은 들어오지 않는다
    expect(await matchCountOf(cupCsId)).toBe(11);
    expect(cup.matches).toBe(11);
  }, 180_000);

  it('2. 컵 — 1부가 없어도 16강 이상이면 상세 대상이다 (2-2 의 OR)', async () => {
    const qf = (await roundsOf(cupCsId)).find((r) => r.name === 'Quarter-finals');
    const eligible = await prisma.match.count({ where: { roundId: qf!.id, detailEligible: true } });
    expect(eligible).toBe(3);
  }, 60_000);

  it('3. 리그 — 라운드·경기·순위가 들어가고 group_name 이 비지 않는다', async () => {
    expect(await matchCountOf(leagueCsId)).toBe(4);
    expect((await roundsOf(leagueCsId)).map((r) => r.ordinal)).toEqual([0, 1]);

    const standings = await prisma.standing.findMany({
      where: { competitionSeasonId: leagueCsId },
      orderBy: { rank: 'asc' },
      select: { rank: true, groupName: true, points: true, teamId: true },
    });
    expect(standings).toHaveLength(4);
    // API 가 빈 문자열을 줘도 NULL 로 두지 않는다 — NULL 은 unique 인덱스에서 서로 달라 중복을 통과시킨다
    expect(standings.every((s) => s.groupName)).toBe(true);
    expect(standings.map((s) => s.rank)).toEqual([1, 2, 3, 4]);
  }, 60_000);

  it('4. 재실행 — 행이 늘지 않고 스코어는 갱신된다', async () => {
    const beforeMatches = await matchCountOf(cupCsId);
    const beforeRounds = (await roundsOf(cupCsId)).length;
    const beforeStandings = await prisma.standing.count({ where: { competitionSeasonId: leagueCsId } });

    // 경기 결과와 순위가 바뀐 상태로 다시 받는다
    const target = fake.fixtures.get(CUP_API_ID)!.find((f) => f.league.round === 'Round of 16')!;
    target.goals = { home: 4, away: 2 };
    target.score.fulltime = { home: 4, away: 2 };
    fake.standings.set(LEAGUE_API_ID, [TF.map((t, i) => standingRow(4 - i, t, ''))]);

    await l2.run();

    expect(await matchCountOf(cupCsId)).toBe(beforeMatches);
    expect((await roundsOf(cupCsId)).length).toBe(beforeRounds);
    expect(await prisma.standing.count({ where: { competitionSeasonId: leagueCsId } })).toBe(beforeStandings);

    const stored = await prisma.match.findUniqueOrThrow({ where: { apiFixtureId: target.fixture.id } });
    expect([stored.goalsHome, stored.goalsAway]).toEqual([4, 2]);
    expect(stored.winnerTeamId).toBe(teamIdByApi.get(TF[0]));

    const top = await prisma.standing.findFirstOrThrow({ where: { competitionSeasonId: leagueCsId, rank: 1 } });
    expect(top.teamId).toBe(teamIdByApi.get(TF[3]));
  }, 180_000);

  it('5. 소유권 경계 — 재실행이 L3~L5 의 열을 지우지 않는다', async () => {
    const target = fake.fixtures.get(CUP_API_ID)!.find((f) => f.league.round === 'Quarter-finals')!;
    const checkedAt = new Date('2026-09-01T00:00:00Z');
    await prisma.match.update({
      where: { apiFixtureId: target.fixture.id },
      data: { hasEvents: true, hasLineups: false, detailCheckedAt: checkedAt, dataVersion: 7 },
    });

    await l2.run();

    const after = await prisma.match.findUniqueOrThrow({ where: { apiFixtureId: target.fixture.id } });
    expect(after.hasEvents).toBe(true);
    expect(after.hasLineups).toBe(false);
    expect(after.detailCheckedAt?.toISOString()).toBe(checkedAt.toISOString());
    expect(after.dataVersion).toBe(7);
  }, 180_000);

  it('6. 고아 행이 없다', async () => {
    expect(await app.get(IntegrityService).findOrphans()).toEqual([]);
  }, 120_000);

  // ── 전 시즌 모드 (백필-1, NEXT_STEPS 8-b) ──

  const seasonsCalledFor = (apiId: number) =>
    [...new Set(fake.calls.filter((c) => c.includes(`league=${apiId}&`)).map((c) => c.slice(c.indexOf('season=') + 7)))].sort();

  const yearsOf = (summary: Awaited<ReturnType<L2Service['run']>>, name: string) =>
    summary.competitions.filter((c) => c.name === name).map((c) => c.seasonYear);

  it('7. --all-seasons — 3시즌을 다 돈다', async () => {
    fake.calls = [];
    const summary = await l2.run({ allSeasons: true });

    expect([...yearsOf(summary, 'L2 Season Cup')].sort()).toEqual([2024, 2025, 2026]);
    expect([...yearsOf(summary, 'L2 Season League')].sort()).toEqual([2024, 2025, 2026]);
    expect(seasonsCalledFor(S_CUP_API_ID)).toEqual(['2024', '2025', '2026']);
  }, 180_000);

  it('8. ★ 1부 팀 집합은 그 시즌의 것이다 — isCurrent 로 뽑으면 과거 시즌이 통째로 0건이 된다', async () => {
    // 2024 컵 R2 에는 S_E 만 나온다. S_E 는 **2024 리그 참가팀**이고 2026 참가팀이 아니다.
    // isCurrent 로 1부 집합을 뽑으면 컷이 안 잡혀(cutRound null) 이 시즌은 아무것도 저장되지 않는다.
    await prisma.match.deleteMany({ where: { competitionSeasonId: sCupCsId[2024] } });

    const summary = await l2.run({ seasonYear: 2024 });
    const cup = summary.competitions.find((c) => c.name === 'L2 Season Cup' && c.seasonYear === 2024);
    expect(cup).toBeDefined();
    expect(cup!.cutRound).toBe('Season Cup R2'); // 버그 코드는 null
    expect(cup!.matches).toBe(1); // 버그 코드는 0

    const saved = await prisma.match.findMany({
      where: { competitionSeasonId: sCupCsId[2024] },
      select: { homeTeamId: true, awayTeamId: true },
    });
    expect(saved).toHaveLength(1);
    expect(saved[0].homeTeamId).toBe(teamIdByApi.get(S_E));

    // 컷 앞 라운드(R1)는 저장되지 않는다
    const rounds = await roundsOf(sCupCsId[2024]);
    expect(rounds.map((r) => r.name)).toEqual(['Season Cup R2']);
    expect(rounds.map((r) => r.ordinal)).toEqual([1]);
  }, 180_000);

  it('9. 최신 시즌부터 역순으로 돈다 (INGESTION_STRATEGY 5-3)', async () => {
    const summary = await l2.run({ allSeasons: true });
    const years = summary.competitions.map((c) => c.seasonYear);
    expect(years).toEqual([...years].sort((a, b) => b - a));
    expect(yearsOf(summary, 'L2 Season Cup')).toEqual([2026, 2025, 2024]);
  }, 180_000);

  it('10. 한 시즌이 실패해도 나머지 시즌은 들어간다', async () => {
    const failKey = `${S_CUP_API_ID}:2025`;
    fake.failKeys.add(failKey);
    try {
      await prisma.match.deleteMany({ where: { competitionSeasonId: sCupCsId[2024] } });
      const summary = await l2.run({ allSeasons: true });

      expect(summary.skipped).toHaveLength(1);
      expect(summary.skipped[0]).toContain('L2 Season Cup 2025');
      expect(summary.partial).toBe(true);
      expect(yearsOf(summary, 'L2 Season Cup')).toEqual([2026, 2024]);
      expect(await matchCountOf(sCupCsId[2024])).toBe(1);
      expect(await matchCountOf(sCupCsId[2026])).toBe(1);
    } finally {
      fake.failKeys.delete(failKey);
    }
  }, 180_000);

  it('11. --season=2025 는 그 시즌만 부른다', async () => {
    fake.calls = [];
    const summary = await l2.run({ seasonYear: 2025 });

    expect(summary.competitions.every((c) => c.seasonYear === 2025)).toBe(true);
    expect(summary.competitions.some((c) => c.name === 'L2 Season Cup')).toBe(true);
    expect(fake.calls.length).toBeGreaterThan(0);
    expect(fake.calls.every((c) => c.endsWith('season=2025'))).toBe(true);
  }, 180_000);

  it('12. 인자 없이 부르면 지금까지와 같다 — 현재 시즌만', async () => {
    fake.calls = [];
    const summary = await l2.run();

    // 픽스처 대회는 2026 만 현재 시즌이다
    const ours = summary.competitions.filter((c) => c.name.startsWith('L2 '));
    expect(ours.length).toBeGreaterThan(0);
    expect(ours.every((c) => c.seasonYear === SEASON_YEAR)).toBe(true);
    expect(ours.map((c) => c.name).sort()).toEqual([
      'L2 Fixture Cup', 'L2 Fixture League', 'L2 Season Cup', 'L2 Season League', 'L2 Season UCL',
    ]);
    expect(seasonsCalledFor(S_CUP_API_ID)).toEqual([String(SEASON_YEAR)]);
    expect(seasonsCalledFor(CUP_API_ID)).toEqual([String(SEASON_YEAR)]);
  }, 180_000);

  it('13. ★ UCL 폴백도 그 시즌의 1부 집합을 쓴다 (top_flight 가 없는 경로)', async () => {
    // S_UCL 은 topFlightCompetitionId 가 null 이라 컵 경로가 아니라 폴백을 탄다:
    // "추적 ROUND_ROBIN 대회의 **같은 시즌** 참가팀 합집합".
    // 2024 UCL R2 의 1부 팀은 S_E — 2024 리그 참가팀이고 현재(2026) 참가팀이 아니다.
    // 폴백만 is_current 로 되돌려도 이 테스트가 걸린다.
    await prisma.match.deleteMany({ where: { competitionSeasonId: sUclCsId[2024] } });

    const summary = await l2.run({ seasonYear: 2024 });
    const ucl = summary.competitions.find((c) => c.name === 'L2 Season UCL' && c.seasonYear === 2024);
    expect(ucl).toBeDefined();
    expect(ucl!.cutRound).toBe('Season UCL R2'); // 버그 코드는 null
    expect(ucl!.matches).toBe(1); // 버그 코드는 0

    const saved = await prisma.match.findMany({
      where: { competitionSeasonId: sUclCsId[2024] },
      select: { homeTeamId: true },
    });
    expect(saved).toHaveLength(1);
    expect(saved[0].homeTeamId).toBe(teamIdByApi.get(S_E));

    const rounds = await roundsOf(sUclCsId[2024]);
    expect(rounds.map((r) => r.name)).toEqual(['Season UCL R2']);
    expect(rounds.map((r) => r.ordinal)).toEqual([1]);
  }, 180_000);

  it('14. 일일 한도 소진은 루프를 끊는다 — 남은 대회시즌은 호출조차 하지 않는다', async () => {
    const quotaKey = `${S_LEAGUE_API_ID}:${SEASON_YEAR}`;
    fake.quotaKeys.add(quotaKey);
    fake.calls = [];
    try {
      const summary = await l2.run({ allSeasons: true });

      // 최신 시즌부터 도므로 소진 지점은 2026 안이다. 그 뒤 시즌은 시작조차 하지 않는다
      const idx = fake.calls.findIndex((c) => c.includes(`league=${S_LEAGUE_API_ID}&season=${SEASON_YEAR}`));
      expect(idx).toBeGreaterThanOrEqual(0);
      // collectOne 이 rounds·fixtures 를 함께 부른다 — 그 두 콜이 로그의 끝이다
      expect(fake.calls.length).toBe(idx + 2);

      expect(summary.skipped).toHaveLength(1);
      expect(summary.skipped[0]).toContain('L2 Season League 2026');
      expect(summary.partial).toBe(true);
      // 2025·2024 는 아예 수집되지 않았다
      expect(summary.competitions.every((c) => c.seasonYear === SEASON_YEAR)).toBe(true);
      expect(seasonsCalledFor(S_CUP_API_ID)).toEqual([]);
      expect(seasonsCalledFor(S_UCL_API_ID)).toEqual([]);
    } finally {
      fake.quotaKeys.delete(quotaKey);
    }
  }, 180_000);

  it('15. 전 시즌 모드는 SEASON_YEARS 밖의 시즌을 집지 않는다', async () => {
    // L0 가 `/leagues?id=` 를 시즌 없이 부르면 1992년까지 competition_seasons 에 들어온다.
    // `season.year in SEASON_YEARS` 를 빼면 그 시즌까지 돌면서 콜을 태운다
    const outOfRange = await prisma.competitionSeason.count({
      where: { competition: { apiCompetitionId: S_LEAGUE_API_ID }, season: { year: OUT_OF_RANGE_YEAR } },
    });
    expect(outOfRange).toBe(1); // 픽스처가 실제로 있어야 이 테스트가 의미를 갖는다

    fake.calls = [];
    const summary = await l2.run({ allSeasons: true });

    expect(summary.competitions.some((c) => c.seasonYear === OUT_OF_RANGE_YEAR)).toBe(false);
    expect(summary.skipped.some((m) => m.includes(String(OUT_OF_RANGE_YEAR)))).toBe(false);
    expect(fake.calls.some((c) => c.endsWith(`season=${OUT_OF_RANGE_YEAR}`))).toBe(false);
    expect(seasonsCalledFor(S_LEAGUE_API_ID)).toEqual(['2024', '2025', '2026']);
  }, 180_000);
});
