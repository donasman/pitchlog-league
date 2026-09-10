/**
 * 조회 API e2e — GET /api/matches/:ref/detail (feature/match-detail-api).
 * MatchFullDetailDto 4갈래 (라인업·이벤트·팀 통계·선수 통계) · availability 3값 · Decimal null 유지 (D6).
 *
 * 자체 시드(밴드 997_6xx, SEASON=2099) 로 다른 e2e 와 격리한다:
 *   - COMP=997_601, TEAM_HOME=997_610, TEAM_AWAY=997_611
 *   - MATCH_A~E = 997_650~997_654 (has_* 조합·null·정렬 반례)
 *   - SEASON=2099 로 backfill-details 와 겹치지 않게 (동일 fileParallelism:false)
 *
 * 원격 DB 는 스스로 skip 한다 — 이 스펙은 도메인 테이블에 가짜 행을 쓴다.
 * 로컬 Postgres · CI 에서만 돈다.
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
  Prisma,
  SeasonStatus,
} from '../src/generated/prisma/client.js';

// 다른 e2e 밴드와 겹치지 않는 대역
const COMP_API_ID = 997_601;
const TEAM_HOME_API = 997_610;
const TEAM_AWAY_API = 997_611;
const VENUE_API_ID = 997_620;
// 5 경기 — has_* 조합·null·정렬 반례
const FX_A = 997_650; // 4갈래 다 non-null true — 완전 처리
const FX_B = 997_651; // teamStats 만 has=false (not_provided)
const FX_C = 997_652; // 4갈래 다 null — not_collected
const FX_D = 997_653; // 정상 · events 순서 반례 (역순 시드)
const FX_E = 997_654; // 4갈래 true · Decimal null 반례 (xG · rating null)

// SEASON=2099 로 못박아 backfill-details(2099) 와 대회 apiId 격리(997_4xx vs 997_6xx) 로 분리
const SEASON_YEAR = 2099;

// 선수·감독 apiId — 이 스펙 전용
const PLAYER_HOME_1 = 997_701; // 홈 GK
const PLAYER_HOME_2 = 997_702; // 홈 DF
const PLAYER_HOME_11 = 997_711; // 홈 FW (골)
const PLAYER_AWAY_1 = 997_721; // 원정 GK
const PLAYER_AWAY_2 = 997_722; // 원정 DF
const PLAYER_AWAY_11 = 997_731; // 원정 FW
const COACH_HOME_API = 997_801;
const COACH_AWAY_API = 997_802;

const skipIfRemote = (): boolean => {
  const host = new URL(process.env.DATABASE_URL ?? 'postgresql://x/').hostname;
  const local = ['localhost', '127.0.0.1', '::1'].includes(host);
  return !local && !process.env.CI && process.env.E2E_ALLOW_REMOTE_DB !== '1';
};

describe('GET /api/matches/:ref/detail (e2e, 997_6xx)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  // 시드 후 채워짐
  let competitionSeasonId = 0;
  let homeTeamId = 0;
  let awayTeamId = 0;
  const matchIdByFx = new Map<number, number>();

  beforeAll(async () => {
    if (skipIfRemote()) {
      console.warn(
        `[match-detail e2e] 원격 DB(${new URL(process.env.DATABASE_URL ?? 'postgresql://x/').hostname}) — 스킵`,
      );
      return;
    }
    const mod = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = setupApp(mod.createNestApplication());
    await app.init();
    prisma = app.get(PrismaService);
    await cleanup();

    // ─── 시드 (부모 → 자식) ─────────────────────────────────
    const season = await prisma.season.upsert({
      where: { year: SEASON_YEAR },
      create: { year: SEASON_YEAR },
      update: {},
    });
    const competition = await prisma.competition.create({
      data: {
        apiCompetitionId: COMP_API_ID,
        name: 'Detail Test League',
        country: 'Testland',
        countryCode: 'TL',
        type: CompetitionType.LEAGUE,
        format: CompetitionFormat.ROUND_ROBIN,
        isTracked: true,
        displayOrder: 99,
      },
    });
    const cs = await prisma.competitionSeason.create({
      data: {
        competitionId: competition.id,
        seasonId: season.id,
        apiSeasonValue: SEASON_YEAR,
        isCurrent: true,
        status: SeasonStatus.IN_PROGRESS,
      },
    });
    competitionSeasonId = cs.id;

    const venue = await prisma.venue.create({
      data: { apiVenueId: VENUE_API_ID, name: 'Detail Arena', city: 'Testville' },
    });
    const homeTeam = await prisma.team.create({
      data: { apiTeamId: TEAM_HOME_API, name: 'Home United', code: 'HOM', country: 'Testland', venueId: venue.id },
    });
    const awayTeam = await prisma.team.create({
      data: { apiTeamId: TEAM_AWAY_API, name: 'Away City', code: 'AWA', country: 'Testland' },
    });
    homeTeamId = homeTeam.id;
    awayTeamId = awayTeam.id;

    await prisma.competitionEntry.createMany({
      data: [homeTeam, awayTeam].map((t) => ({ competitionSeasonId: cs.id, teamId: t.id })),
    });

    const round = await prisma.competitionRound.create({
      data: { competitionSeasonId: cs.id, name: 'Detail Round 1', ordinal: 1, matchCount: 10 },
    });

    // 선수 (홈/원정 각 3명 = 6명)
    const players = await Promise.all(
      [
        [PLAYER_HOME_1, 'Home Keeper'],
        [PLAYER_HOME_2, 'Home Defender'],
        [PLAYER_HOME_11, 'Home Forward'],
        [PLAYER_AWAY_1, 'Away Keeper'],
        [PLAYER_AWAY_2, 'Away Defender'],
        [PLAYER_AWAY_11, 'Away Forward'],
      ].map(([apiId, name]) =>
        prisma.player.create({ data: { apiPlayerId: apiId as number, name: name as string } }),
      ),
    );
    const [pHome1, pHome2, pHome11, pAway1, pAway2, pAway11] = players;

    // 감독
    const coachHome = await prisma.coach.create({
      data: { apiCoachId: COACH_HOME_API, name: 'H. Coach' },
    });
    const coachAway = await prisma.coach.create({
      data: { apiCoachId: COACH_AWAY_API, name: 'A. Coach' },
    });

    const oldKickoff = new Date('2099-01-15T15:00:00Z');
    const mk = async (
      apiFx: number,
      overrides: {
        hasLineups?: boolean | null;
        hasEvents?: boolean | null;
        hasTeamStats?: boolean | null;
        hasPlayerStats?: boolean | null;
      },
    ) => {
      const m = await prisma.match.create({
        data: {
          apiFixtureId: apiFx,
          competitionSeasonId: cs.id,
          roundId: round.id,
          kickoffAt: oldKickoff,
          statusShort: 'FT',
          statusLong: 'Match Finished',
          elapsed: 90,
          venueId: venue.id,
          referee: 'R. Test',
          homeTeamId: homeTeam.id,
          awayTeamId: awayTeam.id,
          goalsHome: 2,
          goalsAway: 1,
          htHome: 1,
          htAway: 0,
          ftHome: 2,
          ftAway: 1,
          winnerTeamId: homeTeam.id,
          detailEligible: true,
          hasLineups: overrides.hasLineups ?? null,
          hasEvents: overrides.hasEvents ?? null,
          hasTeamStats: overrides.hasTeamStats ?? null,
          hasPlayerStats: overrides.hasPlayerStats ?? null,
          detailCheckedAt: overrides.hasLineups !== null ? new Date() : null,
        },
      });
      matchIdByFx.set(apiFx, m.id);
      return m;
    };

    const matchA = await mk(FX_A, { hasLineups: true, hasEvents: true, hasTeamStats: true, hasPlayerStats: true });
    const matchB = await mk(FX_B, { hasLineups: true, hasEvents: true, hasTeamStats: false, hasPlayerStats: true });
    await mk(FX_C, { hasLineups: null, hasEvents: null, hasTeamStats: null, hasPlayerStats: null });
    const matchD = await mk(FX_D, { hasLineups: true, hasEvents: true, hasTeamStats: true, hasPlayerStats: true });
    const matchE = await mk(FX_E, { hasLineups: true, hasEvents: true, hasTeamStats: true, hasPlayerStats: true });

    // ── MATCH_A · MATCH_B · MATCH_D · MATCH_E: 라인업·이벤트 시드 ──────────

    // 라인업 (홈+원정 = 2행) — MATCH_A · B · D · E 는 다 채운다
    const seedLineup = async (matchId: number) => {
      await prisma.matchLineup.create({
        data: { matchId, teamId: homeTeam.id, formation: '4-3-3', coachId: coachHome.id },
      });
      await prisma.matchLineup.create({
        data: { matchId, teamId: awayTeam.id, formation: '4-4-2', coachId: coachAway.id },
      });
      // LineupEntry — 각 팀 2 선발 + 1 벤치 (unique(matchId, playerId) 이므로 선수 id 겹치면 안 됨)
      await prisma.lineupEntry.createMany({
        data: [
          // 홈 선발 (jerseyNumber 1, 11 — asc 확인용으로 11 을 먼저 시드, 응답은 1 → 11 순이어야)
          { matchId, teamId: homeTeam.id, playerId: pHome11.id, jerseyNumber: 11, position: 'F', grid: '4:2', isStarter: true },
          { matchId, teamId: homeTeam.id, playerId: pHome1.id, jerseyNumber: 1, position: 'G', grid: '1:1', isStarter: true },
          // 홈 벤치
          { matchId, teamId: homeTeam.id, playerId: pHome2.id, jerseyNumber: 5, position: 'D', grid: null, isStarter: false },
          // 원정 선발
          { matchId, teamId: awayTeam.id, playerId: pAway11.id, jerseyNumber: 9, position: 'F', grid: '4:3', isStarter: true },
          { matchId, teamId: awayTeam.id, playerId: pAway1.id, jerseyNumber: 12, position: 'G', grid: '1:1', isStarter: true },
          // 원정 벤치
          { matchId, teamId: awayTeam.id, playerId: pAway2.id, jerseyNumber: 3, position: 'D', grid: null, isStarter: false },
        ],
      });
    };

    // MatchEvent — 3~5개. MATCH_D 는 역순으로 시드해도 응답은 asc 여야 (orderBy: {seq:'asc'})
    const seedEventsForwardOrder = async (matchId: number) => {
      // seq 0, 1, 2 순서대로 시드
      await prisma.matchEvent.createMany({
        data: [
          { matchId, seq: 0, minute: 12, minuteExtra: null, teamId: homeTeam.id, playerId: pHome11.id, assistPlayerId: pHome2.id, type: 'Goal', detail: 'Normal Goal', comments: null },
          { matchId, seq: 1, minute: 47, minuteExtra: 3, teamId: awayTeam.id, playerId: pAway11.id, assistPlayerId: null, type: 'Card', detail: 'Yellow Card', comments: null },
          { matchId, seq: 2, minute: 78, minuteExtra: null, teamId: homeTeam.id, playerId: null, assistPlayerId: null, type: 'Var', detail: 'Goal Disallowed', comments: null },
        ],
      });
    };
    const seedEventsReverseOrder = async (matchId: number) => {
      // 역순 (2, 1, 0) 으로 시드해도 응답은 asc — orderBy: {seq:'asc'} 확인
      // (unique(matchId, seq) 라 역순 삽입에도 실제 저장 순서 무관)
      await prisma.matchEvent.createMany({
        data: [
          { matchId, seq: 2, minute: 90, minuteExtra: null, teamId: awayTeam.id, playerId: pAway2.id, assistPlayerId: null, type: 'Card', detail: 'Red Card', comments: null },
          { matchId, seq: 1, minute: 55, minuteExtra: null, teamId: homeTeam.id, playerId: pHome1.id, assistPlayerId: null, type: 'subst', detail: 'Substitution 1', comments: null },
          { matchId, seq: 0, minute: 25, minuteExtra: null, teamId: homeTeam.id, playerId: pHome11.id, assistPlayerId: pHome2.id, type: 'Goal', detail: 'Normal Goal', comments: null },
        ],
      });
    };

    // TeamMatchStat — 홈·원정
    const seedTeamStatsHomeAway = async (matchId: number, xgHome: Prisma.Decimal | null = new Prisma.Decimal('1.87')) => {
      await prisma.teamMatchStat.create({
        data: {
          matchId, teamId: homeTeam.id,
          shotsOnGoal: 5, shotsOffGoal: 3, totalShots: 12, blockedShots: 2, shotsInsidebox: 8, shotsOutsidebox: 4,
          fouls: 11, cornerKicks: 6, offsides: 3, ballPossession: 58,
          yellowCards: 2, redCards: 0, goalkeeperSaves: 4,
          totalPasses: 512, passesAccurate: 458, passesPercentage: 89,
          expectedGoals: xgHome, goalsPrevented: xgHome === null ? null : new Prisma.Decimal('0.42'),
        },
      });
      await prisma.teamMatchStat.create({
        data: {
          matchId, teamId: awayTeam.id,
          shotsOnGoal: 3, shotsOffGoal: 5, totalShots: 10, blockedShots: 2, shotsInsidebox: 5, shotsOutsidebox: 5,
          fouls: 14, cornerKicks: 4, offsides: 2, ballPossession: 42,
          yellowCards: 3, redCards: 0, goalkeeperSaves: 3,
          totalPasses: 400, passesAccurate: 330, passesPercentage: 83,
          expectedGoals: new Prisma.Decimal('0.95'), goalsPrevented: new Prisma.Decimal('-0.20'),
        },
      });
    };

    // PlayerMatchStat — 각 팀 3명씩 (rating 유·무 반례)
    const seedPlayerStats = async (matchId: number, ratingHome11: Prisma.Decimal | null = new Prisma.Decimal('8.40')) => {
      await prisma.playerMatchStat.createMany({
        data: [
          // 홈 3명
          { matchId, playerId: pHome1.id, teamId: homeTeam.id, competitionSeasonId: cs.id, minutes: 90, jerseyNumber: 1, position: 'G', rating: new Prisma.Decimal('7.10'), isCaptain: false, isSubstitute: false, saves: 4, passesTotal: 30, passesKey: 0, passesAccuracy: 90 },
          { matchId, playerId: pHome2.id, teamId: homeTeam.id, competitionSeasonId: cs.id, minutes: 90, jerseyNumber: 5, position: 'D', rating: new Prisma.Decimal('7.30'), isCaptain: true, isSubstitute: false, passesTotal: 60, passesKey: 1, passesAccuracy: 88, tacklesTotal: 3, blocks: 1, interceptions: 2 },
          { matchId, playerId: pHome11.id, teamId: homeTeam.id, competitionSeasonId: cs.id, minutes: 90, jerseyNumber: 11, position: 'F', rating: ratingHome11, isCaptain: false, isSubstitute: false, shotsTotal: 4, shotsOn: 3, goalsTotal: 1, assists: 1, passesTotal: 42, passesKey: 3, passesAccuracy: 88, dribblesAttempts: 4, dribblesSuccess: 3 },
          // 원정 3명
          { matchId, playerId: pAway1.id, teamId: awayTeam.id, competitionSeasonId: cs.id, minutes: 90, jerseyNumber: 12, position: 'G', rating: new Prisma.Decimal('6.90'), isCaptain: false, isSubstitute: false, saves: 3, goalsConceded: 2, passesTotal: 20, passesKey: 0, passesAccuracy: 85 },
          { matchId, playerId: pAway2.id, teamId: awayTeam.id, competitionSeasonId: cs.id, minutes: 90, jerseyNumber: 3, position: 'D', rating: new Prisma.Decimal('6.50'), isCaptain: true, isSubstitute: false, passesTotal: 45, passesKey: 0, passesAccuracy: 82 },
          { matchId, playerId: pAway11.id, teamId: awayTeam.id, competitionSeasonId: cs.id, minutes: 90, jerseyNumber: 9, position: 'F', rating: new Prisma.Decimal('7.00'), isCaptain: false, isSubstitute: false, shotsTotal: 3, shotsOn: 2, goalsTotal: 1, passesTotal: 25, passesKey: 2, passesAccuracy: 80 },
        ],
      });
    };

    // MATCH_A: 4갈래 다 채움 (완전 처리)
    await seedLineup(matchA.id);
    await seedEventsForwardOrder(matchA.id);
    await seedTeamStatsHomeAway(matchA.id);
    await seedPlayerStats(matchA.id);

    // MATCH_B: teamStats 만 없음 — has_teamStats=false 이지만 실제 team_match_stats 행 0
    await seedLineup(matchB.id);
    await seedEventsForwardOrder(matchB.id);
    // teamStats 시드하지 않음
    await seedPlayerStats(matchB.id);

    // MATCH_C: 아무것도 시드하지 않음 (has_* 다 null)

    // MATCH_D: 정상 처리 · 이벤트는 역순으로 시드 → 응답은 asc
    await seedLineup(matchD.id);
    await seedEventsReverseOrder(matchD.id);
    await seedTeamStatsHomeAway(matchD.id);
    await seedPlayerStats(matchD.id);

    // MATCH_E: xG 홈 null · rating 홈 11번 null → Decimal null 유지 확인
    await seedLineup(matchE.id);
    await seedEventsForwardOrder(matchE.id);
    await seedTeamStatsHomeAway(matchE.id, null); // 홈 xG null · goalsPrevented null
    await seedPlayerStats(matchE.id, null); // pHome11 rating null
  }, 60_000);

  afterAll(async () => {
    if (skipIfRemote()) return;
    try {
      await cleanup();
    } catch (cause) {
      console.warn('[match-detail e2e] 정리 실패:', cause);
    }
    await app?.close();
  });

  /**
   * 시드 제거 — 자식 → 부모 순. FK 는 없지만 CI 고아 행 검사(check-details)와
   * Restrict 에뮬레이션이 이 순서를 요구. seasons 는 공유라 안 지운다.
   */
  async function cleanup(): Promise<void> {
    if (!prisma) return;
    // 이 스펙 대역의 매치 id
    const matches = await prisma.match.findMany({
      where: { apiFixtureId: { in: [FX_A, FX_B, FX_C, FX_D, FX_E] } },
      select: { id: true },
    });
    const matchIds = matches.map((m) => m.id);
    if (matchIds.length > 0) {
      await prisma.playerMatchStat.deleteMany({ where: { matchId: { in: matchIds } } });
      await prisma.teamMatchStat.deleteMany({ where: { matchId: { in: matchIds } } });
      await prisma.matchEvent.deleteMany({ where: { matchId: { in: matchIds } } });
      await prisma.lineupEntry.deleteMany({ where: { matchId: { in: matchIds } } });
      await prisma.matchLineup.deleteMany({ where: { matchId: { in: matchIds } } });
      await prisma.match.deleteMany({ where: { id: { in: matchIds } } });
    }
    // 대회시즌·라운드·참가
    const comps = await prisma.competition.findMany({
      where: { apiCompetitionId: COMP_API_ID },
      select: { id: true },
    });
    const compIds = comps.map((c) => c.id);
    const csRows = await prisma.competitionSeason.findMany({
      where: { competitionId: { in: compIds } },
      select: { id: true },
    });
    const csIds = csRows.map((c) => c.id);
    if (csIds.length > 0) {
      await prisma.competitionRound.deleteMany({ where: { competitionSeasonId: { in: csIds } } });
      await prisma.competitionEntry.deleteMany({ where: { competitionSeasonId: { in: csIds } } });
      await prisma.backfillJob.deleteMany({ where: { competitionSeasonId: { in: csIds } } });
      await prisma.competitionSeason.deleteMany({ where: { id: { in: csIds } } });
    }
    if (compIds.length > 0) await prisma.competition.deleteMany({ where: { id: { in: compIds } } });
    await prisma.team.deleteMany({ where: { apiTeamId: { in: [TEAM_HOME_API, TEAM_AWAY_API] } } });
    await prisma.venue.deleteMany({ where: { apiVenueId: VENUE_API_ID } });
    await prisma.player.deleteMany({
      where: {
        apiPlayerId: {
          in: [PLAYER_HOME_1, PLAYER_HOME_2, PLAYER_HOME_11, PLAYER_AWAY_1, PLAYER_AWAY_2, PLAYER_AWAY_11],
        },
      },
    });
    await prisma.coach.deleteMany({ where: { apiCoachId: { in: [COACH_HOME_API, COACH_AWAY_API] } } });
  }

  const get = (path: string) => request(app.getHttpServer()).get(path);

  // ================================================================================================
  it('1. MATCH_A — 4갈래 모두 ok · lineups(startXI/bench) · events seq asc · teamStats · playerStats', async () => {
    if (skipIfRemote()) return;
    const res = await get(`/api/matches/${FX_A}/detail`).expect(200);
    const body = res.body as {
      id: number;
      availability: { lineups: string; events: string; teamStats: string; playerStats: string };
      lineups: Array<{ teamRef: string; startXI: Array<{ number: number | null; playerRef: string }>; bench: Array<{ playerRef: string }>; formation: string | null; coach: { name: string } | null }>;
      events: Array<{ seq: number; teamRef: string; type: string }>;
      teamStats: Array<{ teamRef: string; expectedGoals: number | null }>;
      playerStats: Array<{ playerRef: string; rating: number | null }>;
      asOf: string;
    };

    expect(body.id).toBe(FX_A);
    expect(body.availability).toEqual({ lineups: 'ok', events: 'ok', teamStats: 'ok', playerStats: 'ok' });
    // lineups 2개 (홈·원정 순)
    expect(body.lineups).toHaveLength(2);
    expect(body.lineups[0].teamRef).toBe(`${TEAM_HOME_API}-home-united`);
    expect(body.lineups[0].coach).toEqual({ name: 'H. Coach' });
    expect(body.lineups[0].formation).toBe('4-3-3');
    // startXI 는 jerseyNumber asc — 시드는 11 을 먼저 넣었지만 응답은 1 → 11
    expect(body.lineups[0].startXI.map((e) => e.number)).toEqual([1, 11]);
    expect(body.lineups[0].startXI[0].playerRef).toBe(`${PLAYER_HOME_1}-home-keeper`);
    expect(body.lineups[0].startXI[1].playerRef).toBe(`${PLAYER_HOME_11}-home-forward`);
    // bench 는 1명 (홈)
    expect(body.lineups[0].bench).toHaveLength(1);
    expect(body.lineups[0].bench[0].playerRef).toBe(`${PLAYER_HOME_2}-home-defender`);
    // 원정 라인업
    expect(body.lineups[1].teamRef).toBe(`${TEAM_AWAY_API}-away-city`);
    expect(body.lineups[1].startXI.map((e) => e.number)).toEqual([9, 12]);
    // events seq asc
    expect(body.events.map((e) => e.seq)).toEqual([0, 1, 2]);
    // teamStats 2 개
    expect(body.teamStats).toHaveLength(2);
    expect(body.teamStats[0].teamRef).toBe(`${TEAM_HOME_API}-home-united`);
    expect(body.teamStats[0].expectedGoals).toBe(1.87);
    // playerStats 6 명
    expect(body.playerStats).toHaveLength(6);
    // asOf 는 ISO 8601 문자열
    expect(new Date(body.asOf).toString()).not.toBe('Invalid Date');
  });

  // ================================================================================================
  it('2. MATCH_B — availability.teamStats=not_provided · teamStats 배열 빈 · 다른 3갈래 ok', async () => {
    if (skipIfRemote()) return;
    const res = await get(`/api/matches/${FX_B}/detail`).expect(200);
    const body = res.body as {
      availability: { lineups: string; events: string; teamStats: string; playerStats: string };
      teamStats: unknown[];
      lineups: unknown[];
      events: unknown[];
      playerStats: unknown[];
    };
    expect(body.availability).toEqual({ lineups: 'ok', events: 'ok', teamStats: 'not_provided', playerStats: 'ok' });
    expect(body.teamStats).toHaveLength(0);
    expect(body.lineups.length).toBeGreaterThan(0);
    expect(body.events.length).toBeGreaterThan(0);
    expect(body.playerStats.length).toBeGreaterThan(0);
  });

  // ================================================================================================
  it('3. MATCH_C — 4갈래 모두 not_collected · 4갈래 배열 다 빈', async () => {
    if (skipIfRemote()) return;
    const res = await get(`/api/matches/${FX_C}/detail`).expect(200);
    const body = res.body as {
      availability: { lineups: string; events: string; teamStats: string; playerStats: string };
      lineups: unknown[];
      events: unknown[];
      teamStats: unknown[];
      playerStats: unknown[];
    };
    expect(body.availability).toEqual({
      lineups: 'not_collected',
      events: 'not_collected',
      teamStats: 'not_collected',
      playerStats: 'not_collected',
    });
    expect(body.lineups).toHaveLength(0);
    expect(body.events).toHaveLength(0);
    expect(body.teamStats).toHaveLength(0);
    expect(body.playerStats).toHaveLength(0);
  });

  // ================================================================================================
  it('4. MATCH_D — events 는 seq asc 로 정렬 (역순 시드 반례)', async () => {
    if (skipIfRemote()) return;
    const res = await get(`/api/matches/${FX_D}/detail`).expect(200);
    const body = res.body as { events: Array<{ seq: number; minute: number; type: string }> };
    // 역순으로 시드했지만 응답은 asc
    expect(body.events.map((e) => e.seq)).toEqual([0, 1, 2]);
    // 각 이벤트의 minute 도 seq 순 (25, 55, 90)
    expect(body.events.map((e) => e.minute)).toEqual([25, 55, 90]);
    expect(body.events.map((e) => e.type)).toEqual(['Goal', 'subst', 'Card']);
  });

  // ================================================================================================
  it('5. MATCH_E — teamStats[0].expectedGoals === null (0 아님) · playerStats 안 rating null 유지', async () => {
    if (skipIfRemote()) return;
    const res = await get(`/api/matches/${FX_E}/detail`).expect(200);
    const body = res.body as {
      teamStats: Array<{ teamRef: string; expectedGoals: number | null; goalsPrevented: number | null }>;
      playerStats: Array<{ playerRef: string; rating: number | null }>;
    };
    // 홈 팀 xG 는 null 유지 (0 이 아니다 — D6)
    const homeStat = body.teamStats.find((t) => t.teamRef === `${TEAM_HOME_API}-home-united`);
    expect(homeStat).toBeDefined();
    expect(homeStat?.expectedGoals).toBeNull();
    expect(homeStat?.goalsPrevented).toBeNull();
    // 원정 팀 xG 는 값 유지
    const awayStat = body.teamStats.find((t) => t.teamRef === `${TEAM_AWAY_API}-away-city`);
    expect(awayStat?.expectedGoals).toBe(0.95);
    expect(awayStat?.goalsPrevented).toBe(-0.2);

    // pHome11 rating null 유지 (0 이 아니다 — schema.prisma 주석)
    const home11 = body.playerStats.find((p) => p.playerRef === `${PLAYER_HOME_11}-home-forward`);
    expect(home11).toBeDefined();
    expect(home11?.rating).toBeNull();
    // 다른 홈 선수는 rating 유지
    const home1 = body.playerStats.find((p) => p.playerRef === `${PLAYER_HOME_1}-home-keeper`);
    expect(home1?.rating).toBe(7.1);
  });

  // ================================================================================================
  it('6. 없는 경기 → 404', async () => {
    if (skipIfRemote()) return;
    await get('/api/matches/997699/detail').expect(404);
  });

  // ================================================================================================
  it('7. 잘못된 ref → 400', async () => {
    if (skipIfRemote()) return;
    await get('/api/matches/abc/detail').expect(400);
  });

  // ================================================================================================
  it('8. asOf 는 유효한 ISO 8601 (4갈래 채워진 MATCH_A · 4갈래 빈 MATCH_C 모두)', async () => {
    if (skipIfRemote()) return;
    const a = (await get(`/api/matches/${FX_A}/detail`).expect(200)).body as { asOf: string };
    expect(new Date(a.asOf).toString()).not.toBe('Invalid Date');
    // MATCH_C 도 asOf 는 유효 (전부 빈 케이스도 기준 시각을 준다 — earliestOf 규약)
    const c = (await get(`/api/matches/${FX_C}/detail`).expect(200)).body as { asOf: string };
    expect(new Date(c.asOf).toString()).not.toBe('Invalid Date');
  });

  // 사용되지 않는 변수 경고 억제 — competitionSeasonId · homeTeamId · awayTeamId · matchIdByFx 는 시드 조립·정리에 쓰인다
  void competitionSeasonId;
  void homeTeamId;
  void awayTeamId;
  void matchIdByFx;
});
