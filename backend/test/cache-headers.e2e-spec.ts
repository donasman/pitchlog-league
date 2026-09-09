/**
 * CacheHeaderInterceptor + /api/matches limit 계약 e2e — 999_5xx 대역.
 *
 * 케이스:
 *   1. GET /api/matches → ETag 있음 · Cache-Control: public, max-age=60
 *   2. If-None-Match 로 같은 ETag 를 넘기면 304 · body 없음
 *   3. GET /health → ETag · Cache-Control 없음 (인터셉터 `/api/*` 제외)
 *   4. GET /api/matches (limit 없음) → items.length <= 100 · total 필드 있음
 *   5. GET /api/matches?limit=1 → items.length === 1 · total === 3 · hasMore === true
 *   6. GET /api/matches?limit=501 → 400 (Max 500)
 *   7. GET /api/matches?limit=abc → 400 (IsInt)
 */
import 'dotenv/config';
import { Test } from '@nestjs/testing';
import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module.js';
import { setupApp } from '../src/app.setup.js';
import { PrismaService } from '../src/prisma/prisma.service.js';
import {
  CompetitionFormat,
  CompetitionType,
  SeasonStatus,
  StatsState,
} from '../src/generated/prisma/client.js';

const API = 999_500;
const COMP_LEAGUE = API + 1;
const TEAM_A = API + 1;
const TEAM_B = API + 2;
const VENUE_A = API + 1;
const VENUE_B = API + 2;
const FIXTURE_A = API + 100;
const FIXTURE_B = API + 101;
const FIXTURE_C = API + 102;

describe('CacheHeaderInterceptor + matches limit (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  beforeAll(async () => {
    const mod = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = setupApp(mod.createNestApplication());
    await app.init();
    prisma = app.get(PrismaService);
    await cleanup();

    const s2026 = (await prisma.season.upsert({ where: { year: 2026 }, create: { year: 2026 }, update: {} })).id;

    const compLeague = await prisma.competition.create({
      data: {
        apiCompetitionId: COMP_LEAGUE,
        name: 'Cache League',
        country: 'Testland',
        countryCode: 'TL',
        type: CompetitionType.LEAGUE,
        format: CompetitionFormat.ROUND_ROBIN,
        isTracked: true,
        displayOrder: 91,
      },
    });

    const asOf = new Date('2026-09-09T00:00:00Z');
    const csLeague2026 = await prisma.competitionSeason.create({
      data: {
        competitionId: compLeague.id,
        seasonId: s2026,
        apiSeasonValue: 2026,
        isCurrent: true,
        status: SeasonStatus.IN_PROGRESS,
        asOf,
      },
    });

    const venueA = await prisma.venue.create({ data: { apiVenueId: VENUE_A, name: 'Cache Venue A', city: 'City A' } });
    const venueB = await prisma.venue.create({ data: { apiVenueId: VENUE_B, name: 'Cache Venue B', city: 'City B' } });
    const teamA = await prisma.team.create({ data: { apiTeamId: TEAM_A, name: 'Cache Team Alpha', country: 'Testland', venueId: venueA.id } });
    const teamB = await prisma.team.create({ data: { apiTeamId: TEAM_B, name: 'Cache Team Beta', country: 'Testland', venueId: venueB.id } });

    await prisma.competitionEntry.createMany({
      data: [
        { competitionSeasonId: csLeague2026.id, teamId: teamA.id },
        { competitionSeasonId: csLeague2026.id, teamId: teamB.id },
      ],
    });

    const roundLeague = await prisma.competitionRound.create({
      data: {
        competitionSeasonId: csLeague2026.id,
        name: 'Regular Season - 1',
        ordinal: 1,
        matchCount: 3,
        isLateStage: false,
      },
    });

    // 3경기 — Case 5 는 total===3, limit=1 → items 1 · hasMore
    const kickoffs = [
      new Date('2026-08-21T14:00:00Z'),
      new Date('2026-08-22T14:00:00Z'),
      new Date('2026-08-23T14:00:00Z'),
    ];
    const fixtures = [FIXTURE_A, FIXTURE_B, FIXTURE_C];
    for (let i = 0; i < 3; i += 1) {
      await prisma.match.create({
        data: {
          apiFixtureId: fixtures[i],
          competitionSeasonId: csLeague2026.id,
          roundId: roundLeague.id,
          kickoffAt: kickoffs[i],
          statusShort: 'FT',
          statusLong: 'Match Finished',
          homeTeamId: i % 2 === 0 ? teamA.id : teamB.id,
          awayTeamId: i % 2 === 0 ? teamB.id : teamA.id,
          venueId: i % 2 === 0 ? venueA.id : venueB.id,
          goalsHome: 1,
          goalsAway: 0,
          ftHome: 1,
          ftAway: 0,
          winnerTeamId: i % 2 === 0 ? teamA.id : teamB.id,
          statsState: StatsState.NONE,
          hasEvents: false,
          hasLineups: false,
          hasTeamStats: false,
          hasPlayerStats: false,
          detailEligible: false,
          asOf,
        },
      });
    }
  }, 60_000);

  afterAll(async () => {
    if (prisma) {
      try {
        await cleanup();
      } catch (cause) {
        console.warn('[cache-headers e2e] 픽스처 정리 실패:', cause);
      }
    }
    await app?.close();
  }, 60_000);

  async function cleanup(): Promise<void> {
    const comps = await prisma.competition.findMany({
      where: { apiCompetitionId: { in: [COMP_LEAGUE] } },
      select: { id: true },
    });
    const compIds = comps.map((c) => c.id);
    const csRows = await prisma.competitionSeason.findMany({
      where: { competitionId: { in: compIds } },
      select: { id: true },
    });
    const csIds = csRows.map((c) => c.id);

    if (csIds.length > 0) {
      await prisma.match.deleteMany({ where: { competitionSeasonId: { in: csIds } } });
      await prisma.competitionRound.deleteMany({ where: { competitionSeasonId: { in: csIds } } });
      await prisma.competitionEntry.deleteMany({ where: { competitionSeasonId: { in: csIds } } });
      await prisma.competitionSeason.deleteMany({ where: { id: { in: csIds } } });
    }
    await prisma.competition.deleteMany({ where: { id: { in: compIds } } });
    await prisma.team.deleteMany({ where: { apiTeamId: { in: [TEAM_A, TEAM_B] } } });
    await prisma.venue.deleteMany({ where: { apiVenueId: { in: [VENUE_A, VENUE_B] } } });
  }

  const get = (path: string): request.Test => request(app.getHttpServer()).get(path);

  // Case 1 — ETag · Cache-Control
  it('Case 1: GET /api/matches → ETag 헤더 · Cache-Control: public, max-age=60', async () => {
    const res = await get(`/api/matches?competition=${COMP_LEAGUE}&season=2026&from=2026-08-01&to=2026-08-31`).expect(200);
    expect(res.headers.etag).toMatch(/^W\/"[A-Za-z0-9+/=]+"$/);
    expect(res.headers['cache-control']).toBe('public, max-age=60');
  });

  // Case 2 — If-None-Match → 304
  it('Case 2: If-None-Match 로 같은 ETag → 304 · body 없음', async () => {
    const first = await get(`/api/matches?competition=${COMP_LEAGUE}&season=2026&from=2026-08-01&to=2026-08-31`).expect(200);
    const etag = first.headers.etag as string;
    expect(etag).toBeDefined();

    const second = await request(app.getHttpServer())
      .get(`/api/matches?competition=${COMP_LEAGUE}&season=2026&from=2026-08-01&to=2026-08-31`)
      .set('If-None-Match', etag)
      .expect(304);
    // 304 는 body 없음
    expect(second.text === '' || second.text === undefined).toBe(true);
    expect(Object.keys(second.body ?? {})).toHaveLength(0);
  });

  // Case 3 — /health 자연 제외 (인터셉터가 붙이는 Cache-Control 은 없다. Express 는 자동 ETag 를 붙일 수 있어 형식으로 구분)
  it('Case 3: GET /health → 내 인터셉터의 Cache-Control 없음 · ETag 는 인터셉터 형식이 아님', async () => {
    const res = await get('/health').expect(200);
    // 내 인터셉터가 붙인 Cache-Control 은 없다 (Express·Nest 는 이 헤더를 자동으로 안 붙임)
    expect(res.headers['cache-control']).toBeUndefined();
    // Express 자동 ETag 는 `W/"hex-hex"` 형식 · 내 인터셉터는 base64 27자 (`W/"XXXX..."` 총 32자)
    // /health 에 ETag 가 있다면 반드시 Express 자동(base64 27자가 아님)이어야 한다
    const etag = res.headers.etag as string | undefined;
    if (etag !== undefined) {
      // 인터셉터 형식은 W/" + base64 27자 + " = 총 32자 · Express 자동은 W/"len-hash" 형태로 dash 포함
      expect(etag).toMatch(/^W\/"[^"]*-[^"]*"$/);
    }
  });

  // Case 4 — limit 없이 default 100
  it('Case 4: GET /api/matches (limit 없음) → items.length <= 100 · total 필드', async () => {
    const res = await get(`/api/matches?competition=${COMP_LEAGUE}&season=2026&from=2026-08-01&to=2026-08-31`).expect(200);
    expect(Array.isArray(res.body.items)).toBe(true);
    expect(res.body.items.length).toBeLessThanOrEqual(100);
    expect(typeof res.body.total).toBe('number');
    expect(res.body.total).toBe(3);
    expect(res.body.hasMore).toBe(false);
  });

  // Case 5 — limit=1
  it('Case 5: GET /api/matches?limit=1 → items 1 · total 3 · hasMore true', async () => {
    const res = await get(`/api/matches?competition=${COMP_LEAGUE}&season=2026&from=2026-08-01&to=2026-08-31&limit=1`).expect(200);
    expect(res.body.items).toHaveLength(1);
    expect(res.body.total).toBe(3);
    expect(res.body.hasMore).toBe(true);
  });

  // Case 6 — limit 상한 초과 → 400
  it('Case 6: GET /api/matches?limit=501 → 400', async () => {
    await get(`/api/matches?competition=${COMP_LEAGUE}&season=2026&from=2026-08-01&to=2026-08-31&limit=501`).expect(400);
  });

  // Case 7 — limit 문자열 → 400
  it('Case 7: GET /api/matches?limit=abc → 400', async () => {
    await get(`/api/matches?competition=${COMP_LEAGUE}&season=2026&from=2026-08-01&to=2026-08-31&limit=abc`).expect(400);
  });
});
