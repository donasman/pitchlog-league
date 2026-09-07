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

  get callCount(): number {
    return this.calls.length;
  }

  async get<T>(path: string, query: Record<string, string | number> = {}): Promise<ApiEnvelope<T>> {
    const league = Number(query.league);
    this.calls.push(`${path}?league=${league}`);
    let response: unknown;
    if (path === '/fixtures/rounds') response = this.rounds.get(league) ?? [];
    else if (path === '/fixtures') response = this.fixtures.get(league) ?? [];
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
  }, 120_000);

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
    const csIds = [leagueCsId, cupCsId].filter((id): id is number => typeof id === 'number');
    if (csIds.length > 0) {
      await prisma.standing.deleteMany({ where: { competitionSeasonId: { in: csIds } } });
      await prisma.match.deleteMany({ where: { competitionSeasonId: { in: csIds } } });
      await prisma.competitionRound.deleteMany({ where: { competitionSeasonId: { in: csIds } } });
      await prisma.backfillJob.deleteMany({ where: { competitionSeasonId: { in: csIds } } });
      await prisma.competitionEntry.deleteMany({ where: { competitionSeasonId: { in: csIds } } });
      await prisma.competitionSeason.deleteMany({ where: { id: { in: csIds } } });
    }
    // 컵이 리그를 top_flight 로 참조한다 — 참조를 끊고 지운다
    await prisma.competition.updateMany({ where: { apiCompetitionId: CUP_API_ID }, data: { topFlightCompetitionId: null } });
    await prisma.competition.deleteMany({ where: { apiCompetitionId: { in: [LEAGUE_API_ID, CUP_API_ID] } } });
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
});
