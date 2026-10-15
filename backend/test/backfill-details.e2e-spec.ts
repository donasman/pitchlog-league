/**
 * 백필-2 오케스트레이터 e2e — MatchDetailsBackfillService
 *
 * 실제 L3·L5 서비스를 통해 DB 에 쓴다. ApiFootballClient 는 픽스처 3개(1451160·1557387·1622630) 를
 * 로드해 fixture 마다 다른 응답을 준다. QuotaService 도 override — /status 를 안 부르고 스크립트로 준다.
 *
 * 검증 대상 18 케이스 · 19 it (2026-09-10 재작성 — phase 안 쓰는 규약 반영 ·
 * 2026-10-15 커서 폐기 — 대상은 detailTargetWhere · 정렬 kickoff asc, id asc · 경기 단위 시도 횟수):
 *   1. 대상 SELECT 필터 — detailCheckedAt≠null · detailEligible=false · 24h 안 · status NS/LIVE ·
 *      다른 대회시즌 → 모두 제외. 자격 있는 것만 처리
 *   2. 커서 무시 — backfillJob.cursorMatchId 가 세팅돼 있어도 20경기 전부 대상 · kickoff asc 앞 2경기 처리 · 커서 값 그대로
 *   3. --limit min(N, budget) — limit 이 작으면 limit 대로
 *   4a. 자율 상한 (daily_cap) — used=5692, limit=7500 → floor((5700-5692)/4)=2 경기 · daily_cap
 *   4b. API 상한 (quota_exhausted) — used=7496, limit=7500 → floor((7500-7496)/4)=1 경기 · quota_exhausted
 *   5. ApiQuotaExhaustedError 중단 — overallStopped=quota_exhausted · 끊긴 경기는 시도로 안 셈 · cursor 안 씀
 *   6. 한 엔드포인트 실패 — 그 경기 failed=1 · 시도 1 · 나머지 서비스 · 다음 경기 정상
 *   7. **모든 대상 매치가 detail_checked_at 이 채워진 대회시즌은 targeted=0 이라 skip** (phase 무관)
 *   8. dry-run — 실 API 안 부름 · targeted 만 계산 · 시도 기록 없음
 *   9. no_targets — 이미 다 처리된 시즌 → job 생성 안 함 · stoppedReason='no_targets'
 *  10. season 지정 안 하면 isCurrent+screenCompetitionWhere 만
 *  11. 매 경기 앞 quota 재확인 — 시즌 시작 시 여유 있어도 경기 처리 중 quota 가 자율 상한 넘으면 그 경기 앞에서 중단
 *  12. **상세 백필은 backfill_jobs.phase 를 안 건드린다** — DONE 이 미리 세팅돼도 DONE 유지 · done/failed 만 갱신 · cursor 는 null
 *  13. **total/done/failed 가 진행에 맞게 갱신된다** — 5경기 처리 후 진행 지표 정확 · 시도 1 은 그 5경기만
 *  14. id 가 작은데 늦게 끝난 경기 — PST 로 빠졌다가 FT 가 되면 다음 판이 처리 (커서였다면 영구 누락)
 *  15. 실패 → 1h 백오프 — 백오프 안에서는 대상 밖 · 지나면 재시도·승격
 *  16. 3회 실패 → 영구 제외 + '상세 재시도 포기' warn 정확히 1건 (2회 뒤 6h 백오프 포함)
 *  17. quota 예외로 끊긴 경기는 시도로 안 셈 — 다음 판이 처음처럼 처리
 *  18. 4갈래 전부 실패해도 시도 1 · updated_at 불변 (시도 기록은 raw UPDATE)
 *
 * 처리 순서는 kickoff asc 다. 시드 kickoff 가 oldKickoff - i시간이라 `ordered()` 의
 * o[0] = FX 997_469 … o[19] = FX 997_450 — 새 DB 에서는 id asc 와 정반대다.
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
import type { INestApplicationContext, Logger } from '@nestjs/common';
import { PrismaService } from '../src/prisma/prisma.service.js';
import { ApiFootballClient } from '../src/ingestion/api-football/api-football.client.js';
import { knownApiPlayerId } from '../src/ingestion/api-football/api-player-id.js';
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
/** 다른 e2e 스펙(l2/l6 는 2022~2026)과 절대 안 겹치는 시즌 연도.
 *  fileParallelism:false 로 같은 DB 를 공유하는데 season=2026 을 쓰면 다른 스펙의 잔존
 *  competitionSeason(예: l2 991_140 + 2026)이 이 스펙의 `screenCompetitionWhere + season:{year:2026}`
 *  필터에 함께 잡혀 `res.perSeason.length > 1` 로 격리가 깨진다. 2099 로 못 박아 격리한다.
 *  season 지정 없는 case 10 은 isCurrent=true 로 뽑되 자기 competitionSeasonId 만 검사한다. */
const SEASON_YEAR = 2099;

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
  /** 이 fixture 에서 특정 path(배열이면 그중 어느 것이든) 를 부르면 Error — case 18 은 4경로 전부 */
  failEndpointAt: { fixture: number; path: string | readonly string[]; message: string } | null = null;

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
      (typeof this.failEndpointAt.path === 'string'
        ? this.failEndpointAt.path === path
        : this.failEndpointAt.path.includes(path))
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
 *
 * `deltaPerSnapshot` 은 snapshot 이 리턴하기 직전에 used 를 이만큼 늘린다 —
 * "매 경기 앞 재확인" 케이스에서 quota 소진 진행을 흉내낸다.
 * 다만 최초 snapshot 을 skipFirstDelta 번 만큼은 그대로 준다 — 시즌 진입 첫 snapshot 을
 * 진짜 상태 그대로 보고 싶을 때 씀.
 */
class FakeQuotaService {
  used = 0;
  limit = 7_500;
  snapshotCount = 0;
  deltaPerSnapshot = 0;
  skipFirstDelta = 0;

  async snapshot(): Promise<{ used: number; limit: number; overWarn: boolean; expiresOn: Date | null }> {
    this.snapshotCount++;
    const snap = {
      used: this.used,
      limit: this.limit,
      overWarn: this.used >= 6_000,
      expiresOn: null,
    };
    if (this.skipFirstDelta > 0) {
      this.skipFirstDelta--;
    } else if (this.deltaPerSnapshot !== 0) {
      this.used += this.deltaPerSnapshot;
    }
    return snap;
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

    // 다른 대회시즌 — case 10 (season 미지정) · case 7 (한 시즌 skip) 격리에 필요.
    // feat/scope-expansion (2026-09-17): ingestScopeWhere 가 isTracked 만이라 displayOrder 로는 격리 안 됨.
    // isTracked=false 로 격리 (case 7 은 이걸로 다른 시즌 순회 방지 · case 10 은 isCurrent=false 로도 격리).
    const otherComp = await prisma.competition.upsert({
      where: { apiCompetitionId: COMP_API_ID + 1 },
      create: {
        apiCompetitionId: COMP_API_ID + 1,
        name: 'Other Fixture League',
        country: 'Testland',
        type: CompetitionType.LEAGUE,
        format: CompetitionFormat.ROUND_ROBIN,
        isTracked: false,
        displayOrder: 200,
      },
      update: { isTracked: false, displayOrder: 200 },
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

  /** 각 테스트 앞에서 이 스펙이 만든 모든 매치 상태·backfillJob·부산물을 초기화.
   *  otherMatchId · excludedMatchIds 도 포함해야 앞 테스트 잔여가 뒤 테스트로 흘러가지 않음. */
  const resetSeason = async () => {
    const allIds = [...matchIdByFx.values(), ...excludedMatchIds];
    if (otherMatchId > 0) allIds.push(otherMatchId);
    await prisma.playerMatchStat.deleteMany({ where: { matchId: { in: allIds } } });
    await prisma.teamMatchStat.deleteMany({ where: { matchId: { in: allIds } } });
    await prisma.matchEvent.deleteMany({ where: { matchId: { in: allIds } } });
    await prisma.lineupEntry.deleteMany({ where: { matchId: { in: allIds } } });
    await prisma.matchLineup.deleteMany({ where: { matchId: { in: allIds } } });
    // 정상 대상 20 경기는 초기 상태 (has_*=null · detail_checked_at=null · statsState=NONE · 시도 0 · FT)
    // statusShort 는 case 14 가 PST 로 바꾼다 — 다음 테스트로 흘러가지 않게 FT 로 되돌린다
    await prisma.match.updateMany({
      where: { id: { in: [...matchIdByFx.values(), otherMatchId].filter((n) => n > 0) } },
      data: {
        hasLineups: null, hasEvents: null, hasTeamStats: null, hasPlayerStats: null,
        detailCheckedAt: null, confirmedAt: null, statsState: 'NONE',
        detailAttempts: 0, detailLastAttemptAt: null, statusShort: 'FT',
      },
    });
    // 반례 경기들은 시드된 조건 (detailCheckedAt=997_481 만 세팅 등) 유지 — 대신 has_* 는 항상 null
    await prisma.match.updateMany({
      where: { id: { in: excludedMatchIds } },
      data: {
        hasLineups: null, hasEvents: null, hasTeamStats: null, hasPlayerStats: null,
        confirmedAt: null, statsState: 'NONE',
        detailAttempts: 0, detailLastAttemptAt: null,
      },
    });
    await prisma.backfillJob.deleteMany({
      where: { competitionSeasonId: { in: [competitionSeasonId, otherCompetitionSeasonId].filter((n) => n > 0) } },
    });
    fake.calls.length = 0;
    fake.quotaExhaustAt = null;
    fake.failEndpointAt = null;
    fakeQuota.used = 0;
    fakeQuota.limit = 7_500;
    fakeQuota.snapshotCount = 0;
    fakeQuota.deltaPerSnapshot = 0;
    fakeQuota.skipFirstDelta = 0;
  };

  /** 자기 competitionSeasonId 만 골라 검사. 다른 스펙 잔존 시즌이 함께 잡혀도 격리. */
  const mySeason = <T extends { competitionSeasonId: number }>(res: { perSeason: T[] }): T => {
    const s = res.perSeason.find((r) => r.competitionSeasonId === competitionSeasonId);
    if (!s) throw new Error(`perSeason 에 competitionSeasonId=${competitionSeasonId} 없음`);
    return s;
  };

  /** 정상 20 경기를 대상 SELECT 와 같은 정렬(kickoff asc, id asc)로. o[0] = FX 997_469 … o[19] = FX 997_450 */
  const ordered = () =>
    prisma.match.findMany({
      where: { id: { in: [...matchIdByFx.values()] } },
      orderBy: [{ kickoffAt: 'asc' }, { id: 'asc' }],
      select: { id: true, apiFixtureId: true },
    });

  /** 마지막 시도 시각을 지금보다 ms 만큼 과거로 — 백오프 창을 시계 대신 데이터로 넘긴다 */
  const backdate = async (id: number, ms: number) => {
    await prisma.match.update({ where: { id }, data: { detailLastAttemptAt: new Date(Date.now() - ms) } });
  };

  /** 한 경기의 상세 상태 · 시도 기록 · updated_at */
  const stateOf = (id: number) =>
    prisma.match.findUniqueOrThrow({
      where: { id },
      select: {
        hasLineups: true, hasEvents: true, hasTeamStats: true, hasPlayerStats: true,
        detailCheckedAt: true, detailAttempts: true, detailLastAttemptAt: true, updatedAt: true,
      },
    });

  /** 정상 20 경기 중 승격된(detail_checked_at 이 찬) id — 오름차순 */
  const promotedIds = async () =>
    (
      await prisma.match.findMany({
        where: { id: { in: [...matchIdByFx.values()] }, detailCheckedAt: { not: null } },
        select: { id: true },
      })
    )
      .map((m) => m.id)
      .sort((a, b) => a - b);

  /** 이 fixture 로 나간 가짜 API 콜 수 (resetSeason 이후 누적) */
  const fixtureCalls = (apiFixtureId: number) =>
    fake.calls.filter((c) => c.endsWith(`?fixture=${apiFixtureId}`)).length;

  const asc = (ids: number[]) => [...ids].sort((a, b) => a - b);

  const HOUR_MS = 60 * 60 * 1_000;

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
        for (const e of [...(it.startXI ?? []), ...(it.substitutes ?? [])]) {
          const k = knownApiPlayerId(e.player.id);
          if (k !== null) playerIds.add(k);
        }
      }
      for (const e of loadEvents(fx)) {
        const kp = knownApiPlayerId(e.player.id);
        if (kp !== null) playerIds.add(kp);
        const ka = knownApiPlayerId(e.assist.id);
        if (ka !== null) playerIds.add(ka);
      }
      for (const it of loadPlayers(fx)) {
        for (const p of it.players) {
          const k = knownApiPlayerId(p.player.id);
          if (k !== null) playerIds.add(k);
        }
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
    // 다른 스펙(l2/l6) 잔존 시즌이 함께 잡힐 수 있음 — 자기 competitionSeasonId 만 검사
    const s = mySeason(res);
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
    // 처리 순서는 대상 SELECT 의 kickoff asc — 여기서는 개수와 has_* 만 본다 (순서는 case 2)
    const processedMatches = await prisma.match.findMany({
      where: {
        competitionSeasonId,
        detailCheckedAt: { not: null },
        id: { notIn: excludedMatchIds }, // 반례 997_481 은 seed 시점 detail_checked_at 세팅 · 제외
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
  // Case 2: 커서 무시 — cursor_match_id 는 읽지도 쓰지도 않는다
  // ================================================================================================
  it('2. 커서 무시 — cursor_match_id 가 최대 id 여도 20 경기 전부 대상 · kickoff asc 앞 2경기 처리 · 커서 값 그대로', async () => {
    await resetSeason();
    const o = await ordered();
    expect(o).toHaveLength(N_FIXTURES);
    // 시드 kickoff 가 oldKickoff - i시간 — 가장 이른 경기가 마지막 FX
    expect(o[0].apiFixtureId).toBe(FX_BASE + N_FIXTURES - 1);
    expect(o[N_FIXTURES - 1].apiFixtureId).toBe(FX_BASE);
    const maxId = Math.max(...o.map((m) => m.id));

    await prisma.backfillJob.create({
      data: { competitionSeasonId, phase: BackfillPhase.DETAILS, cursorMatchId: maxId },
    });

    const res = await backfill.run({ season: SEASON_YEAR, limit: 2 });
    const s = mySeason(res);
    // 옛 코드(id > cursor)였다면 0 이었다
    expect(s.targeted).toBe(N_FIXTURES);
    expect(s.processed).toBe(2);

    // 처리된 매치는 kickoff 가 가장 이른 o[0], o[1]
    expect(await promotedIds()).toEqual(asc([o[0].id, o[1].id]));

    const job = await prisma.backfillJob.findUniqueOrThrow({ where: { competitionSeasonId } });
    expect(job.cursorMatchId).toBe(maxId); // 시드 값 그대로 — 갱신하지 않는다
    expect(job.phase).toBe(BackfillPhase.DETAILS); // phase 도 그대로
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
    expect(mySeason(res).processed).toBe(5);
    expect(res.overallStopped).toBe('limit_reached');
    // 4 콜 × 5 경기 = 20
    expect(fake.callCount).toBe(20);
  }, 180_000);

  // ================================================================================================
  // Case 4a: 자율 상한 (daily_cap) — used < limit 이지만 자율 상한(5700) 을 이미 넘긴 상태
  // ================================================================================================
  it('4a. --limit=100 · 자율 상한 앞 2경기치만 → 2 경기 · daily_cap', async () => {
    await resetSeason();
    // limit=7500, used=5692, 자율 상한 5700 → remaining=8, /4=2
    fakeQuota.used = 5_692;
    fakeQuota.limit = 7_500;

    const res = await backfill.run({ season: SEASON_YEAR, limit: 100 });
    expect(res.totalProcessed).toBe(2);
    expect(mySeason(res).processed).toBe(2);
    // 두 경기 처리 후 매 경기 앞 재확인에서 자율 상한에 도달 → daily_cap
    expect(res.overallStopped).toBe('daily_cap');
    expect(mySeason(res).stoppedReason).toBe('daily_cap');
  }, 180_000);

  // ================================================================================================
  // Case 4b: API 상한 (quota_exhausted) — 시즌 진입에서 used>=limit 인 극단 상태
  // ================================================================================================
  it('4b. --limit=100 · 시즌 진입 시 used>=limit → 0 경기 · quota_exhausted', async () => {
    await resetSeason();
    // used=7500, limit=7500 → remaining=0. 시즌 진입 quota 판정에서 quota_exhausted
    fakeQuota.used = 7_500;
    fakeQuota.limit = 7_500;

    const res = await backfill.run({ season: SEASON_YEAR, limit: 100 });
    expect(res.totalProcessed).toBe(0);
    expect(mySeason(res).processed).toBe(0);
    // used >= limit → quota_exhausted
    expect(res.overallStopped).toBe('quota_exhausted');
    expect(mySeason(res).stoppedReason).toBe('quota_exhausted');
  }, 180_000);

  // ================================================================================================
  // Case 5: ApiQuotaExhaustedError 중단
  // ================================================================================================
  it('5. ApiQuotaExhaustedError — 3번째 경기 lineups 에서 throw → quota_exhausted · 끊긴 경기는 시도로 안 셈 · cursor 안 씀', async () => {
    await resetSeason();
    fakeQuota.used = 0;
    fakeQuota.limit = 7_500;

    // 3번째로 처리될 매치 (kickoff asc)
    const o = await ordered();
    fake.quotaExhaustAt = { fixture: o[2].apiFixtureId, path: '/fixtures/lineups' };

    const res = await backfill.run({ season: SEASON_YEAR, limit: 10 });
    const s = mySeason(res);
    expect(s.stoppedReason).toBe('quota_exhausted');
    expect(res.overallStopped).toBe('quota_exhausted');
    expect(s.processed).toBe(2); // 2 경기 완료 시도

    const job = await prisma.backfillJob.findUniqueOrThrow({ where: { competitionSeasonId } });
    // 상세 백필은 phase 를 안 건드린다. 최초 create 는 default(PENDING) 로 남는다.
    expect(job.phase).toBe(BackfillPhase.PENDING);
    // 커서는 쓰지 않는다 — 재개는 대상 SELECT 가 맡는다
    expect(job.cursorMatchId).toBeNull();

    // 4콜을 다 시도한 두 경기만 시도 1. quota 로 끊긴 3번째는 시도로 안 센다
    expect((await stateOf(o[0].id)).detailAttempts).toBe(1);
    expect((await stateOf(o[1].id)).detailAttempts).toBe(1);
    const third = await stateOf(o[2].id);
    expect(third.detailAttempts).toBe(0);
    expect(third.detailLastAttemptAt).toBeNull();
  }, 180_000);

  // ================================================================================================
  // Case 6: 한 엔드포인트 실패
  // ================================================================================================
  it('6. 한 엔드포인트 실패 — 2번째 경기 events 만 실패 → 그 경기 failed=1 · 다른 endpoint 는 진행 · 3번째 경기 정상', async () => {
    await resetSeason();
    fakeQuota.used = 0;
    fakeQuota.limit = 7_500;

    const o = await ordered();
    fake.failEndpointAt = { fixture: o[1].apiFixtureId, path: '/fixtures/events', message: 'test events fail' };

    const res = await backfill.run({ season: SEASON_YEAR, limit: 3 });
    const s = mySeason(res);
    expect(s.processed).toBe(3);
    expect(s.failed).toBe(1);
    // 진행은 계속되므로 overallStopped 는 limit_reached (limit=3 인데 3 다 처리하고 뒤에 남음)
    expect(s.stoppedReason).toBe('limit_reached');
    expect(res.overallStopped).toBe('limit_reached');

    // 2번째 매치는 has_lineups=true (부분 성공) · has_events 는 null (실패)
    const second = await stateOf(o[1].id);
    expect(second.hasLineups).toBe(true);
    expect(second.hasEvents).toBeNull(); // 실패로 유지
    expect(second.hasTeamStats).toBe(true); // 다음 endpoint 진행됨
    expect(second.hasPlayerStats).toBe(true);
    // 승격 안 됨 (has_events NULL)
    expect(second.detailCheckedAt).toBeNull();
    // 실패해도 시도는 센다 — 1h 뒤 다시 대상
    expect(second.detailAttempts).toBe(1);
    expect(second.detailLastAttemptAt).not.toBeNull();

    // 3번째 매치는 온전히 처리
    const third = await stateOf(o[2].id);
    expect(third.hasLineups).toBe(true);
    expect(third.hasEvents).toBe(true);
    expect(third.hasTeamStats).toBe(true);
    expect(third.hasPlayerStats).toBe(true);
    expect(third.detailCheckedAt).not.toBeNull();
    expect(third.detailAttempts).toBe(1);

    // 커서는 쓰지 않는다
    const job = await prisma.backfillJob.findUniqueOrThrow({ where: { competitionSeasonId } });
    expect(job.cursorMatchId).toBeNull();
  }, 180_000);

  // ================================================================================================
  // Case 7: 모든 대상 매치가 detail_checked_at 이 채워진 대회시즌은 targeted=0 이라 skip
  // (예전 phase=DONE skip 케이스 재작성 — 이제 phase 는 오케스트레이터가 안 읽는다)
  // ================================================================================================
  it('7. 모든 대상 매치가 detail_checked_at 이 채워진 대회시즌은 targeted=0 이라 skip (phase 무관)', async () => {
    await resetSeason();
    // 모든 정상 대상 매치를 이미 처리된 상태로 세팅
    const matchIds = [...matchIdByFx.values()];
    await prisma.match.updateMany({
      where: { id: { in: matchIds } },
      data: { detailCheckedAt: new Date() },
    });

    const res = await backfill.run({ season: SEASON_YEAR, limit: 10 });
    const s = mySeason(res);
    expect(s.targeted).toBe(0);
    expect(s.processed).toBe(0);
    expect(s.stoppedReason).toBe('no_targets');
    // API 는 한 번도 안 부름
    expect(fake.callCount).toBe(0);
    // backfillJob row 자체가 생성되지 않음 (오케스트레이터가 continue 로 통과)
    const job = await prisma.backfillJob.findUnique({ where: { competitionSeasonId } });
    expect(job).toBeNull();
  }, 60_000);

  // ================================================================================================
  // Case 8: dry-run
  // ================================================================================================
  it('8. dry-run — API 안 부름 · targeted 계산됨 · 매치·job 안 건드림', async () => {
    await resetSeason();

    const res = await backfill.run({ season: SEASON_YEAR, limit: 3, dryRun: true });
    expect(res.dryRun).toBe(true);
    expect(fake.callCount).toBe(0);
    const s = mySeason(res);
    expect(s.targeted).toBe(N_FIXTURES);
    expect(s.processed).toBe(0);
    // 매치 안 건드림 (반례 997_481 은 seed 시점 detailCheckedAt 세팅 · 제외)
    const processed = await prisma.match.count({
      where: { competitionSeasonId, detailCheckedAt: { not: null }, id: { notIn: excludedMatchIds } },
    });
    expect(processed).toBe(0);
    // backfillJob 안 만듦
    const job = await prisma.backfillJob.findUnique({ where: { competitionSeasonId } });
    expect(job).toBeNull();
    // quota snapshot 도 안 부름
    expect(fakeQuota.snapshotCount).toBe(0);
    // 시도 기록도 안 남김
    const untouched = await prisma.match.count({
      where: { id: { in: [...matchIdByFx.values()] }, detailAttempts: 0 },
    });
    expect(untouched).toBe(N_FIXTURES);
  }, 60_000);

  // ================================================================================================
  // Case 9: no_targets — 대상 없으면 stoppedReason='no_targets' · job 자체 생성 안 함
  // (phase 를 안 쓰는 규약 — 대상 없으면 아무 상태도 남기지 않는다)
  // ================================================================================================
  it('9. no_targets — 이미 다 처리된 시즌 → job 생성 안 함 · stoppedReason=no_targets', async () => {
    await resetSeason();
    // 모든 매치를 detailCheckedAt 세팅 → 대상 0
    await prisma.match.updateMany({
      where: { competitionSeasonId, detailEligible: true },
      data: { detailCheckedAt: new Date() },
    });

    const res = await backfill.run({ season: SEASON_YEAR, limit: 10 });
    const s = mySeason(res);
    expect(s.targeted).toBe(0);
    expect(s.processed).toBe(0);
    expect(s.stoppedReason).toBe('no_targets');

    // 상세 백필은 대상 없으면 job 을 만들지 않는다 (phase 소유권 규약)
    const job = await prisma.backfillJob.findUnique({ where: { competitionSeasonId } });
    expect(job).toBeNull();
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

  // ================================================================================================
  // Case 11: 매 경기 앞 quota 재확인 — 시즌 시작 시 여유 있어도 진행 중 자율 상한 넘으면 그 경기 앞에서 중단
  // ================================================================================================
  it('11. 매 경기 앞 재확인 — used 가 진행 중 자율 상한 넘기면 그 경기 앞에서 daily_cap', async () => {
    await resetSeason();
    // 시즌 진입 시 used=5000 (자율 상한 5700 대비 700 여유 · 예산상 175 경기치)
    // 시즌 진입 snapshot 은 skip. 매 경기 앞 snapshot 마다 used 를 232 씩 늘림 →
    //   경기1 앞: used=5000 (통과, 5700-5000=700 >= 4) → 이후 5232
    //   경기2 앞: used=5232 (통과, 5700-5232=468 >= 4) → 이후 5464
    //   경기3 앞: used=5464 (통과, 5700-5464=236 >= 4) → 이후 5696
    //   경기4 앞: used=5696 (부족, 5700-5696=4 == PER_MATCH_CALLS 통과) → 이후 5928
    //   → 필요한 건 4 미만이 되게 하는 것. delta 를 233 으로 조정:
    //   경기1 앞 5000 → 이후 5233
    //   경기2 앞 5233 → 이후 5466
    //   경기3 앞 5466 → 이후 5699 (5700-5466=234 >= 4 통과)
    //   경기4 앞 5699 → 5700-5699=1 < 4 → daily_cap 중단
    //   확인: 3경기 처리, 4번째 경기 앞에서 중단
    fakeQuota.used = 5_000;
    fakeQuota.limit = 7_500;
    fakeQuota.skipFirstDelta = 1; // 시즌 진입 snapshot 은 delta 적용 안 함
    fakeQuota.deltaPerSnapshot = 233;

    const res = await backfill.run({ season: SEASON_YEAR, limit: 100 });
    const s = mySeason(res);
    expect(s.processed).toBe(3);
    expect(s.stoppedReason).toBe('daily_cap');
    expect(res.overallStopped).toBe('daily_cap');
    // API 호출은 3경기 × 4엔드포인트 = 12
    expect(fake.callCount).toBe(12);
  }, 180_000);

  // ================================================================================================
  // Case 12: 상세 백필을 돌려도 backfill_jobs.phase 가 변하지 않는다
  // (L2·L6 백필-1 완료 표시 · L1 락과 공유되는 신호라 우리 소유가 아니다)
  // ================================================================================================
  it('12. 상세 백필을 돌려도 backfill_jobs.phase 는 변하지 않는다 (DONE 유지)', async () => {
    await resetSeason();
    fakeQuota.used = 0;
    fakeQuota.limit = 7_500;

    // 시나리오: L6 백필-1 이 이미 세운 DONE 상태 + cursor 없음
    const jobStartedAt = new Date(Date.now() - 24 * 60 * 60 * 1_000);
    await prisma.backfillJob.create({
      data: {
        competitionSeasonId,
        phase: BackfillPhase.DONE,
        startedAt: jobStartedAt,
        cursorMatchId: null,
        total: 0,
        done: 0,
        failed: 0,
      },
    });

    const res = await backfill.run({ season: SEASON_YEAR, limit: 3 });
    const s = mySeason(res);
    // 상세 백필은 phase 를 무시하고 대상 SELECT 로만 판정 — 3 경기 처리
    expect(s.processed).toBe(3);
    expect(s.targeted).toBe(N_FIXTURES);

    const job = await prisma.backfillJob.findUniqueOrThrow({ where: { competitionSeasonId } });
    // phase 는 그대로 DONE — 상세 백필이 덮지 않는다
    expect(job.phase).toBe(BackfillPhase.DONE);
    // done/failed 는 상세 백필이 갱신 · cursor 는 쓰지 않아 시드 값(null) 그대로
    expect(job.cursorMatchId).toBeNull();
    expect(job.done).toBe(3);
    expect(job.failed).toBe(0);
    // startedAt 도 유지 (create 안 됐고 update 만 됐다)
    expect(job.startedAt?.getTime()).toBe(jobStartedAt.getTime());
  }, 180_000);

  // ================================================================================================
  // Case 13: total/done/failed 가 진행에 맞게 갱신된다
  // ================================================================================================
  it('13. total·done·failed 가 진행에 맞게 갱신된다 (한 endpoint 실패 시 failed 증가) · 시도 1 은 처리한 5경기만', async () => {
    await resetSeason();
    fakeQuota.used = 0;
    fakeQuota.limit = 7_500;

    // kickoff asc 앞 5 매치 중 2번째의 events 만 실패시키기
    const o = await ordered();
    fake.failEndpointAt = { fixture: o[1].apiFixtureId, path: '/fixtures/events', message: 'test events fail' };

    const res = await backfill.run({ season: SEASON_YEAR, limit: 5 });
    const s = mySeason(res);
    expect(s.processed).toBe(5);
    expect(s.failed).toBe(1);

    // job 진행 지표 확인 — done=5 · failed=1 · total=targeted · cursor 는 안 씀
    const job = await prisma.backfillJob.findUniqueOrThrow({ where: { competitionSeasonId } });
    expect(job.done).toBe(5);
    expect(job.failed).toBe(1);
    expect(job.total).toBe(N_FIXTURES);
    expect(job.cursorMatchId).toBeNull();
    // phase 는 create default(PENDING) 그대로 — 상세 백필이 안 건드림
    expect(job.phase).toBe(BackfillPhase.PENDING);

    // 시도 기록 — 처리한 5경기(실패 1 포함)만 1, 나머지 15경기는 0
    const ids = [...matchIdByFx.values()];
    expect(await prisma.match.count({ where: { id: { in: ids }, detailAttempts: 1 } })).toBe(5);
    expect(await prisma.match.count({ where: { id: { in: ids }, detailAttempts: 0 } })).toBe(N_FIXTURES - 5);
  }, 180_000);

  // ================================================================================================
  // Case 14 (a): id 가 작은데 늦게 끝난 경기 — 커서였다면 영구히 빠졌다
  // ================================================================================================
  it('14. id 가 가장 작은 경기가 PST 로 빠졌다가 FT 가 되면 다음 판이 처리한다 (커서 시절엔 영구 누락)', async () => {
    await resetSeason();
    const o = await ordered();
    const late = o.reduce((a, b) => (b.id < a.id ? b : a));
    await prisma.match.update({ where: { id: late.id }, data: { statusShort: 'PST' } });

    const run1 = mySeason(await backfill.run({ season: SEASON_YEAR, limit: 5 }));
    expect(run1.targeted).toBe(N_FIXTURES - 1);
    expect(run1.processed).toBe(5);
    // kickoff asc 앞 5경기 (late 제외)
    const firstFive = o.filter((m) => m.id !== late.id).slice(0, 5).map((m) => m.id);
    expect(await promotedIds()).toEqual(asc(firstFive));
    const lateAfter1 = await stateOf(late.id);
    expect(lateAfter1.detailCheckedAt).toBeNull();
    expect(lateAfter1.detailAttempts).toBe(0);

    // 경기가 끝났다 — 옛 커서(id > 5번째 처리 id)라면 late 는 영영 대상 밖이었다
    await prisma.match.update({ where: { id: late.id }, data: { statusShort: 'FT' } });
    const run2 = mySeason(await backfill.run({ season: SEASON_YEAR, limit: 20 }));
    expect(run2.targeted).toBe(N_FIXTURES - 5);
    expect(run2.processed).toBe(N_FIXTURES - 5);
    expect(run2.stoppedReason).toBe('done');
    const lateAfter2 = await stateOf(late.id);
    expect(lateAfter2.detailCheckedAt).not.toBeNull();
    expect(lateAfter2.detailAttempts).toBe(1);

    const job = await prisma.backfillJob.findUniqueOrThrow({ where: { competitionSeasonId } });
    expect(job.cursorMatchId).toBeNull();
  }, 180_000);

  // ================================================================================================
  // Case 15 (b): 실패 → 1시간 백오프
  // ================================================================================================
  it('15. 실패한 경기는 1시간 백오프 동안 대상 밖 · 지나면 다시 처리·승격', async () => {
    await resetSeason();
    const o = await ordered();
    const fx0 = o[0].apiFixtureId;
    fake.failEndpointAt = { fixture: fx0, path: '/fixtures/events', message: 'test events fail' };

    // 1회 — 실패
    const t0 = Date.now();
    const run1 = mySeason(await backfill.run({ season: SEASON_YEAR, limit: 1 }));
    const t1 = Date.now();
    expect(run1.processed).toBe(1);
    expect(run1.failed).toBe(1);
    const a1 = await stateOf(o[0].id);
    expect(a1.detailAttempts).toBe(1);
    expect(a1.detailCheckedAt).toBeNull();
    const at1 = a1.detailLastAttemptAt?.getTime();
    expect(at1).toBeGreaterThanOrEqual(t0);
    expect(at1).toBeLessThanOrEqual(t1);

    // 실패 해제 — 그래도 1h 안이라 o[0] 은 대상 밖. 다음 경기 o[1] 이 처리된다
    fake.failEndpointAt = null;
    const run2 = mySeason(await backfill.run({ season: SEASON_YEAR, limit: 1 }));
    expect(run2.targeted).toBe(N_FIXTURES - 1);
    expect(run2.processed).toBe(1);
    expect(await promotedIds()).toEqual([o[1].id]);
    expect((await stateOf(o[0].id)).detailAttempts).toBe(1);

    // 1h 지남 — o[0] 이 kickoff 가 가장 일러 먼저 처리되고 승격
    await backdate(o[0].id, 61 * 60 * 1_000);
    const run3 = mySeason(await backfill.run({ season: SEASON_YEAR, limit: 1 }));
    expect(run3.targeted).toBe(N_FIXTURES - 1);
    expect(run3.processed).toBe(1);
    const a3 = await stateOf(o[0].id);
    expect(a3.detailCheckedAt).not.toBeNull();
    expect(a3.detailAttempts).toBe(2);
    // o[0] 콜: 1회 4 + 3회 4
    expect(fixtureCalls(fx0)).toBe(8);
  }, 180_000);

  // ================================================================================================
  // Case 16 (c): 3회 실패 → 영구 제외 + 포기 warn
  // ================================================================================================
  it('16. 3회 실패하면 영구 제외 · 상세 재시도 포기 warn 정확히 1건 (1회 뒤 1h · 2회 뒤 6h 백오프)', async () => {
    await resetSeason();
    const o = await ordered();
    const fx0 = o[0].apiFixtureId;
    // 테스트 내내 o[0] events 실패
    fake.failEndpointAt = { fixture: fx0, path: '/fixtures/events', message: 'test events fail' };
    const warn = vi.spyOn((backfill as unknown as { logger: Logger }).logger, 'warn');
    const giveUps = () => warn.mock.calls.filter(([msg]) => String(msg).includes('상세 재시도 포기'));
    try {
      // 1회
      let s = mySeason(await backfill.run({ season: SEASON_YEAR, limit: 1 }));
      expect(s.processed).toBe(1);
      expect((await stateOf(o[0].id)).detailAttempts).toBe(1);

      // 2회 — 1h 지나 재시도 · 또 실패 · 아직 포기 아님
      await backdate(o[0].id, 61 * 60 * 1_000);
      s = mySeason(await backfill.run({ season: SEASON_YEAR, limit: 1 }));
      expect(s.processed).toBe(1);
      expect((await stateOf(o[0].id)).detailAttempts).toBe(2);
      expect(giveUps()).toHaveLength(0);

      // 2회 뒤 2h — 6h 백오프 안이라 o[0] 제외 · 다음 경기 o[1] 처리
      await backdate(o[0].id, 2 * HOUR_MS);
      s = mySeason(await backfill.run({ season: SEASON_YEAR, limit: 1 }));
      expect(s.targeted).toBe(N_FIXTURES - 1);
      expect(s.processed).toBe(1);
      expect((await stateOf(o[1].id)).detailCheckedAt).not.toBeNull();
      expect((await stateOf(o[0].id)).detailAttempts).toBe(2);

      // 3회 — 6h 지나 재시도 · 또 실패 → 포기 warn 1건
      await backdate(o[0].id, 6 * HOUR_MS + 60 * 1_000);
      s = mySeason(await backfill.run({ season: SEASON_YEAR, limit: 1 }));
      expect(s.targeted).toBe(N_FIXTURES - 1);
      expect(s.processed).toBe(1);
      expect((await stateOf(o[0].id)).detailAttempts).toBe(3);
      const g = giveUps();
      expect(g).toHaveLength(1);
      expect(String(g[0][0])).toContain(`match ${o[0].id} (fixture ${fx0})`);

      // 30일 뒤에도 제외 — 다음 경기 o[2] 처리 · warn 은 더 안 나온다
      await backdate(o[0].id, 30 * 24 * HOUR_MS);
      s = mySeason(await backfill.run({ season: SEASON_YEAR, limit: 1 }));
      expect(s.targeted).toBe(N_FIXTURES - 2);
      expect(s.processed).toBe(1);
      expect((await stateOf(o[2].id)).detailCheckedAt).not.toBeNull();
      const a5 = await stateOf(o[0].id);
      expect(a5.detailAttempts).toBe(3);
      expect(a5.detailCheckedAt).toBeNull();
      expect(giveUps()).toHaveLength(1);
      // o[0] 콜: 1·2·3회 × 4
      expect(fixtureCalls(fx0)).toBe(12);
    } finally {
      warn.mockRestore();
    }
  }, 180_000);

  // ================================================================================================
  // Case 17 (d): quota 예외로 끊긴 경기는 시도로 안 센다
  // ================================================================================================
  it('17. players 에서 quota 예외로 끊긴 경기는 시도 0 · job 도 없음 · 다음 판이 처음처럼 처리', async () => {
    await resetSeason();
    const o = await ordered();
    fake.quotaExhaustAt = { fixture: o[0].apiFixtureId, path: '/fixtures/players' };

    const res1 = await backfill.run({ season: SEASON_YEAR, limit: 3 });
    const s1 = mySeason(res1);
    expect(s1.processed).toBe(0);
    expect(s1.stoppedReason).toBe('quota_exhausted');
    expect(res1.overallStopped).toBe('quota_exhausted');
    const a1 = await stateOf(o[0].id);
    expect(a1.hasLineups).toBe(true);
    expect(a1.hasEvents).toBe(true);
    expect(a1.hasTeamStats).toBe(true);
    expect(a1.hasPlayerStats).toBeNull();
    expect(a1.detailCheckedAt).toBeNull();
    expect(a1.detailAttempts).toBe(0);
    expect(a1.detailLastAttemptAt).toBeNull();
    expect(await prisma.backfillJob.findUnique({ where: { competitionSeasonId } })).toBeNull();

    fake.quotaExhaustAt = null;
    const s2 = mySeason(await backfill.run({ season: SEASON_YEAR, limit: 1 }));
    expect(s2.processed).toBe(1);
    const a2 = await stateOf(o[0].id);
    expect(a2.detailCheckedAt).not.toBeNull();
    expect(a2.detailAttempts).toBe(1);
  }, 180_000);

  // ================================================================================================
  // Case 18 (e): 4갈래 전부 실패해도 updated_at 은 그대로 — 시도 기록은 raw UPDATE
  // ================================================================================================
  it('18. 4갈래 전부 실패 → 시도 1 · has_* 전부 null · updated_at 불변', async () => {
    await resetSeason();
    const o = await ordered();
    fake.failEndpointAt = {
      fixture: o[0].apiFixtureId,
      path: ['/fixtures/lineups', '/fixtures/events', '/fixtures/statistics', '/fixtures/players'],
      message: 'test all fail',
    };
    const before = (await stateOf(o[0].id)).updatedAt;

    const s = mySeason(await backfill.run({ season: SEASON_YEAR, limit: 1 }));
    expect(s.processed).toBe(1);
    expect(s.failed).toBe(1);

    const a = await stateOf(o[0].id);
    expect(a.detailAttempts).toBe(1);
    expect(a.detailLastAttemptAt).not.toBeNull();
    expect(a.hasLineups).toBeNull();
    expect(a.hasEvents).toBeNull();
    expect(a.hasTeamStats).toBeNull();
    expect(a.hasPlayerStats).toBeNull();
    expect(a.detailCheckedAt).toBeNull();
    // Prisma update 였다면 @updatedAt 이 올라갔다
    expect(a.updatedAt.getTime()).toBe(before.getTime());
  }, 180_000);
});
