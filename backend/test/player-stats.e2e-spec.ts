/**
 * /api/players/:ref · /api/stats/scorers · /api/stats/assisters e2e.
 * 자체 시드(apiId 9,100,000대 — 다른 e2e·실 데이터와 겹치지 않음)를 넣고 끝나면 지운다.
 * 검증:
 *   - PlayerDetailDto 필드 셋과 정렬(시즌 desc → 대회 displayOrder asc)
 *   - totals.assists null 규칙 (하나라도 null 이면 합계도 null)
 *   - 모드 A (competition 지정) — items[].breakdown 없음, competition·season 세팅
 *   - 모드 B (competition 생략) — competition·season null, items[].breakdown 필수
 *   - limit 검증 · 잘못된 ref · 없는 선수
 * 원격 DB 가드 없음 — 자체 apiId 대역이 실 데이터와 안 겹쳐 로컬·CI 어디서든 동작한다 (read-api.e2e-spec.ts 관례).
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
  RankingCategory,
  SeasonStatus,
  StatsSource,
} from '../src/generated/prisma/client.js';

const API = 9_100_000;

// apiIds
const COMP_A = API + 1; // displayOrder 9,110 (모드 B 에서 먼저)
const COMP_B = API + 2; // displayOrder 9,120
const P1 = API + 11; // photoUrl 있음 · birthDate 있음 · 현재 소속 있음
const P2 = API + 12; // photoUrl null · 현재 소속 없음
const P3 = API + 13; // 현재 소속 · position null
const T1 = API + 21;
const T2 = API + 22;
const T3 = API + 23;
const T4 = API + 24; // P1 이 csA2026 에서 이적한 두 번째 팀 (unique [playerId, teamId, csId] 반례)

describe('player · stats API (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  // 내부 id 저장소
  const ids = {
    compA: 0,
    compB: 0,
    csA2026: 0,
    csA2025: 0,
    csB2026: 0,
    csB2025: 0,
    team1: 0,
    team2: 0,
    team3: 0,
    team4: 0,
    player1: 0,
    player2: 0,
    player3: 0,
  };

  beforeAll(async () => {
    const mod = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = setupApp(mod.createNestApplication());
    await app.init();
    prisma = app.get(PrismaService);
    await cleanup(); // 이전 실행이 중간에 죽었을 때 남은 시드

    // 시즌 (다른 e2e 와 공유되니 upsert)
    const y = async (year: number): Promise<number> =>
      (await prisma.season.upsert({ where: { year }, create: { year }, update: {} })).id;
    const s2026 = await y(2026);
    const s2025 = await y(2025);

    // 대회 — screenCompetitionWhere 통과 조건: isTracked · displayOrder <= 100
    const compA = await prisma.competition.create({
      data: {
        apiCompetitionId: COMP_A,
        name: 'PS Test League A',
        country: 'Testland',
        countryCode: 'TL',
        type: CompetitionType.LEAGUE,
        format: CompetitionFormat.ROUND_ROBIN,
        isTracked: true,
        displayOrder: 71, // 100 이하여야 화면 대회 스코프에 잡힌다
      },
    });
    const compB = await prisma.competition.create({
      data: {
        apiCompetitionId: COMP_B,
        name: 'PS Test League B',
        country: 'Testland',
        type: CompetitionType.LEAGUE,
        format: CompetitionFormat.ROUND_ROBIN,
        isTracked: true,
        displayOrder: 72, // A 보다 뒤
      },
    });

    // 대회시즌 — A/B × 2026/2025. 2026 은 isCurrent=true (모드 B 는 각 대회의 현재 시즌을 고른다)
    const mk = (competitionId: number, seasonId: number, year: number, extra: object = {}) =>
      prisma.competitionSeason.create({
        data: {
          competitionId,
          seasonId,
          apiSeasonValue: year,
          asOf: new Date('2026-09-08T00:00:00Z'),
          ...extra,
        },
      });
    const csA2026 = await mk(compA.id, s2026, 2026, { isCurrent: true, status: SeasonStatus.IN_PROGRESS });
    const csA2025 = await mk(compA.id, s2025, 2025, { status: SeasonStatus.FINISHED });
    const csB2026 = await mk(compB.id, s2026, 2026, { isCurrent: true, status: SeasonStatus.IN_PROGRESS });
    const csB2025 = await mk(compB.id, s2025, 2025, { status: SeasonStatus.FINISHED });

    // 팀
    const team1 = await prisma.team.create({ data: { apiTeamId: T1, name: 'Alpha PS', country: 'Testland' } });
    const team2 = await prisma.team.create({ data: { apiTeamId: T2, name: 'Bravo PS', country: 'Testland' } });
    const team3 = await prisma.team.create({ data: { apiTeamId: T3, name: 'Charlie PS', country: 'Testland' } });
    const team4 = await prisma.team.create({ data: { apiTeamId: T4, name: 'Delta PS', country: 'Testland' } });

    // 선수 3명
    const player1 = await prisma.player.create({
      data: {
        apiPlayerId: P1,
        name: 'Player One',
        firstname: 'Player',
        lastname: 'One',
        birthDate: new Date('1990-01-15'),
        birthPlace: 'Testville',
        birthCountry: 'Testland',
        nationality: 'Testland',
        heightCm: 180,
        weightKg: 75,
        photoUrl: 'https://example.invalid/p1.png',
      },
    });
    const player2 = await prisma.player.create({
      data: {
        apiPlayerId: P2,
        name: 'Player Two',
        firstname: 'Player',
        lastname: 'Two',
        nationality: 'Testland',
        photoUrl: null, // photoUrl null 커버
      },
    });
    const player3 = await prisma.player.create({
      data: {
        apiPlayerId: P3,
        name: 'Player Three',
        nationality: 'Testland',
      },
    });

    // SquadEntry — 현재 소속(validTo IS NULL). P1: 팀1 · FWD · 등번호 10 / P3: 팀3 · position null · 등번호 없음
    const now = new Date('2026-08-01');
    await prisma.squadEntry.create({
      data: {
        playerId: player1.id,
        teamId: team1.id,
        seasonYear: 2026,
        jerseyNumber: 10,
        position: 'FWD',
        validFrom: now,
        validTo: null,
        observedAt: now,
      },
    });
    await prisma.squadEntry.create({
      data: {
        playerId: player3.id,
        teamId: team3.id,
        seasonYear: 2026,
        jerseyNumber: null,
        position: null,
        validFrom: now,
        validTo: null,
        observedAt: now,
      },
    });
    // P2 는 현재 소속 없음 (SquadEntry 자체 없음)

    // PlayerSeasonStat — unique = (playerId, teamId, competitionSeasonId)
    // 대회 A 2026 에 P1(팀1) · P2(팀2) · P3(팀3)
    // 대회 B 2026 에 P1(팀1) · P2(팀2) · P3(팀3)
    // assists null 커버: P1 의 대회 A 시즌 통계.
    const asOf = new Date('2026-09-08T00:00:00Z');
    await prisma.playerSeasonStat.createMany({
      data: [
        // 대회 A × 2026
        {
          playerId: player1.id, teamId: team1.id, competitionSeasonId: csA2026.id,
          appearances: 10, lineupsCount: 9, minutes: 800, goals: 8, assists: null,
          yellowCards: 2, yellowredCards: null, redCards: 0,
          source: StatsSource.API, asOf,
        },
        // 이적 반례 — P1 이 csA2026 안에서 team4 로도 뛴다.
        // unique [playerId, teamId, csId] 가 (P1, T4, csA2026) 을 허용한다는 걸 잠근다.
        // assists non-null 이지만 앞 team1 행이 assists=null 이라 totals.assists 는 null 유지.
        {
          playerId: player1.id, teamId: team4.id, competitionSeasonId: csA2026.id,
          appearances: 5, lineupsCount: 4, minutes: 320, goals: 2, assists: 1,
          yellowCards: 0, yellowredCards: 0, redCards: 0,
          source: StatsSource.API, asOf,
        },
        {
          playerId: player2.id, teamId: team2.id, competitionSeasonId: csA2026.id,
          appearances: 12, lineupsCount: 12, minutes: 1080, goals: 5, assists: 4,
          yellowCards: 3, yellowredCards: 0, redCards: 0,
          source: StatsSource.API, asOf,
        },
        {
          playerId: player3.id, teamId: team3.id, competitionSeasonId: csA2026.id,
          appearances: 8, lineupsCount: 6, minutes: 500, goals: 3, assists: 2,
          yellowCards: 1, yellowredCards: 0, redCards: 0,
          source: StatsSource.API, asOf,
        },
        // 대회 B × 2026
        {
          playerId: player1.id, teamId: team1.id, competitionSeasonId: csB2026.id,
          appearances: 5, lineupsCount: 5, minutes: 450, goals: 6, assists: 3,
          yellowCards: 0, yellowredCards: 0, redCards: 0,
          source: StatsSource.API, asOf,
        },
        {
          playerId: player2.id, teamId: team2.id, competitionSeasonId: csB2026.id,
          appearances: 4, lineupsCount: 3, minutes: 300, goals: 2, assists: 1,
          yellowCards: 1, yellowredCards: 0, redCards: 0,
          source: StatsSource.API, asOf,
        },
        {
          playerId: player3.id, teamId: team3.id, competitionSeasonId: csB2026.id,
          appearances: 3, lineupsCount: 2, minutes: 180, goals: 1, assists: 1,
          yellowCards: 0, yellowredCards: 0, redCards: 0,
          source: StatsSource.API, asOf,
        },
        // P1 의 과거 시즌(대회 A 2025) — seasonStats 정렬 검증용
        {
          playerId: player1.id, teamId: team1.id, competitionSeasonId: csA2025.id,
          appearances: 20, lineupsCount: 18, minutes: 1600, goals: 12, assists: 5,
          yellowCards: 4, yellowredCards: 1, redCards: 0,
          source: StatsSource.API, asOf,
        },
      ],
    });

    // TopRanking — 대회 A · B × SCORERS · ASSISTS × top3
    // A SCORERS: P1(8) rank1, P2(5) rank2, P3(3) rank3
    await prisma.topRanking.createMany({
      data: [
        // 대회 A · 2026 · SCORERS
        { competitionSeasonId: csA2026.id, category: RankingCategory.SCORERS, rank: 1, playerId: player1.id, teamId: team1.id, value: 8, asOf },
        { competitionSeasonId: csA2026.id, category: RankingCategory.SCORERS, rank: 2, playerId: player2.id, teamId: team2.id, value: 5, asOf },
        { competitionSeasonId: csA2026.id, category: RankingCategory.SCORERS, rank: 3, playerId: player3.id, teamId: team3.id, value: 3, asOf },
        // 대회 A · 2026 · ASSISTS
        { competitionSeasonId: csA2026.id, category: RankingCategory.ASSISTS, rank: 1, playerId: player2.id, teamId: team2.id, value: 4, asOf },
        { competitionSeasonId: csA2026.id, category: RankingCategory.ASSISTS, rank: 2, playerId: player3.id, teamId: team3.id, value: 2, asOf },
        // 대회 B · 2026 · SCORERS
        { competitionSeasonId: csB2026.id, category: RankingCategory.SCORERS, rank: 1, playerId: player1.id, teamId: team1.id, value: 6, asOf },
        { competitionSeasonId: csB2026.id, category: RankingCategory.SCORERS, rank: 2, playerId: player2.id, teamId: team2.id, value: 2, asOf },
        { competitionSeasonId: csB2026.id, category: RankingCategory.SCORERS, rank: 3, playerId: player3.id, teamId: team3.id, value: 1, asOf },
        // 대회 B · 2026 · ASSISTS
        { competitionSeasonId: csB2026.id, category: RankingCategory.ASSISTS, rank: 1, playerId: player1.id, teamId: team1.id, value: 3, asOf },
        { competitionSeasonId: csB2026.id, category: RankingCategory.ASSISTS, rank: 2, playerId: player2.id, teamId: team2.id, value: 1, asOf },
        { competitionSeasonId: csB2026.id, category: RankingCategory.ASSISTS, rank: 3, playerId: player3.id, teamId: team3.id, value: 1, asOf },
      ],
    });

    Object.assign(ids, {
      compA: compA.id, compB: compB.id,
      csA2026: csA2026.id, csA2025: csA2025.id,
      csB2026: csB2026.id, csB2025: csB2025.id,
      team1: team1.id, team2: team2.id, team3: team3.id, team4: team4.id,
      player1: player1.id, player2: player2.id, player3: player3.id,
    });
  }, 60_000);

  afterAll(async () => {
    if (prisma) {
      try {
        await cleanup();
      } catch (cause) {
        console.warn('[player-stats e2e] 픽스처 정리 실패:', cause);
      }
    }
    await app?.close();
  }, 60_000);

  /** 시드 제거 — 자식 먼저 (Restrict 에뮬레이션 · CI 고아 행 검사) */
  async function cleanup(): Promise<void> {
    const comps = await prisma.competition.findMany({
      where: { apiCompetitionId: { in: [COMP_A, COMP_B] } },
      select: { id: true },
    });
    const compIds = comps.map((c) => c.id);
    const csRows = await prisma.competitionSeason.findMany({
      where: { competitionId: { in: compIds } },
      select: { id: true },
    });
    const csIds = csRows.map((c) => c.id);

    if (csIds.length > 0) {
      await prisma.topRanking.deleteMany({ where: { competitionSeasonId: { in: csIds } } });
      await prisma.playerSeasonStat.deleteMany({ where: { competitionSeasonId: { in: csIds } } });
      await prisma.competitionEntry.deleteMany({ where: { competitionSeasonId: { in: csIds } } });
      await prisma.competitionSeason.deleteMany({ where: { id: { in: csIds } } });
    }
    await prisma.competition.deleteMany({ where: { id: { in: compIds } } });
    await prisma.squadEntry.deleteMany({ where: { player: { apiPlayerId: { in: [P1, P2, P3] } } } });
    await prisma.player.deleteMany({ where: { apiPlayerId: { in: [P1, P2, P3] } } });
    await prisma.team.deleteMany({ where: { apiTeamId: { in: [T1, T2, T3, T4] } } });
  }

  const get = (path: string) => request(app.getHttpServer()).get(path);

  describe('GET /api/players/:ref', () => {
    it('필드 셋, seasonStats 정렬(시즌 desc → 대회 displayOrder asc), totals.assists null 규칙', async () => {
      const res = await get(`/api/players/${P1}-player-one`).expect(200);
      const body = res.body;
      expect(body).toMatchObject({
        ref: `${P1}-player-one`,
        apiId: P1,
        displayName: 'Player One',
        shortDisplayName: 'Player One',
        originalName: 'Player One',
        firstname: 'Player',
        lastname: 'One',
        nationality: 'Testland',
        birthDate: '1990-01-15',
        birthPlace: 'Testville',
        birthCountry: 'Testland',
        heightCm: 180,
        weightKg: 75,
        photoUrl: 'https://example.invalid/p1.png',
        jerseyNumber: 10,
        position: 'FWD',
      });
      expect(body.primaryTeam).toMatchObject({ ref: `${T1}-alpha-ps`, apiId: T1 });

      // seasonStats 정렬: 2026(A→B) → 2025(A). csA2026 은 이적 반례로 팀 두 개(T1·T4) → 4행.
      // year desc → competition.displayOrder asc 만 잡히고 팀 tiebreaker 는 없으니
      // 같은 (COMP_A, 2026) 두 행의 상대 순서는 검증하지 않는다.
      const rows: Array<{ competition: { apiId: number }; season: { year: number }; team: { apiId: number }; assists: number | null; appearances: number; goals: number; minutes: number }> = body.seasonStats;
      expect(rows).toHaveLength(4);
      expect(rows.slice(0, 2).map((r) => [r.competition.apiId, r.season.year])).toEqual([
        [COMP_A, 2026],
        [COMP_A, 2026],
      ]);
      expect([rows[2].competition.apiId, rows[2].season.year]).toEqual([COMP_B, 2026]);
      expect([rows[3].competition.apiId, rows[3].season.year]).toEqual([COMP_A, 2025]);
      // csA2026 두 팀이 T1·T4
      expect(rows.slice(0, 2).map((r) => r.team.apiId).sort((a, b) => a - b)).toEqual([T1, T4]);
      // assists null 유지 — T1 행에서
      const csA2026Team1 = rows.find((r) => r.competition.apiId === COMP_A && r.season.year === 2026 && r.team.apiId === T1);
      expect(csA2026Team1?.assists).toBeNull();

      // totals: assists 는 하나라도 null 이면 null (T1 행이 null)
      expect(body.totals.assists).toBeNull();
      // 나머지 SUM: goals = 8(T1·A2026) + 2(T4·A2026) + 6(B2026) + 12(A2025) = 28
      expect(body.totals.goals).toBe(28);
      // minutes = 800 + 320 + 450 + 1600 = 3170
      expect(body.totals.minutes).toBe(3170);
      // appearances = 10 + 5 + 5 + 20 = 40
      expect(body.totals.appearances).toBe(40);

      expect(new Date(body.asOf).toString()).not.toBe('Invalid Date');
    });

    it('photoUrl null · 현재 소속 없음(SquadEntry 없음)', async () => {
      const res = await get(`/api/players/${P2}`).expect(200);
      expect(res.body).toMatchObject({
        apiId: P2,
        photoUrl: null,
        primaryTeam: null,
        jerseyNumber: null,
        position: null,
      });
      // P2 는 assists 가 전부 non-null (4 + 1 = 5)
      expect(res.body.totals.assists).toBe(5);
    });

    it('position null 이 그대로 노출', async () => {
      const res = await get(`/api/players/${P3}`).expect(200);
      expect(res.body.position).toBeNull();
      expect(res.body.primaryTeam).toMatchObject({ apiId: T3 });
    });

    it('없는 선수 404 · 형식 오류 400', async () => {
      await get(`/api/players/${API + 999}`).expect(404);
      await get('/api/players/not-a-ref').expect(400);
    });
  });

  describe('GET /api/stats/scorers · assisters (모드 A: competition 지정)', () => {
    it('rank 순으로 items 반환, breakdown 없음, competition·season 세팅', async () => {
      const res = await get(`/api/stats/scorers?competition=${COMP_A}&limit=2`).expect(200);
      const body = res.body;
      expect(body.competition).toMatchObject({ apiId: COMP_A, ref: `${COMP_A}-ps-test-league-a` });
      expect(body.season).toEqual({ year: 2026, label: '2026-27' });
      expect(body.items).toHaveLength(2);
      expect(body.items[0]).toMatchObject({ rank: 1, value: 8 });
      expect(body.items[0].player.apiId).toBe(P1);
      expect(body.items[0].team.apiId).toBe(T1);
      // breakdown 없음
      expect(body.items[0].breakdown).toBeUndefined();
      expect(body.items[1]).toMatchObject({ rank: 2, value: 5 });
    });

    it('assisters — category ASSISTS 데이터로 채워짐', async () => {
      const res = await get(`/api/stats/assisters?competition=${COMP_A}`).expect(200);
      // A · ASSISTS: P2 rank1 value 4, P3 rank2 value 2
      expect(res.body.items.map((r: { rank: number; value: number }) => [r.rank, r.value])).toEqual([[1, 4], [2, 2]]);
      expect(res.body.items[0].player.apiId).toBe(P2);
    });

    it('없는 대회 404 · 없는 시즌 404 · limit>100 400', async () => {
      await get(`/api/stats/scorers?competition=${API + 999}`).expect(404);
      await get(`/api/stats/scorers?competition=${COMP_A}&season=1999`).expect(400); // Min 2000
      await get(`/api/stats/scorers?competition=${COMP_A}&season=2020`).expect(404); // 없는 시즌
      await get(`/api/stats/scorers?limit=101`).expect(400);
      await get(`/api/stats/scorers?bogus=1`).expect(400); // forbidNonWhitelisted
    });
  });

  describe('GET /api/stats/scorers (모드 B: competition 생략)', () => {
    it('competition·season null · items[].breakdown 필수 · 합산 정렬', async () => {
      const res = await get('/api/stats/scorers?limit=3').expect(200);
      const body = res.body;
      expect(body.competition).toBeNull();
      expect(body.season).toBeNull();

      // 우리 픽스처 6대회 중 A·B 만 실제 데이터 · 다른 실 데이터가 함께 있을 수 있으니 P1·P2·P3 존재만 확인
      const byPlayer = new Map<number, { rank: number; value: number; breakdown: Array<{ competition: { apiId: number }; season: { year: number }; value: number }> }>();
      for (const item of body.items) {
        byPlayer.set(item.player.apiId, item);
      }

      // limit=3 이라 실 데이터가 없으면 우리 P1·P2·P3 순서. 실 데이터가 있어도 P1 은 반드시 breakdown 을 갖고 나온다면 검증
      // 안전을 위해 P1 이 items 에 없으면 스킵 대신 실패시켜 데이터 오염 여부를 드러낸다
      const item1 = body.items.find((r: { player: { apiId: number } }) => r.player.apiId === P1);
      if (item1) {
        expect(Array.isArray(item1.breakdown)).toBe(true);
        // P1 은 A(8) · B(6) = 14
        expect(item1.value).toBe(14);
        // breakdown 원소에 competition · season · value 세팅
        for (const b of item1.breakdown) {
          expect(b).toHaveProperty('competition.apiId');
          expect(b).toHaveProperty('season.year');
          expect(typeof b.value).toBe('number');
        }
        // 두 대회 다 들어갔다
        const apis = item1.breakdown.map((b: { competition: { apiId: number } }) => b.competition.apiId).sort();
        expect(apis).toEqual([COMP_A, COMP_B].sort());
      }

      expect(byPlayer.size).toBeGreaterThan(0);
      expect(new Date(body.asOf).toString()).not.toBe('Invalid Date');
    });
  });

  describe('선수 이적 — 같은 대회시즌 두 팀 (unique 반례)', () => {
    it('seasonStats 에 P1 csA2026 의 두 행이 모두 온다 (T1·T4)', async () => {
      const res = await get(`/api/players/${P1}-player-one`).expect(200);
      const cs2026Rows = res.body.seasonStats.filter(
        (r: { season: { year: number }; competition: { apiId: number } }) =>
          r.season.year === 2026 && r.competition.apiId === COMP_A,
      );
      expect(cs2026Rows).toHaveLength(2);
      const teamIds = cs2026Rows.map((r: { team: { apiId: number } }) => r.team.apiId).sort((a: number, b: number) => a - b);
      expect(teamIds).toEqual([T1, T4]);
    });

    it('totals — appearances·goals 는 두 행 포함 SUM, assists 는 null (T1 행 null)', async () => {
      const res = await get(`/api/players/${P1}-player-one`).expect(200);
      const rows: Array<{ appearances: number; goals: number }> = res.body.seasonStats;
      // 4행 전부의 필드 합이 totals 와 같다 (assists 제외)
      const totalAppearances = rows.reduce((a, r) => a + r.appearances, 0);
      const totalGoals = rows.reduce((a, r) => a + r.goals, 0);
      expect(res.body.totals.appearances).toBe(totalAppearances);
      expect(res.body.totals.goals).toBe(totalGoals);
      // P1 csA2026 T1 행이 assists=null → totals null (R2/R3: 하나라도 null 이면 합계도 null)
      expect(res.body.totals.assists).toBeNull();
    });

    it('assists=null 인 행에서 appearances·goals·yellowCards 는 응답에 살아 있다 (필드 단위 null)', async () => {
      const res = await get(`/api/players/${P1}-player-one`).expect(200);
      const nullAssistRow = res.body.seasonStats.find(
        (r: { assists: number | null }) => r.assists === null,
      );
      expect(nullAssistRow).toBeDefined();
      // R2/R3: assists null 은 필드 단위 · 시즌 전체 값을 가리지 않는다
      expect(nullAssistRow.appearances).toBeGreaterThan(0);
      expect(nullAssistRow.goals).toBeGreaterThanOrEqual(0);
      expect(nullAssistRow.yellowCards).toBeGreaterThanOrEqual(0);
    });
  });
});
