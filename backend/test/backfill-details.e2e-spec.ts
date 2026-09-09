/**
 * 백필-2 오케스트레이터 e2e — MatchDetailsBackfillService
 *
 * 실제 L3·L5 서비스를 통해 DB 에 쓴다. ApiFootballClient 는 픽스처 3개(1451160·1557387·1622630) 를
 * 로드해 fixture 마다 다른 응답을 준다. QuotaService 도 override — /status 를 안 부르고 스크립트로 준다.
 *
 * 검증 대상 10 케이스:
 *   1. 대상 SELECT 필터 — detailCheckedAt≠null · detailEligible=false · 24h 안 · status NS/LIVE ·
 *      다른 대회시즌 → 모두 제외. 자격 있는 것만 처리
 *   2. 커서 뒤만 처리 — backfillJob.cursorMatchId 세팅 시 그 뒤 id 만
 *   3. --limit min(N, budget) — limit 이 작으면 limit 대로
 *   4. --limit min 이 budget 이 작은 경우 — budget 이 잘라낸다
 *   5. ApiQuotaExhaustedError 중단 — overallStopped=quota_exhausted · cursor 는 마지막 성공 경기
 *   6. 한 엔드포인트 실패 — 그 경기 failed=1 · 나머지 서비스 · 다음 경기 정상
 *   7. DONE 인 job 은 skip — API 안 부름
 *   8. dry-run — 실 API 안 부름 · targeted 만 계산
 *   9. no_targets — 커서 뒤 대상 없으면 stoppedReason='no_targets'
 *  10. season 지정 안 하면 isCurrent+screenCompetitionWhere 만
 *
 * 밴드 997_4xx (l3·l5 밴드 밖).
 *
 * 이 파일은 도메인 테이블에 가짜 행을 쓴다 — 로컬 DB 나 CI 에서만 돈다.
 * 끝나면 반드시 치운다 (l0.e2e 가 대회시즌·팀·참가를 전역으로 센다).
 */
import 'dotenv/config';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { Test } from '@nestjs/testing';
import type { INestApplicationContext } from '@nestjs/common';
import { PrismaService } from '../src/prisma/prisma.service.js';
import { ApiFootballClient } from '../src/ingestion/api-football/api-football.client.js';
import { QuotaService } from '../src/ingestion/api-football/quota.service.js';
import { ApiQuotaExhaustedError } from '../src/ingestion/api-football/api-football.errors.js';
import { MatchDetailsBackfillService } from '../src/ingestion/backfill/match-details-backfill.service.js';
import {
  BackfillPhase,
  CompetitionFormat,
  CompetitionType,
} from '../src/generated/prisma/client.js';
import type {
  ApiEnvelope,
  ApiFixtureEventItem,
  ApiFixtureLineupItem,
  ApiFixturePlayersItem,
  ApiFixtureStatisticsItem,
} from '../src/ingestion/api-football/api-football.types.js';

/** 카탈로그·다른 e2e 와 겹치지 않는 대역. 997_4xx (l3=997_1xx · l5=997_2xx · l1=990 · l2=991~995 · l6=996 밖) */
const COMP_API_ID = 997_401;
/** 현재 시즌은 화면 selection 을 위해 SEASON_YEARS 안 값(2026)이 좋지만, 이 판에서는 season 인자로 강제한다.
 *  season 지정 없는 case 10 은 isCurrent=true 로 뽑는다 */
const SEASON_YEAR = 2026;

/** 픽스처 원문의 team.id — apiTeamId 로 upsert (팀 매핑 검증) */
const TEAM_LIV = 40;
const TEAM_QAR = 556;
const TEAM_ARS = 42;
const TEAM_CHE = 49;
const TEAM_LYO = 80;
const TEAM_FEN = 611;
const TEAMS_ALL = [TEAM_LIV, TEAM_QAR, TEAM_ARS, TEAM_CHE, TEAM_LYO, TEAM_FEN];

/** 우리 밴드 안의 apiFixtureId — 각 fixture 를 어느 픽스처에 매핑할지 controller.map 이 정한다 */
const FX_BASE = 997_450;
const N_FIXTURES = 20;
const FX_ALL = Array.from({ length: N_FIXTURES }, (_, i) => FX_BASE + i);

const VENUE_API_ID = 997_430;

/** 픽스처 원문 파일 로드 */
const FIXTURE_DIR = resolve(__dirname, 'fixtures', 'api-football');
const loadLineups = (fx: number): ApiFixtureLineupItem[] => {
  const raw = readFileSync(resolve(FIXTURE_DIR, `lineups_${fx}.json`), 'utf8');
  return (JSON.parse(raw) as { response: ApiFixtureLineupItem[] }).response;
};
const loadEvents = (fx: number): ApiFixtureEventItem[] => {
  const raw = readFileSync(resolve(FIXTURE_DIR, `events_${fx}.json`), 'utf8');
  return (JSON.parse(raw) as { response: ApiFixtureEventItem[] }).response;
};
const loadStatistics = (fx: number): ApiFixtureStatisticsItem[] => {
  const raw = readFileSync(resolve(FIXTURE_DIR, `statistics_${fx}.json`), 'utf8');
  return (JSON.parse(raw) as { response: ApiFixtureStatisticsItem[] }).response;
};
const loadPlayers = (fx: number): ApiFixturePlayersItem[] => {
  const raw = readFileSync(resolve(FIXTURE_DIR, `players_${fx}.json`), 'utf8');
  return (JSON.parse(raw) as { response: ApiFixturePlayersItem[] }).response;
};

/** 실 픽스처 순환 매핑 — apiFixtureId → 실 픽스처 id */
const REAL_FX = [1_451_160, 1_557_387, 1_622_630] as const;
const realFxFor = (apiFxId: number): number => REAL_FX[(apiFxId - FX_BASE) % REAL_FX.length];

/**
 * Fake ApiFootballClient — 4 엔드포인트 응답을 준다.
 *
 * `quotaExhaustAt` · `failEndpointAt` 로 특정 fixture 에서 던지게 조작한다.
 * `callCount` 는 IngestionRunService.wrap 이 차분 계산에 쓴다.
 */
class FakeApiFootballClient {
  calls: string[] = [];
  /** 이 fixture 에서 특정 path 를 부르면 ApiQuotaExhaustedError */
  quotaExhaustAt: { fixture: number; path: string } | null = null;
  /** 이 fixture 에서 특정 path 를 부르면 ApiFootballError */
  failEndpointAt: { fixture: number; path: string; message: string } | null = null;

  get callCount(): number {
    return this.calls.length;
  }

  async get<T>(path: string, query: Record<string, string | number> = {}): Promise<ApiEnvelope<T>> {
    const fixture = Number(query.fixture);
    this.calls.push(`${path}?fixture=${fixture}`);

    if (
      this.quotaExhaustAt !== null &&
      this.quotaExhaustAt.fixture === fixture &&
      this.quotaExhaustAt.path === path
    ) {
      throw new ApiQuotaExhaustedError(path);
    }
    if (
      this.failEndpointAt !== null &&
      this.failEndpointAt.fixture === fixture &&
      this.failEndpointAt.path === path
    ) {
      throw new Error(this.failEndpointAt.message);
    }

    const realFx = realFxFor(fixture);
    let response: unknown;
    if (path === '/fixtures/lineups') response = loadLineups(realFx);
    else if (path === '/fixtures/events') response = loadEvents(realFx);
    else if (path === '/fixtures/statistics') response = loadStatistics(realFx);
    else if (path === '/fixtures/players') response = loadPlayers(realFx);
    else throw new Error(`가짜 클라이언트가 모르는 경로: ${path}`);
    const n = Array.isArray(response) ? response.length : 1;
    return {
      get: path,
      parameters: {},
      errors: [],
      results: n,
      paging: { current: 1, total: 1 },
      response: response as T,
    };
  }
}

/**
 * Fake QuotaService — /status 실 호출 대신 스크립트로 주는 값을 돌려준다.
 * 인수 없는 constructor.
 */
class FakeQuotaService {
  used = 0;
  limit = 7_500;
  snapshotCount = 0;

  async snapshot(): Promise<{ used: number; limit: number; overWarn: boolean; expiresOn: Date | null }> {
    this.snapshotCount++;
    return {
      used: this.used,
      limit: this.limit,
      overWarn: this.used >= 6_000,
      expiresOn: null,
    };
  }
}

describe('MatchDetailsBackfillService (e2e, 픽스처 기반)', () => {
  let app: INestApplicationContext;
  let prisma: PrismaService;
  let backfill: MatchDetailsBackfillService;
  let fake: FakeApiFootballClient;
  let fakeQuota: FakeQuotaService;
  let competitionSeasonId: number;
  let otherCompetitionSeasonId: number;
  const teamIdByApi = new Map<number, number>();
  /** matchId 매핑 — apiFixtureId → 내부 id */
  const matchIdByFx = new Map<number, number>();
  /** 자격 반례 · 옛 시즌 반례 · 최근 24h 반례 · NS 반례 · 이미 확인된 반례 등 */
  const excludedMatchIds: number[] = [];
  /** 다른 대회시즌 소속 반례 */
  let otherMatchId = 0;

  beforeAll(async () => {
    const host = new URL(process.env.DATABASE_URL ?? 'postgresql://x/').hostname;
    const local = ['localhost', '127.0.0.1', '::1'].includes(host);
    if (!local && !process.env.CI && process.env.E2E_ALLOW_REMOTE_DB !== '1') {
      throw new Error(
        `backfill-details e2e 는 픽스처를 쓰므로 원격 DB(${host})에서는 돌리지 않는다 — 로컬 Postgres 를 쓰거나 E2E_ALLOW_REMOTE_DB=1`,
      );
    }
    const { AppModule } = await import('../src/app.module.js');
    fake = new FakeApiFootballClient();
    fakeQuota = new FakeQuotaService();
    const mod = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(ApiFootballClient)
      .useValue(fake)
      .overrideProvider(QuotaService)
      .useValue(fakeQuota)
      .compile();
    app = await mod.init();
    prisma = app.get(PrismaService);
    backfill = app.get(MatchDetailsBackfillService);

    // 시즌·대회·대회시즌
    await prisma.season.upsert({ where: { year: SEASON_YEAR }, create: { year: SEASON_YEAR }, update: {} });
    const season = await prisma.season.findUniqueOrThrow({ where: { year: SEASON_YEAR } });
    const comp = await prisma.competition.upsert({
      where: { apiCompetitionId: COMP_API_ID },
      create: {
        apiCompetitionId: COMP_API_ID,
        name: 'Backfill Fixture League',
        country: 'Testland',
        type: CompetitionType.LEAGUE,
        format: CompetitionFormat.ROUND_ROBIN,
        isTracked: true,
        displayOrder: 96,
      },
      update: { isTracked: true, displayOrder: 96 },
    });
    const cs = await prisma.competitionSeason.upsert({
      where: { competitionId_seasonId: { competitionId: comp.id, seasonId: season.id } },
      create: { competitionId: comp.id, seasonId: season.id, apiSeasonValue: SEASON_YEAR, isCurrent: true },
      update: { isCurrent: true },
    });
    competitionSeasonId = cs.id;

    // 다른 대회시즌 — case 10 (season 미지정) 이 이걸 안 건드리는지 검증할 때 필요
    // isCurrent=false 로 만들어 case 10 에서 제외되게 한다
    const otherComp = await prisma.competition.upsert({
      where: { apiCompetitionId: COMP_API_ID + 1 },
      create: {
        apiCompetitionId: COMP_API_ID + 1,
        name: 'Other Fixture League',
        country: 'Testland',
        type: CompetitionType.LEAGUE,
        format: CompetitionFormat.ROUND_ROBIN,
        isTracked: true,
        displayOrder: 95,
      },
      update: { isTracked: true, displayOrder: 95 },
    });
    const otherCs = await prisma.competitionSeason.upsert({
      where: { competitionId_seasonId: { competitionId: otherComp.id, seasonId: season.id } },
      create: { competitionId: otherComp.id, seasonId: season.id, apiSeasonValue: SEASON_YEAR, isCurrent: false },
      update: { isCurrent: false },
    });
    otherCompetitionSeasonId = otherCs.id;

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
      where: { competitionSeasonId_name: { competitionSeasonId: cs.id, name: 'Backfill Round 1' } },
      create: { competitionSeasonId: cs.id, name: 'Backfill Round 1', ordinal: 0, hasTopFlight: true, isLateStage: false },
      update: {},
    });
    const otherRound = await prisma.competitionRound.upsert({
      where: { competitionSeasonId_name: { competitionSeasonId: otherCs.id, name: 'Other Round 1' } },
      create: { competitionSeasonId: otherCs.id, name: 'Other Round 1', ordinal: 0, hasTopFlight: true, isLateStage: false },
      update: {},
    });

    const venue = await prisma.venue.upsert({
      where: { apiVenueId: VENUE_API_ID },
      create: { apiVenueId: VENUE_API_ID, name: 'Backfill Fixture Arena', city: 'Testville' },
      update: {},
    });

    // 정상 대상 20 경기 (997_450~997_469) — 다 FT · 24h 전 · detail_eligible=true · detail_checked_at=null
    // 각 픽스처 realFx 순환에 맞춰 팀 결정
    const teamPairs: [number, number][] = [
      [TEAM_LIV, TEAM_QAR],
      [TEAM_ARS, TEAM_CHE],
      [TEAM_LYO, TEAM_FEN],
    ];
    const oldKickoff = new Date(Date.now() - 48 * 60 * 60 * 1_000);
    for (let i = 0; i < N_FIXTURES; i++) {
      const apiFx = FX_ALL[i];
      const [home, away] = teamPairs[i % teamPairs.length];
      const m = await prisma.match.upsert({
        where: { apiFixtureId: apiFx },
        create: {
          apiFixtureId: apiFx,
          competitionSeasonId: cs.id,
          roundId: round.id,
          kickoffAt: new Date(oldKickoff.getTime() - i * 3_600_000),
          statusShort: 'FT',
          statusLong: 'Match Finished',
          venueId: venue.id,
          homeTeamId: teamIdByApi.get(home) as number,
          awayTeamId: teamIdByApi.get(away) as number,
          detailEligible: true,
        },
        update: {
          statusShort: 'FT',
          detailEligible: true,
          kickoffAt: new Date(oldKickoff.getTime() - i * 3_600_000),
          hasLineups: null, hasEvents: null, hasTeamStats: null, hasPlayerStats: null,
          detailCheckedAt: null,
        },
      });
      matchIdByFx.set(apiFx, m.id);
    }

    // 반례 경기들 — SELECT 필터에 걸려야 한다
    const excludedSeed: Array<{
      apiFx: number;
      overrides: {
        detailEligible?: boolean;
        detailCheckedAt?: Date | null;
        kickoffAt?: Date;
        statusShort?: string;
      };
    }> = [
      // detailEligible=false
      { apiFx: 997_480, overrides: { detailEligible: false } },
      // detailCheckedAt 세팅 (이미 처리됨)
      { apiFx: 997_481, overrides: { detailCheckedAt: new Date() } },
      // 24h 안 (너무 최근)
      { apiFx: 997_482, overrides: { kickoffAt: new Date(Date.now() - 60 * 60 * 1_000) } },
      // status NS
      { apiFx: 997_483, overrides: { statusShort: 'NS' } },
      // status LIVE (1H)
      { apiFx: 997_484, overrides: { statusShort: '1H' } },
    ];
    for (const s of excludedSeed) {
      const [home, away] = teamPairs[0];
      const m = await prisma.match.upsert({
        where: { apiFixtureId: s.apiFx },
        create: {
          apiFixtureId: s.apiFx,
          competitionSeasonId: cs.id,
          roundId: round.id,
          kickoffAt: s.overrides.kickoffAt ?? oldKickoff,
          statusShort: s.overrides.statusShort ?? 'FT',
          statusLong: 'Match',
          venueId: venue.id,
          homeTeamId: teamIdByApi.get(home) as number,
          awayTeamId: teamIdByApi.get(away) as number,
          detailEligible: s.overrides.detailEligible ?? true,
          detailCheckedAt: s.overrides.detailCheckedAt ?? null,
        },
        update: {
          kickoffAt: s.overrides.kickoffAt ?? oldKickoff,
          statusShort: s.overrides.statusShort ?? 'FT',
          detailEligible: s.overrides.detailEligible ?? true,
          detailCheckedAt: s.overrides.detailCheckedAt ?? null,
          hasLineups: null, hasEvents: null, hasTeamStats: null, hasPlayerStats: null,
        },
      });
      excludedMatchIds.push(m.id);
    }

    // 다른 대회시즌 매치 하나 — season 미지정 (isCurrent) 필터가 제외해야 한다
    const otherM = await prisma.match.upsert({
      where: { apiFixtureId: 997_495 },
      create: {
        apiFixtureId: 997_495,
        competitionSeasonId: otherCs.id,
        roundId: otherRound.id,
        kickoffAt: oldKickoff,
        statusShort: 'FT',
        statusLong: 'Match Finished',
        venueId: venue.id,
        homeTeamId: teamIdByApi.get(TEAM_LIV) as number,
        awayTeamId: teamIdByApi.get(TEAM_ARS) as number,
        detailEligible: true,
      },
      update: {
        detailEligible: true,
        hasLineups: null, hasEvents: null, hasTeamStats: null, hasPlayerStats: null,
        detailCheckedAt: null,
      },
    });
    otherMatchId = otherM.id;
  }, 180_000);

  afterAll(async () => {
    if (prisma) {
      try {
        await cleanupFixture();
      } catch (cause) {
        console.warn('[backfill-details e2e] 픽스처 정리 실패 — 다음 e2e 가 영향을 받을 수 있다:', cause);
      }
    }
    await app?.close();
  });

  /** 각 테스트 앞에서 이 대회시즌의 매치 상태·backfillJob·부산물을 초기화 */
  const resetSeason = async () => {
    const matchIds = [...matchIdByFx.values()];
    // 자식: player/team stats · events · lineups → matches state 리셋
    await prisma.playerMatchStat.deleteMany({ where: { matchId: { in: matchIds } } });
    await prisma.teamMatchStat.deleteMany({ where: { matchId: { in: matchIds } } });
    await prisma.matchEvent.deleteMany({ where: { matchId: { in: matchIds } } });
    await prisma.lineupEntry.deleteMany({ where: { matchId: { in: matchIds } } });
    await prisma.matchLineup.deleteMany({ where: { matchId: { in: matchIds } } });
    await prisma.match.updateMany({
      where: { id: { in: matchIds } },
      data: {
        hasLineups: null, hasEvents: null, hasTeamStats: null, hasPlayerStats: null,
        detailCheckedAt: null, confirmedAt: null,
      },
    });
    await prisma.backfillJob.deleteMany({ where: { competitionSeasonId } });
    fake.calls.length = 0;
    fake.quotaExhaustAt = null;
    fake.failEndpointAt = null;
    fakeQuota.used = 0;
    fakeQuota.limit = 7_500;
    fakeQuota.snapshotCount = 0;
  };

  const cleanupFixture = async () => {
    const matchIds = [...matchIdByFx.values(), ...excludedMatchIds, otherMatchId].filter((n) => n > 0);
    if (matchIds.length > 0) {
      await prisma.playerMatchStat.deleteMany({ where: { matchId: { in: matchIds } } });
      await prisma.teamMatchStat.deleteMany({ where: { matchId: { in: matchIds } } });
      await prisma.matchEvent.deleteMany({ where: { matchId: { in: matchIds } } });
      await prisma.lineupEntry.deleteMany({ where: { matchId: { in: matchIds } } });
      await prisma.matchLineup.deleteMany({ where: { matchId: { in: matchIds } } });
      await prisma.match.deleteMany({ where: { id: { in: matchIds } } });
    }
    const csIds = [competitionSeasonId, otherCompetitionSeasonId].filter((n) => n > 0);
    if (csIds.length > 0) {
      await prisma.backfillJob.deleteMany({ where: { competitionSeasonId: { in: csIds } } });
      await prisma.competitionRound.deleteMany({ where: { competitionSeasonId: { in: csIds } } });
      await prisma.competitionEntry.deleteMany({ where: { competitionSeasonId: { in: csIds } } });
      await prisma.ingestionRun.deleteMany({ where: { competitionSeasonId: { in: csIds } } });
      await prisma.competitionSeason.deleteMany({ where: { id: { in: csIds } } });
    }
    await prisma.competition.deleteMany({ where: { apiCompetitionId: { in: [COMP_API_ID, COMP_API_ID + 1] } } });
    await prisma.venue.deleteMany({ where: { apiVenueId: VENUE_API_ID } });
    const teamIds = [...teamIdByApi.values()];
    if (teamIds.length > 0) await prisma.team.deleteMany({ where: { id: { in: teamIds } } });
    // Coach 6개 (l3 fixture 안의 coach.id 들)
    await prisma.coach.deleteMany({ where: { apiCoachId: { in: [2006, 6801, 7248, 26000, 2431, 28826] } } });
    // Player — 3 픽스처 실 선수 id 모아 제거
    const playerIds = new Set<number>();
    for (const fx of REAL_FX) {
      for (const it of loadLineups(fx)) {
        for (const e of [...it.startXI, ...it.substitutes]) playerIds.add(e.player.id);
      }
      for (const e of loadEvents(fx)) {
        if (e.player.id !== null) playerIds.add(e.player.id);
        if (e.assist.id !== null) playerIds.add(e.assist.id);
      }
      for (const it of loadPlayers(fx)) {
        for (const p of it.players) playerIds.add(p.player.id);
      }
    }
    if (playerIds.size > 0) {
      await prisma.player.deleteMany({ where: { apiPlayerId: { in: [...playerIds] } } });
    }
    // 이 판이 남긴 BACKFILL ingestion_runs (competitionSeasonId=null) — 죽은 id 는 아니지만 흔적 정리
    await prisma.ingestionRun.deleteMany({
      where: { layer: 'BACKFILL', competitionSeasonId: null, callsUsed: { lt: 10_000 } },
    });
  };

  // ================================================================================================
  // Case 1: 대상 SELECT 필터
  // ================================================================================================
  it('1. 대상 SELECT — 반례 5개(자격/이미확인/최근/NS/LIVE)는 처리 안 함. 정상 20 경기만 대상', async () => {
    await resetSeason();
    // 예산 넉넉히
    fakeQuota.used = 0;
    fakeQuota.limit = 7_500;

    const res = await backfill.run({ season: SEASON_YEAR, limit: 3 });
    expect(res.perSeason).toHaveLength(1);
    const s = res.perSeason[0];
    expect(s.competitionSeasonId).toBe(competitionSeasonId);
    // targeted 는 정확히 20 (반례 5 개는 걸림)
    expect(s.targeted).toBe(N_FIXTURES);
    expect(s.processed).toBe(3);

    // 반례 경기들은 하나도 안 건드림 (has_* 는 여전히 그대로)
    for (const id of excludedMatchIds) {
      const m = await prisma.match.findUniqueOrThrow({
        where: { id },
        select: { hasLineups: true, hasEvents: true, hasTeamStats: true, hasPlayerStats: true, detailCheckedAt: true },
      });
      // detail_checked_at 반례(id=997_481)를 제외하고는 모두 여전히 null
      const seed = excludedMatchIds.indexOf(id);
      if (seed === 1) {
        expect(m.detailCheckedAt).not.toBeNull(); // 우리가 세팅한 값 유지
      } else {
        expect(m.detailCheckedAt).toBeNull();
      }
      expect(m.hasLineups).toBeNull();
      expect(m.hasEvents).toBeNull();
      expect(m.hasTeamStats).toBeNull();
      expect(m.hasPlayerStats).toBeNull();
    }

    // 처리된 3 경기는 promote 됐거나 has_* 채워짐 (실 서비스가 정상 응답이라 CONFIRMED)
    // 첫 3 매치 id 순서 확인 — id asc
    const processedMatches = await prisma.match.findMany({
      where: {
        competitionSeasonId,
        detailCheckedAt: { not: null },
      },
      orderBy: { id: 'asc' },
      select: { id: true, hasLineups: true, hasEvents: true, hasTeamStats: true, hasPlayerStats: true },
    });
    expect(processedMatches).toHaveLength(3);
    for (const m of processedMatches) {
      expect(m.hasLineups).not.toBeNull();
      expect(m.hasEvents).not.toBeNull();
      expect(m.hasTeamStats).not.toBeNull();
      expect(m.hasPlayerStats).not.toBeNull();
    }
  }, 180_000);

  // ================================================================================================
  // Case 2: 커서 뒤만 처리
  // ================================================================================================
  it('2. 커서 뒤만 — cursor_match_id 세팅 시 그 뒤 id 만 대상', async () => {
    await resetSeason();
    // 정렬된 매치 id 목록
    const sorted = await prisma.match.findMany({
      where: { competitionSeasonId, detailEligible: true, detailCheckedAt: null },
      orderBy: { id: 'asc' },
      select: { id: true },
    });
    expect(sorted.length).toBeGreaterThanOrEqual(10);
    const cursorId = sorted[9].id; // 10 번째 매치를 커서로

    await prisma.backfillJob.create({
      data: { competitionSeasonId, phase: BackfillPhase.DETAILS, cursorMatchId: cursorId },
    });

    const res = await backfill.run({ season: SEASON_YEAR, limit: 2 });
    const s = res.perSeason[0];
    // targeted 는 cursor 뒤: 20 - 10 = 10
    expect(s.targeted).toBe(N_FIXTURES - 10);
    expect(s.processed).toBe(2);

    // 처리된 매치는 sorted[10], sorted[11]
    const processed = await prisma.match.findMany({
      where: { competitionSeasonId, detailCheckedAt: { not: null } },
      orderBy: { id: 'asc' },
      select: { id: true },
    });
    expect(processed.map((m) => m.id)).toEqual([sorted[10].id, sorted[11].id]);
  }, 180_000);

  // ================================================================================================
  // Case 3: --limit min 이 limit 인 경우
  // ================================================================================================
  it('3. --limit=5 · 예산 여유 → 5 경기만', async () => {
    await resetSeason();
    fakeQuota.used = 0;
    fakeQuota.limit = 7_500; // 남은 예산 1875 경기치

    const res = await backfill.run({ season: SEASON_YEAR, limit: 5 });
    expect(res.totalProcessed).toBe(5);
    expect(res.perSeason[0].processed).toBe(5);
    expect(res.overallStopped).toBe('limit_reached');
    // 4 콜 × 5 경기 = 20
    expect(fake.callCount).toBe(20);
  }, 180_000);

  // ================================================================================================
  // Case 4: --limit min 이 budget 인 경우
  // ================================================================================================
  it('4. --limit=100 · 예산 2 경기치만 → 2 경기만', async () => {
    await resetSeason();
    // limit=7500, used=7492 → remaining=8, /4=2
    fakeQuota.used = 7_492;
    fakeQuota.limit = 7_500;

    const res = await backfill.run({ season: SEASON_YEAR, limit: 100 });
    expect(res.totalProcessed).toBe(2);
    expect(res.perSeason[0].processed).toBe(2);
    // 남은 대상은 있으니 limit_reached 로 잘림 (targeted > processed)
    expect(res.overallStopped).toBe('limit_reached');
  }, 180_000);

  // ================================================================================================
  // Case 5: ApiQuotaExhaustedError 중단
  // ================================================================================================
  it('5. ApiQuotaExhaustedError — 3번째 경기 lineups 에서 throw → overallStopped=quota_exhausted · cursor 는 3번째 경기', async () => {
    await resetSeason();
    fakeQuota.used = 0;
    fakeQuota.limit = 7_500;

    // 3번째로 처리될 매치 (id 오름차순)
    const sorted = await prisma.match.findMany({
      where: { competitionSeasonId, detailEligible: true, detailCheckedAt: null },
      orderBy: { id: 'asc' },
      select: { id: true, apiFixtureId: true },
    });
    const thirdFx = sorted[2].apiFixtureId;
    fake.quotaExhaustAt = { fixture: thirdFx, path: '/fixtures/lineups' };

    const res = await backfill.run({ season: SEASON_YEAR, limit: 10 });
    const s = res.perSeason[0];
    expect(s.stoppedReason).toBe('quota_exhausted');
    expect(res.overallStopped).toBe('quota_exhausted');
    // 3번째 경기까지 시도했고 lineups 에서 죽었다. cursor 는 그 경기 id
    // (커서 갱신은 4엔드포인트가 다 지나간 뒤 · 이번엔 첫 엔드포인트에서 죽어 갱신 안 됨)
    // 그러므로 cursor 는 2번째(sorted[1]) 경기 id
    const job = await prisma.backfillJob.findUniqueOrThrow({ where: { competitionSeasonId } });
    expect(job.cursorMatchId).toBe(sorted[1].id);
    expect(job.phase).toBe(BackfillPhase.DETAILS); // FAILED 로 닫지 않음 (quota 는 재시도 가능)
    expect(s.processed).toBe(2); // 2 경기 완료 시도
  }, 180_000);

  // ================================================================================================
  // Case 6: 한 엔드포인트 실패
  // ================================================================================================
  it('6. 한 엔드포인트 실패 — 2번째 경기 events 만 실패 → 그 경기 failed=1 · 다른 endpoint 는 진행 · 3번째 경기 정상', async () => {
    await resetSeason();
    fakeQuota.used = 0;
    fakeQuota.limit = 7_500;

    const sorted = await prisma.match.findMany({
      where: { competitionSeasonId, detailEligible: true, detailCheckedAt: null },
      orderBy: { id: 'asc' },
      select: { id: true, apiFixtureId: true },
    });
    const secondFx = sorted[1].apiFixtureId;
    fake.failEndpointAt = { fixture: secondFx, path: '/fixtures/events', message: 'test events fail' };

    const res = await backfill.run({ season: SEASON_YEAR, limit: 3 });
    const s = res.perSeason[0];
    expect(s.processed).toBe(3);
    expect(s.failed).toBe(1);
    // 진행은 계속되므로 overallStopped 는 limit_reached (limit=3 인데 3 다 처리하고 뒤에 남음)
    expect(s.stoppedReason).toBe('limit_reached');
    expect(res.overallStopped).toBe('limit_reached');

    // 2번째 매치는 has_lineups=true (부분 성공) · has_events 는 null (실패)
    const second = await prisma.match.findUniqueOrThrow({
      where: { id: sorted[1].id },
      select: { hasLineups: true, hasEvents: true, hasTeamStats: true, hasPlayerStats: true, detailCheckedAt: true },
    });
    expect(second.hasLineups).toBe(true);
    expect(second.hasEvents).toBeNull(); // 실패로 유지
    expect(second.hasTeamStats).toBe(true); // 다음 endpoint 진행됨
    expect(second.hasPlayerStats).toBe(true);
    // 승격 안 됨 (has_events NULL)
    expect(second.detailCheckedAt).toBeNull();

    // 3번째 매치는 온전히 처리
    const third = await prisma.match.findUniqueOrThrow({
      where: { id: sorted[2].id },
      select: { hasLineups: true, hasEvents: true, hasTeamStats: true, hasPlayerStats: true, detailCheckedAt: true },
    });
    expect(third.hasLineups).toBe(true);
    expect(third.hasEvents).toBe(true);
    expect(third.hasTeamStats).toBe(true);
    expect(third.hasPlayerStats).toBe(true);
    expect(third.detailCheckedAt).not.toBeNull();

    // cursor 는 3번째 매치 (모두 시도 완료)
    const job = await prisma.backfillJob.findUniqueOrThrow({ where: { competitionSeasonId } });
    expect(job.cursorMatchId).toBe(sorted[2].id);
  }, 180_000);

  // ================================================================================================
  // Case 7: DONE 인 job 은 skip
  // ================================================================================================
  it('7. 이미 DONE 인 시즌 → skip · API 안 부름', async () => {
    await resetSeason();
    await prisma.backfillJob.create({
      data: { competitionSeasonId, phase: BackfillPhase.DONE, startedAt: new Date() },
    });

    const res = await backfill.run({ season: SEASON_YEAR, limit: 10 });
    const s = res.perSeason[0];
    expect(s.stoppedReason).toBe('done');
    expect(s.processed).toBe(0);
    // API 안 부름 (quota snapshot 도 안 부르나? 코드에서는 이 skip 이 quota 앞에 있다)
    expect(fake.callCount).toBe(0);
    // 매치 상태 그대로
    const processed = await prisma.match.count({
      where: { competitionSeasonId, detailCheckedAt: { not: null } },
    });
    expect(processed).toBe(0);
  }, 60_000);

  // ================================================================================================
  // Case 8: dry-run
  // ================================================================================================
  it('8. dry-run — API 안 부름 · targeted 계산됨 · 매치·job 안 건드림', async () => {
    await resetSeason();

    const res = await backfill.run({ season: SEASON_YEAR, limit: 3, dryRun: true });
    expect(res.dryRun).toBe(true);
    expect(fake.callCount).toBe(0);
    const s = res.perSeason[0];
    expect(s.targeted).toBe(N_FIXTURES);
    expect(s.processed).toBe(0);
    // 매치 안 건드림
    const processed = await prisma.match.count({
      where: { competitionSeasonId, detailCheckedAt: { not: null } },
    });
    expect(processed).toBe(0);
    // backfillJob 안 만듦
    const job = await prisma.backfillJob.findUnique({ where: { competitionSeasonId } });
    expect(job).toBeNull();
    // quota snapshot 도 안 부름
    expect(fakeQuota.snapshotCount).toBe(0);
  }, 60_000);

  // ================================================================================================
  // Case 9: no_targets — 커서 뒤 대상 없으면 stoppedReason='no_targets'
  // ================================================================================================
  it('9. no_targets — 이미 다 처리된 시즌 → complete 호출 · stoppedReason=no_targets', async () => {
    await resetSeason();
    // 모든 매치를 detailCheckedAt 세팅 → 대상 0
    await prisma.match.updateMany({
      where: { competitionSeasonId, detailEligible: true },
      data: { detailCheckedAt: new Date() },
    });

    const res = await backfill.run({ season: SEASON_YEAR, limit: 10 });
    const s = res.perSeason[0];
    expect(s.targeted).toBe(0);
    expect(s.processed).toBe(0);
    expect(s.stoppedReason).toBe('no_targets');

    // DONE 으로 닫혔는지
    const job = await prisma.backfillJob.findUniqueOrThrow({ where: { competitionSeasonId } });
    expect(job.phase).toBe(BackfillPhase.DONE);
  }, 60_000);

  // ================================================================================================
  // Case 10: season 미지정 → isCurrent+screenCompetitionWhere. 다른 대회시즌 안 건드림
  // ================================================================================================
  it('10. season 미지정 — isCurrent+screenCompetitionWhere 만. 다른 대회시즌(isCurrent=false) 은 대상 아님', async () => {
    await resetSeason();

    const res = await backfill.run({ limit: 1 });
    // perSeason 은 isCurrent=true 인 시즌만
    const ids = res.perSeason.map((r) => r.competitionSeasonId);
    expect(ids).toContain(competitionSeasonId);
    expect(ids).not.toContain(otherCompetitionSeasonId);

    // 다른 대회시즌 매치는 안 건드림
    const otherM = await prisma.match.findUniqueOrThrow({
      where: { id: otherMatchId },
      select: { hasLineups: true, hasEvents: true, detailCheckedAt: true },
    });
    expect(otherM.hasLineups).toBeNull();
    expect(otherM.hasEvents).toBeNull();
    expect(otherM.detailCheckedAt).toBeNull();
  }, 180_000);
});
