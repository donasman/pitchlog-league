/**
 * L5 팀 통계 · 선수 통계 — 쓰기 불변식 (BACKEND_FEATURES L5, INGESTION_STRATEGY 상세 4콜)
 *
 * 실제 픽스처 3개(1451160·1557387·1622630)를 로드해 서비스에 넘긴다.
 * 여기서는 DB 에 실제로 쓸 때만 드러나는 것을 본다:
 *   - team-stats: TeamMatchStat 2행 + hasTeamStats=true
 *   - Red Cards null → 0 (D6) · Ball Possession "56%" → 56 (Int)
 *   - expected_goals Decimal 유지 · null 픽스처(1622630)는 null 유지
 *   - player-stats: 선수 다수 저장 + Player 최소 upsert (D9)
 *   - rating null 유지 (미출장·5분 이하) · passes.accuracy 문자열→Int
 *   - penalty.commited → penalty_committed 재매핑 (D6)
 *   - 빈 응답 → hasTeamStats=false · hasPlayerStats=false. 승격 안 됨
 *   - 네 has_* 다 non-NULL 이면 promoteIfAllDetailsChecked 가 CONFIRMED 로 올린다
 *   - detail_eligible=false 는 서비스 진입에서 skip
 *
 * 이 파일은 도메인 테이블에 가짜 행을 쓴다 — 로컬 DB 나 CI 에서만 돈다.
 * 밴드: 997_2xx (l3 e2e 는 997_1xx, l0·l1·l2·l6 밖).
 *
 * ## 끝나면 반드시 치운다 — l0.e2e 가 대회시즌·팀·참가를 전역으로 센다.
 * Restrict 때문에 자식부터 지운다.
 */
import 'dotenv/config';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { Test } from '@nestjs/testing';
import type { INestApplicationContext } from '@nestjs/common';
import { PrismaService } from '../src/prisma/prisma.service.js';
import { ApiFootballClient } from '../src/ingestion/api-football/api-football.client.js';
import { L5TeamStatsService } from '../src/ingestion/l5/team-stats.service.js';
import { L5PlayerStatsService } from '../src/ingestion/l5/player-stats.service.js';
import {
  CompetitionFormat,
  CompetitionType,
  StatsState,
} from '../src/generated/prisma/client.js';
import type {
  ApiEnvelope,
  ApiFixturePlayersItem,
  ApiFixtureStatisticsItem,
} from '../src/ingestion/api-football/api-football.types.js';

/** 카탈로그·다른 e2e 와 겹치지 않는 대역. l3 는 997_1xx, l5 는 997_2xx */
const COMP_API_ID = 997_201;
const SEASON_YEAR = 2026;

/** 실 픽스처 원문의 team.id 를 apiTeamId 로 그대로 upsert 한다 */
const TEAM_LIV = 40;   // Liverpool  (1451160 home)
const TEAM_QAR = 556;  // Qarabag    (1451160 away)
const TEAM_ARS = 42;   // Arsenal    (1557387 home)
const TEAM_CHE = 49;   // Chelsea    (1557387 away)
const TEAM_LYO = 80;   // Lyon       (1622630 home)
const TEAM_FEN = 611;  // Fenerbahçe (1622630 away)
const TEAMS_ALL = [TEAM_LIV, TEAM_QAR, TEAM_ARS, TEAM_CHE, TEAM_LYO, TEAM_FEN];

const APIFX_A = 1_451_160;
const APIFX_B = 1_557_387;
const APIFX_C = 1_622_630;

const VENUE_API_ID = 997_230;

/** 픽스처 원문의 파일 경로 */
const FIXTURE_DIR = resolve(__dirname, 'fixtures', 'api-football');
const loadStatistics = (fx: number): ApiFixtureStatisticsItem[] => {
  const raw = readFileSync(resolve(FIXTURE_DIR, `statistics_${fx}.json`), 'utf8');
  return (JSON.parse(raw) as { response: ApiFixtureStatisticsItem[] }).response;
};
const loadPlayers = (fx: number): ApiFixturePlayersItem[] => {
  const raw = readFileSync(resolve(FIXTURE_DIR, `players_${fx}.json`), 'utf8');
  return (JSON.parse(raw) as { response: ApiFixturePlayersItem[] }).response;
};

class FakeApiFootballClient {
  calls: string[] = [];
  statistics = new Map<number, ApiFixtureStatisticsItem[]>();
  players = new Map<number, ApiFixturePlayersItem[]>();

  get callCount(): number {
    return this.calls.length;
  }

  async get<T>(path: string, query: Record<string, string | number> = {}): Promise<ApiEnvelope<T>> {
    const fixture = Number(query.fixture);
    this.calls.push(`${path}?fixture=${fixture}`);
    let response: unknown;
    if (path === '/fixtures/statistics') response = this.statistics.get(fixture) ?? loadStatistics(fixture);
    else if (path === '/fixtures/players') response = this.players.get(fixture) ?? loadPlayers(fixture);
    else throw new Error(`가짜 클라이언트가 모르는 경로: ${path}`);
    const n = Array.isArray(response) ? response.length : 1;
    return { get: path, parameters: {}, errors: [], results: n, paging: { current: 1, total: 1 }, response: response as T };
  }
}

describe('L5 팀 통계·선수 통계 (e2e, 픽스처 기반)', () => {
  let app: INestApplicationContext;
  let prisma: PrismaService;
  let teamStatsSvc: L5TeamStatsService;
  let playerStatsSvc: L5PlayerStatsService;
  let fake: FakeApiFootballClient;
  let competitionSeasonId: number;
  const teamIdByApi = new Map<number, number>();
  const matchIdByFx = new Map<number, number>();
  let matchIneligibleId: number;

  beforeAll(async () => {
    const host = new URL(process.env.DATABASE_URL ?? 'postgresql://x/').hostname;
    const local = ['localhost', '127.0.0.1', '::1'].includes(host);
    if (!local && !process.env.CI && process.env.E2E_ALLOW_REMOTE_DB !== '1') {
      throw new Error(`l5 e2e 는 픽스처를 쓰므로 원격 DB(${host})에서는 돌리지 않는다 — 로컬 Postgres 를 쓰거나 E2E_ALLOW_REMOTE_DB=1`);
    }
    const { AppModule } = await import('../src/app.module.js');
    fake = new FakeApiFootballClient();
    const mod = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(ApiFootballClient)
      .useValue(fake)
      .compile();
    app = await mod.init();
    prisma = app.get(PrismaService);
    teamStatsSvc = app.get(L5TeamStatsService);
    playerStatsSvc = app.get(L5PlayerStatsService);

    // 시즌·대회·대회시즌
    await prisma.season.upsert({ where: { year: SEASON_YEAR }, create: { year: SEASON_YEAR }, update: {} });
    const season = await prisma.season.findUniqueOrThrow({ where: { year: SEASON_YEAR } });
    const comp = await prisma.competition.upsert({
      where: { apiCompetitionId: COMP_API_ID },
      create: {
        apiCompetitionId: COMP_API_ID, name: 'L5 Fixture League', country: 'Testland',
        type: CompetitionType.LEAGUE, format: CompetitionFormat.ROUND_ROBIN, isTracked: true, displayOrder: 98,
      },
      update: { isTracked: true, displayOrder: 98 },
    });
    const cs = await prisma.competitionSeason.upsert({
      where: { competitionId_seasonId: { competitionId: comp.id, seasonId: season.id } },
      create: { competitionId: comp.id, seasonId: season.id, apiSeasonValue: SEASON_YEAR, isCurrent: true },
      update: { isCurrent: true },
    });
    competitionSeasonId = cs.id;

    // 팀
    for (const apiTeamId of TEAMS_ALL) {
      const team = await prisma.team.upsert({
        where: { apiTeamId },
        create: { apiTeamId, name: `Team ${apiTeamId}`, country: 'Testland' },
        update: {},
      });
      teamIdByApi.set(apiTeamId, team.id);
    }

    const round = await prisma.competitionRound.upsert({
      where: { competitionSeasonId_name: { competitionSeasonId: cs.id, name: 'L5 Round 1' } },
      create: { competitionSeasonId: cs.id, name: 'L5 Round 1', ordinal: 0, hasTopFlight: true, isLateStage: false },
      update: {},
    });

    const venue = await prisma.venue.upsert({
      where: { apiVenueId: VENUE_API_ID },
      create: { apiVenueId: VENUE_API_ID, name: 'L5 Fixture Arena', city: 'Testville' },
      update: {},
    });

    const mkMatch = async (apiFx: number, home: number, away: number, eligible = true): Promise<number> => {
      const m = await prisma.match.upsert({
        where: { apiFixtureId: apiFx },
        create: {
          apiFixtureId: apiFx,
          competitionSeasonId: cs.id,
          roundId: round.id,
          kickoffAt: new Date(1_770_000_000_000 + apiFx * 1_000),
          statusShort: 'FT',
          statusLong: 'Match Finished',
          venueId: venue.id,
          homeTeamId: teamIdByApi.get(home) as number,
          awayTeamId: teamIdByApi.get(away) as number,
          detailEligible: eligible,
        },
        update: { detailEligible: eligible },
      });
      return m.id;
    };
    matchIdByFx.set(APIFX_A, await mkMatch(APIFX_A, TEAM_LIV, TEAM_QAR));
    matchIdByFx.set(APIFX_B, await mkMatch(APIFX_B, TEAM_ARS, TEAM_CHE));
    matchIdByFx.set(APIFX_C, await mkMatch(APIFX_C, TEAM_LYO, TEAM_FEN));
    matchIneligibleId = await mkMatch(997_298, TEAM_LIV, TEAM_ARS, false);
  }, 180_000);

  afterAll(async () => {
    if (prisma) {
      try {
        await cleanupFixture();
      } catch (cause) {
        console.warn('[l5 e2e] 픽스처 정리 실패 — 다음 e2e 가 영향을 받을 수 있다:', cause);
      }
    }
    await app?.close();
  });

  /**
   * 자식부터 지운다. player_match_stats → team_match_stats → match → 나머지 → team → venue → player.
   * Player 는 이 테스트에서 upsert 한 것만 지운다 — 픽스처의 player.id 목록.
   */
  const cleanupFixture = async () => {
    const matchIds = [...matchIdByFx.values(), matchIneligibleId];
    if (matchIds.length > 0) {
      await prisma.playerMatchStat.deleteMany({ where: { matchId: { in: matchIds } } });
      await prisma.teamMatchStat.deleteMany({ where: { matchId: { in: matchIds } } });
      await prisma.match.deleteMany({ where: { id: { in: matchIds } } });
    }
    if (competitionSeasonId) {
      await prisma.competitionRound.deleteMany({ where: { competitionSeasonId } });
      await prisma.competitionEntry.deleteMany({ where: { competitionSeasonId } });
      await prisma.ingestionRun.deleteMany({ where: { competitionSeasonId } });
      await prisma.competitionSeason.deleteMany({ where: { id: competitionSeasonId } });
    }
    await prisma.competition.deleteMany({ where: { apiCompetitionId: COMP_API_ID } });
    await prisma.venue.deleteMany({ where: { apiVenueId: VENUE_API_ID } });
    const teamIds = [...teamIdByApi.values()];
    if (teamIds.length > 0) await prisma.team.deleteMany({ where: { id: { in: teamIds } } });
    // Player 는 이 3개 픽스처의 players[].player.id 를 모아 지운다
    const playerIds = new Set<number>();
    for (const fx of [APIFX_A, APIFX_B, APIFX_C]) {
      for (const it of loadPlayers(fx)) {
        for (const p of it.players) playerIds.add(p.player.id);
      }
    }
    if (playerIds.size > 0) {
      await prisma.player.deleteMany({ where: { apiPlayerId: { in: [...playerIds] } } });
    }
  };

  it('1. team-stats — TeamMatchStat 2행 · hasTeamStats=true · Ball Possession Int · Red Cards→0', async () => {
    const matchId = matchIdByFx.get(APIFX_A) as number;
    const res = await teamStatsSvc.run(matchId, APIFX_A);
    expect(res.ok).toBe(true);
    expect(res.hasTeamStats).toBe(true);
    expect(res.teams).toBe(2);

    const stats = await prisma.teamMatchStat.findMany({
      where: { matchId },
      orderBy: { teamId: 'asc' },
    });
    expect(stats).toHaveLength(2);

    // 팀별로 확인
    const liv = stats.find((s) => s.teamId === teamIdByApi.get(TEAM_LIV));
    const qar = stats.find((s) => s.teamId === teamIdByApi.get(TEAM_QAR));
    expect(liv).toBeDefined();
    expect(qar).toBeDefined();

    // Ball Possession "56%" · "44%" → 56 · 44 (Int)
    expect(liv!.ballPossession).toBe(56);
    expect(qar!.ballPossession).toBe(44);

    // Red Cards null → 0 (D6)
    expect(liv!.redCards).toBe(0);
    expect(qar!.redCards).toBe(0);

    // Passes % "89%" → 89
    expect(liv!.passesPercentage).toBe(89);
    expect(qar!.passesPercentage).toBe(83);

    // Int 컬럼
    expect(liv!.shotsOnGoal).toBe(12);
    expect(liv!.totalShots).toBe(38);
    expect(liv!.totalPasses).toBe(503);

    // expected_goals · goals_prevented Decimal 유지 (문자열 "5.91"·"-1.67")
    expect(liv!.expectedGoals?.toString()).toBe('5.91');
    expect(liv!.goalsPrevented?.toString()).toBe('-1.67');

    // matches 갱신은 has_team_stats 만. 다른 has_* 는 NULL 유지 · statsState=NONE
    const m = await prisma.match.findUniqueOrThrow({
      where: { id: matchId },
      select: { hasLineups: true, hasEvents: true, hasTeamStats: true, hasPlayerStats: true, statsState: true, detailCheckedAt: true, dataVersion: true },
    });
    expect(m.hasTeamStats).toBe(true);
    expect(m.hasLineups).toBeNull();
    expect(m.hasEvents).toBeNull();
    expect(m.hasPlayerStats).toBeNull();
    expect(m.statsState).toBe(StatsState.NONE);
    expect(m.detailCheckedAt).toBeNull();
    expect(m.dataVersion).toBe(0); // 안 건드림 (D18)
  }, 60_000);

  it('2. team-stats — expected_goals null 픽스처(1622630) 는 null 유지', async () => {
    const matchId = matchIdByFx.get(APIFX_C) as number;
    const res = await teamStatsSvc.run(matchId, APIFX_C);
    expect(res.ok).toBe(true);
    expect(res.hasTeamStats).toBe(true);

    const stats = await prisma.teamMatchStat.findMany({ where: { matchId } });
    expect(stats).toHaveLength(2);
    // 예선 픽스처 — expected_goals · goals_prevented 둘 다 null 유지
    expect(stats.every((s) => s.expectedGoals === null)).toBe(true);
    expect(stats.every((s) => s.goalsPrevented === null)).toBe(true);
  }, 60_000);

  it('3. player-stats — 선수 저장 · Player 최소 upsert · hasPlayerStats=true', async () => {
    const matchId = matchIdByFx.get(APIFX_A) as number;
    const res = await playerStatsSvc.run(matchId, APIFX_A);
    expect(res.ok).toBe(true);
    expect(res.hasPlayerStats).toBe(true);
    expect(res.players).toBeGreaterThan(0);

    // Player 최소 upsert — 픽스처의 첫 선수(Alisson id=280) 가 있는지
    const alisson = await prisma.player.findUnique({ where: { apiPlayerId: 280 } });
    expect(alisson).not.toBeNull();
    expect(alisson!.name).toBe('Alisson');
    expect(alisson!.photoUrl).toBe('https://media.api-sports.io/football/players/280.png');

    // matches 갱신은 has_player_stats 만
    const m = await prisma.match.findUniqueOrThrow({
      where: { id: matchId },
      select: { hasPlayerStats: true, hasLineups: true, hasEvents: true, statsState: true, dataVersion: true },
    });
    expect(m.hasPlayerStats).toBe(true);
    expect(m.hasLineups).toBeNull();
    expect(m.hasEvents).toBeNull();
    expect(m.statsState).toBe(StatsState.NONE);
    expect(m.dataVersion).toBe(0);
  }, 60_000);

  it('4. player-stats — rating null 유지 (미출장·5분 이하) · passes_accuracy 문자열 → Int', async () => {
    const matchId = matchIdByFx.get(APIFX_A) as number;

    // Alisson (id=280) — rating "6.9" · passes.accuracy "15"
    const alisson = await prisma.player.findUniqueOrThrow({ where: { apiPlayerId: 280 } });
    const alissonStat = await prisma.playerMatchStat.findUniqueOrThrow({
      where: { matchId_playerId: { matchId, playerId: alisson.id } },
    });
    expect(alissonStat.rating?.toString()).toBe('6.9');
    expect(alissonStat.passesAccuracy).toBe(15);
    expect(alissonStat.minutes).toBe(90);

    // Frimpong (id=152654) — 4분 뛰고 rating null (D6: null 유지)
    const frim = await prisma.player.findUniqueOrThrow({ where: { apiPlayerId: 152654 } });
    const frimStat = await prisma.playerMatchStat.findUniqueOrThrow({
      where: { matchId_playerId: { matchId, playerId: frim.id } },
    });
    expect(frimStat.rating).toBeNull();
    expect(frimStat.passesAccuracy).toBe(2); // "2" 문자열 → 2
    expect(frimStat.minutes).toBe(4);
  }, 60_000);

  it('5. player-stats — penalty.commited(API 오타) → penalty_committed 재매핑 (D6)', async () => {
    const matchId = matchIdByFx.get(APIFX_A) as number;

    // 픽스처 응답을 조작 — 특정 선수의 penalty.commited 를 3 으로
    const items = loadPlayers(APIFX_A).map((it) => ({
      ...it,
      players: it.players.map((p, idx) => {
        if (idx !== 0) return p;
        const stat = p.statistics[0];
        return {
          ...p,
          statistics: [
            {
              ...stat,
              penalty: {
                won: 1,
                commited: 3, // API 오타 — 여기 3 이 penalty_committed 로 가야 한다
                scored: 2,
                missed: 1,
                saved: null,
              },
            },
          ],
        };
      }),
    }));
    fake.players.set(APIFX_A, items);

    // 재실행
    const res = await playerStatsSvc.run(matchId, APIFX_A);
    expect(res.ok).toBe(true);

    const alisson = await prisma.player.findUniqueOrThrow({ where: { apiPlayerId: 280 } });
    const stat = await prisma.playerMatchStat.findUniqueOrThrow({
      where: { matchId_playerId: { matchId, playerId: alisson.id } },
    });
    expect(stat.penaltyWon).toBe(1);
    expect(stat.penaltyCommitted).toBe(3); // commited → committed
    expect(stat.penaltyScored).toBe(2);
    expect(stat.penaltyMissed).toBe(1);
    expect(stat.penaltySaved).toBe(0); // null → 0

    fake.players.delete(APIFX_A);
  }, 60_000);

  it('6. team-stats — 빈 응답 → hasTeamStats=false · 승격 안 됨 (다른 has_* NULL 유지)', async () => {
    const matchId = matchIdByFx.get(APIFX_B) as number;
    // 이 매치 상세 상태 리셋
    await prisma.match.update({
      where: { id: matchId },
      data: { hasLineups: null, hasEvents: null, hasTeamStats: null, hasPlayerStats: null, statsState: StatsState.NONE, detailCheckedAt: null, confirmedAt: null },
    });

    fake.statistics.set(APIFX_B, []);
    const res = await teamStatsSvc.run(matchId, APIFX_B);
    expect(res.ok).toBe(true);
    expect(res.hasTeamStats).toBe(false);
    expect(res.teams).toBe(0);
    expect(res.promoted).toBe(false);

    const m = await prisma.match.findUniqueOrThrow({
      where: { id: matchId },
      select: { hasTeamStats: true, hasLineups: true, hasEvents: true, hasPlayerStats: true, statsState: true, detailCheckedAt: true, confirmedAt: true },
    });
    expect(m.hasTeamStats).toBe(false);
    expect(m.hasLineups).toBeNull();
    expect(m.hasEvents).toBeNull();
    expect(m.hasPlayerStats).toBeNull();
    expect(m.statsState).toBe(StatsState.NONE);
    expect(m.detailCheckedAt).toBeNull();
    expect(m.confirmedAt).toBeNull();

    fake.statistics.delete(APIFX_B);
  }, 60_000);

  it('7. player-stats — 빈 응답 → hasPlayerStats=false · 승격 안 됨', async () => {
    const matchId = matchIdByFx.get(APIFX_B) as number;
    await prisma.match.update({
      where: { id: matchId },
      data: { hasLineups: null, hasEvents: null, hasTeamStats: null, hasPlayerStats: null, statsState: StatsState.NONE, detailCheckedAt: null, confirmedAt: null },
    });

    fake.players.set(APIFX_B, []);
    const res = await playerStatsSvc.run(matchId, APIFX_B);
    expect(res.ok).toBe(true);
    expect(res.hasPlayerStats).toBe(false);
    expect(res.players).toBe(0);
    expect(res.promoted).toBe(false);

    const m = await prisma.match.findUniqueOrThrow({
      where: { id: matchId },
      select: { hasPlayerStats: true, statsState: true, detailCheckedAt: true },
    });
    expect(m.hasPlayerStats).toBe(false);
    expect(m.statsState).toBe(StatsState.NONE);
    expect(m.detailCheckedAt).toBeNull();

    fake.players.delete(APIFX_B);
  }, 60_000);

  it('8. 네 has_* 다 non-NULL 이면 승격 (CONFIRMED · detail_checked_at · confirmed_at 세팅)', async () => {
    const matchId = matchIdByFx.get(APIFX_C) as number;
    // 다른 세 has_* 를 수동으로 true 세팅 · statsState 리셋
    await prisma.match.update({
      where: { id: matchId },
      data: { hasLineups: true, hasEvents: true, hasPlayerStats: true, hasTeamStats: null, statsState: StatsState.NONE, detailCheckedAt: null, confirmedAt: null },
    });

    // team-stats 서비스가 마지막 has_* 를 채우면 승격 헬퍼가 CONFIRMED 로 올려야 한다
    const res = await teamStatsSvc.run(matchId, APIFX_C);
    expect(res.ok).toBe(true);
    expect(res.hasTeamStats).toBe(true);
    expect(res.promoted).toBe(true);

    const m = await prisma.match.findUniqueOrThrow({
      where: { id: matchId },
      select: { statsState: true, detailCheckedAt: true, confirmedAt: true },
    });
    expect(m.statsState).toBe(StatsState.CONFIRMED);
    expect(m.detailCheckedAt).not.toBeNull();
    expect(m.confirmedAt).not.toBeNull();
  }, 60_000);

  it('9. detail_eligible=false 는 서비스 진입에서 skip · matches 안 건드림', async () => {
    const before = await prisma.match.findUniqueOrThrow({
      where: { id: matchIneligibleId },
      select: { hasTeamStats: true, hasPlayerStats: true, statsState: true, detailCheckedAt: true },
    });

    const rt = await teamStatsSvc.run(matchIneligibleId, 997_298);
    expect(rt.ok).toBe(false);
    expect(rt.reason).toBe('not-eligible');

    const rp = await playerStatsSvc.run(matchIneligibleId, 997_298);
    expect(rp.ok).toBe(false);
    expect(rp.reason).toBe('not-eligible');

    const after = await prisma.match.findUniqueOrThrow({
      where: { id: matchIneligibleId },
      select: { hasTeamStats: true, hasPlayerStats: true, statsState: true, detailCheckedAt: true },
    });
    expect(after).toEqual(before);
  }, 60_000);

  it('10. apiFixtureId 불일치 → skip · matches 안 건드림', async () => {
    const matchId = matchIdByFx.get(APIFX_A) as number;
    const before = await prisma.match.findUniqueOrThrow({
      where: { id: matchId },
      select: { hasTeamStats: true, hasPlayerStats: true, statsState: true },
    });

    const rt = await teamStatsSvc.run(matchId, 999_999);
    expect(rt.ok).toBe(false);
    expect(rt.reason).toBe('fixture-id-mismatch');

    const rp = await playerStatsSvc.run(matchId, 999_999);
    expect(rp.ok).toBe(false);
    expect(rp.reason).toBe('fixture-id-mismatch');

    const after = await prisma.match.findUniqueOrThrow({
      where: { id: matchId },
      select: { hasTeamStats: true, hasPlayerStats: true, statsState: true },
    });
    expect(after).toEqual(before);
  }, 60_000);
});
