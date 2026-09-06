/**
 * L0 적재 시뮬레이션 — 실제 API 대신 실측 응답 형태(docs/api-inventory.json)를 본뜬 가짜 클라이언트로
 * 대회 → 시즌 → 경기장 → 팀 → 참가를 끝까지 흘려보낸다.
 *
 * 확인하는 것:
 *   - 두 번 돌려도 행 수·내부 id 가 같다 (멱등)
 *   - 대회당 isCurrent 는 하나 (partial unique)
 *   - 공유 구장·경기장 없는 팀·시즌 미제공 컵을 견딘다
 *   - first_seen_competition_id 는 첫 INSERT 값이 유지된다
 *   - 팀·경기장·참가 upsert 가 INSERT … ON CONFLICT 로 나간다 (설계검토 B-2)
 *   - 끝난 뒤 고아 행이 없다 (IntegrityService)
 */
import 'dotenv/config';
import { Test } from '@nestjs/testing';
import type { INestApplicationContext } from '@nestjs/common';
import { PrismaService } from '../src/prisma/prisma.service.js';
import { IntegrityService } from '../src/prisma/integrity.service.js';
import { ApiFootballClient } from '../src/ingestion/api-football/api-football.client.js';
import { L0Service } from '../src/ingestion/l0/l0.service.js';
import { COMPETITIONS, SEASON_YEARS } from '../src/ingestion/l0/competitions.catalog.js';
import type { ApiEnvelope, ApiLeague, ApiTeam } from '../src/ingestion/api-football/api-football.types.js';

const COVERAGE = {
  fixtures: { events: true, lineups: true, statistics_fixtures: true, statistics_players: true },
  standings: true, players: true, top_scorers: true, top_assists: true, top_cards: true, injuries: true, predictions: true, odds: true,
};

/** 실측: Copa del Rey(143) · Coupe de France(66) 는 2026 시즌이 아직 없다 */
const NO_2026 = new Set([143, 66]);

class FakeApiFootballClient {
  calls: string[] = [];

  /** IngestionRunService 가 콜 수 차분에 쓴다 */
  get callCount(): number {
    return this.calls.length;
  }

  async get<T>(path: string, query: Record<string, string | number> = {}): Promise<ApiEnvelope<T>> {
    this.calls.push(`${path}?${new URLSearchParams(Object.entries(query).map(([k, v]) => [k, String(v)]))}`);
    if (path === '/leagues') return this.envelope(path, [this.league(Number(query.id))] as T);
    if (path === '/teams') return this.envelope(path, this.teams(Number(query.league), Number(query.season)) as T);
    throw new Error(`가짜 클라이언트가 모르는 경로: ${path}`);
  }

  private envelope<T>(path: string, response: T): ApiEnvelope<T> {
    const n = Array.isArray(response) ? response.length : 1;
    return { get: path, parameters: {}, errors: [], results: n, paging: { current: 1, total: 1 }, response };
  }

  private league(id: number): ApiLeague {
    const entry = COMPETITIONS.find((c) => c.apiId === id)!;
    const years = SEASON_YEARS.filter((y) => !(NO_2026.has(id) && y === 2026));
    return {
      // 실측: API 는 슈퍼컵 셋을 전부 "Super Cup" 으로 준다 — 카탈로그 이름이 이겨야 한다
      league: { id, name: entry.type === 'SUPER_CUP' ? 'Super Cup' : entry.name, type: entry.type === 'LEAGUE' ? 'League' : 'Cup', logo: `https://media.api-sports.io/football/leagues/${id}.png` },
      country: { name: 'England', code: 'GB-ENG', flag: null },
      seasons: years.map((y) => ({ year: y, start: `${y}-08-01`, end: `${y + 1}-05-30`, current: y === Math.max(...years), coverage: COVERAGE })),
    };
  }

  /** 대회마다 팀 20개. 같은 팀이 여러 대회에 나오도록 apiId 를 대회 간에 겹치게 만든다 */
  private teams(league: number, season: number): ApiTeam[] {
    const base = (league % 7) * 5; // 대회별로 5칸씩 어긋난 창 → 팀 풀이 겹친다
    return Array.from({ length: 20 }, (_, i) => {
      const id = 1000 + base + i;
      const sharedVenue = i % 6 === 5; // 6번째마다 앞 팀과 구장 공유 (같은 배치 안 중복키)
      const noVenue = i === 19 && season === 2022; // 경기장 미제공 케이스
      const venueId = sharedVenue ? 5000 + id - 1 : 5000 + id;
      return {
        team: { id, name: `Team ${id}`, code: i % 4 === 0 ? null : `T${id}`, country: 'England', founded: 1900 + i, national: false, logo: `https://x/${id}.png` },
        venue: noVenue
          ? { id: null, name: null, address: null, city: null, capacity: null, surface: null, image: null }
          : { id: venueId, name: `Stadium ${venueId}`, address: null, city: 'City', capacity: 30_000 + i, surface: i % 2 ? 'grass' : null, image: null },
      };
    });
  }
}

describe('L0 적재 (e2e, 가짜 API)', () => {
  let app: INestApplicationContext;
  let prisma: PrismaService;
  let l0: L0Service;
  let fake: FakeApiFootballClient;
  const queries: string[] = [];

  beforeAll(async () => {
    // PrismaService 는 development 에서만 query 이벤트를 켠다 — B-2(ON CONFLICT) 검증에 원문 SQL 이 필요.
    // vitest 는 NODE_ENV=test 를 넣으므로 ConfigModule 이 읽기 전에 바꾸고 나서 AppModule 을 불러온다 (import 호이스팅 회피)
    process.env.NODE_ENV = 'development';
    const { AppModule } = await import('../src/app.module.js');
    fake = new FakeApiFootballClient();
    const mod = await Test.createTestingModule({ imports: [AppModule] }).overrideProvider(ApiFootballClient).useValue(fake).compile();
    app = await mod.init();
    prisma = app.get(PrismaService);
    l0 = app.get(L0Service);
    (prisma as unknown as { $on: (e: 'query', cb: (ev: { query: string }) => void) => void }).$on('query', (ev) => queries.push(ev.query));
  }, 60_000);

  afterAll(async () => {
    await app.close();
  });

  const snapshot = async () => {
    const [teams, venues, entries, seasons, current] = await Promise.all([
      prisma.team.findMany({ select: { id: true, apiTeamId: true, firstSeenCompetitionId: true, venueId: true }, orderBy: { apiTeamId: 'asc' } }),
      prisma.venue.count(),
      prisma.competitionEntry.count(),
      prisma.competitionSeason.count({ where: { competition: { isTracked: true } } }),
      prisma.competitionSeason.groupBy({ by: ['competitionId'], where: { isCurrent: true }, _count: true, orderBy: { competitionId: 'asc' } }),
    ]);
    return { teams, venues, entries, seasons, current };
  };

  it('첫 실행 — 대회·시즌·경기장·팀·참가가 모두 들어간다', async () => {
    const s = await l0.run();
    expect(s.competitions).toBe(COMPETITIONS.length);
    expect(s.skipped, s.skipped.join('\n')).toEqual([]);
    expect(s.partial).toBeUndefined();

    const snap = await snapshot();
    // 시즌: 17대회 × 5 − 2026 없는 컵 2개
    expect(snap.seasons).toBe(COMPETITIONS.length * SEASON_YEARS.length - NO_2026.size);
    // 현재 시즌은 대회당 정확히 1개
    expect(snap.current.every((c) => c._count === 1)).toBe(true);
    expect(snap.current).toHaveLength(COMPETITIONS.length);
    // 팀 풀: base 0..30 + 20 → apiId 1000..1049 = 50개
    expect(snap.teams).toHaveLength(50);
    // 참가: 대회시즌마다 20
    expect(snap.entries).toBe(snap.seasons * 20);
    // 경기장 없는 팀(2022 시즌 19번째)도 팀은 들어갔고 venueId 만 null 일 수 있다
    expect(snap.teams.filter((t) => t.venueId === null).length).toBeLessThanOrEqual(7);
  }, 120_000);

  it('두 번째 실행 — 행 수와 내부 id 가 그대로다 (멱등)', async () => {
    const before = await snapshot();
    const callsBefore = fake.calls.length;
    const s = await l0.run();
    expect(s.skipped).toEqual([]);
    const after = await snapshot();
    expect(after).toEqual(before);
    // 콜 수: /leagues 17 + /teams 시즌 수
    expect(fake.calls.length - callsBefore).toBe(COMPETITIONS.length + before.seasons);
  }, 120_000);

  it('대회 이름은 API 가 아니라 카탈로그 표기다 (슈퍼컵 3개가 "Super Cup" 으로 합쳐지지 않는다)', async () => {
    const names = (await prisma.competition.findMany({ where: { isTracked: true }, select: { name: true } })).map((c) => c.name);
    expect(names).toHaveLength(new Set(names).size);
    expect(names).not.toContain('Super Cup');
    expect(names).toContain('Supercopa de España');
  });

  it('first_seen_competition_id 는 첫 INSERT 때 값이 유지된다', async () => {
    // apiId 1000 은 base 0 인 대회(league % 7 === 0) 여러 곳에 나오지만 displayOrder 가 가장 앞선 대회가 먼저 넣는다
    const team = await prisma.team.findUniqueOrThrow({ where: { apiTeamId: 1000 } });
    const firstSeen = await prisma.competition.findUniqueOrThrow({ where: { id: team.firstSeenCompetitionId! } });
    const firstWith1000 = [...COMPETITIONS].sort((a, b) => a.displayOrder - b.displayOrder).find((c) => c.apiId % 7 === 0)!;
    expect(firstSeen.apiCompetitionId).toBe(firstWith1000.apiId);
  });

  it('팀·경기장·참가 upsert 는 INSERT … ON CONFLICT 로 나간다 (B-2)', async () => {
    // 쿼리 이벤트가 안 잡히는 환경이면 pg_stat_statements 없이도 확인 가능한 방법: 로그 대신 실행 계획으로 확인
    const plan = await prisma.$queryRawUnsafe<{ 'QUERY PLAN': string }[]>(
      `EXPLAIN INSERT INTO "venues" ("api_venue_id","name") VALUES (1::int,'x'::text) ON CONFLICT ("api_venue_id") DO UPDATE SET "name" = EXCLUDED."name" RETURNING "id"`,
    );
    expect(plan.map((p) => p['QUERY PLAN']).join('\n')).toContain('Conflict Resolution: UPDATE');
    const upserts = queries.filter((q) => /^INSERT INTO "(venues|teams|competition_entries)"/.test(q));
    expect(upserts.length, '쿼리 이벤트가 잡히지 않았다 — PrismaService 의 log 설정 확인').toBeGreaterThan(0);
    expect(upserts.every((q) => q.includes('ON CONFLICT'))).toBe(true);
    // 문장 수: 대회시즌(83)당 3문장 × 2회 실행 — 행 단위였다면 수천 개
    expect(upserts.length).toBe(2 * 3 * (COMPETITIONS.length * SEASON_YEARS.length - NO_2026.size));
  });

  it('끝난 뒤 고아 행이 없다', async () => {
    expect(await app.get(IntegrityService).findOrphans()).toEqual([]);
  });
});
