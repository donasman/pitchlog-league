/**
 * 조회 API e2e — /api/matches · /api/standings.
 * 자체 시드(apiId 9,100,000대 — 실 데이터·다른 e2e 시드와 겹치지 않음)를 넣고 끝나면 지운다.
 * 리그는 displayOrder 99 라 화면 범위(≤100) 안 → 기본 목록에 나온다. 컵은 9,102 라 밖 → competition 지정으로만 본다.
 * 검증: 시즌 결정 규칙 · KST 날짜 경계 · 팀 필터 · MatchDto 형태(statsState · 스코어 null · winnerTeamRef) · 순위표 KNOCKOUT/EMPTY.
 */
import 'dotenv/config';
import { Test } from '@nestjs/testing';
import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module.js';
import { setupApp } from '../src/app.setup.js';
import { PrismaService } from '../src/prisma/prisma.service.js';
import { CompetitionFormat, CompetitionType, MatchLeg, SeasonStatus, StatsState, type Prisma } from '../src/generated/prisma/client.js';

const API = 9_100_000;
const AS_OF = new Date('2026-09-07T00:00:00Z');

describe('경기·순위표 API (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  beforeAll(async () => {
    const mod = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = setupApp(mod.createNestApplication());
    await app.init();
    prisma = app.get(PrismaService);
    await cleanup(); // 이전 실행이 중간에 죽었을 때 남은 시드

    // 시드 — 부모 먼저. seasons 는 다른 테스트가 이미 만들었을 수 있으니 upsert
    const y = async (year: number) => (await prisma.season.upsert({ where: { year }, create: { year }, update: {} })).id;
    const league = await prisma.competition.create({
      data: {
        apiCompetitionId: API + 1, name: 'Stand League', country: 'Testland', countryCode: 'TL', type: CompetitionType.LEAGUE,
        format: CompetitionFormat.ROUND_ROBIN, isTracked: true, displayOrder: 99,
      },
    });
    const cup = await prisma.competition.create({
      data: {
        apiCompetitionId: API + 2, name: 'Stand Cup', country: 'Testland', type: CompetitionType.CUP, format: CompetitionFormat.KNOCKOUT,
        isTracked: true, displayOrder: 9_102, topFlightCompetitionId: league.id,
      },
    });
    const mk = (competitionId: number, seasonId: number, year: number, extra: object) =>
      prisma.competitionSeason.create({ data: { competitionId, seasonId, apiSeasonValue: year, asOf: AS_OF, ...extra } });
    const cs2026 = await mk(league.id, await y(2026), 2026, { isCurrent: true, status: SeasonStatus.IN_PROGRESS, startDate: new Date('2026-08-21'), endDate: new Date('2027-05-30') });
    const cs2025 = await mk(league.id, await y(2025), 2025, { status: SeasonStatus.FINISHED });
    const cupCs = await mk(cup.id, await y(2026), 2026, { isCurrent: true, status: SeasonStatus.IN_PROGRESS });

    const venue = await prisma.venue.create({ data: { apiVenueId: API + 1, name: 'Stand Arena', city: 'Testville' } });
    const teamA = await prisma.team.create({ data: { apiTeamId: API + 1, name: 'Stand United', code: 'STU', country: 'Testland', venueId: venue.id } });
    const teamB = await prisma.team.create({ data: { apiTeamId: API + 2, name: 'Stand City', shortName: 'City', country: 'Testland' } });
    const teamC = await prisma.team.create({ data: { apiTeamId: API + 3, name: 'Stand Rovers', country: 'Testland' } });
    await prisma.competitionEntry.createMany({
      data: [teamA, teamB, teamC].map((t) => ({ competitionSeasonId: cs2026.id, teamId: t.id })),
    });

    const round = (competitionSeasonId: number, name: string, ordinal: number, extra: object = {}) =>
      prisma.competitionRound.create({ data: { competitionSeasonId, name, ordinal, ...extra } });
    const r1 = await round(cs2026.id, 'Regular Season - 1', 1, { matchCount: 10 });
    const r2 = await round(cs2026.id, 'Regular Season - 2', 2, { matchCount: 10 });
    const r2025 = await round(cs2025.id, 'Regular Season - 1', 1);
    const rCup = await round(cupCs.id, 'Final', 1, { isLateStage: true });

    // 상태 기본 NS. 타입은 우회하지 않는다 — statsState 는 prisma generate 후에만 통과한다
    const match = (apiFixtureId: number, extra: Omit<Prisma.MatchUncheckedCreateInput, 'apiFixtureId' | 'asOf' | 'statusShort'> & { statusShort?: string }) =>
      prisma.match.create({ data: { apiFixtureId, statusShort: 'NS', asOf: AS_OF, ...extra } });
    // FT: A 3-1 B, 승자 A, 경기장 있음 — KST 11-23 00:00 정각
    await match(API + 1, {
      competitionSeasonId: cs2026.id, roundId: r1.id, kickoffAt: new Date('2026-11-22T15:00:00Z'), statusShort: 'FT', statusLong: 'Match Finished',
      elapsed: 90, venueId: venue.id, referee: 'R. Test', homeTeamId: teamA.id, awayTeamId: teamB.id,
      goalsHome: 3, goalsAway: 1, htHome: 1, htAway: 0, ftHome: 3, ftAway: 1, winnerTeamId: teamA.id, detailEligible: true, hasEvents: true, hasLineups: false,
    });
    // FT RECHECK: B 0-0 C — 마이그레이션 적용 후에만 컴파일된다
    await match(API + 2, {
      competitionSeasonId: cs2026.id, roundId: r1.id, kickoffAt: new Date('2026-11-21T12:00:00Z'), statusShort: 'FT', homeTeamId: teamB.id, awayTeamId: teamC.id,
      goalsHome: 0, goalsAway: 0, htHome: 0, htAway: 0, ftHome: 0, ftAway: 0, statsState: StatsState.RECHECK,
    });
    // NS: C vs A, 경기장 없음 — KST 11-22 23:59:59
    await match(API + 3, {
      competitionSeasonId: cs2026.id, roundId: r2.id, kickoffAt: new Date('2026-11-22T14:59:59Z'), homeTeamId: teamC.id, awayTeamId: teamA.id,
    });
    // 2025 시즌 경기
    await match(API + 4, {
      competitionSeasonId: cs2025.id, roundId: r2025.id, kickoffAt: new Date('2025-11-22T15:00:00Z'), statusShort: 'FT', homeTeamId: teamA.id, awayTeamId: teamB.id,
      goalsHome: 1, goalsAway: 2, ftHome: 1, ftAway: 2, winnerTeamId: teamB.id,
    });
    // 컵 경기 — 화면 범위 밖 대회
    await match(API + 5, {
      competitionSeasonId: cupCs.id, roundId: rCup.id, kickoffAt: new Date('2026-11-25T20:00:00Z'), homeTeamId: teamA.id, awayTeamId: teamC.id, leg: MatchLeg.SINGLE,
    });

    // 순위 3행 (2026). 2025 는 0행 → EMPTY
    const row = (teamId: number, rank: number, extra: object) => ({
      competitionSeasonId: cs2026.id, teamId, rank, groupName: 'Stand League', asOf: AS_OF,
      played: 2, win: 0, draw: 0, lose: 0, goalsFor: 0, goalsAgainst: 0, goalDiff: 0, points: 0, ...extra,
    });
    await prisma.standing.createMany({
      data: [
        row(teamA.id, 1, { points: 4, win: 1, draw: 1, goalsFor: 3, goalsAgainst: 1, goalDiff: 2, homePlayed: 1, homeWin: 1, homeGf: 3, homeGa: 1, form: 'WWD', description: 'Promotion - Champions League (League phase)', status: 'same' }),
        row(teamB.id, 2, { points: 1, draw: 1, lose: 1, goalsFor: 1, goalsAgainst: 3, goalDiff: -2, form: 'DL' }),
        row(teamC.id, 3, { points: 1, draw: 1, goalsFor: 0, goalsAgainst: 0, form: 'D' }),
      ],
    });
  }, 60_000);

  afterAll(async () => {
    await cleanup();
    await app.close();
  });

  /** 시드 제거 — 자식 먼저. FK 는 없지만 Restrict 에뮬레이션과 CI 고아 행 검사가 순서를 요구한다. seasons 는 공유라 안 지운다 */
  async function cleanup(): Promise<void> {
    const comps = await prisma.competition.findMany({ where: { apiCompetitionId: { in: [API + 1, API + 2] } }, select: { id: true, topFlightCompetitionId: true } });
    const compIds = comps.map((c) => c.id);
    const csIds = (await prisma.competitionSeason.findMany({ where: { competitionId: { in: compIds } }, select: { id: true } })).map((c) => c.id);
    await prisma.standing.deleteMany({ where: { competitionSeasonId: { in: csIds } } });
    await prisma.match.deleteMany({ where: { competitionSeasonId: { in: csIds } } });
    await prisma.competitionRound.deleteMany({ where: { competitionSeasonId: { in: csIds } } });
    await prisma.backfillJob.deleteMany({ where: { competitionSeasonId: { in: csIds } } });
    await prisma.competitionEntry.deleteMany({ where: { competitionSeasonId: { in: csIds } } });
    await prisma.competitionSeason.deleteMany({ where: { id: { in: csIds } } });
    await prisma.competition.deleteMany({ where: { id: { in: comps.filter((c) => c.topFlightCompetitionId !== null).map((c) => c.id) } } }); // 컵 먼저
    await prisma.competition.deleteMany({ where: { id: { in: compIds } } });
    await prisma.team.deleteMany({ where: { apiTeamId: { in: [API + 1, API + 2, API + 3] } } });
    await prisma.venue.deleteMany({ where: { apiVenueId: API + 1 } });
  }

  const get = (path: string) => request(app.getHttpServer()).get(path);
  const LEAGUE = `${API + 1}-stand-league`;
  type Item = { id: number; kickoffAt: string; season: { year: number } };

  describe('GET /api/matches', () => {
    it('기본 — 화면 대회의 현재 시즌 경기. 리그 포함 · 컵 미포함 · 킥오프 오름차순 · asOf', async () => {
      const res = await get('/api/matches').expect(200);
      const items: Item[] = res.body.items;
      const ids = items.map((i) => i.id);
      expect(ids).toEqual(expect.arrayContaining([API + 1, API + 2, API + 3]));
      expect(ids).not.toContain(API + 4); // 2025 시즌
      expect(ids).not.toContain(API + 5); // 컵 — displayOrder 9,102 는 화면 범위 밖
      for (let i = 1; i < items.length; i++) expect(items[i].kickoffAt >= items[i - 1].kickoffAt).toBe(true);
      expect(res.body.season).toBeNull();
      expect(new Date(res.body.asOf).toString()).not.toBe('Invalid Date');
    });

    it('competition + season → 그 시즌만. 없는 시즌 404 · 모르는 파라미터 400', async () => {
      const res = await get(`/api/matches?competition=${LEAGUE}&season=2025`).expect(200);
      expect(res.body.season).toMatchObject({ year: 2025, label: '2025-26', isCurrent: false });
      expect(res.body.items.map((i: Item) => i.id)).toEqual([API + 4]);
      expect(res.body.items.every((i: Item) => i.season.year === 2025)).toBe(true);

      const cur = await get(`/api/matches?competition=${API + 1}`).expect(200);
      expect(cur.body.season.year).toBe(2026);
      expect(cur.body.items.map((i: Item) => i.id)).toEqual([API + 2, API + 3, API + 1]);

      await get(`/api/matches?competition=${LEAGUE}&season=2024`).expect(404);
      await get(`/api/matches?competition=${API + 999}`).expect(404);
      await get('/api/matches?competition=abc').expect(400);
      await get(`/api/matches?competition=${LEAGUE}&season=1999`).expect(400);
      await get(`/api/matches?competition=${LEAGUE}&bogus=1`).expect(400); // forbidNonWhitelisted
    });

    it('from/to 는 KST 날짜 포함 — 11-23 00:00 KST = 11-22 15:00Z 경계', async () => {
      const from = await get(`/api/matches?competition=${LEAGUE}&from=2026-11-23`).expect(200);
      expect(from.body.items.map((i: Item) => i.id)).toEqual([API + 1]); // 15:00:00Z 포함 · 14:59:59Z 제외

      const to = await get(`/api/matches?competition=${LEAGUE}&to=2026-11-22`).expect(200);
      expect(to.body.items.map((i: Item) => i.id)).toEqual([API + 2, API + 3]); // 15:00:00Z 는 다음 날

      const both = await get(`/api/matches?competition=${LEAGUE}&from=2026-11-22&to=2026-11-22`).expect(200);
      expect(both.body.items.map((i: Item) => i.id)).toEqual([API + 3]);

      await get(`/api/matches?competition=${LEAGUE}&from=2026-11-24&to=2026-11-23`).expect(400);
      await get(`/api/matches?competition=${LEAGUE}&from=2026-1-1`).expect(400);
      await get(`/api/matches?competition=${LEAGUE}&to=20261123`).expect(400);
    });

    it('team → 홈·원정 양쪽. 없는 팀 404 · 형식 오류 400', async () => {
      const res = await get(`/api/matches?competition=${LEAGUE}&team=${API + 1}-stand-united`).expect(200);
      expect(res.body.items.map((i: Item) => i.id)).toEqual([API + 3, API + 1]); // 원정(C vs A) · 홈(A vs B)
      await get(`/api/matches?competition=${LEAGUE}&team=${API + 999}`).expect(404);
      await get(`/api/matches?competition=${LEAGUE}&team=united`).expect(400);
    });

    it('MatchDto 형태 — statsState · 스코어 5종(null 유지) · winnerTeamRef · round · venue', async () => {
      const ft = (await get(`/api/matches/${API + 1}`).expect(200)).body;
      expect(ft).toMatchObject({
        id: API + 1, kickoffAt: '2026-11-22T15:00:00.000Z', statusShort: 'FT', statusLong: 'Match Finished', elapsed: 90, extraElapsed: null,
        statsState: 'NONE', confirmedAt: null,
        goals: { home: 3, away: 1 }, ht: { home: 1, away: 0 }, ft: { home: 3, away: 1 }, et: { home: null, away: null }, pen: { home: null, away: null },
        home: { ref: `${API + 1}-stand-united`, apiId: API + 1, displayName: 'Stand United', shortDisplayName: 'STU', code: 'STU' },
        away: { ref: `${API + 2}-stand-city`, shortDisplayName: 'City' },
        competition: { ref: LEAGUE, apiId: API + 1, displayName: 'Stand League', shortDisplayName: 'Stand League', originalName: 'Stand League', type: 'LEAGUE', format: 'ROUND_ROBIN' },
        season: { year: 2026, label: '2026-27' },
        round: { name: 'Regular Season - 1', ordinal: 1, matchCount: 10, isLateStage: false },
        venue: { name: 'Stand Arena', city: 'Testville' },
        referee: 'R. Test', leg: null, detailEligible: true, hasEvents: true, hasLineups: false, hasTeamStats: null, hasPlayerStats: null,
      });
      expect(ft.winnerTeamRef).toBe(ft.home.ref);
      expect(new Date(ft.asOf).toString()).not.toBe('Invalid Date');

      const recheck = (await get(`/api/matches/${API + 2}`).expect(200)).body;
      expect(recheck).toMatchObject({ statsState: 'RECHECK', winnerTeamRef: null, goals: { home: 0, away: 0 } });

      const ns = (await get(`/api/matches/${API + 3}`).expect(200)).body;
      expect(ns).toMatchObject({
        statusShort: 'NS', statsState: 'NONE', goals: { home: null, away: null }, ht: { home: null, away: null }, ft: { home: null, away: null },
        winnerTeamRef: null, venue: null, referee: null, detailEligible: false, hasEvents: null,
        round: { name: 'Regular Season - 2', ordinal: 2, matchCount: 10 },
      });

      const cup = (await get(`/api/matches/${API + 5}`).expect(200)).body;
      expect(cup).toMatchObject({ leg: 'SINGLE', competition: { ref: `${API + 2}-stand-cup`, type: 'CUP', format: 'KNOCKOUT' }, round: { name: 'Final', isLateStage: true, matchCount: null } });
    });
  });

  describe('GET /api/matches/:ref', () => {
    it('숫자만 · id-slug 동일 응답. 형식 오류 400 · 없음 404', async () => {
      const a = await get(`/api/matches/${API + 1}`).expect(200);
      const b = await get(`/api/matches/${API + 1}-whatever`).expect(200);
      expect(b.body).toEqual(a.body);
      await get('/api/matches/abc').expect(400);
      await get(`/api/matches/${API + 999}`).expect(404);
    });
  });

  describe('GET /api/standings', () => {
    type Table = { competition: { ref: string; format: string }; season: { year: number }; unavailableReason: string | null; rows: Array<{ rank: number; form: string | null; description: string | null; team: { ref: string } }>; asOf: string };

    it('기본 — 화면 대회 전부. 리그 표는 rank 순 · form/description 원문. 컵(범위 밖)은 없다', async () => {
      const res = await get('/api/standings').expect(200);
      const items: Table[] = res.body.items;
      const league = items.find((t) => t.competition.ref === LEAGUE)!;
      expect(league).toBeDefined();
      expect(league.season).toMatchObject({ year: 2026, isCurrent: true, dataState: 'NONE' });
      expect(league.unavailableReason).toBeNull();
      expect(league.rows.map((r) => r.rank)).toEqual([1, 2, 3]);
      expect(league.rows[0]).toMatchObject({
        team: { ref: `${API + 1}-stand-united`, shortDisplayName: 'STU' }, groupName: 'Stand League', rank: 1, points: 4, played: 2, win: 1, draw: 1, lose: 0,
        goalsFor: 3, goalsAgainst: 1, goalDiff: 2, home: { played: 1, win: 1, draw: 0, lose: 0, gf: 3, ga: 1 }, away: { played: 0, win: 0, draw: 0, lose: 0, gf: 0, ga: 0 },
        form: 'WWD', description: 'Promotion - Champions League (League phase)', status: 'same',
      });
      expect(league.rows[1]).toMatchObject({ form: 'DL', description: null, status: null });
      expect(items.some((t) => t.competition.ref === `${API + 2}-stand-cup`)).toBe(false); // displayOrder 9,102 는 화면 범위 밖
      expect(new Date(res.body.asOf).toString()).not.toBe('Invalid Date');
      expect(new Date(league.asOf).toString()).not.toBe('Invalid Date');
    });

    it('competition 지정 — 1개. 컵은 200 + KNOCKOUT · 2025 리그는 EMPTY · 추적 안 함 404 · season 범위 밖 400', async () => {
      const league = await get(`/api/standings?competition=${LEAGUE}`).expect(200);
      expect(league.body.items).toHaveLength(1);
      expect(league.body.items[0]).toMatchObject({ competition: { ref: LEAGUE }, season: { year: 2026 }, unavailableReason: null });
      expect(league.body.items[0].rows).toHaveLength(3);

      const cup = await get(`/api/standings?competition=${API + 2}`).expect(200);
      expect(cup.body.items).toHaveLength(1);
      expect(cup.body.items[0]).toMatchObject({ competition: { ref: `${API + 2}-stand-cup`, format: 'KNOCKOUT' }, season: { year: 2026 }, unavailableReason: 'KNOCKOUT', rows: [] });

      const empty = await get(`/api/standings?competition=${LEAGUE}&season=2025`).expect(200);
      expect(empty.body.items[0]).toMatchObject({ season: { year: 2025 }, unavailableReason: 'EMPTY', rows: [] });

      await get(`/api/standings?competition=${LEAGUE}&season=2024`).expect(404);
      await get(`/api/standings?competition=${API + 999}`).expect(404);
      await get('/api/standings?competition=abc').expect(400);
      await get(`/api/standings?competition=${LEAGUE}&season=1999`).expect(400);
      await get(`/api/standings?competition=${LEAGUE}&bogus=1`).expect(400);
    });
  });
});
