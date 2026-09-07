/**
 * 조회 API e2e — /api/competitions · /api/teams.
 * 자체 시드(apiId 9,000,000대 — 실 데이터·l0 가짜 데이터와 겹치지 않음)를 넣고 끝나면 지운다.
 * 검증: /api 접두사 · asOf · ref 파싱(숫자만 / id-slug / 잘못된 형식) · dataState · 404 · 이름 3종.
 */
import 'dotenv/config';
import { Test } from '@nestjs/testing';
import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module.js';
import { setupApp } from '../src/app.setup.js';
import { PrismaService } from '../src/prisma/prisma.service.js';
import { BackfillPhase, CompetitionFormat, CompetitionType, SeasonStatus } from '../src/generated/prisma/client.js';

const API = 9_000_000;

describe('조회 API (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  const ids = { league: 0, cup: 0, cs2026: 0, cs2025: 0, cs2024: 0, cupCs: 0, teamA: 0, teamB: 0, teamC: 0, venue: 0 };

  beforeAll(async () => {
    const mod = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = setupApp(mod.createNestApplication());
    await app.init();
    prisma = app.get(PrismaService);
    await cleanup(); // 이전 실행이 중간에 죽었을 때 남은 시드

    // 시드 — 부모 먼저. 다른 테스트가 같은 연도 seasons 행을 이미 만들었을 수 있으니 upsert
    const y = async (year: number) => (await prisma.season.upsert({ where: { year }, create: { year }, update: {} })).id;
    const league = await prisma.competition.create({
      data: {
        apiCompetitionId: API + 1, name: 'Test League', country: 'Testland', countryCode: 'TL', type: CompetitionType.LEAGUE,
        format: CompetitionFormat.ROUND_ROBIN, isTracked: true, displayOrder: 9_001,
      },
    });
    const cup = await prisma.competition.create({
      data: {
        apiCompetitionId: API + 2, name: 'Test Cup', country: 'Testland', type: CompetitionType.CUP, format: CompetitionFormat.KNOCKOUT,
        isTracked: true, displayOrder: 9_002, topFlightCompetitionId: league.id,
      },
    });
    // 추적하지 않는 대회 — 목록·상세에 안 나와야 한다
    await prisma.competition.create({
      data: { apiCompetitionId: API + 3, name: 'Untracked', country: 'X', type: CompetitionType.LEAGUE, format: CompetitionFormat.ROUND_ROBIN, isTracked: false },
    });
    const mk = (competitionId: number, seasonId: number, year: number, extra: object) =>
      prisma.competitionSeason.create({ data: { competitionId, seasonId, apiSeasonValue: year, asOf: new Date('2026-09-07T00:00:00Z'), ...extra } });
    const cs2026 = await mk(league.id, await y(2026), 2026, { isCurrent: true, status: SeasonStatus.IN_PROGRESS, startDate: new Date('2026-08-21'), endDate: new Date('2027-05-30') });
    const cs2025 = await mk(league.id, await y(2025), 2025, { status: SeasonStatus.FINISHED });
    const cs2024 = await mk(league.id, await y(2024), 2024, { status: SeasonStatus.FINISHED });
    const cupCs = await mk(cup.id, await y(2026), 2026, { isCurrent: true, status: SeasonStatus.IN_PROGRESS });
    // dataState: 2026 없음 → NONE · 2025 DONE → COMPLETE · 2024 DETAILS → PARTIAL
    await prisma.backfillJob.create({ data: { competitionSeasonId: cs2025.id, phase: BackfillPhase.DONE } });
    await prisma.backfillJob.create({ data: { competitionSeasonId: cs2024.id, phase: BackfillPhase.DETAILS, total: 380, done: 120 } });

    const venue = await prisma.venue.create({ data: { apiVenueId: API + 1, name: 'Test Arena', city: 'Testville', capacity: 12_345, surface: 'grass' } });
    const teamA = await prisma.team.create({ data: { apiTeamId: API + 1, name: 'Zeta Athletic', code: 'ZET', country: 'Testland', founded: 1900, venueId: venue.id } });
    const teamB = await prisma.team.create({ data: { apiTeamId: API + 2, name: 'Alpha Town FC', shortName: 'Alpha', country: 'Testland' } });
    const teamC = await prisma.team.create({ data: { apiTeamId: API + 3, name: 'Águila Ñuñoa', country: 'Testland' } });
    await prisma.competitionEntry.createMany({
      data: [
        { competitionSeasonId: cs2026.id, teamId: teamA.id },
        { competitionSeasonId: cs2026.id, teamId: teamB.id },
        { competitionSeasonId: cs2025.id, teamId: teamA.id },
        { competitionSeasonId: cupCs.id, teamId: teamA.id },
        { competitionSeasonId: cupCs.id, teamId: teamC.id },
      ],
    });
    Object.assign(ids, { league: league.id, cup: cup.id, cs2026: cs2026.id, cs2025: cs2025.id, cs2024: cs2024.id, cupCs: cupCs.id, teamA: teamA.id, teamB: teamB.id, teamC: teamC.id, venue: venue.id });
  }, 60_000);

  afterAll(async () => {
    await cleanup();
    await app.close();
  });

  /** 시드 제거 — 자식 먼저. FK 는 없지만 Restrict 에뮬레이션(컵 → 1부 리그)과 CI 고아 행 검사가 순서를 요구한다 */
  async function cleanup(): Promise<void> {
    const comps = await prisma.competition.findMany({ where: { apiCompetitionId: { in: [API + 1, API + 2, API + 3] } }, select: { id: true, topFlightCompetitionId: true } });
    const compIds = comps.map((c) => c.id);
    const csIds = (await prisma.competitionSeason.findMany({ where: { competitionId: { in: compIds } }, select: { id: true } })).map((c) => c.id);
    await prisma.competitionEntry.deleteMany({ where: { competitionSeasonId: { in: csIds } } });
    await prisma.backfillJob.deleteMany({ where: { competitionSeasonId: { in: csIds } } });
    await prisma.competitionSeason.deleteMany({ where: { id: { in: csIds } } });
    await prisma.competition.deleteMany({ where: { id: { in: comps.filter((c) => c.topFlightCompetitionId !== null).map((c) => c.id) } } }); // 컵 먼저
    await prisma.competition.deleteMany({ where: { id: { in: compIds } } });
    await prisma.team.deleteMany({ where: { apiTeamId: { in: [API + 1, API + 2, API + 3] } } });
    await prisma.venue.deleteMany({ where: { apiVenueId: API + 1 } });
  }

  const get = (path: string) => request(app.getHttpServer()).get(path);

  describe('GET /api/competitions', () => {
    it('추적 대회만, displayOrder 순, 현재 시즌 포함, asOf 있음', async () => {
      const res = await get('/api/competitions').expect(200);
      const items: Array<{ ref: string; apiId: number; currentSeason: { year: number; dataState: string } | null }> = res.body.items;
      const refs = items.map((i) => i.ref);
      expect(refs).toContain(`${API + 1}-test-league`);
      expect(refs).toContain(`${API + 2}-test-cup`);
      expect(refs.some((r) => r.startsWith(`${API + 3}-`))).toBe(false);
      expect(refs.indexOf(`${API + 1}-test-league`)).toBeLessThan(refs.indexOf(`${API + 2}-test-cup`));
      const league = items.find((i) => i.apiId === API + 1)!;
      expect(league.currentSeason).toMatchObject({ year: 2026, label: '2026-27', isCurrent: true, dataState: 'NONE', startDate: '2026-08-21' });
      expect(new Date(res.body.asOf).toString()).not.toBe('Invalid Date');
    });

    it('/api 접두사 없이는 404, /health 는 접두사 없이 200', async () => {
      await get('/competitions').expect(404);
      await get('/health').expect(200);
    });
  });

  describe('GET /api/competitions/:ref', () => {
    it('id-slug · 숫자만 · 틀린 slug 전부 같은 대회, 시즌은 최신 먼저 + dataState 3종', async () => {
      const a = await get(`/api/competitions/${API + 1}-test-league`).expect(200);
      const b = await get(`/api/competitions/${API + 1}`).expect(200);
      const c = await get(`/api/competitions/${API + 1}-whatever`).expect(200);
      expect(b.body.ref).toBe(a.body.ref);
      expect(c.body.ref).toBe(a.body.ref);
      expect(a.body).toMatchObject({ displayName: 'Test League', shortDisplayName: 'Test League', originalName: 'Test League', topFlightRef: null });
      expect(a.body.seasons.map((s: { year: number; dataState: string }) => [s.year, s.dataState])).toEqual([
        [2026, 'NONE'], [2025, 'COMPLETE'], [2024, 'PARTIAL'],
      ]);
    });

    it('컵은 topFlightRef 로 1부 리그를 가리킨다', async () => {
      const res = await get(`/api/competitions/${API + 2}`).expect(200);
      expect(res.body.topFlightRef).toBe(`${API + 1}-test-league`);
      expect(res.body.type).toBe('CUP');
    });

    it('형식 오류 400 · 없는 대회 404 · 추적 안 하는 대회 404', async () => {
      await get('/api/competitions/premier-league').expect(400);
      await get('/api/competitions/123456789012').expect(400);
      await get(`/api/competitions/${API + 999}`).expect(404);
      await get(`/api/competitions/${API + 3}`).expect(404);
    });
  });

  describe('GET /api/teams', () => {
    it('competition 필수 — 없으면 400', async () => {
      await get('/api/teams').expect(400);
      await get('/api/teams?competition=abc').expect(400);
      await get(`/api/teams?competition=${API + 1}&season=1999`).expect(400);
      await get(`/api/teams?competition=${API + 1}&bogus=1`).expect(400); // forbidNonWhitelisted
    });

    it('season 생략 → 현재 시즌, 이름순, 이름 3종', async () => {
      const res = await get(`/api/teams?competition=${API + 1}-test-league`).expect(200);
      expect(res.body.competitionRef).toBe(`${API + 1}-test-league`);
      expect(res.body.season).toMatchObject({ year: 2026, isCurrent: true, dataState: 'NONE' });
      expect(res.body.items.map((t: { displayName: string }) => t.displayName)).toEqual(['Alpha Town FC', 'Zeta Athletic']);
      expect(res.body.items[0]).toMatchObject({ ref: `${API + 2}-alpha-town-fc`, shortDisplayName: 'Alpha', code: null });
      expect(res.body.items[1]).toMatchObject({ shortDisplayName: 'ZET' }); // shortName 없으면 code
    });

    it('season 지정 → 그 시즌 참가팀. 없는 시즌 404', async () => {
      const res = await get(`/api/teams?competition=${API + 1}&season=2025`).expect(200);
      expect(res.body.season).toMatchObject({ year: 2025, dataState: 'COMPLETE' });
      expect(res.body.items).toHaveLength(1);
      await get(`/api/teams?competition=${API + 1}&season=2023`).expect(404);
    });
  });

  describe('GET /api/teams/:ref', () => {
    it('경기장 + 참가 이력(대회 displayOrder 순 · 시즌 최신 먼저)', async () => {
      const res = await get(`/api/teams/${API + 1}-zeta-athletic`).expect(200);
      expect(res.body).toMatchObject({
        ref: `${API + 1}-zeta-athletic`, apiId: API + 1, displayName: 'Zeta Athletic', founded: 1900,
        venue: { name: 'Test Arena', city: 'Testville', capacity: 12_345, surface: 'grass', imageUrl: null },
      });
      expect(res.body.participations).toEqual([
        { competitionRef: `${API + 1}-test-league`, competitionName: 'Test League', seasons: [2026, 2025] },
        { competitionRef: `${API + 2}-test-cup`, competitionName: 'Test Cup', seasons: [2026] },
      ]);
      expect(new Date(res.body.asOf).toString()).not.toBe('Invalid Date');
    });

    it('악센트·ñ 는 slug 에서 ASCII 로, 경기장 없으면 null', async () => {
      const res = await get(`/api/teams/${API + 3}`).expect(200);
      expect(res.body.ref).toBe(`${API + 3}-aguila-nunoa`);
      expect(res.body.venue).toBeNull();
      expect(res.body.shortDisplayName).toBe('Águila Ñuñoa'); // shortName·code 둘 다 없으면 원본
    });

    it('없는 팀 404', async () => {
      await get(`/api/teams/${API + 999}`).expect(404);
    });
  });
});
