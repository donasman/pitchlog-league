/**
 * apiId 대역 998_xxx — assistant 도구 e2e. 실 데이터·다른 e2e 와 안 겹친다.
 * 원격 DB 가드 없음 (read-api·player-stats 관례 — 자체 apiId 대역이 실 데이터와 안 겹쳐 로컬·CI 어디서든 동작).
 *
 * 케이스:
 *   1. 도구 10개 정상 호출 → wrapper.data === 서비스 직접 호출 결과 (deep-equal)
 *   2. 인자 거부 (ajv BadRequest)
 *   3. description 3상태 문구 (`do not conflate` · `not measured` · `API did not provide`) 존재
 *   4. 모드 B 4개 도구에 6-대회 문구 존재
 *   5. golden.json 스모크 — 15건 · null 5 · called 10 · 도구 10개 각 최소 1회 · args 가 argsSchema 통과 (ajv)
 *   6. get_standings 컵(KNOCKOUT) → items[0].rows=[] · unavailableReason='KNOCKOUT'
 *   7. get_player — assists null 시즌 · totals.assists null
 *   8. get_player — primaryTeam 은 validTo IS NULL 인 팀
 *   9. list_matches — 3경기 시드 → limit=2 → truncated:true · total:3. limit=50 → truncated 없음
 *  10. stdio 스모크 — dist/cli/mcp.js 를 spawn, tools/list(10) · tools/call get_standings 왕복
 */
import 'dotenv/config';
import { execSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { Test } from '@nestjs/testing';
import type { INestApplication } from '@nestjs/common';
import { BadRequestException } from '@nestjs/common';
import { Ajv } from 'ajv';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { AppModule } from '../src/app.module.js';
import { setupApp } from '../src/app.setup.js';
import { PrismaService } from '../src/prisma/prisma.service.js';
import { AssistantToolRegistry } from '../src/assistant/assistant-tool.registry.js';
import { CompetitionService } from '../src/competition/competition.service.js';
import { TeamService } from '../src/team/team.service.js';
import { MatchService } from '../src/match/match.service.js';
import { StandingService } from '../src/standing/standing.service.js';
import { StatisticsService } from '../src/statistics/statistics.service.js';
import { PlayerService } from '../src/player/player.service.js';
import {
  CompetitionFormat,
  CompetitionType,
  RankingCategory,
  SeasonStatus,
  StatsSource,
  StatsState,
} from '../src/generated/prisma/client.js';

const API = 998_000;

const COMP_LEAGUE = API + 1;
const COMP_CUP = API + 2;
const TEAM_A = API + 1;
const TEAM_B = API + 2;
const TEAM_C = API + 3;
const PLAYER_1 = API + 11;
const VENUE_A = API + 1;
const VENUE_B = API + 2;
const VENUE_C = API + 3;

const FIXTURE_A = API + 100;
const FIXTURE_B = API + 101;
const FIXTURE_C = API + 102;

describe('assistant tools (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let registry: AssistantToolRegistry;
  let competitions: CompetitionService;
  let teams: TeamService;
  let matches: MatchService;
  let standings: StandingService;
  let stats: StatisticsService;
  let players: PlayerService;

  const ids = {
    compLeague: 0,
    compCup: 0,
    csLeague2026: 0,
    csLeague2025: 0,
    csCup2026: 0,
    teamA: 0,
    teamB: 0,
    teamC: 0,
    venueA: 0,
    venueB: 0,
    venueC: 0,
    player1: 0,
    roundLeague: 0,
    fixtureA: 0,
    fixtureB: 0,
    fixtureC: 0,
  };

  beforeAll(async () => {
    const mod = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = setupApp(mod.createNestApplication());
    await app.init();
    prisma = app.get(PrismaService);
    registry = app.get(AssistantToolRegistry);
    competitions = app.get(CompetitionService);
    teams = app.get(TeamService);
    matches = app.get(MatchService);
    standings = app.get(StandingService);
    stats = app.get(StatisticsService);
    players = app.get(PlayerService);

    await cleanup();

    const y = async (year: number): Promise<number> =>
      (await prisma.season.upsert({ where: { year }, create: { year }, update: {} })).id;
    const s2026 = await y(2026);
    const s2025 = await y(2025);

    const compLeague = await prisma.competition.create({
      data: {
        apiCompetitionId: COMP_LEAGUE,
        name: 'Assist Test League',
        country: 'Testland',
        countryCode: 'TL',
        type: CompetitionType.LEAGUE,
        format: CompetitionFormat.ROUND_ROBIN,
        isTracked: true,
        displayOrder: 81,
      },
    });
    const compCup = await prisma.competition.create({
      data: {
        apiCompetitionId: COMP_CUP,
        name: 'Assist Test Cup',
        country: 'Testland',
        type: CompetitionType.CUP,
        format: CompetitionFormat.KNOCKOUT,
        isTracked: true,
        displayOrder: 82,
        topFlightCompetitionId: compLeague.id,
      },
    });

    const asOf = new Date('2026-09-09T00:00:00Z');
    const csLeague2026 = await prisma.competitionSeason.create({
      data: {
        competitionId: compLeague.id,
        seasonId: s2026,
        apiSeasonValue: 2026,
        isCurrent: true,
        status: SeasonStatus.IN_PROGRESS,
        asOf,
      },
    });
    const csLeague2025 = await prisma.competitionSeason.create({
      data: {
        competitionId: compLeague.id,
        seasonId: s2025,
        apiSeasonValue: 2025,
        status: SeasonStatus.FINISHED,
        asOf,
      },
    });
    const csCup2026 = await prisma.competitionSeason.create({
      data: {
        competitionId: compCup.id,
        seasonId: s2026,
        apiSeasonValue: 2026,
        isCurrent: true,
        status: SeasonStatus.IN_PROGRESS,
        asOf,
      },
    });

    const venueA = await prisma.venue.create({
      data: { apiVenueId: VENUE_A, name: 'Venue A', city: 'City A' },
    });
    const venueB = await prisma.venue.create({
      data: { apiVenueId: VENUE_B, name: 'Venue B', city: 'City B' },
    });
    const venueC = await prisma.venue.create({
      data: { apiVenueId: VENUE_C, name: 'Venue C', city: 'City C' },
    });
    const teamA = await prisma.team.create({
      data: { apiTeamId: TEAM_A, name: 'Assist Team Alpha', country: 'Testland', venueId: venueA.id },
    });
    const teamB = await prisma.team.create({
      data: { apiTeamId: TEAM_B, name: 'Assist Team Beta', country: 'Testland', venueId: venueB.id },
    });
    const teamC = await prisma.team.create({
      data: { apiTeamId: TEAM_C, name: 'Assist Team Gamma', country: 'Testland', venueId: venueC.id },
    });

    await prisma.competitionEntry.createMany({
      data: [
        { competitionSeasonId: csLeague2026.id, teamId: teamA.id },
        { competitionSeasonId: csLeague2026.id, teamId: teamB.id },
        { competitionSeasonId: csCup2026.id, teamId: teamA.id },
        { competitionSeasonId: csCup2026.id, teamId: teamB.id },
      ],
    });

    // 라운드 하나 만든다 (Match 는 roundId 필요)
    const roundLeague = await prisma.competitionRound.create({
      data: {
        competitionSeasonId: csLeague2026.id,
        name: 'Regular Season - 1',
        ordinal: 1,
        matchCount: 3,
        isLateStage: false,
      },
    });

    // 매치 3개 (list_matches 자동 컷 반례 · Case 9)
    const kickoffs = [
      new Date('2026-08-21T14:00:00Z'),
      new Date('2026-08-22T14:00:00Z'),
      new Date('2026-08-23T14:00:00Z'),
    ];
    const fixtureA = await prisma.match.create({
      data: {
        apiFixtureId: FIXTURE_A,
        competitionSeasonId: csLeague2026.id,
        roundId: roundLeague.id,
        kickoffAt: kickoffs[0],
        statusShort: 'FT',
        statusLong: 'Match Finished',
        homeTeamId: teamA.id,
        awayTeamId: teamB.id,
        venueId: venueA.id,
        goalsHome: 2,
        goalsAway: 1,
        ftHome: 2,
        ftAway: 1,
        winnerTeamId: teamA.id,
        statsState: StatsState.NONE,
        hasEvents: false,
        hasLineups: false,
        hasTeamStats: false,
        hasPlayerStats: false,
        detailEligible: false,
        asOf,
      },
    });
    const fixtureB = await prisma.match.create({
      data: {
        apiFixtureId: FIXTURE_B,
        competitionSeasonId: csLeague2026.id,
        roundId: roundLeague.id,
        kickoffAt: kickoffs[1],
        statusShort: 'FT',
        statusLong: 'Match Finished',
        homeTeamId: teamB.id,
        awayTeamId: teamA.id,
        venueId: venueB.id,
        goalsHome: 0,
        goalsAway: 0,
        ftHome: 0,
        ftAway: 0,
        winnerTeamId: null,
        statsState: StatsState.NONE,
        hasEvents: false,
        hasLineups: false,
        hasTeamStats: false,
        hasPlayerStats: false,
        detailEligible: false,
        asOf,
      },
    });
    const fixtureC = await prisma.match.create({
      data: {
        apiFixtureId: FIXTURE_C,
        competitionSeasonId: csLeague2026.id,
        roundId: roundLeague.id,
        kickoffAt: kickoffs[2],
        statusShort: 'NS',
        statusLong: 'Not Started',
        homeTeamId: teamA.id,
        awayTeamId: teamB.id,
        venueId: venueA.id,
        goalsHome: null,
        goalsAway: null,
        statsState: StatsState.NONE,
        hasEvents: false,
        hasLineups: false,
        hasTeamStats: false,
        hasPlayerStats: false,
        detailEligible: false,
        asOf,
      },
    });

    // Standing — csLeague2026 만 (csCup2026 은 KNOCKOUT 이라 rows 없음)
    await prisma.standing.createMany({
      data: [
        {
          competitionSeasonId: csLeague2026.id,
          teamId: teamA.id,
          groupName: null,
          rank: 1,
          points: 3,
          played: 1,
          win: 1,
          draw: 0,
          lose: 0,
          goalsFor: 2,
          goalsAgainst: 1,
          goalDiff: 1,
          homePlayed: 1,
          homeWin: 1,
          homeDraw: 0,
          homeLose: 0,
          homeGf: 2,
          homeGa: 1,
          awayPlayed: 0,
          awayWin: 0,
          awayDraw: 0,
          awayLose: 0,
          awayGf: 0,
          awayGa: 0,
          form: 'W',
          asOf,
        },
        {
          competitionSeasonId: csLeague2026.id,
          teamId: teamB.id,
          groupName: null,
          rank: 2,
          points: 0,
          played: 1,
          win: 0,
          draw: 0,
          lose: 1,
          goalsFor: 1,
          goalsAgainst: 2,
          goalDiff: -1,
          homePlayed: 0,
          homeWin: 0,
          homeDraw: 0,
          homeLose: 0,
          homeGf: 0,
          homeGa: 0,
          awayPlayed: 1,
          awayWin: 0,
          awayDraw: 0,
          awayLose: 1,
          awayGf: 1,
          awayGa: 2,
          form: 'L',
          asOf,
        },
      ],
    });

    // Player · SquadEntry (이적 반례 — 2025 팀A validTo 있음, 2026 팀B validTo null)
    const player1 = await prisma.player.create({
      data: {
        apiPlayerId: PLAYER_1,
        name: 'Assist Player One',
        firstname: 'Assist',
        lastname: 'One',
        nationality: 'Testland',
      },
    });
    await prisma.squadEntry.create({
      data: {
        playerId: player1.id,
        teamId: teamA.id,
        seasonYear: 2025,
        jerseyNumber: 9,
        position: 'FWD',
        validFrom: new Date('2025-07-01'),
        validTo: new Date('2026-06-30'),
        observedAt: new Date('2025-07-01'),
      },
    });
    await prisma.squadEntry.create({
      data: {
        playerId: player1.id,
        teamId: teamB.id,
        seasonYear: 2026,
        jerseyNumber: 10,
        position: 'FWD',
        validFrom: new Date('2026-07-01'),
        validTo: null,
        observedAt: new Date('2026-07-01'),
      },
    });

    // PlayerSeasonStat — 2025 시즌에 assists=null · goals=8 (assists null 반례)
    await prisma.playerSeasonStat.create({
      data: {
        playerId: player1.id,
        teamId: teamA.id,
        competitionSeasonId: csLeague2025.id,
        appearances: 20,
        lineupsCount: 18,
        minutes: 1600,
        goals: 8,
        assists: null,
        yellowCards: 3,
        yellowredCards: 0,
        redCards: 0,
        source: StatsSource.API,
        asOf,
      },
    });

    // TopRanking — csLeague2026 · SCORERS · player rank 1 value 5
    await prisma.topRanking.create({
      data: {
        competitionSeasonId: csLeague2026.id,
        category: RankingCategory.SCORERS,
        rank: 1,
        playerId: player1.id,
        teamId: teamB.id,
        value: 5,
        asOf,
      },
    });

    Object.assign(ids, {
      compLeague: compLeague.id,
      compCup: compCup.id,
      csLeague2026: csLeague2026.id,
      csLeague2025: csLeague2025.id,
      csCup2026: csCup2026.id,
      teamA: teamA.id,
      teamB: teamB.id,
      teamC: teamC.id,
      venueA: venueA.id,
      venueB: venueB.id,
      venueC: venueC.id,
      player1: player1.id,
      roundLeague: roundLeague.id,
      fixtureA: fixtureA.id,
      fixtureB: fixtureB.id,
      fixtureC: fixtureC.id,
    });
  }, 120_000);

  afterAll(async () => {
    if (prisma) {
      try {
        await cleanup();
      } catch (cause) {
        console.warn('[assistant-tools e2e] 픽스처 정리 실패:', cause);
      }
    }
    await app?.close();
  }, 60_000);

  /**
   * 자식 먼저 지운다 (relationMode="prisma" Restrict + CI 고아 행 검사).
   * topRanking → playerSeasonStat → squadEntry → player → standing → match → competitionEntry
   *   → competitionSeason → competition(cup 먼저) → competition(league) → team → venue
   */
  async function cleanup(): Promise<void> {
    const comps = await prisma.competition.findMany({
      where: { apiCompetitionId: { in: [COMP_LEAGUE, COMP_CUP] } },
      select: { id: true, topFlightCompetitionId: true },
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
      await prisma.standing.deleteMany({ where: { competitionSeasonId: { in: csIds } } });
      await prisma.match.deleteMany({ where: { competitionSeasonId: { in: csIds } } });
      await prisma.competitionRound.deleteMany({ where: { competitionSeasonId: { in: csIds } } });
      await prisma.competitionEntry.deleteMany({ where: { competitionSeasonId: { in: csIds } } });
      await prisma.competitionSeason.deleteMany({ where: { id: { in: csIds } } });
    }
    await prisma.squadEntry.deleteMany({ where: { player: { apiPlayerId: PLAYER_1 } } });
    await prisma.player.deleteMany({ where: { apiPlayerId: PLAYER_1 } });
    // 컵 먼저 (topFlightCompetitionId 참조)
    const cupIds = comps.filter((c) => c.topFlightCompetitionId !== null).map((c) => c.id);
    if (cupIds.length > 0) await prisma.competition.deleteMany({ where: { id: { in: cupIds } } });
    await prisma.competition.deleteMany({ where: { id: { in: compIds } } });
    await prisma.team.deleteMany({ where: { apiTeamId: { in: [TEAM_A, TEAM_B, TEAM_C] } } });
    await prisma.venue.deleteMany({ where: { apiVenueId: { in: [VENUE_A, VENUE_B, VENUE_C] } } });
  }

  // ── Case 1. 10개 도구 정상 호출 → wrapper.data === 서비스 직접 호출 결과 ──────────
  describe('Case 1: 도구 10개 → 서비스 직접 호출과 deep-equal', () => {
    it('list_competitions', async () => {
      const direct = await competitions.list();
      const via = await registry.call('list_competitions', {});
      expect(via.tool).toBe('list_competitions');
      expect(via.data).toEqual(direct);
      expect(via.asOf).toBe(direct.asOf);
    });

    it('get_competition', async () => {
      const ref = `${COMP_LEAGUE}`;
      const direct = await competitions.detail(ref);
      const via = await registry.call('get_competition', { ref });
      expect(via.tool).toBe('get_competition');
      expect(via.data).toEqual(direct);
      expect(via.asOf).toBe(direct.asOf);
    });

    it('list_teams', async () => {
      const args = { competition: `${COMP_LEAGUE}` };
      const direct = await teams.list(args);
      const via = await registry.call('list_teams', args);
      expect(via.tool).toBe('list_teams');
      expect(via.data).toEqual(direct);
      expect(via.asOf).toBe(direct.asOf);
    });

    it('get_team', async () => {
      const ref = `${TEAM_A}`;
      const direct = await teams.detail(ref);
      const via = await registry.call('get_team', { ref });
      expect(via.tool).toBe('get_team');
      expect(via.data).toEqual(direct);
      expect(via.asOf).toBe(direct.asOf);
    });

    it('list_matches (limit 50, 3경기 시드 → 전부)', async () => {
      // from/to 를 명시해 자동 default (today ±7d KST) 회피 — 시드는 2026-08-21~23 이라 오늘 기준 밖
      const args = { competition: `${COMP_LEAGUE}`, season: 2026, from: '2026-08-01', to: '2026-08-31' };
      const direct = await matches.list(args);
      // registry 는 limit 을 채워 wrapper.args 에 반영. data 자체는 서비스 그대로.
      const via = await registry.call('list_matches', args);
      expect(via.tool).toBe('list_matches');
      expect(via.data).toEqual(direct);
      expect(via.asOf).toBe(direct.asOf);
      // 3개 뿐이라 truncated 없다
      expect(via.truncated).toBeUndefined();
    });

    it('get_match', async () => {
      const ref = `${FIXTURE_A}`;
      const direct = await matches.detail(ref);
      const via = await registry.call('get_match', { fixtureId: ref });
      expect(via.tool).toBe('get_match');
      expect(via.data).toEqual(direct);
      expect(via.asOf).toBe(direct.asOf);
    });

    it('get_standings', async () => {
      const args = { competition: `${COMP_LEAGUE}` };
      const direct = await standings.list(args);
      const via = await registry.call('get_standings', args);
      expect(via.tool).toBe('get_standings');
      expect(via.data).toEqual(direct);
      expect(via.asOf).toBe(direct.asOf);
    });

    it('get_top_scorers', async () => {
      const args = { competition: `${COMP_LEAGUE}`, limit: 10 };
      const direct = await stats.scorers(args);
      const via = await registry.call('get_top_scorers', args);
      expect(via.tool).toBe('get_top_scorers');
      expect(via.data).toEqual(direct);
      expect(via.asOf).toBe(direct.asOf);
    });

    it('get_top_assisters', async () => {
      const args = { competition: `${COMP_LEAGUE}`, limit: 10 };
      const direct = await stats.assisters(args);
      const via = await registry.call('get_top_assisters', args);
      expect(via.tool).toBe('get_top_assisters');
      expect(via.data).toEqual(direct);
      expect(via.asOf).toBe(direct.asOf);
    });

    it('get_player', async () => {
      const ref = `${PLAYER_1}`;
      const direct = await players.detail(ref);
      const via = await registry.call('get_player', { ref });
      expect(via.tool).toBe('get_player');
      expect(via.data).toEqual(direct);
      expect(via.asOf).toBe(direct.asOf);
    });
  });

  // ── Case 2. 인자 거부 ────────────────────────────────────────────
  describe('Case 2: 인자 거부 → BadRequestException', () => {
    it('get_top_scorers limit=201', async () => {
      await expect(registry.call('get_top_scorers', { limit: 201 })).rejects.toBeInstanceOf(BadRequestException);
    });
    it('get_top_scorers limit=-1', async () => {
      await expect(registry.call('get_top_scorers', { limit: -1 })).rejects.toBeInstanceOf(BadRequestException);
    });
    it('list_matches from=invalid', async () => {
      await expect(registry.call('list_matches', { from: 'invalid' })).rejects.toBeInstanceOf(BadRequestException);
    });
    it('list_teams season=1999', async () => {
      await expect(
        registry.call('list_teams', { competition: '39-premier-league', season: 1999 }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });
    it('get_team {} (ref required)', async () => {
      await expect(registry.call('get_team', {})).rejects.toBeInstanceOf(BadRequestException);
    });
    it('get_player ref=not-a-ref', async () => {
      await expect(registry.call('get_player', { ref: 'not-a-ref' })).rejects.toBeInstanceOf(BadRequestException);
    });
  });

  // ── Case 3. description 3상태 문구 ─────────────────────────────
  it('Case 3: 모든 도구의 description 에 3상태 문구 3종 존재', () => {
    for (const t of registry.getAll()) {
      expect(t.description).toContain('do not conflate');
      expect(t.description).toContain('not measured');
      expect(t.description).toContain('API did not provide');
    }
  });

  // ── Case 4. 모드 B 4개 도구 6-대회 문구 ────────────────────────
  it('Case 4: 모드 B 4개 도구 description 에 "6 display competitions" 존재', () => {
    for (const name of ['list_matches', 'get_standings', 'get_top_scorers', 'get_top_assisters']) {
      const t = registry.get(name);
      expect(t).toBeDefined();
      expect(t!.description).toContain('6 display competitions');
    }
  });

  // ── Case 5. golden.json 스모크 ────────────────────────────────
  it('Case 5: golden.json 15건 · null 5 · called 10 · 도구 10개 각 최소 1회 · args argsSchema 통과', () => {
    const goldenPath = resolve(__dirname, '../src/assistant/golden.json');
    const golden = JSON.parse(readFileSync(goldenPath, 'utf8')) as {
      cases: Array<{ id: string; question: string; tool: string | null; args?: Record<string, unknown>; reason?: string }>;
    };
    expect(golden.cases).toHaveLength(15);

    const nulls = golden.cases.filter((c) => c.tool === null);
    expect(nulls.length).toBe(5);
    for (const c of nulls) {
      expect(typeof c.reason).toBe('string');
      expect(c.reason!.length).toBeGreaterThan(0);
    }

    const called = golden.cases.filter((c) => c.tool !== null);
    expect(called.length).toBe(10);

    // 도구 10개 각각 최소 1회
    const seen = new Set(called.map((c) => c.tool));
    expect(seen.size).toBe(10);

    // args 가 argsSchema 를 통과 (ajv). 실행은 안 함
    const ajv = new Ajv({ useDefaults: true, coerceTypes: false });
    for (const c of called) {
      const t = registry.get(c.tool!);
      expect(t, `${c.id}: tool ${c.tool} 없음`).toBeDefined();
      const validate = ajv.compile(t!.argsSchema);
      // useDefaults 가 원본을 변형하므로 사본
      const copy: Record<string, unknown> = c.args ? { ...c.args } : {};
      const ok = validate(copy);
      expect(ok, `${c.id}: ${ajv.errorsText(validate.errors)}`).toBe(true);
    }
  });

  // ── Case 6. get_standings KNOCKOUT 반례 ────────────────────
  it('Case 6: get_standings 컵 → items[0].rows=[] · unavailableReason=KNOCKOUT', async () => {
    const r = await registry.call('get_standings', { competition: `${COMP_CUP}` });
    const data = r.data as { items: Array<{ rows: unknown[]; unavailableReason: string | null }> };
    expect(data.items.length).toBeGreaterThan(0);
    expect(data.items[0].rows).toEqual([]);
    expect(data.items[0].unavailableReason).toBe('KNOCKOUT');
  });

  // ── Case 7. get_player assists null 시즌 ─────────────────
  it('Case 7: get_player — assists=null 시즌 · totals.assists=null', async () => {
    const r = await registry.call('get_player', { ref: `${PLAYER_1}` });
    const data = r.data as {
      seasonStats: Array<{ season: { year: number }; assists: number | null }>;
      totals: { assists: number | null };
    };
    const s2025 = data.seasonStats.find((x) => x.season.year === 2025);
    expect(s2025).toBeDefined();
    expect(s2025!.assists).toBeNull();
    expect(data.totals.assists).toBeNull();
  });

  // ── Case 8. get_player primaryTeam (validTo IS NULL 인 팀B) ───
  it('Case 8: get_player — primaryTeam.apiId = TEAM_B (validTo IS NULL 인 소속)', async () => {
    const r = await registry.call('get_player', { ref: `${PLAYER_1}` });
    const data = r.data as { primaryTeam: { apiId: number } | null };
    expect(data.primaryTeam).not.toBeNull();
    expect(data.primaryTeam!.apiId).toBe(TEAM_B);
  });

  // ── Case 9. list_matches 자동 컷 ─────────────────────────────
  describe('Case 9: list_matches 자동 컷 (truncated/total)', () => {
    it('limit=2 → items 2 · truncated:true · total:3', async () => {
      const r = await registry.call('list_matches', {
        competition: `${COMP_LEAGUE}`,
        season: 2026,
        from: '2026-08-01',
        to: '2026-08-31',
        limit: 2,
      });
      const data = r.data as { items: unknown[] };
      expect(data.items).toHaveLength(2);
      expect(r.truncated).toBe(true);
      expect(r.total).toBe(3);
    });

    it('limit=50 (default) → items 3 · truncated 없음', async () => {
      const r = await registry.call('list_matches', {
        competition: `${COMP_LEAGUE}`,
        season: 2026,
        from: '2026-08-01',
        to: '2026-08-31',
      });
      const data = r.data as { items: unknown[] };
      expect(data.items).toHaveLength(3);
      expect(r.truncated).toBeUndefined();
      expect(r.total).toBeUndefined();
    });
  });

  // ── Case 10. stdio 스모크 (nest build + spawn dist/cli/mcp.js) ─
  describe('Case 10: MCP stdio 스모크', () => {
    beforeAll(() => {
      // nest build — dist/cli/mcp.js 생성
      execSync('nest build', { cwd: resolve(__dirname, '..'), stdio: 'inherit' });
    }, 180_000);

    it('initialize → tools/list(10) → tools/call get_standings → wrapper', async () => {
      const transport = new StdioClientTransport({
        command: process.execPath,
        args: [resolve(__dirname, '../dist/cli/mcp.js')],
        env: { ...(process.env as Record<string, string>) },
      });
      const client = new Client({ name: 'e2e', version: '0.0.1' }, { capabilities: {} });
      await client.connect(transport);
      try {
        const tools = await client.listTools();
        expect(tools.tools).toHaveLength(10);

        const res = await client.callTool({
          name: 'get_standings',
          arguments: { competition: `${COMP_LEAGUE}` },
        });
        const content = res.content as Array<{ type: string; text: string }>;
        expect(content).toHaveLength(1);
        expect(content[0].type).toBe('text');
        const wrapped = JSON.parse(content[0].text) as {
          tool: string;
          args: Record<string, unknown>;
          asOf: string;
          data: unknown;
        };
        expect(wrapped.tool).toBe('get_standings');
        expect(wrapped.args).toMatchObject({ competition: `${COMP_LEAGUE}` });
        expect(typeof wrapped.asOf).toBe('string');
        expect(wrapped.data).toBeDefined();
      } finally {
        await client.close();
      }
    }, 60_000);
  });
});
