/**
 * id 없는 선수 회귀 — 운영 실측 원문 fixture 1635690 (2026 UCL League Stage - 2 · Man City vs PSG)
 *
 * 원문 `test/fixtures/fixture-ids-1635690.json` (/fixtures?ids= 봉투, response[0] 에 lineups·events·statistics·players).
 * 같은 선수(PSG 벤치 Adam Mouak #80)가 lineups 에서는 `player.id = null`, /fixtures/players 에서는 `player.id = 0` 으로 온다.
 * players.api_player_id 가 NOT NULL·UNIQUE 라 0 을 쓰면 서로 다른 무명 선수가 한 행으로 합쳐진다 — 그래서
 * knownApiPlayerId 로 걸러 저장하지 않는다. 이 파일은 DB 에 실제로 쓸 때만 드러나는 것을 본다:
 *   1. lineups — id 없는 엔트리 1건 skip · 45행 · players 에 api_player_id 0 행이 생기지 않는다
 *   2. player-stats — id 0 선수 1명 skip · 45행
 *   3. events — id 0 인 player 는 player_id NULL 로 저장, players 행을 만들지 않는다
 *   4·5. 같은 선수의 id 가 나중에 채워지면 행이 생기고, 다시 id 없이 와도 그 행을 지우지 않는다 (upsert 만 — 현재 동작 고정)
 *   6. 고아 행 없음 · 외부 호출 0회
 *
 * 이 파일은 도메인 테이블에 가짜 행을 쓴다 — 로컬 DB 나 CI 에서만 돈다.
 * 밴드: 997_3xx (l3=997_1xx · l5=997_2xx · backfill-details=997_4xx · match-detail=997_6xx~8xx 밖)
 *   대회 997_301 (isTracked:false) · 팀 997_310(MCI)/997_311(PSG) · 감독 997_320/997_321 · 경기장 997_330
 *   경기 apiFixtureId 997_350 · "나중에 채워진" 선수 id 997_399
 *
 * 팀·감독 id 는 원문(50·85 · 12629·193)을 메모리에서 위 대역으로 바꿔 넣는다 — 실데이터가 있는 로컬 DB 에서
 * 정리가 실팀을 지우지 않게. 선수 id 는 l3·l5 e2e 관례대로 원문 그대로 둔다.
 *
 * ## 끝나면 반드시 치운다 — l0.e2e 가 대회시즌·팀·참가를 전역으로 센다 (09-07 CI).
 * Restrict 때문에 자식부터 지운다 (SCHEMA_DESIGN 2-5). seasons 는 지우지 않는다.
 */
import 'dotenv/config';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { Test } from '@nestjs/testing';
import type { INestApplicationContext } from '@nestjs/common';
import { PrismaService } from '../src/prisma/prisma.service.js';
import { IntegrityService } from '../src/prisma/integrity.service.js';
import { ApiFootballClient } from '../src/ingestion/api-football/api-football.client.js';
import { knownApiPlayerId } from '../src/ingestion/api-football/api-player-id.js';
import { L3LineupsService } from '../src/ingestion/l3/lineups.service.js';
import { L3EventsService } from '../src/ingestion/l3/events.service.js';
import { L5PlayerStatsService } from '../src/ingestion/l5/player-stats.service.js';
import {
  CompetitionFormat,
  CompetitionType,
  StatsState,
} from '../src/generated/prisma/client.js';
import type {
  ApiEnvelope,
  ApiFixtureEventItem,
  ApiFixtureLineupItem,
  ApiFixturePlayersItem,
} from '../src/ingestion/api-football/api-football.types.js';

/** 카탈로그·다른 e2e 와 겹치지 않는 대역 — 997_3xx */
const COMP_API_ID = 997_301;
const SEASON_YEAR = 2026;
const TEAM_MCI = 997_310;  // 원문 50 Manchester City
const TEAM_PSG = 997_311;  // 원문 85 Paris Saint Germain
const COACH_MCI = 997_320; // 원문 Man City 감독
const COACH_PSG = 997_321; // 원문 PSG 감독
const VENUE_API_ID = 997_330;
const APIFX = 997_350;
/** Adam Mouak 의 id 가 나중에 채워졌다고 가정할 때 쓰는 id */
const LATE_PLAYER_ID = 997_399;

/** 원문 apiTeamId → 대역 */
const TEAM_REMAP = new Map<number, number>([[50, TEAM_MCI], [85, TEAM_PSG]]);
/** 원문 apiTeamId → 그 팀 감독 대역 */
const COACH_REMAP = new Map<number, number>([[50, COACH_MCI], [85, COACH_PSG]]);

const remap = (table: Map<number, number>, apiTeamId: number): number => {
  const v = table.get(apiTeamId);
  if (v === undefined) throw new Error(`픽스처에 예상 밖 팀 id ${apiTeamId} — 대역 치환표에 없다`);
  return v;
};

const FIXTURE_PATH = resolve(__dirname, 'fixtures', 'fixture-ids-1635690.json');

interface FixtureDetail {
  lineups: ApiFixtureLineupItem[];
  events: ApiFixtureEventItem[];
  players: ApiFixturePlayersItem[];
}

/**
 * 원문을 새로 parse 하고 팀·감독 id 를 대역으로 바꾼다. 매 case 가 새로 부른다 (case 간 변형 누수 방지).
 * 선수 id 는 원문 그대로.
 */
const loadFixture = (): FixtureDetail => {
  const raw = readFileSync(FIXTURE_PATH, 'utf8');
  const item = (JSON.parse(raw) as { response: FixtureDetail[] }).response[0];
  return {
    lineups: item.lineups.map((it) => ({
      ...it,
      team: { ...it.team, id: remap(TEAM_REMAP, it.team.id) },
      coach: { ...it.coach, id: remap(COACH_REMAP, it.team.id) },
    })),
    events: item.events.map((e) => ({
      ...e,
      team: { ...e.team, id: e.team.id === null ? null : remap(TEAM_REMAP, e.team.id) },
    })),
    players: item.players.map((it) => ({
      ...it,
      team: { ...it.team, id: remap(TEAM_REMAP, it.team.id) },
    })),
  };
};

/** 이 파일은 persist 만 부른다 — 어떤 get 이든 오면 실패. 마지막에 호출 0회를 확인한다 */
class ThrowingApiFootballClient {
  calls: string[] = [];

  get callCount(): number {
    return this.calls.length;
  }

  async get<T>(path: string, query: Record<string, string | number> = {}): Promise<ApiEnvelope<T>> {
    this.calls.push(`${path}?${new URLSearchParams(Object.entries(query).map(([k, v]) => [k, String(v)])).toString()}`);
    throw new Error(`no-id-players e2e 는 외부 호출을 하지 않는다 — ${path}`);
  }
}

describe('id 없는 선수 회귀 (e2e, 실측 fixture 1635690)', () => {
  let app: INestApplicationContext;
  let prisma: PrismaService;
  let lineupsSvc: L3LineupsService;
  let eventsSvc: L3EventsService;
  let playerStatsSvc: L5PlayerStatsService;
  let fake: ThrowingApiFootballClient;
  let competitionSeasonId: number;
  let matchId: number;
  const teamIdByApi = new Map<number, number>();
  /** 시작 전 api_player_id = 0 행 수 — 이후 변화량만 본다 */
  let zeroBefore: number;

  const zeroRows = () => prisma.player.count({ where: { apiPlayerId: 0 } });

  beforeAll(async () => {
    const host = new URL(process.env.DATABASE_URL ?? 'postgresql://x/').hostname;
    const local = ['localhost', '127.0.0.1', '::1'].includes(host);
    if (!local && !process.env.CI && process.env.E2E_ALLOW_REMOTE_DB !== '1') {
      throw new Error(`no-id-players e2e 는 픽스처를 쓰므로 원격 DB(${host})에서는 돌리지 않는다 — 로컬 Postgres 를 쓰거나 E2E_ALLOW_REMOTE_DB=1`);
    }
    const { AppModule } = await import('../src/app.module.js');
    fake = new ThrowingApiFootballClient();
    const mod = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(ApiFootballClient)
      .useValue(fake)
      .compile();
    app = await mod.init();
    prisma = app.get(PrismaService);
    lineupsSvc = app.get(L3LineupsService);
    eventsSvc = app.get(L3EventsService);
    playerStatsSvc = app.get(L5PlayerStatsService);

    zeroBefore = await zeroRows();

    // 시즌·대회·대회시즌 — 수집 범위 밖 (isTracked:false · isCurrent:false)
    await prisma.season.upsert({ where: { year: SEASON_YEAR }, create: { year: SEASON_YEAR }, update: {} });
    const season = await prisma.season.findUniqueOrThrow({ where: { year: SEASON_YEAR } });
    const comp = await prisma.competition.upsert({
      where: { apiCompetitionId: COMP_API_ID },
      create: {
        apiCompetitionId: COMP_API_ID, name: 'No-Id Players Fixture Cup', country: 'Testland',
        type: CompetitionType.LEAGUE, format: CompetitionFormat.ROUND_ROBIN, isTracked: false,
      },
      update: { isTracked: false },
    });
    const cs = await prisma.competitionSeason.upsert({
      where: { competitionId_seasonId: { competitionId: comp.id, seasonId: season.id } },
      create: { competitionId: comp.id, seasonId: season.id, apiSeasonValue: SEASON_YEAR, isCurrent: false },
      update: { isCurrent: false },
    });
    competitionSeasonId = cs.id;

    // 팀 — 대역 id
    for (const [apiTeamId, name] of [[TEAM_MCI, 'Fixture Man City'], [TEAM_PSG, 'Fixture PSG']] as const) {
      const team = await prisma.team.upsert({
        where: { apiTeamId },
        create: { apiTeamId, name, country: 'Testland' },
        update: {},
      });
      teamIdByApi.set(apiTeamId, team.id);
    }

    const round = await prisma.competitionRound.upsert({
      where: { competitionSeasonId_name: { competitionSeasonId: cs.id, name: 'League Stage - 2' } },
      create: { competitionSeasonId: cs.id, name: 'League Stage - 2', ordinal: 0, hasTopFlight: true, isLateStage: false },
      update: {},
    });

    const venue = await prisma.venue.upsert({
      where: { apiVenueId: VENUE_API_ID },
      create: { apiVenueId: VENUE_API_ID, name: 'No-Id Fixture Arena', city: 'Testville' },
      update: {},
    });

    const m = await prisma.match.upsert({
      where: { apiFixtureId: APIFX },
      create: {
        apiFixtureId: APIFX,
        competitionSeasonId: cs.id,
        roundId: round.id,
        kickoffAt: new Date('2026-10-14T19:00:00Z'),
        statusShort: 'FT',
        statusLong: 'Match Finished',
        venueId: venue.id,
        homeTeamId: teamIdByApi.get(TEAM_MCI) as number,
        awayTeamId: teamIdByApi.get(TEAM_PSG) as number,
        detailEligible: true,
      },
      update: {
        detailEligible: true,
        hasLineups: null, hasEvents: null, hasTeamStats: null, hasPlayerStats: null,
        statsState: StatsState.NONE, detailCheckedAt: null, confirmedAt: null,
      },
    });
    matchId = m.id;

    // 앞선 실행이 정리에 실패했어도 이 경기의 상세 행은 비우고 시작한다 (카운트 어설션이 이 경기로 좁혀져 있다)
    await prisma.playerMatchStat.deleteMany({ where: { matchId } });
    await prisma.lineupEntry.deleteMany({ where: { matchId } });
    await prisma.matchLineup.deleteMany({ where: { matchId } });
    await prisma.matchEvent.deleteMany({ where: { matchId } });
    await prisma.teamMatchStat.deleteMany({ where: { matchId } });
  }, 180_000);

  afterAll(async () => {
    if (prisma) {
      try {
        await cleanupFixture();
      } catch (cause) {
        console.warn('[no-id-players e2e] 픽스처 정리 실패 — 다음 e2e 가 영향을 받을 수 있다:', cause);
      }
    }
    await app?.close();
  }, 60_000);

  /**
   * 자식부터 지운다. relationMode="prisma" 의 Restrict 는 자식이 남으면 부모 삭제를 막는다.
   *   player_match_stats → lineup_entries → match_lineups → match_events → team_match_stats → matches
   *   → competition_rounds → competition_seasons → competitions → venues → teams → coaches → players
   * Player 는 픽스처 lineups·events(player·assist)·players 의 id 를 knownApiPlayerId 로 거른 집합 + 997_399.
   */
  const cleanupFixture = async () => {
    if (matchId) {
      await prisma.playerMatchStat.deleteMany({ where: { matchId } });
      await prisma.lineupEntry.deleteMany({ where: { matchId } });
      await prisma.matchLineup.deleteMany({ where: { matchId } });
      await prisma.matchEvent.deleteMany({ where: { matchId } });
      await prisma.teamMatchStat.deleteMany({ where: { matchId } });
      await prisma.match.deleteMany({ where: { id: matchId } });
    }
    if (competitionSeasonId) {
      await prisma.competitionRound.deleteMany({ where: { competitionSeasonId } });
      await prisma.competitionEntry.deleteMany({ where: { competitionSeasonId } });
      await prisma.ingestionRun.deleteMany({ where: { competitionSeasonId } });
      await prisma.competitionSeason.deleteMany({ where: { id: competitionSeasonId } });
    }
    await prisma.competition.deleteMany({ where: { apiCompetitionId: COMP_API_ID } });
    await prisma.venue.deleteMany({ where: { apiVenueId: VENUE_API_ID } });
    await prisma.team.deleteMany({ where: { apiTeamId: { in: [TEAM_MCI, TEAM_PSG] } } });
    await prisma.coach.deleteMany({ where: { apiCoachId: { in: [COACH_MCI, COACH_PSG] } } });

    const fx = loadFixture();
    const playerIds = new Set<number>([LATE_PLAYER_ID]);
    const add = (id: number | null) => {
      const k = knownApiPlayerId(id);
      if (k !== null) playerIds.add(k);
    };
    for (const it of fx.lineups) for (const e of [...it.startXI, ...it.substitutes]) add(e.player.id);
    for (const e of fx.events) {
      add(e.player.id);
      add(e.assist.id);
    }
    for (const it of fx.players) for (const p of it.players) add(p.player.id);
    await prisma.player.deleteMany({ where: { apiPlayerId: { in: [...playerIds] } } });
  };

  it('1. lineups — id 없는 엔트리 1건 skip · 엔트리 45 · api_player_id 0 행 안 생김', async () => {
    const fx = loadFixture();
    const all = fx.lineups.flatMap((it) => [...it.startXI, ...it.substitutes]);
    const known = all.filter((e) => knownApiPlayerId(e.player.id) !== null);
    expect(all).toHaveLength(46);
    expect(known).toHaveLength(45);

    const res = await lineupsSvc.persist(matchId, APIFX, fx.lineups, { promote: false });
    expect(res).toEqual({ ok: true, hasLineups: true, lineups: 2, entries: 45, skippedNoId: 1, promoted: false });
    expect(res.entries).toBe(known.length);
    expect(res.skippedNoId).toBe(all.length - known.length);

    const psgTeamId = teamIdByApi.get(TEAM_PSG) as number;
    expect(await prisma.matchLineup.count({ where: { matchId } })).toBe(2);
    expect(await prisma.lineupEntry.count({ where: { matchId } })).toBe(45);
    expect(await prisma.lineupEntry.count({ where: { matchId, isStarter: true } })).toBe(22);
    expect(await prisma.lineupEntry.count({ where: { matchId, isStarter: false } })).toBe(23);
    expect(await prisma.lineupEntry.count({ where: { matchId, teamId: psgTeamId } })).toBe(22);
    // Adam Mouak (#80) 는 저장되지 않는다
    expect(await prisma.lineupEntry.count({ where: { matchId, teamId: psgTeamId, jerseyNumber: 80 } })).toBe(0);

    const entries = await prisma.lineupEntry.findMany({
      where: { matchId },
      select: { player: { select: { apiPlayerId: true } } },
    });
    expect(entries).toHaveLength(45);
    expect(entries.every((e) => e.player.apiPlayerId > 0)).toBe(true);

    // matches 갱신은 has_lineups 만 (promote:false — 승격 안 함)
    const m = await prisma.match.findUniqueOrThrow({
      where: { id: matchId },
      select: { hasLineups: true, hasEvents: true, hasTeamStats: true, hasPlayerStats: true, statsState: true, detailCheckedAt: true },
    });
    expect(m.hasLineups).toBe(true);
    expect(m.hasEvents).toBeNull();
    expect(m.hasTeamStats).toBeNull();
    expect(m.hasPlayerStats).toBeNull();
    expect(m.statsState).toBe(StatsState.NONE);
    expect(m.detailCheckedAt).toBeNull();

    expect(await zeroRows()).toBe(zeroBefore);
  }, 60_000);

  it('2. player-stats — id 0 선수 1명 skip · 45행 · api_player_id 0 행 안 생김', async () => {
    const fx = loadFixture();
    const all = fx.players.flatMap((it) => it.players);
    const known = all.filter((p) => knownApiPlayerId(p.player.id) !== null);
    expect(all).toHaveLength(46);
    expect(known).toHaveLength(45);
    expect(all.filter((p) => p.player.id === 0)).toHaveLength(1);

    const res = await playerStatsSvc.persist(matchId, APIFX, fx.players, { promote: false });
    expect(res).toEqual({
      ok: true,
      hasPlayerStats: true,
      players: 45,
      missingTeams: [],
      promoted: false,
      skippedNoId: 1,
    });
    expect(res.players).toBe(known.length);
    expect(res.skippedNoId).toBe(all.length - known.length);

    expect(await prisma.playerMatchStat.count({ where: { matchId } })).toBe(45);
    expect(await prisma.playerMatchStat.count({ where: { matchId, teamId: teamIdByApi.get(TEAM_PSG) as number } })).toBe(22);
    const stats = await prisma.playerMatchStat.findMany({
      where: { matchId },
      select: { player: { select: { apiPlayerId: true } } },
    });
    expect(stats).toHaveLength(45);
    expect(stats.every((s) => s.player.apiPlayerId > 0)).toBe(true);

    const m = await prisma.match.findUniqueOrThrow({ where: { id: matchId }, select: { hasPlayerStats: true } });
    expect(m.hasPlayerStats).toBe(true);

    expect(await zeroRows()).toBe(zeroBefore);
  }, 60_000);

  it('3. events — id 0 인 player 는 player_id NULL · players 행을 만들지 않는다', async () => {
    const fx = loadFixture();
    expect(fx.events).toHaveLength(18);

    const res = await eventsSvc.persist(matchId, APIFX, fx.events, { promote: false });
    expect(res).toEqual({ ok: true, hasEvents: true, events: 18, dropped: 0, promoted: false });
    expect(await prisma.matchEvent.count({ where: { matchId } })).toBe(18);
    const base = await prisma.matchEvent.count({ where: { matchId, playerId: null } });

    // 첫 이벤트의 player 를 id 0 으로 바꿔 다시 저장 (events 는 delete + insert 라 행 수는 그대로)
    const fx2 = loadFixture();
    fx2.events[0] = { ...fx2.events[0], player: { id: 0, name: 'Zero Id Test' } };
    const res2 = await eventsSvc.persist(matchId, APIFX, fx2.events, { promote: false });
    expect(res2).toEqual({ ok: true, hasEvents: true, events: 18, dropped: 0, promoted: false });

    expect(await prisma.matchEvent.count({ where: { matchId } })).toBe(18);
    expect(await prisma.matchEvent.count({ where: { matchId, playerId: null } })).toBe(base + 1);
    expect(await prisma.player.count({ where: { name: 'Zero Id Test' } })).toBe(0);
    expect(await zeroRows()).toBe(zeroBefore);
  }, 60_000);

  it('4. lineups 재저장 — id 가 나중에 채워지면 엔트리가 생기고, 다시 id 없이 와도 지우지 않는다 (현재 동작 고정)', async () => {
    // Adam Mouak 의 id 를 997_399 로 채운 원문
    const fx = loadFixture();
    let patched = 0;
    for (const it of fx.lineups) {
      for (const e of [...it.startXI, ...it.substitutes]) {
        if (knownApiPlayerId(e.player.id) === null) {
          expect(e.player.name).toBe('Adam Mouak');
          e.player.id = LATE_PLAYER_ID;
          patched++;
        }
      }
    }
    expect(patched).toBe(1);

    const res = await lineupsSvc.persist(matchId, APIFX, fx.lineups, { promote: false });
    expect(res.ok).toBe(true);
    expect(res.entries).toBe(46);
    expect(res.skippedNoId).toBe(0);
    expect(await prisma.lineupEntry.count({ where: { matchId } })).toBe(46);

    const late = await prisma.player.findUniqueOrThrow({ where: { apiPlayerId: LATE_PLAYER_ID } });
    expect(late.name).toBe('Adam Mouak');
    const lateEntry = await prisma.lineupEntry.findUniqueOrThrow({
      where: { matchId_playerId: { matchId, playerId: late.id } },
      select: { teamId: true, jerseyNumber: true, isStarter: true },
    });
    expect(lateEntry).toEqual({ teamId: teamIdByApi.get(TEAM_PSG), jerseyNumber: 80, isStarter: false });

    // 다시 원문(null) — upsert 만 하므로 997_399 엔트리는 남는다
    const res2 = await lineupsSvc.persist(matchId, APIFX, loadFixture().lineups, { promote: false });
    expect(res2.ok).toBe(true);
    expect(res2.entries).toBe(45);
    expect(res2.skippedNoId).toBe(1);
    expect(await prisma.lineupEntry.count({ where: { matchId } })).toBe(46);

    expect(await zeroRows()).toBe(zeroBefore);
  }, 60_000);

  it('5. player-stats 재저장 — id 가 나중에 채워지면 행이 생기고, 다시 id 0 으로 와도 지우지 않는다 (현재 동작 고정)', async () => {
    const fx = loadFixture();
    let patched = 0;
    for (const it of fx.players) {
      for (const p of it.players) {
        if (knownApiPlayerId(p.player.id) === null) {
          expect(p.player.name).toBe('Adam Mouak');
          p.player.id = LATE_PLAYER_ID;
          patched++;
        }
      }
    }
    expect(patched).toBe(1);

    const res = await playerStatsSvc.persist(matchId, APIFX, fx.players, { promote: false });
    expect(res.ok).toBe(true);
    expect(res.players).toBe(46);
    expect(res.skippedNoId).toBe(0);
    expect(await prisma.playerMatchStat.count({ where: { matchId } })).toBe(46);

    const late = await prisma.player.findUniqueOrThrow({ where: { apiPlayerId: LATE_PLAYER_ID } });
    expect(late.name).toBe('Adam Mouak');
    expect(await prisma.playerMatchStat.count({ where: { matchId, playerId: late.id } })).toBe(1);

    // 다시 원문(id 0) — upsert 만 하므로 997_399 행은 남는다
    const res2 = await playerStatsSvc.persist(matchId, APIFX, loadFixture().players, { promote: false });
    expect(res2.ok).toBe(true);
    expect(res2.players).toBe(45);
    expect(res2.skippedNoId).toBe(1);
    expect(await prisma.playerMatchStat.count({ where: { matchId } })).toBe(46);

    expect(await zeroRows()).toBe(zeroBefore);
  }, 60_000);

  it('6. 고아 행 없음 · 외부 호출 0회', async () => {
    expect(await app.get(IntegrityService).findOrphans()).toEqual([]);
    expect(fake.callCount).toBe(0);
    expect(fake.calls).toEqual([]);
  }, 60_000);
});
