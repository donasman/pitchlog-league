/**
 * L6 선수 시즌 통계 · 랭킹 · 팀 시즌 통계 — 쓰기 불변식 (백필-1 뒤쪽, NEXT_STEPS 8-b)
 *
 * null 규칙 자체는 `src/ingestion/l6/player-stats.mapper.spec.ts` 가 DB 없이 표로 검증한다.
 * 여기서는 DB 에 실제로 쓸 때만 드러나는 것을 본다:
 *   - `/players` 페이지를 `paging.total` 만큼 끝까지 읽는다
 *   - `statistics[]` 에서 다른 대회·다른 시즌 항목을 버린다
 *   - 이적 선수는 같은 대회시즌에 팀이 다른 두 행으로 남는다
 *   - **세 컬럼이 NULL 로 저장된다** — 컬럼이 NOT NULL 이면 여기서 터진다 (마이그레이션 회귀)
 *   - 시즌 역순 두 번째 패스의 빈 프로필이 채워둔 값을 **지우지 않는다** (coalesceUpdate)
 *   - DB 에 없는 팀은 그 행만 버리고 보고한다
 *   - 랭킹 목록이 줄면 남는 유령 행이 `as_of` 정리로 사라진다
 *   - `backfill_jobs` 가 성공에 DONE · 실패에 FAILED 로 닫힌다 (FAILED 여야 L1 락이 풀린다)
 *   - 끝난 뒤 고아 행이 없다
 *
 * 이 파일은 도메인 테이블에 가짜 행을 쓴다 — 로컬 DB 나 CI 에서만 돈다.
 *
 * ## 끝나면 반드시 치운다
 * `l0.e2e-spec.ts` 는 대회시즌·팀·참가를 **전역으로** 센다 (09-07 CI 에서 실제로 깨졌다).
 * `relationMode="prisma"` 의 Restrict 때문에 자식부터 지운다.
 *
 * ## 시즌 연도를 SEASON_YEARS 밖(2019·2018·2017)으로 잡은 이유
 * `run({ seasonYear })` 는 그 해의 **화면 대회 전부**를 대상으로 한다. 2026 을 쓰면 개발 DB 의
 * 진짜 EPL·라리가까지 끌려와 `backfill_jobs` 를 건드린다. 아무도 안 쓰는 연도면 우리 픽스처만 걸린다.
 */
import 'dotenv/config';
import { Test } from '@nestjs/testing';
import type { INestApplicationContext } from '@nestjs/common';
import { PrismaService } from '../src/prisma/prisma.service.js';
import { IntegrityService } from '../src/prisma/integrity.service.js';
import { ApiFootballClient } from '../src/ingestion/api-football/api-football.client.js';
import { L6Service } from '../src/ingestion/l6/l6.service.js';
import { BackfillPhase, CompetitionFormat, CompetitionType, RankingCategory } from '../src/generated/prisma/client.js';
import type {
  ApiEnvelope,
  ApiPlayerSeason,
  ApiPlayerSeasonStat,
  ApiTeamStatistics,
} from '../src/ingestion/api-football/api-football.types.js';

/** 카탈로그·다른 e2e 와 겹치지 않는 대역 (l1 990_xxx · l2 991~995_xxx) */
const LEAGUE_API_ID = 996_140;
/** 갈래가 전부 실패하는 대회 — backfill_jobs FAILED 경로 */
const FAIL_API_ID = 996_141;
/** ROUND_ROBIN 이 아닌 대회 — `--only=teams` 면 돌 갈래가 0개다 */
const KNOCKOUT_API_ID = 996_142;
/** `statistics[]` 필터가 버려야 할 다른 대회 */
const OTHER_LEAGUE_API_ID = 996_777;

/** SEASON_YEARS 밖 — 파일 머리말 참고 */
const Y1 = 2019;
const Y2 = 2018;
const Y3 = 2017;
/** `--only` 부분 수집이 phase 를 세우지 않는지 보는 시즌 */
const Y4 = 2016;
/** 갈래가 하나도 안 도는 조합(KNOCKOUT + --only=teams) — API 콜 없이 DONE 을 세우던 자리 */
const Y5 = 2015;

const TEAM_A = 996_001;
const TEAM_B = 996_002;
const TEAM_C = 996_003;
const TEAMS = [TEAM_A, TEAM_B, TEAM_C];
/** 일부러 DB 에 만들지 않는 팀 — missingTeams 보고 경로 */
const MISSING_TEAM = 996_999;

const P_NULL = 996_101;
const P_MOVED = 996_102;
const P_FULL = 996_103;
const P_ORPHAN_TEAM = 996_104;
/** 랭킹에만 나오는 선수 — 랭킹도 자기 선수를 upsert 해야 고아가 안 생긴다 */
const R_PLAYERS = [996_201, 996_202, 996_203, 996_204, 996_205, 996_206];

/** 모든 숫자 필드가 null 인 항목 — 과거 시즌 실측 모양 */
const stat = (
  teamApiId: number,
  league: number,
  season: number,
  over: Partial<{
    appearences: number; lineups: number; minutes: number; rating: string;
    goals: number; assists: number; yellow: number; yellowred: number; red: number;
    shotsTotal: number; shotsOn: number; passesKey: number;
    tackles: number; interceptions: number; duelsTotal: number; duelsWon: number; dribblesSuccess: number;
  }> = {},
): ApiPlayerSeasonStat => ({
  team: { id: teamApiId, name: `Team ${teamApiId}`, logo: null },
  league: { id: league, name: null, country: null, logo: null, flag: null, season },
  games: {
    appearences: over.appearences ?? null,
    lineups: over.lineups ?? null,
    minutes: over.minutes ?? null,
    number: null,
    position: null,
    rating: over.rating ?? null,
    captain: null,
  },
  substitutes: { in: null, out: null, bench: null },
  shots: { total: over.shotsTotal ?? null, on: over.shotsOn ?? null },
  goals: { total: over.goals ?? null, conceded: null, assists: over.assists ?? null, saves: null },
  passes: { total: null, key: over.passesKey ?? null, accuracy: null },
  tackles: { total: over.tackles ?? null, blocks: null, interceptions: over.interceptions ?? null },
  duels: { total: over.duelsTotal ?? null, won: over.duelsWon ?? null },
  dribbles: { attempts: null, success: over.dribblesSuccess ?? null, past: null },
  fouls: { drawn: null, committed: null },
  cards: { yellow: over.yellow ?? null, yellowred: over.yellowred ?? null, red: over.red ?? null },
  penalty: { won: null, commited: null, scored: null, missed: null, saved: null },
});

/** 프로필이 채워진 선수 */
const filledPlayer = (id: number, name: string): ApiPlayerSeason['player'] => ({
  id, name,
  firstname: `${name}First`,
  lastname: `${name}Last`,
  age: 28,
  birth: { date: '1997-03-04', place: 'Testville', country: 'Testland' },
  nationality: 'Testland',
  height: '188 cm',
  weight: '80 kg',
  injured: false,
  photo: `https://example.invalid/${id}.png`,
});

/** 프로필이 통째로 빈 선수 — 과거 시즌 실측 모양 */
const emptyPlayer = (id: number, name: string): ApiPlayerSeason['player'] => ({
  id, name,
  firstname: null, lastname: null, age: null,
  birth: { date: null, place: null, country: null },
  nationality: null, height: null, weight: null, injured: false, photo: null,
});

const entry = (player: ApiPlayerSeason['player'], statistics: ApiPlayerSeasonStat[]): ApiPlayerSeason => ({ player, statistics });

const teamStatistics = (teamApiId: number, season: number): ApiTeamStatistics => ({
  league: { id: LEAGUE_API_ID, name: null, country: null, logo: null, flag: null, season },
  team: { id: teamApiId, name: `Team ${teamApiId}`, logo: null },
  form: 'WWDLW',
  fixtures: {
    played: { home: 5, away: 4, total: 9 },
    wins: { home: 3, away: 1, total: 4 },
    draws: { home: 1, away: 2, total: 3 },
    loses: { home: 1, away: 1, total: 2 },
  },
  goals: {
    for: { total: { home: 10, away: 6, total: 16 } },
    against: { total: { home: 4, away: 5, total: 9 } },
  },
  biggest: {
    streak: { wins: 3, draws: 1, loses: 1 },
    // 원정 최다승이 없다 — null 이 "해당 없음" 이고 0 으로 접으면 안 된다
    wins: { home: '4-0', away: null },
    loses: { home: null, away: '0-3' },
    goals: { for: { home: 4, away: 2 }, against: { home: 2, away: 3 } },
  },
  clean_sheet: { home: 2, away: 1, total: 3 },
  failed_to_score: { home: 0, away: 2, total: 2 },
  penalty: { scored: { total: 2, percentage: '100%' }, missed: { total: 0, percentage: '0%' }, total: 2 },
  lineups: [{ formation: '4-3-3', played: 7 }, { formation: '4-2-3-1', played: 2 }],
  cards: { yellow: { '0-15': { total: 1, percentage: '10%' } }, red: {} },
});

class FakeApiFootballClient {
  calls: string[] = [];
  /** `${league}:${season}` → 페이지 배열. 인덱스 0 이 page=1 이고 길이가 paging.total 이다 */
  playerPages = new Map<string, ApiPlayerSeason[][]>();
  /** `${path}:${league}:${season}` → 랭킹 응답 */
  rankings = new Map<string, ApiPlayerSeason[]>();
  /** `${league}:${season}:${team}` → 팀 통계 */
  teamStats = new Map<string, ApiTeamStatistics>();
  /** 이 league 는 모든 경로가 던진다 — 갈래 3개가 다 죽는 경로 */
  failLeagues = new Set<number>();

  get callCount(): number {
    return this.calls.length;
  }

  async get<T>(path: string, query: Record<string, string | number> = {}): Promise<ApiEnvelope<T>> {
    const league = Number(query.league);
    const season = Number(query.season);
    const page = Number(query.page ?? 1);
    const team = query.team === undefined ? null : Number(query.team);
    this.calls.push(`${path}?league=${league}&season=${season}${team === null ? '' : `&team=${team}`}&page=${page}`);
    if (this.failLeagues.has(league)) throw new Error(`가짜 실패 league=${league}`);

    if (path === '/players') {
      const pages = this.playerPages.get(`${league}:${season}`) ?? [];
      const response = pages[page - 1] ?? [];
      return this.envelope(path, response as T, Math.max(1, pages.length));
    }
    if (path.startsWith('/players/top')) {
      const response = this.rankings.get(`${path}:${league}:${season}`) ?? [];
      return this.envelope(path, response as T, 1);
    }
    if (path === '/teams/statistics') {
      const hit = this.teamStats.get(`${league}:${season}:${team}`);
      if (!hit) throw new Error(`가짜 클라이언트에 팀 통계가 없다: ${league}:${season}:${team}`);
      return this.envelope(path, hit as T, 1);
    }
    throw new Error(`가짜 클라이언트가 모르는 경로: ${path}`);
  }

  private envelope<T>(path: string, response: T, total: number): ApiEnvelope<T> {
    const n = Array.isArray(response) ? response.length : 1;
    return { get: path, parameters: {}, errors: [], results: n, paging: { current: 1, total }, response };
  }
}

describe('L6 시즌 집계 (e2e, 가짜 API)', () => {
  let app: INestApplicationContext;
  let prisma: PrismaService;
  let l6: L6Service;
  let fake: FakeApiFootballClient;
  let csY1 = 0;
  let csY2 = 0;
  let csY3 = 0;
  let csY4 = 0;
  let csY5 = 0;
  const teamIdByApi = new Map<number, number>();

  beforeAll(async () => {
    const host = new URL(process.env.DATABASE_URL ?? 'postgresql://x/').hostname;
    const local = ['localhost', '127.0.0.1', '::1'].includes(host);
    if (!local && !process.env.CI && process.env.E2E_ALLOW_REMOTE_DB !== '1') {
      throw new Error(`l6 e2e 는 가짜 데이터를 쓰므로 원격 DB(${host})에서는 돌리지 않는다 — 로컬 Postgres 를 쓰거나 E2E_ALLOW_REMOTE_DB=1`);
    }
    const { AppModule } = await import('../src/app.module.js');
    fake = new FakeApiFootballClient();
    const mod = await Test.createTestingModule({ imports: [AppModule] }).overrideProvider(ApiFootballClient).useValue(fake).compile();
    app = await mod.init();
    prisma = app.get(PrismaService);
    l6 = app.get(L6Service);

    for (const apiTeamId of TEAMS) {
      const team = await prisma.team.upsert({
        where: { apiTeamId },
        create: { apiTeamId, name: `Team ${apiTeamId}`, country: 'Testland' },
        update: {},
      });
      teamIdByApi.set(apiTeamId, team.id);
    }

    const league = await prisma.competition.upsert({
      where: { apiCompetitionId: LEAGUE_API_ID },
      create: {
        apiCompetitionId: LEAGUE_API_ID, name: 'L6 Fixture League', country: 'Testland',
        type: CompetitionType.LEAGUE, format: CompetitionFormat.ROUND_ROBIN, isTracked: true, displayOrder: 96,
      },
      update: { isTracked: true, displayOrder: 96, format: CompetitionFormat.ROUND_ROBIN },
    });
    const failLeague = await prisma.competition.upsert({
      where: { apiCompetitionId: FAIL_API_ID },
      create: {
        apiCompetitionId: FAIL_API_ID, name: 'L6 Fixture Fail League', country: 'Testland',
        type: CompetitionType.LEAGUE, format: CompetitionFormat.ROUND_ROBIN, isTracked: true, displayOrder: 97,
      },
      update: { isTracked: true, displayOrder: 97, format: CompetitionFormat.ROUND_ROBIN },
    });

    const knockout = await prisma.competition.upsert({
      where: { apiCompetitionId: KNOCKOUT_API_ID },
      create: {
        apiCompetitionId: KNOCKOUT_API_ID, name: 'L6 Fixture Knockout', country: 'Testland',
        type: CompetitionType.CUP, format: CompetitionFormat.KNOCKOUT, isTracked: true, displayOrder: 98,
      },
      update: { isTracked: true, displayOrder: 98, format: CompetitionFormat.KNOCKOUT },
    });

    const csIdFor = async (competitionId: number, year: number): Promise<number> => {
      await prisma.season.upsert({ where: { year }, create: { year }, update: {} });
      const season = await prisma.season.findUniqueOrThrow({ where: { year } });
      const cs = await prisma.competitionSeason.upsert({
        where: { competitionId_seasonId: { competitionId, seasonId: season.id } },
        create: { competitionId, seasonId: season.id, apiSeasonValue: year, isCurrent: false },
        update: { isCurrent: false },
      });
      for (const apiTeamId of TEAMS) {
        const teamId = teamIdByApi.get(apiTeamId) as number;
        const exists = await prisma.competitionEntry.findFirst({ where: { competitionSeasonId: cs.id, teamId } });
        if (!exists) await prisma.competitionEntry.create({ data: { competitionSeasonId: cs.id, teamId } });
      }
      return cs.id;
    };

    csY1 = await csIdFor(league.id, Y1);
    csY2 = await csIdFor(league.id, Y2);
    csY3 = await csIdFor(failLeague.id, Y3);
    csY4 = await csIdFor(league.id, Y4);
    csY5 = await csIdFor(knockout.id, Y5);

    // ── Y1 (2019) — 2페이지. `paging.total` 을 진짜로 세팅한다
    fake.playerPages.set(`${LEAGUE_API_ID}:${Y1}`, [
      [
        // 전부 null 인 항목 + 버려야 할 다른 대회 · 다른 시즌 항목
        entry(filledPlayer(P_NULL, 'NullGuy'), [
          stat(TEAM_A, OTHER_LEAGUE_API_ID, Y1),
          stat(TEAM_A, LEAGUE_API_ID, Y2),
          stat(TEAM_A, LEAGUE_API_ID, Y1),
        ]),
        // 이적 선수 — 같은 대회시즌에 팀이 둘
        entry(emptyPlayer(P_MOVED, 'MovedGuy'), [
          stat(TEAM_A, LEAGUE_API_ID, Y1, { appearences: 10, goals: 3 }),
          stat(TEAM_B, LEAGUE_API_ID, Y1, { appearences: 8, goals: 2 }),
        ]),
      ],
      [
        entry(filledPlayer(P_FULL, 'FullGuy'), [
          stat(TEAM_C, LEAGUE_API_ID, Y1, {
            appearences: 30, lineups: 28, minutes: 2500, rating: '7.25',
            goals: 5, assists: 7, yellow: 4, yellowred: 1, red: 0,
            shotsTotal: 60, shotsOn: 25, passesKey: 33,
            tackles: 18, interceptions: 9, duelsTotal: 200, duelsWon: 110, dribblesSuccess: 40,
          }),
        ]),
        // DB 에 없는 팀 — 이 행만 버려야 한다
        entry(filledPlayer(P_ORPHAN_TEAM, 'OrphanTeamGuy'), [stat(MISSING_TEAM, LEAGUE_API_ID, Y1, { goals: 1 })]),
      ],
    ]);

    // ── Y2 (2018) — 같은 선수인데 프로필이 비어 있다. coalesce 회귀
    fake.playerPages.set(`${LEAGUE_API_ID}:${Y2}`, [
      [entry(emptyPlayer(P_FULL, 'FullGuy'), [stat(TEAM_C, LEAGUE_API_ID, Y2, { goals: 2 })])],
    ]);

    setRankings(fake, Y1, 5);
    // Y4 는 `--only=rankings` 로만 돈다 — 실제로 행이 들어가야 "돌긴 돌았다" 를 증명할 수 있다
    setRankings(fake, Y4, 3);
    for (const season of [Y1, Y2]) {
      for (const apiTeamId of TEAMS) fake.teamStats.set(`${LEAGUE_API_ID}:${season}:${apiTeamId}`, teamStatistics(apiTeamId, season));
    }

    fake.failLeagues.add(FAIL_API_ID);
  }, 180_000);

  /** 득점 랭킹 길이를 바꾼다 — 목록 축소(8번) 재현용 */
  function setRankings(client: FakeApiFootballClient, season: number, scorerCount: number): void {
    const scorers = R_PLAYERS.slice(0, scorerCount).map((id, i) =>
      entry(filledPlayer(id, `Scorer${id}`), [stat(TEAM_A, LEAGUE_API_ID, season, { goals: 10 - i * 2 })]),
    );
    client.rankings.set(`/players/topscorers:${LEAGUE_API_ID}:${season}`, scorers);
    client.rankings.set(`/players/topassists:${LEAGUE_API_ID}:${season}`, [
      entry(filledPlayer(R_PLAYERS[0], 'Assist0'), [stat(TEAM_A, LEAGUE_API_ID, season, { assists: 12 })]),
      // value 가 null — 이 행은 버려지고 rank 는 이어져야 한다
      entry(filledPlayer(R_PLAYERS[1], 'Assist1'), [stat(TEAM_A, LEAGUE_API_ID, season)]),
      entry(filledPlayer(R_PLAYERS[2], 'Assist2'), [stat(TEAM_B, LEAGUE_API_ID, season, { assists: 9 })]),
    ]);
    client.rankings.set(`/players/topyellowcards:${LEAGUE_API_ID}:${season}`, [
      entry(filledPlayer(R_PLAYERS[3], 'Yellow0'), [stat(TEAM_B, LEAGUE_API_ID, season, { yellow: 11 })]),
    ]);
    client.rankings.set(`/players/topredcards:${LEAGUE_API_ID}:${season}`, [
      entry(filledPlayer(R_PLAYERS[4], 'Red0'), [stat(TEAM_C, LEAGUE_API_ID, season, { red: 3 })]),
    ]);
  }

  afterAll(async () => {
    if (prisma) {
      try {
        await cleanupFixture();
      } catch (cause) {
        console.warn('[l6 e2e] 픽스처 정리 실패 — 다음 e2e 가 영향을 받을 수 있다:', cause);
      }
    }
    await app?.close();
  });

  /** 자식부터 지운다. relationMode="prisma" 의 Restrict 는 자식이 남으면 부모 삭제를 막는다 */
  const cleanupFixture = async () => {
    const csIds = [csY1, csY2, csY3, csY4, csY5].filter((id) => id > 0);
    if (csIds.length > 0) {
      await prisma.topRanking.deleteMany({ where: { competitionSeasonId: { in: csIds } } });
      await prisma.playerSeasonStat.deleteMany({ where: { competitionSeasonId: { in: csIds } } });
      await prisma.teamSeasonStat.deleteMany({ where: { competitionSeasonId: { in: csIds } } });
      await prisma.backfillJob.deleteMany({ where: { competitionSeasonId: { in: csIds } } });
      await prisma.competitionEntry.deleteMany({ where: { competitionSeasonId: { in: csIds } } });
      // 시즌 단위 wrap 이 남긴 행 — FK 는 없지만 죽은 id 를 가리키게 두지 않는다
      await prisma.ingestionRun.deleteMany({ where: { competitionSeasonId: { in: csIds } } });
      await prisma.competitionSeason.deleteMany({ where: { id: { in: csIds } } });
    }
    await prisma.competition.deleteMany({ where: { apiCompetitionId: { in: [LEAGUE_API_ID, FAIL_API_ID, KNOCKOUT_API_ID] } } });
    await prisma.player.deleteMany({
      where: { apiPlayerId: { in: [P_NULL, P_MOVED, P_FULL, P_ORPHAN_TEAM, ...R_PLAYERS] } },
    });
    const ids = [...teamIdByApi.values()];
    if (ids.length > 0) await prisma.team.deleteMany({ where: { id: { in: ids } } });
  };

  const statsOf = (csId: number) =>
    prisma.playerSeasonStat.findMany({ where: { competitionSeasonId: csId }, orderBy: [{ playerId: 'asc' }, { teamId: 'asc' }] });

  const statFor = async (csId: number, apiPlayerId: number) => {
    const player = await prisma.player.findUniqueOrThrow({ where: { apiPlayerId } });
    return prisma.playerSeasonStat.findMany({ where: { competitionSeasonId: csId, playerId: player.id }, orderBy: { teamId: 'asc' } });
  };

  const ranksOf = (csId: number, category: RankingCategory) =>
    prisma.topRanking.findMany({ where: { competitionSeasonId: csId, category }, orderBy: { rank: 'asc' } });

  const playerCallsFor = (season: number) =>
    fake.calls.filter((c) => c.startsWith('/players?') && c.includes(`league=${LEAGUE_API_ID}&season=${season}`));

  it('1. /players 페이지를 paging.total 만큼 끝까지 읽는다', async () => {
    const summary = await l6.run({ seasonYear: Y1 });
    const r = summary.competitions.find((c) => c.name === 'L6 Fixture League');
    expect(r).toBeDefined();
    expect(r?.playerStats?.pages).toBe(2);
    expect(r?.playerStats?.fetchedPages).toBe(2);
    expect(r?.playerStats?.failedPages).toEqual([]);
    expect(playerCallsFor(Y1)).toHaveLength(2);

    // 두 페이지의 선수가 다 들어왔다 — 팀이 없는 선수도 players 행은 생긴다
    expect(r?.playerStats?.players).toBe(4);
    const apiIds = (await prisma.player.findMany({
      where: { apiPlayerId: { in: [P_NULL, P_MOVED, P_FULL, P_ORPHAN_TEAM] } },
      select: { apiPlayerId: true },
    })).map((p) => p.apiPlayerId).sort();
    expect(apiIds).toEqual([P_NULL, P_MOVED, P_FULL, P_ORPHAN_TEAM].sort());
  }, 180_000);

  it('2. statistics[] 필터 — 다른 대회 · 다른 시즌 항목은 버린다', async () => {
    // NullGuy 는 항목이 3개인데 이 대회시즌 것은 하나뿐이다
    const rows = await statFor(csY1, P_NULL);
    expect(rows).toHaveLength(1);
    expect(rows[0].teamId).toBe(teamIdByApi.get(TEAM_A));
    // 다른 시즌(Y2) 항목이 Y2 대회시즌에 새는 일도 없어야 한다 — Y2 는 아직 안 돌렸다
    expect(await prisma.playerSeasonStat.count({ where: { competitionSeasonId: csY2 } })).toBe(0);
  }, 120_000);

  it('3. 이적 선수 — 같은 대회시즌에 팀이 다른 2행', async () => {
    const rows = await statFor(csY1, P_MOVED);
    expect(rows).toHaveLength(2);
    expect(rows.map((r) => r.teamId).sort()).toEqual([teamIdByApi.get(TEAM_A), teamIdByApi.get(TEAM_B)].sort());
    expect(rows.map((r) => r.goals).sort()).toEqual([2, 3]);
  }, 120_000);

  it('4. ★ null 규칙 — 세 컬럼만 NULL 이고 나머지는 0 이다', async () => {
    const [row] = await statFor(csY1, P_NULL);

    // 컬럼이 NOT NULL 이면 여기서 터진다 (마이그레이션 20260908090000 회귀)
    expect(row.assists).toBeNull();
    expect(row.yellowredCards).toBeNull();
    expect(row.passesKey).toBeNull();
    // 3-2 — 평점 0점과 평점 없음은 다르다
    expect(row.ratingAvg).toBeNull();

    // 3-1 — 0 으로 접는 것들
    expect(row.shotsTotal).toBe(0);
    expect(row.shotsOn).toBe(0);
    expect(row.tacklesTotal).toBe(0);
    expect(row.interceptions).toBe(0);
    expect(row.duelsTotal).toBe(0);
    expect(row.duelsWon).toBe(0);
    expect(row.dribblesSuccess).toBe(0);
    expect(row.yellowCards).toBe(0);
    expect(row.redCards).toBe(0);
    expect(row.minutes).toBe(0);
    expect(row.appearances).toBe(0);
    expect(row.goals).toBe(0);
    expect(row.source).toBe('API');

    // 값이 있는 쪽은 그대로 들어간다 — rating 은 numeric 으로 캐스트된다
    const [full] = await statFor(csY1, P_FULL);
    expect(full.assists).toBe(7);
    expect(full.yellowredCards).toBe(1);
    expect(full.passesKey).toBe(33);
    expect(Number(full.ratingAvg)).toBeCloseTo(7.25, 2);
    expect(full.minutes).toBe(2500);
  }, 120_000);

  it('5. 프로필이 채워지고, 두 번째 시즌 패스의 빈 프로필이 그것을 되돌리지 않는다 (coalesceUpdate)', async () => {
    const before = await prisma.player.findUniqueOrThrow({ where: { apiPlayerId: P_FULL } });
    expect(before.birthDate).not.toBeNull();
    expect(before.nationality).toBe('Testland');
    expect(before.heightCm).toBe(188);
    expect(before.weightKg).toBe(80);
    expect(before.profileFetchedAt).not.toBeNull();

    // 프로필이 비어 있으면 profile_fetched_at 을 세우지 않는다 — L1 #9 가 이 선수를 건너뛰면 안 된다
    const moved = await prisma.player.findUniqueOrThrow({ where: { apiPlayerId: P_MOVED } });
    expect(moved.profileFetchedAt).toBeNull();

    // 시즌 역순 두 번째 패스 — 같은 선수가 프로필 없이 온다
    await l6.run({ seasonYear: Y2 });

    const after = await prisma.player.findUniqueOrThrow({ where: { apiPlayerId: P_FULL } });
    expect(after.birthDate?.toISOString().slice(0, 10)).toBe(before.birthDate?.toISOString().slice(0, 10));
    expect(after.nationality).toBe('Testland');
    expect(after.heightCm).toBe(188);
    expect(after.weightKg).toBe(80);
    expect(after.profileFetchedAt).not.toBeNull();
    // 그 시즌 통계는 정상적으로 들어갔다
    expect(await prisma.playerSeasonStat.count({ where: { competitionSeasonId: csY2 } })).toBe(1);
  }, 180_000);

  it('6. DB 에 없는 팀 — 그 행만 버리고 보고한다', async () => {
    const rows = await statFor(csY1, P_ORPHAN_TEAM);
    expect(rows).toHaveLength(0);
    // 나머지는 다 들어갔다: NullGuy 1 + MovedGuy 2 + FullGuy 1
    expect(await statsOf(csY1)).toHaveLength(4);

    const summary = await l6.run({ seasonYear: Y1, only: 'players' });
    const r = summary.competitions.find((c) => c.name === 'L6 Fixture League');
    expect(r?.playerStats?.missingTeams).toEqual([MISSING_TEAM]);
    expect(r?.playerStats?.partial).toBe(true);
    expect(summary.partial).toBe(true);
  }, 180_000);

  it('7. 랭킹 4종 — rank 는 1..N 연속이고 카테고리마다 값이 다르다', async () => {
    const scorers = await ranksOf(csY1, RankingCategory.SCORERS);
    expect(scorers.map((r) => r.rank)).toEqual([1, 2, 3, 4, 5]);
    expect(scorers.map((r) => r.value)).toEqual([10, 8, 6, 4, 2]);

    // value 가 null 인 행은 버리되 **rank 는 응답 배열의 자리 그대로**다 — 2번 자리가 비고 3위가 rank 3.
    // 여기서 [1, 2] 가 나오면 3위가 2위로 승격된 것이다 (틀린 순위)
    const assists = await ranksOf(csY1, RankingCategory.ASSISTS);
    expect(assists.map((r) => r.rank)).toEqual([1, 3]);
    expect(assists.map((r) => r.value)).toEqual([12, 9]);

    expect((await ranksOf(csY1, RankingCategory.YELLOW_CARDS)).map((r) => r.value)).toEqual([11]);
    expect((await ranksOf(csY1, RankingCategory.RED_CARDS)).map((r) => r.value)).toEqual([3]);

    // 랭킹에만 나오는 선수도 players 에 들어가 있다 (고아 방지)
    expect(await prisma.player.count({ where: { apiPlayerId: { in: R_PLAYERS } } })).toBeGreaterThanOrEqual(5);
  }, 120_000);

  it('8. 랭킹 축소 — 5건 → 3건 재수집 시 rank 4·5 가 사라진다 (as_of 정리)', async () => {
    expect(await ranksOf(csY1, RankingCategory.SCORERS)).toHaveLength(5);
    // 같은 밀리초에 두 run 이 겹치면 as_of 비교가 무의미해진다
    await new Promise((r) => setTimeout(r, 20));
    setRankings(fake, Y1, 3);

    const summary = await l6.run({ seasonYear: Y1, only: 'rankings' });
    const r = summary.competitions.find((c) => c.name === 'L6 Fixture League');
    // 정확히 rank 4·5 두 행만 지워져야 한다 — 넘치면 다른 카테고리까지 긁은 것이다
    expect(r?.rankings?.pruned).toBe(2);

    const scorers = await ranksOf(csY1, RankingCategory.SCORERS);
    expect(scorers.map((r2) => r2.rank)).toEqual([1, 2, 3]);
    // 줄어들지 않은 카테고리는 그대로다 — 정리가 카테고리 단위인지 본다
    expect((await ranksOf(csY1, RankingCategory.ASSISTS)).map((r2) => r2.rank)).toEqual([1, 3]);
  }, 180_000);

  it('9. 팀 시즌 통계 — jsonb 두 컬럼이 객체로 들어가고 biggest_win_away 는 null 을 지킨다', async () => {
    const rows = await prisma.teamSeasonStat.findMany({ where: { competitionSeasonId: csY1 }, orderBy: { teamId: 'asc' } });
    expect(rows).toHaveLength(TEAMS.length);
    const [row] = rows;
    expect(row.form).toBe('WWDLW');
    expect(row.playedTotal).toBe(9);
    expect(row.goalsForHome).toBe(10);
    expect(row.biggestWinHome).toBe('4-0');
    expect(row.biggestWinAway).toBeNull();
    expect(row.biggestLoseHome).toBeNull();
    expect(row.cleanSheetTotal).toBe(3);
    expect(row.penaltyScored).toBe(2);
    expect(row.formations).toEqual([{ formation: '4-3-3', played: 7 }, { formation: '4-2-3-1', played: 2 }]);
    expect(row.cards).toEqual({ yellow: { '0-15': { total: 1, percentage: '10%' } }, red: {} });
  }, 120_000);

  it('10. 재실행 멱등 — 세 테이블 행 수는 그대로고 값은 갱신된다', async () => {
    const before = {
      stats: await prisma.playerSeasonStat.count({ where: { competitionSeasonId: csY1 } }),
      rankings: await prisma.topRanking.count({ where: { competitionSeasonId: csY1 } }),
      teams: await prisma.teamSeasonStat.count({ where: { competitionSeasonId: csY1 } }),
    };
    expect(before.stats).toBe(4);

    // 값만 바꾼다 — 같은 선수 · 같은 팀 · 같은 대회시즌
    const pages = fake.playerPages.get(`${LEAGUE_API_ID}:${Y1}`) as ApiPlayerSeason[][];
    pages[1][0].statistics[0].goals.total = 9;
    fake.teamStats.set(`${LEAGUE_API_ID}:${Y1}:${TEAM_A}`, { ...teamStatistics(TEAM_A, Y1), form: 'LLLLL' });

    await l6.run({ seasonYear: Y1 });

    expect(await prisma.playerSeasonStat.count({ where: { competitionSeasonId: csY1 } })).toBe(before.stats);
    expect(await prisma.topRanking.count({ where: { competitionSeasonId: csY1 } })).toBe(before.rankings);
    expect(await prisma.teamSeasonStat.count({ where: { competitionSeasonId: csY1 } })).toBe(before.teams);

    const [full] = await statFor(csY1, P_FULL);
    expect(full.goals).toBe(9);
    const teamA = await prisma.teamSeasonStat.findFirstOrThrow({
      where: { competitionSeasonId: csY1, teamId: teamIdByApi.get(TEAM_A) },
    });
    expect(teamA.form).toBe('LLLLL');
  }, 180_000);

  it('11. --only 는 부분 수집이라 backfill_jobs 를 열지 않는다', async () => {
    // 갈래 하나만 도는데 DONE 을 세우면 dataStateOf 가 COMPLETE 를 돌려준다 — 선수 통계는 한 행도 없는데
    const summary = await l6.run({ seasonYear: Y4, only: 'rankings' });
    const r = summary.competitions.find((c) => c.name === 'L6 Fixture League');
    // 실제로 돌긴 돌았다는 증거 — 안 돌아서 job 이 없는 것과 구분한다
    expect(r?.rankings?.rows).toBeGreaterThan(0);
    expect(await prisma.topRanking.count({ where: { competitionSeasonId: csY4 } })).toBeGreaterThan(0);
    expect(await prisma.backfillJob.findUnique({ where: { competitionSeasonId: csY4 } })).toBeNull();

    // KNOCKOUT + --only=teams → 돌 갈래가 0개다. API 콜 없이 begin→complete 를 왕복하던 자리
    const callsBefore = fake.callCount;
    await l6.run({ seasonYear: Y5, only: 'teams' });
    expect(fake.callCount).toBe(callsBefore);
    expect(await prisma.backfillJob.findUnique({ where: { competitionSeasonId: csY5 } })).toBeNull();
  }, 180_000);

  it('12. 응답은 왔는데 저장 0행이면 기존 랭킹을 지우지 않는다', async () => {
    const before = await ranksOf(csY1, RankingCategory.SCORERS);
    expect(before.map((r) => r.rank)).toEqual([1, 2, 3]);
    await new Promise((r) => setTimeout(r, 20));

    // 상위권 팀이 통째로 DB 에 없는 상황 (L0 미실행) — rows 가 0이 된다
    fake.rankings.set(`/players/topscorers:${LEAGUE_API_ID}:${Y1}`, [
      entry(filledPlayer(R_PLAYERS[0], 'GhostA'), [stat(MISSING_TEAM, LEAGUE_API_ID, Y1, { goals: 10 })]),
      entry(filledPlayer(R_PLAYERS[1], 'GhostB'), [stat(MISSING_TEAM, LEAGUE_API_ID, Y1, { goals: 8 })]),
    ]);

    const summary = await l6.run({ seasonYear: Y1, only: 'rankings' });
    const r = summary.competitions.find((c) => c.name === 'L6 Fixture League');
    expect(r?.rankings?.missingTeams).toContain(MISSING_TEAM);
    expect(r?.rankings?.partial).toBe(true);
    // 지울 근거가 없으니 아무것도 지우지 않는다
    expect(r?.rankings?.pruned).toBe(0);

    const after = await ranksOf(csY1, RankingCategory.SCORERS);
    expect(after.map((r2) => r2.rank)).toEqual([1, 2, 3]);
    expect(after.map((r2) => r2.value)).toEqual(before.map((r2) => r2.value));
  }, 180_000);

  it('13. 1위의 팀이 DB 에 없어도 2위가 1위로 올라오지 않는다', async () => {
    await new Promise((r) => setTimeout(r, 20));
    fake.rankings.set(`/players/topassists:${LEAGUE_API_ID}:${Y1}`, [
      // 1위 — 팀이 DB 에 없어 저장되지 않는다. 그 자리는 비어야 한다
      entry(filledPlayer(R_PLAYERS[5], 'GhostTop'), [stat(MISSING_TEAM, LEAGUE_API_ID, Y1, { assists: 20 })]),
      entry(filledPlayer(R_PLAYERS[2], 'RealSecond'), [stat(TEAM_A, LEAGUE_API_ID, Y1, { assists: 9 })]),
    ]);

    await l6.run({ seasonYear: Y1, only: 'rankings' });

    const assists = await ranksOf(csY1, RankingCategory.ASSISTS);
    // rank 가 1 이면 2위가 득점왕(도움왕)으로 화면에 뜬다
    expect(assists.map((r) => r.rank)).toEqual([2]);
    expect(assists.map((r) => r.value)).toEqual([9]);
  }, 180_000);

  it('14. backfill_jobs — 성공은 DONE, 갈래가 다 죽으면 FAILED (FAILED 여야 L1 락이 풀린다)', async () => {
    const done = await prisma.backfillJob.findUniqueOrThrow({ where: { competitionSeasonId: csY1 } });
    expect(done.phase).toBe(BackfillPhase.DONE);
    expect(done.lastError).toBeNull();
    expect(done.startedAt).not.toBeNull();

    // 가짜가 모든 경로에서 던지는 대회시즌
    const summary = await l6.run({ seasonYear: Y3 });
    expect(summary.partial).toBe(true);
    expect(summary.skipped.length).toBeGreaterThan(0);

    const failed = await prisma.backfillJob.findUniqueOrThrow({ where: { competitionSeasonId: csY3 } });
    expect(failed.phase).toBe(BackfillPhase.FAILED);
    expect(failed.lastError).toContain('가짜 실패');
    // FAILED 는 BACKFILL_IN_PROGRESS 에 없다 — L1 이 이 대회시즌의 팀을 다시 볼 수 있다
    expect(failed.phase).not.toBe(BackfillPhase.RANKINGS);
  }, 180_000);

  it('15. 고아 행이 없다 (player_season_stats · team_season_stats · top_rankings 포함)', async () => {
    expect(await app.get(IntegrityService).findOrphans()).toEqual([]);
  }, 120_000);
});
