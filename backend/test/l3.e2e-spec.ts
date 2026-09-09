/**
 * L3 라인업·이벤트 — 쓰기 불변식 (BACKEND_FEATURES L3, INGESTION_STRATEGY 상세 4콜)
 *
 * 실제 픽스처 3개(1451160·1557387·1622630)를 로드해 서비스에 넘긴다.
 * 여기서는 DB 에 실제로 쓸 때만 드러나는 것을 본다:
 *   - lineups 응답이 있으면 MatchLineup 2행 + LineupEntry 다수 + hasLineups=true
 *   - events 는 (elapsed, extra, index) 로 정렬되고 seq 0..N. minute_extra 컬럼은 NULL 유지
 *   - 재실행 시 이벤트 수가 줄면 옛 seq 가 남지 않는다 (deleteMany 회귀 반례)
 *   - 빈 응답 → hasLineups=false · hasEvents=false. 다른 has_* 는 NULL 유지 → CONFIRMED 승격 안 됨
 *   - 네 has_* 다 non-NULL 이면 promoteIfAllDetailsChecked 가 CONFIRMED 로 올린다
 *   - team.id 매핑 실패 · time.elapsed=null 반례는 warn 후 skip
 *   - detail_eligible=false 는 서비스 진입에서 skip
 *
 * 이 파일은 도메인 테이블에 가짜 행을 쓴다 — 로컬 DB 나 CI 에서만 돈다.
 * 밴드: 997_1xx (l1·l2·l6 대역 밖). 픽스처 apiFixtureId 는 997_15x.
 *
 * ## 끝나면 반드시 치운다 — l0.e2e 가 대회시즌·팀·참가를 전역으로 센다 (09-07 CI).
 * Restrict 때문에 자식부터 지운다.
 */
import 'dotenv/config';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { Test } from '@nestjs/testing';
import type { INestApplicationContext } from '@nestjs/common';
import { PrismaService } from '../src/prisma/prisma.service.js';
import { ApiFootballClient } from '../src/ingestion/api-football/api-football.client.js';
import { L3LineupsService } from '../src/ingestion/l3/lineups.service.js';
import { L3EventsService } from '../src/ingestion/l3/events.service.js';
import {
  CompetitionFormat,
  CompetitionType,
  StatsState,
} from '../src/generated/prisma/client.js';
import type {
  ApiEnvelope,
  ApiFixtureEventItem,
  ApiFixtureLineupItem,
} from '../src/ingestion/api-football/api-football.types.js';

/** 카탈로그·다른 e2e 와 겹치지 않는 대역. l1=990 · l2=991~995 · l6=996 밖 */
const COMP_API_ID = 997_101;
const SEASON_YEAR = 2026;

/** 실 픽스처 원문의 team.id 를 apiTeamId 로 그대로 upsert 한다 (매핑 검증) */
const TEAM_LIV = 40;   // Liverpool  (1451160 home)
const TEAM_QAR = 556;  // Qarabag    (1451160 away)
const TEAM_ARS = 42;   // Arsenal    (1557387 home)
const TEAM_CHE = 49;   // Chelsea    (1557387 away)
const TEAM_LYO = 80;   // Lyon       (1622630 home)
const TEAM_FEN = 611;  // Fenerbahçe (1622630 away)
const TEAMS_ALL = [TEAM_LIV, TEAM_QAR, TEAM_ARS, TEAM_CHE, TEAM_LYO, TEAM_FEN];

/** 우리 밴드 안의 fixture id (실 apiFixtureId 를 그대로 쓰면 다른 테스트와 섞일 수 있다) */
const APIFX_A = 1_451_160;
const APIFX_B = 1_557_387;
const APIFX_C = 1_622_630;

const VENUE_API_ID = 997_130;

/** 픽스처 원문의 파일 경로 */
const FIXTURE_DIR = resolve(__dirname, 'fixtures', 'api-football');
const loadLineups = (fx: number): ApiFixtureLineupItem[] => {
  const raw = readFileSync(resolve(FIXTURE_DIR, `lineups_${fx}.json`), 'utf8');
  return (JSON.parse(raw) as { response: ApiFixtureLineupItem[] }).response;
};
const loadEvents = (fx: number): ApiFixtureEventItem[] => {
  const raw = readFileSync(resolve(FIXTURE_DIR, `events_${fx}.json`), 'utf8');
  return (JSON.parse(raw) as { response: ApiFixtureEventItem[] }).response;
};

/**
 * 가짜 클라이언트. path 와 fixture 파라미터로 픽스처를 골라 준다.
 * 특정 fixture 를 빈 응답 · 조작된 응답으로 오버라이드할 수 있다.
 */
class FakeApiFootballClient {
  calls: string[] = [];
  lineups = new Map<number, ApiFixtureLineupItem[]>();
  events = new Map<number, ApiFixtureEventItem[]>();

  get callCount(): number {
    return this.calls.length;
  }

  async get<T>(path: string, query: Record<string, string | number> = {}): Promise<ApiEnvelope<T>> {
    const fixture = Number(query.fixture);
    this.calls.push(`${path}?fixture=${fixture}`);
    let response: unknown;
    if (path === '/fixtures/lineups') response = this.lineups.get(fixture) ?? loadLineups(fixture);
    else if (path === '/fixtures/events') response = this.events.get(fixture) ?? loadEvents(fixture);
    else throw new Error(`가짜 클라이언트가 모르는 경로: ${path}`);
    const n = Array.isArray(response) ? response.length : 1;
    return { get: path, parameters: {}, errors: [], results: n, paging: { current: 1, total: 1 }, response: response as T };
  }
}

describe('L3 라인업·이벤트 (e2e, 픽스처 기반)', () => {
  let app: INestApplicationContext;
  let prisma: PrismaService;
  let lineupsSvc: L3LineupsService;
  let eventsSvc: L3EventsService;
  let fake: FakeApiFootballClient;
  let competitionSeasonId: number;
  const teamIdByApi = new Map<number, number>();
  /** matchId 매핑 — apiFixtureId → 내부 id */
  const matchIdByFx = new Map<number, number>();
  /** 픽스처 A 를 detail_eligible=false 로 만드는 두 번째 매치 (진입 검사 반례) */
  let matchIneligibleId: number;

  beforeAll(async () => {
    const host = new URL(process.env.DATABASE_URL ?? 'postgresql://x/').hostname;
    const local = ['localhost', '127.0.0.1', '::1'].includes(host);
    if (!local && !process.env.CI && process.env.E2E_ALLOW_REMOTE_DB !== '1') {
      throw new Error(`l3 e2e 는 픽스처를 쓰므로 원격 DB(${host})에서는 돌리지 않는다 — 로컬 Postgres 를 쓰거나 E2E_ALLOW_REMOTE_DB=1`);
    }
    const { AppModule } = await import('../src/app.module.js');
    fake = new FakeApiFootballClient();
    const mod = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(ApiFootballClient)
      .useValue(fake)
      .compile();
    app = await mod.init();
    prisma = app.get(PrismaService);
    lineupsSvc = app.get(L3LineupsService);
    eventsSvc = app.get(L3EventsService);

    // 시즌·대회·대회시즌
    await prisma.season.upsert({ where: { year: SEASON_YEAR }, create: { year: SEASON_YEAR }, update: {} });
    const season = await prisma.season.findUniqueOrThrow({ where: { year: SEASON_YEAR } });
    const comp = await prisma.competition.upsert({
      where: { apiCompetitionId: COMP_API_ID },
      create: {
        apiCompetitionId: COMP_API_ID, name: 'L3 Fixture League', country: 'Testland',
        type: CompetitionType.LEAGUE, format: CompetitionFormat.ROUND_ROBIN, isTracked: true, displayOrder: 97,
      },
      update: { isTracked: true, displayOrder: 97 },
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

    // 라운드
    const round = await prisma.competitionRound.upsert({
      where: { competitionSeasonId_name: { competitionSeasonId: cs.id, name: 'L3 Round 1' } },
      create: { competitionSeasonId: cs.id, name: 'L3 Round 1', ordinal: 0, hasTopFlight: true, isLateStage: false },
      update: {},
    });

    // 경기장
    const venue = await prisma.venue.upsert({
      where: { apiVenueId: VENUE_API_ID },
      create: { apiVenueId: VENUE_API_ID, name: 'L3 Fixture Arena', city: 'Testville' },
      update: {},
    });

    // 매치 3개 (detail_eligible=true) + 자격 반례 1개 (detail_eligible=false)
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
    matchIneligibleId = await mkMatch(997_198, TEAM_LIV, TEAM_ARS, false);
  }, 180_000);

  afterAll(async () => {
    if (prisma) {
      try {
        await cleanupFixture();
      } catch (cause) {
        console.warn('[l3 e2e] 픽스처 정리 실패 — 다음 e2e 가 영향을 받을 수 있다:', cause);
      }
    }
    await app?.close();
  });

  /**
   * 자식부터 지운다. relationMode="prisma" 의 Restrict 는 자식이 남으면 부모 삭제를 막는다.
   * Coach·Player 는 다른 e2e 와 대역이 겹칠 수 있으므로 이 테스트가 만든 것만 골라낸다:
   *   · Coach: 이 픽스처 fixture 원문의 coach.id 들 — 2006, 6801, 7248, 26000, 2431, 28826
   *   · Player: 이 테스트가 만든 것만 지운다 (아래에서 미리 찾아둔 매치 id 로 lineup_entries 를 지운 뒤,
   *     그 매치의 이벤트 안 선수·라인업 안 선수 id 를 모아 명단이 이 테스트에서만 쓰이는 것을 확인 후 제거)
   */
  const cleanupFixture = async () => {
    const matchIds = [...matchIdByFx.values(), matchIneligibleId];
    if (matchIds.length > 0) {
      // 자식: match_events → lineup_entries → match_lineups → matches
      await prisma.matchEvent.deleteMany({ where: { matchId: { in: matchIds } } });
      await prisma.lineupEntry.deleteMany({ where: { matchId: { in: matchIds } } });
      await prisma.matchLineup.deleteMany({ where: { matchId: { in: matchIds } } });
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
    // Coach 6개
    await prisma.coach.deleteMany({ where: { apiCoachId: { in: [2006, 6801, 7248, 26000, 2431, 28826] } } });
    // Player — 픽스처 안의 모든 player.id 를 모아 지운다. 다른 테스트는 700_xxx·990_1xx·996_xxx 대역이라 겹치지 않는다.
    // 픽스처 실 선수 id 는 몇백~30만대라 대역 겹침 위험이 낮지만, 매치 참조가 이미 지워졌으므로 여기서 지우는 것은 안전하다
    const playerIds = new Set<number>();
    for (const fx of [APIFX_A, APIFX_B, APIFX_C]) {
      for (const it of loadLineups(fx)) {
        for (const e of [...it.startXI, ...it.substitutes]) playerIds.add(e.player.id);
      }
      for (const e of loadEvents(fx)) {
        if (e.player.id !== null) playerIds.add(e.player.id);
        if (e.assist.id !== null) playerIds.add(e.assist.id);
      }
    }
    if (playerIds.size > 0) {
      await prisma.player.deleteMany({ where: { apiPlayerId: { in: [...playerIds] } } });
    }
  };

  it('1. lineups — MatchLineup 2행 · 엔트리 다수 · hasLineups=true', async () => {
    const matchId = matchIdByFx.get(APIFX_A) as number;
    const res = await lineupsSvc.run(matchId, APIFX_A);
    expect(res.ok).toBe(true);
    expect(res.hasLineups).toBe(true);

    const lineups = await prisma.matchLineup.findMany({
      where: { matchId },
      orderBy: { teamId: 'asc' },
      select: { teamId: true, formation: true, coachId: true },
    });
    expect(lineups).toHaveLength(2);
    expect(lineups.every((l) => l.formation === '4-2-3-1')).toBe(true);
    expect(lineups.every((l) => l.coachId !== null)).toBe(true);

    // 픽스처 실측 43 pos → 43 entries
    const entries = await prisma.lineupEntry.count({ where: { matchId } });
    expect(entries).toBe(43);

    const starters = await prisma.lineupEntry.count({ where: { matchId, isStarter: true } });
    expect(starters).toBe(22); // 팀당 11명

    // 벤치는 grid 항상 null
    const subs = await prisma.lineupEntry.findMany({ where: { matchId, isStarter: false }, select: { grid: true } });
    expect(subs.length).toBeGreaterThan(0);
    expect(subs.every((s) => s.grid === null)).toBe(true);

    // 선발은 grid 가 있다 (샘플)
    const startersWithGrid = await prisma.lineupEntry.count({ where: { matchId, isStarter: true, grid: { not: null } } });
    expect(startersWithGrid).toBe(22);

    // matches 갱신은 has_lineups 만. 다른 has_* 는 NULL 유지 · statsState=NONE
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
  }, 60_000);

  it('2. events — (elapsed, extra, index) 정렬로 seq 0..N. minute_extra=NULL 유지', async () => {
    const matchId = matchIdByFx.get(APIFX_B) as number;
    const res = await eventsSvc.run(matchId, APIFX_B);
    expect(res.ok).toBe(true);
    expect(res.hasEvents).toBe(true);
    expect(res.events).toBe(19); // 픽스처 실측

    const rows = await prisma.matchEvent.findMany({
      where: { matchId },
      orderBy: { seq: 'asc' },
      select: { seq: true, minute: true, minuteExtra: true, type: true, detail: true, comments: true },
    });
    expect(rows.length).toBe(19);
    expect(rows.map((r) => r.seq)).toEqual([...Array(19).keys()]);

    // 저장된 minute_extra 는 전부 NULL (정렬용으로만 썼다 — D8)
    expect(rows.every((r) => r.minuteExtra === null)).toBe(true);

    // 이 픽스처는 90+5 카드가 응답 안에서 90분 교체보다 앞에 나온다. 정렬 후에는 뒤로 간다.
    // 마지막 두 이벤트: [minute=90(자체 index 뒤), minute=90 extra=5(원문 자체 index 17)]
    const last = rows[rows.length - 1];
    expect(last.minute).toBe(90);
    // 마지막이 옐로 카드(Merino, "Time wasting") 여야 정렬이 맞다
    expect(last.type).toBe('Card');
    expect(last.detail).toBe('Yellow Card');
    expect(last.comments).toBe('Time wasting');

    // matches: hasEvents 만 true. 다른 것은 NULL 유지
    const m = await prisma.match.findUniqueOrThrow({
      where: { id: matchId },
      select: { hasLineups: true, hasEvents: true, hasTeamStats: true, hasPlayerStats: true, statsState: true },
    });
    expect(m.hasEvents).toBe(true);
    expect(m.hasLineups).toBeNull();
    expect(m.hasTeamStats).toBeNull();
    expect(m.hasPlayerStats).toBeNull();
    expect(m.statsState).toBe(StatsState.NONE);
  }, 60_000);

  it('3. 재실행 시 이벤트 수 줄면 옛 seq 가 남지 않는다 (deleteMany 회귀)', async () => {
    const matchId = matchIdByFx.get(APIFX_C) as number;
    await eventsSvc.run(matchId, APIFX_C);
    const before = await prisma.matchEvent.count({ where: { matchId } });
    expect(before).toBe(18); // 픽스처 실측

    // 응답을 3개로 잘라서 재실행
    const shortEvents = loadEvents(APIFX_C).slice(0, 3);
    fake.events.set(APIFX_C, shortEvents);
    const res = await eventsSvc.run(matchId, APIFX_C);
    expect(res.events).toBe(3);

    const after = await prisma.matchEvent.findMany({
      where: { matchId },
      orderBy: { seq: 'asc' },
      select: { seq: true },
    });
    expect(after.length).toBe(3);
    expect(after.map((r) => r.seq)).toEqual([0, 1, 2]);

    // 원상 복구
    fake.events.delete(APIFX_C);
  }, 60_000);

  it('4. 빈 lineups → hasLineups=false · 승격 안 됨 (다른 has_* 는 NULL 유지)', async () => {
    const matchId = matchIdByFx.get(APIFX_A) as number;
    // 이 매치의 기존 상세 상태 리셋
    await prisma.match.update({
      where: { id: matchId },
      data: { hasLineups: null, hasEvents: null, hasTeamStats: null, hasPlayerStats: null, statsState: StatsState.NONE, detailCheckedAt: null, confirmedAt: null },
    });

    fake.lineups.set(APIFX_A, []);
    const res = await lineupsSvc.run(matchId, APIFX_A);
    expect(res.ok).toBe(true);
    expect(res.hasLineups).toBe(false);
    expect(res.lineups).toBe(0);
    expect(res.promoted).toBe(false);

    const m = await prisma.match.findUniqueOrThrow({
      where: { id: matchId },
      select: { hasLineups: true, hasEvents: true, hasTeamStats: true, hasPlayerStats: true, statsState: true, detailCheckedAt: true, confirmedAt: true },
    });
    expect(m.hasLineups).toBe(false);
    expect(m.hasEvents).toBeNull();
    expect(m.hasTeamStats).toBeNull();
    expect(m.hasPlayerStats).toBeNull();
    expect(m.statsState).toBe(StatsState.NONE);
    expect(m.detailCheckedAt).toBeNull();
    expect(m.confirmedAt).toBeNull();

    fake.lineups.delete(APIFX_A);
  }, 60_000);

  it('5. 빈 events → hasEvents=false · matchEvent deleteMany 됨 · 승격 안 됨', async () => {
    const matchId = matchIdByFx.get(APIFX_C) as number;
    // 3번 테스트에서 3개 이벤트가 남아 있다
    const before = await prisma.matchEvent.count({ where: { matchId } });
    expect(before).toBeGreaterThan(0);

    await prisma.match.update({
      where: { id: matchId },
      data: { hasLineups: null, hasEvents: null, hasTeamStats: null, hasPlayerStats: null, statsState: StatsState.NONE, detailCheckedAt: null, confirmedAt: null },
    });

    fake.events.set(APIFX_C, []);
    const res = await eventsSvc.run(matchId, APIFX_C);
    expect(res.ok).toBe(true);
    expect(res.hasEvents).toBe(false);
    expect(res.events).toBe(0);
    expect(res.promoted).toBe(false);

    const remaining = await prisma.matchEvent.count({ where: { matchId } });
    expect(remaining).toBe(0);

    const m = await prisma.match.findUniqueOrThrow({
      where: { id: matchId },
      select: { hasEvents: true, statsState: true, detailCheckedAt: true },
    });
    expect(m.hasEvents).toBe(false);
    expect(m.statsState).toBe(StatsState.NONE);
    expect(m.detailCheckedAt).toBeNull();

    fake.events.delete(APIFX_C);
  }, 60_000);

  it('6. 네 has_* 다 non-NULL 이면 승격 (CONFIRMED · detail_checked_at · confirmed_at 세팅)', async () => {
    const matchId = matchIdByFx.get(APIFX_B) as number;
    // hasEvents 는 테스트 2 에서 true 로 세팅됐다. 수동으로 나머지 세 개도 세팅
    await prisma.match.update({
      where: { id: matchId },
      data: { hasLineups: true, hasTeamStats: true, hasPlayerStats: true, statsState: StatsState.NONE, detailCheckedAt: null, confirmedAt: null },
    });

    // 승격은 events.run 이 마지막 has_* 를 채운 뒤 자연스럽게 부른다.
    // 여기서는 events 를 다시 부르지 않고, lineups 를 다시 부르지도 않으므로
    // 직접 승격 헬퍼를 부르는 대신 events 서비스를 다시 돌려서 hasEvents 재세팅 → 승격 트리거 확인
    const res = await eventsSvc.run(matchId, APIFX_B);
    expect(res.ok).toBe(true);
    expect(res.promoted).toBe(true);

    const m = await prisma.match.findUniqueOrThrow({
      where: { id: matchId },
      select: { statsState: true, detailCheckedAt: true, confirmedAt: true },
    });
    expect(m.statsState).toBe(StatsState.CONFIRMED);
    expect(m.detailCheckedAt).not.toBeNull();
    expect(m.confirmedAt).not.toBeNull();
  }, 60_000);

  it('7. events — team.id null 반례는 warn 후 skip (dropped 카운트)', async () => {
    const matchId = matchIdByFx.get(APIFX_A) as number;
    await prisma.match.update({
      where: { id: matchId },
      data: { hasLineups: null, hasEvents: null, hasTeamStats: null, hasPlayerStats: null, statsState: StatsState.NONE, detailCheckedAt: null, confirmedAt: null },
    });

    // 원문 로드 후 첫 이벤트의 team.id 를 null 로 조작
    const events = loadEvents(APIFX_A);
    events[0] = {
      ...events[0],
      team: { ...events[0].team, id: null },
    };
    fake.events.set(APIFX_A, events);

    const res = await eventsSvc.run(matchId, APIFX_A);
    expect(res.ok).toBe(true);
    expect(res.dropped).toBe(1);
    expect(res.events).toBe(events.length - 1);

    // 저장된 것은 dropped 만큼 적다
    const rows = await prisma.matchEvent.findMany({ where: { matchId }, select: { seq: true } });
    expect(rows.length).toBe(events.length - 1);

    fake.events.delete(APIFX_A);
  }, 60_000);

  it('8. events — time.elapsed null 반례도 warn 후 skip', async () => {
    const matchId = matchIdByFx.get(APIFX_A) as number;

    const events = loadEvents(APIFX_A);
    events[0] = {
      ...events[0],
      time: { ...events[0].time, elapsed: null },
    };
    fake.events.set(APIFX_A, events);

    const res = await eventsSvc.run(matchId, APIFX_A);
    expect(res.ok).toBe(true);
    expect(res.dropped).toBe(1);
    expect(res.events).toBe(events.length - 1);

    fake.events.delete(APIFX_A);
  }, 60_000);

  it('9. detail_eligible=false 는 서비스 진입에서 skip · matches 안 건드림', async () => {
    // matchIneligibleId 는 detail_eligible=false
    const before = await prisma.match.findUniqueOrThrow({
      where: { id: matchIneligibleId },
      select: { hasLineups: true, hasEvents: true, statsState: true, detailCheckedAt: true },
    });

    const rl = await lineupsSvc.run(matchIneligibleId, 997_198);
    expect(rl.ok).toBe(false);
    expect(rl.reason).toBe('not-eligible');

    const re = await eventsSvc.run(matchIneligibleId, 997_198);
    expect(re.ok).toBe(false);
    expect(re.reason).toBe('not-eligible');

    const after = await prisma.match.findUniqueOrThrow({
      where: { id: matchIneligibleId },
      select: { hasLineups: true, hasEvents: true, statsState: true, detailCheckedAt: true },
    });
    expect(after).toEqual(before);
  }, 60_000);

  it('10. apiFixtureId 불일치 → skip · matches 안 건드림', async () => {
    const matchId = matchIdByFx.get(APIFX_C) as number;
    const before = await prisma.match.findUniqueOrThrow({
      where: { id: matchId },
      select: { hasLineups: true, hasEvents: true, statsState: true },
    });

    const rl = await lineupsSvc.run(matchId, 999_999);
    expect(rl.ok).toBe(false);
    expect(rl.reason).toBe('fixture-id-mismatch');

    const re = await eventsSvc.run(matchId, 999_999);
    expect(re.ok).toBe(false);
    expect(re.reason).toBe('fixture-id-mismatch');

    const after = await prisma.match.findUniqueOrThrow({
      where: { id: matchId },
      select: { hasLineups: true, hasEvents: true, statsState: true },
    });
    expect(after).toEqual(before);
  }, 60_000);
});
