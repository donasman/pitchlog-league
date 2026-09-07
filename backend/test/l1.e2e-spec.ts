/**
 * L1 스쿼드 diff — 쓰기 불변식 (BACKEND_FEATURES L1 #8, Phase 1 관문)
 *
 * 판정 로직 자체는 `src/ingestion/l1/squad-diff.spec.ts` 가 DB 없이 검증한다.
 * 여기서는 DB 에 실제로 쓸 때만 드러나는 것을 본다:
 *   - (선수, 시즌) 열린 행이 언제나 하나 이하 (partial unique squad_entries_current_uq)
 *   - 이적이 이력 2행으로 남는다
 *   - 빈 응답·급감·백필 락 팀은 아무것도 쓰지 않는다
 *   - 끝난 뒤 고아 행이 없다
 *
 * 이 파일은 도메인 테이블에 가짜 행을 쓴다 — 로컬 DB 나 CI 에서만 돈다.
 */
import 'dotenv/config';
import { Test } from '@nestjs/testing';
import type { INestApplicationContext } from '@nestjs/common';
import { PrismaService } from '../src/prisma/prisma.service.js';
import { IntegrityService } from '../src/prisma/integrity.service.js';
import { ApiFootballClient } from '../src/ingestion/api-football/api-football.client.js';
import { L1Service, todayInKst } from '../src/ingestion/l1/l1.service.js';
import { BackfillPhase, CompetitionFormat, CompetitionType } from '../src/generated/prisma/client.js';
import type { ApiEnvelope, ApiSquad } from '../src/ingestion/api-football/api-football.types.js';

/** 다른 e2e 파일의 데이터와 섞이지 않도록 카탈로그 밖 id 를 쓴다 */
const FIXTURE_COMPETITION_API_ID = 990_039;
const SEASON_YEAR = 2026;
const TEAM_A = 990_001;
const TEAM_B = 990_002;
const TEAM_C = 990_003;
const FIXTURE_TEAMS = [TEAM_A, TEAM_B, TEAM_C];
/** 선수 id 대역 — 어설션을 이 대역으로 좁힌다 */
const P = (n: number) => 990_100 + n;

type SquadPlayer = ApiSquad['players'][number];

const player = (id: number, number: number | null, position: string): SquadPlayer =>
  ({ id, name: `Player ${id}`, age: 25, number, position, photo: `https://x/${id}.png` });

class FakeApiFootballClient {
  calls: string[] = [];
  /** apiTeamId → 스쿼드. 없으면 기본 명단을 준다 (다른 테스트가 남긴 팀들) */
  squads = new Map<number, SquadPlayer[]>();

  get callCount(): number {
    return this.calls.length;
  }

  async get<T>(path: string, query: Record<string, string | number> = {}): Promise<ApiEnvelope<T>> {
    this.calls.push(`${path}?team=${query.team}`);
    if (path !== '/players/squads') throw new Error(`가짜 클라이언트가 모르는 경로: ${path}`);
    const team = Number(query.team);
    const players = this.squads.get(team) ?? this.defaultSquad(team);
    const response = [{ team: { id: team, name: `Team ${team}`, logo: null }, players }] as T;
    return { get: path, parameters: {}, errors: [], results: 1, paging: { current: 1, total: 1 }, response };
  }

  /** 픽스처 밖 팀 — 팀마다 겹치지 않는 선수 2명. 우리 어설션 대역(990_1xx) 밖이다 */
  private defaultSquad(team: number): SquadPlayer[] {
    return [player(700_000 + team * 2, 1, 'Goalkeeper'), player(700_001 + team * 2, 2, 'Defender')];
  }
}

describe('L1 스쿼드 diff (e2e, 가짜 API)', () => {
  let app: INestApplicationContext;
  let prisma: PrismaService;
  let l1: L1Service;
  let fake: FakeApiFootballClient;
  let competitionSeasonId: number;
  const teamIdByApi = new Map<number, number>();

  beforeAll(async () => {
    const host = new URL(process.env.DATABASE_URL ?? 'postgresql://x/').hostname;
    const local = ['localhost', '127.0.0.1', '::1'].includes(host);
    if (!local && !process.env.CI && process.env.E2E_ALLOW_REMOTE_DB !== '1') {
      throw new Error(`l1 e2e 는 가짜 데이터를 쓰므로 원격 DB(${host})에서는 돌리지 않는다 — 로컬 Postgres 를 쓰거나 E2E_ALLOW_REMOTE_DB=1`);
    }
    const { AppModule } = await import('../src/app.module.js');
    fake = new FakeApiFootballClient();
    const mod = await Test.createTestingModule({ imports: [AppModule] }).overrideProvider(ApiFootballClient).useValue(fake).compile();
    app = await mod.init();
    prisma = app.get(PrismaService);
    l1 = app.get(L1Service);

    // 픽스처: 화면 범위(displayOrder ≤ 100) 안의 대회 1개 · 현재 시즌 · 팀 3개
    await prisma.season.upsert({ where: { year: SEASON_YEAR }, create: { year: SEASON_YEAR }, update: {} });
    const season = await prisma.season.findUniqueOrThrow({ where: { year: SEASON_YEAR } });
    const competition = await prisma.competition.upsert({
      where: { apiCompetitionId: FIXTURE_COMPETITION_API_ID },
      create: {
        apiCompetitionId: FIXTURE_COMPETITION_API_ID, name: 'L1 Fixture League', country: 'Testland',
        type: CompetitionType.LEAGUE, format: CompetitionFormat.ROUND_ROBIN, isTracked: true, displayOrder: 90,
      },
      update: { isTracked: true, displayOrder: 90 },
    });
    const cs = await prisma.competitionSeason.upsert({
      where: { competitionId_seasonId: { competitionId: competition.id, seasonId: season.id } },
      create: { competitionId: competition.id, seasonId: season.id, apiSeasonValue: SEASON_YEAR, isCurrent: true },
      update: { isCurrent: true },
    });
    competitionSeasonId = cs.id;

    for (const apiTeamId of FIXTURE_TEAMS) {
      const team = await prisma.team.upsert({
        where: { apiTeamId },
        create: { apiTeamId, name: `Team ${apiTeamId}`, country: 'Testland' },
        update: {},
      });
      teamIdByApi.set(apiTeamId, team.id);
      const exists = await prisma.competitionEntry.findFirst({ where: { competitionSeasonId: cs.id, teamId: team.id } });
      if (!exists) await prisma.competitionEntry.create({ data: { competitionSeasonId: cs.id, teamId: team.id } });
    }
  }, 120_000);

  afterAll(async () => {
    await app.close();
  });

  /** 픽스처 선수들의 소속 이력 (닫힌 것 포함) */
  const historyOf = async (apiPlayerId: number) => {
    const p = await prisma.player.findUnique({ where: { apiPlayerId } });
    if (!p) return [];
    return prisma.squadEntry.findMany({
      where: { playerId: p.id, seasonYear: SEASON_YEAR },
      orderBy: { id: 'asc' },
      select: { teamId: true, validFrom: true, validTo: true, jerseyNumber: true },
    });
  };

  const openOf = async (apiTeamId: number) =>
    prisma.squadEntry.count({ where: { teamId: teamIdByApi.get(apiTeamId), seasonYear: SEASON_YEAR, validTo: null } });

  /** 다음 실행이 "다른 날" 이 되도록 픽스처 행의 수집일을 과거로 민다 */
  const backdate = async () => {
    await prisma.squadEntry.updateMany({
      where: { seasonYear: SEASON_YEAR, validTo: null, teamId: { in: [...teamIdByApi.values()] } },
      data: { validFrom: new Date('2026-08-01T00:00:00Z') },
    });
  };

  /** 어떤 시점에도 (선수, 시즌) 열린 행은 하나 이하여야 한다 */
  const assertOneOpenPerPlayer = async () => {
    const dupes = await prisma.$queryRaw<{ player_id: number; n: bigint }[]>`
      SELECT "player_id", count(*) AS n FROM "squad_entries"
      WHERE "valid_to" IS NULL GROUP BY "player_id", "season_year" HAVING count(*) > 1`;
    expect(dupes).toEqual([]);
  };

  it('1. 첫 실행 — 참가팀 스쿼드가 전원 신규로 들어간다', async () => {
    fake.squads.set(TEAM_A, [player(P(1), 7, 'Midfielder'), player(P(2), 9, 'Attacker')]);
    fake.squads.set(TEAM_B, [player(P(3), 1, 'Goalkeeper')]);
    fake.squads.set(TEAM_C, [player(P(4), 4, 'Defender')]);

    const s = await l1.run();
    expect(s.seasonYear).toBe(SEASON_YEAR);
    expect(s.today).toBe(todayInKst());

    expect(await openOf(TEAM_A)).toBe(2);
    expect(await openOf(TEAM_B)).toBe(1);
    await assertOneOpenPerPlayer();
  }, 120_000);

  it('2. 무변화 재실행 — 행이 늘지 않는다', async () => {
    const before = await prisma.squadEntry.count({ where: { seasonYear: SEASON_YEAR } });
    await l1.run();
    expect(await prisma.squadEntry.count({ where: { seasonYear: SEASON_YEAR } })).toBe(before);
    await assertOneOpenPerPlayer();
  }, 120_000);

  it('3. 이적 — 이력 2행이 남고 열린 행은 하나', async () => {
    await backdate();
    fake.squads.set(TEAM_A, [player(P(2), 9, 'Attacker')]);
    fake.squads.set(TEAM_B, [player(P(3), 1, 'Goalkeeper'), player(P(1), 21, 'Midfielder')]);

    await l1.run();

    const history = await historyOf(P(1));
    expect(history).toHaveLength(2);
    expect(history[0].teamId).toBe(teamIdByApi.get(TEAM_A));
    expect(history[0].validTo).not.toBeNull();
    expect(history[1].teamId).toBe(teamIdByApi.get(TEAM_B));
    expect(history[1].validTo).toBeNull();
    expect(history[1].jerseyNumber).toBe(21);
    await assertOneOpenPerPlayer();
  }, 120_000);

  it('4. 등번호 변경 — 새 행 없이 기존 행이 바뀐다', async () => {
    await backdate();
    fake.squads.set(TEAM_B, [player(P(3), 13, 'Goalkeeper'), player(P(1), 21, 'Midfielder')]);
    const before = await historyOf(P(3));

    await l1.run();

    const after = await historyOf(P(3));
    expect(after).toHaveLength(before.length);
    expect(after.at(-1)!.jerseyNumber).toBe(13);
    expect(after.at(-1)!.validTo).toBeNull();
  }, 120_000);

  it('5. 빈 응답 — 그 팀은 건너뛰고 기존 소속을 유지한다', async () => {
    await backdate();
    const before = await openOf(TEAM_C);
    expect(before).toBeGreaterThan(0);
    fake.squads.set(TEAM_C, []);

    const s = await l1.run();

    expect(s.teams.skippedEmpty).toBeGreaterThanOrEqual(1);
    expect(s.partial).toBe(true);
    expect(await openOf(TEAM_C)).toBe(before);
    await assertOneOpenPerPlayer();
  }, 120_000);

  it('6. 급감 — 절반 이하로 줄면 건너뛴다', async () => {
    await backdate();
    // TEAM_A 를 4명으로 채운 뒤 1명으로 줄인다
    fake.squads.set(TEAM_C, [player(P(4), 4, 'Defender')]);
    fake.squads.set(TEAM_A, [player(P(2), 9, 'Attacker'), player(P(5), 5, 'Defender'), player(P(6), 6, 'Midfielder'), player(P(7), 8, 'Attacker')]);
    await l1.run();
    expect(await openOf(TEAM_A)).toBe(4);

    await backdate();
    fake.squads.set(TEAM_A, [player(P(2), 9, 'Attacker')]);
    const s = await l1.run();

    expect(s.teams.skippedShrunk).toBeGreaterThanOrEqual(1);
    expect(await openOf(TEAM_A)).toBe(4);
    await assertOneOpenPerPlayer();
  }, 120_000);

  it('7. 백필 진행 중 — 그 대회시즌 팀은 아무것도 쓰지 않는다 (SCHEMA_DESIGN 충돌 ③)', async () => {
    await backdate();
    await prisma.backfillJob.upsert({
      where: { competitionSeasonId },
      create: { competitionSeasonId, phase: BackfillPhase.DETAILS },
      update: { phase: BackfillPhase.DETAILS },
    });
    fake.squads.set(TEAM_A, []); // 락이 먼저 걸려 이 값은 쓰이지 않아야 한다
    const before = await prisma.squadEntry.findMany({
      where: { seasonYear: SEASON_YEAR, teamId: { in: [...teamIdByApi.values()] } },
      orderBy: { id: 'asc' }, select: { id: true, teamId: true, validTo: true },
    });

    const s = await l1.run();
    expect(s.teams.skippedBackfill).toBe(FIXTURE_TEAMS.length);

    const after = await prisma.squadEntry.findMany({
      where: { seasonYear: SEASON_YEAR, teamId: { in: [...teamIdByApi.values()] } },
      orderBy: { id: 'asc' }, select: { id: true, teamId: true, validTo: true },
    });
    expect(after).toEqual(before);

    await prisma.backfillJob.update({ where: { competitionSeasonId }, data: { phase: BackfillPhase.DONE } });
  }, 120_000);

  it('8. 고아 행이 없다', async () => {
    expect(await app.get(IntegrityService).findOrphans()).toEqual([]);
  }, 120_000);
});
