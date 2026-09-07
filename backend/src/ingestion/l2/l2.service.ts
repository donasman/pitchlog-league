/**
 * L2 — 라운드 · 경기 · 순위 (BACKEND_FEATURES #13·#15, INGESTION_STRATEGY 2-2)
 *
 * 지금은 **화면 6대회의 현재 시즌만** 받는다. 대회당 3콜(rounds · fixtures · standings).
 * 5개년 백필은 이 코드를 전체 대회시즌으로 돌리는 것이고(NEXT_STEPS 8-b, isCurrent 조건만 푼다),
 * 녹아웃 tie·대진표 슬롯은 L2-b 다 (8-d, 2027-02 실 데이터 뒤).
 *
 * ## 왜 라운드를 먼저 받나
 * 라운드 이름으로 자르지 않기 때문이다. `/fixtures/rounds` 가 주는 **순서**가 ordinal 이고,
 * 컷은 경기 목록에서 계산한다 — 1부 팀이 처음 등장하는 라운드부터 (`round-scope.ts`).
 *
 * ## 소유권 경계
 * L2 는 일정·스코어를 쓴다. 그러나 `has_events`·`has_lineups`·`has_team_stats`·
 * `has_player_stats`·`detail_checked_at`·`data_version`·`tie_id`·`leg` 은 건드리지 않는다 —
 * L3~L5 와 L2-b 의 것이다. 재실행이 저쪽 진행 상태를 지우면 안 된다.
 *
 * ⚠ 지금은 L4·L5 가 없어 **L2 가 유일한 스코어 소스**다. L4(라이브 폴링)를 붙일 때
 * 이 규칙을 다시 본다 — 그때는 진행 중 경기의 스코어 주인이 L4 이고,
 * L2 가 캐시된 옛 값으로 덮어쓰면 안 된다 (SCHEMA_DESIGN 충돌 ①, `data_version`).
 */
import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';
import { ApiFootballClient } from '../api-football/api-football.client.js';
import { IngestionRunService } from '../ingestion-run.service.js';
import { batchUpsert } from '../../prisma/batch-upsert.js';
import { screenCompetitionWhere } from '../screen-scope.js';
import { CompetitionFormat, IngestionLayer } from '../../generated/prisma/client.js';
import type { ApiFixture, ApiStandings } from '../api-football/api-football.types.js';
import { resolveRoundScope, type FixtureRef } from './round-scope.js';

export interface L2CompetitionResult {
  name: string;
  seasonYear: number;
  rounds: number;
  matches: number;
  standings: number;
  /** 저장 시작 라운드 (INGESTION_STRATEGY 2-2). null 이면 1부 팀이 없어 아무것도 안 넣었다 */
  cutRound: string | null;
  droppedRounds: number;
  unknownRounds: string[];
  missingTeams: number[];
}

export interface L2Summary {
  competitions: L2CompetitionResult[];
  totals: { rounds: number; matches: number; standings: number };
  skipped: string[];
  partial?: boolean;
}

@Injectable()
export class L2Service {
  private readonly logger = new Logger(L2Service.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly api: ApiFootballClient,
    private readonly runs: IngestionRunService,
  ) {}

  async run(): Promise<L2Summary> {
    return this.runs.wrap(IngestionLayer.L2, null, async () => {
      const summary: L2Summary = {
        competitions: [],
        totals: { rounds: 0, matches: 0, standings: 0 },
        skipped: [],
      };

      const seasons = await this.prisma.competitionSeason.findMany({
        where: { isCurrent: true, competition: screenCompetitionWhere },
        include: { competition: true, season: true },
        orderBy: { competition: { displayOrder: 'asc' } },
      });
      if (seasons.length === 0) throw new Error('현재 시즌인 화면 대회가 없다 — L0 를 먼저 돌린다');

      const teamIdByApi = await this.teamIdMap();

      for (const cs of seasons) {
        const label = `${cs.competition.name} ${cs.season.year}`;
        try {
          const r = await this.collectOne(cs, teamIdByApi);
          summary.competitions.push(r);
          summary.totals.rounds += r.rounds;
          summary.totals.matches += r.matches;
          summary.totals.standings += r.standings;
          if (r.cutRound === null || r.unknownRounds.length > 0 || r.missingTeams.length > 0) {
            summary.partial = true;
          }
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          this.logger.warn(`${label} 실패 — ${msg}`);
          summary.skipped.push(`${label}: ${msg}`);
          summary.partial = true;
        }
      }

      this.logger.log(
        `L2 완료 — 라운드 ${summary.totals.rounds} · 경기 ${summary.totals.matches} · 순위 ${summary.totals.standings}` +
          (summary.skipped.length ? ` · 건너뜀 ${summary.skipped.length}` : ''),
      );
      return summary;
    });
  }

  private async teamIdMap(): Promise<Map<number, number>> {
    const teams = await this.prisma.team.findMany({ select: { id: true, apiTeamId: true } });
    return new Map(teams.map((t) => [t.apiTeamId, t.id]));
  }

  /**
   * 이 대회의 1부 팀 (API team id).
   *   리그  → 자기 참가팀 (모든 라운드가 1부다)
   *   컵    → top_flight_competition 의 현재 시즌 참가팀
   *   UCL   → top_flight 가 없다. 추적하는 리그(ROUND_ROBIN) 참가팀 합집합을 쓴다
   */
  private async topFlightApiTeamIds(competitionSeasonId: number, competitionId: number, format: CompetitionFormat, topFlightCompetitionId: number | null): Promise<Set<number>> {
    if (format === CompetitionFormat.ROUND_ROBIN) {
      return this.entryApiTeamIds({ competitionSeasonId });
    }
    if (topFlightCompetitionId !== null) {
      return this.entryApiTeamIds({ competitionSeason: { isCurrent: true, competitionId: topFlightCompetitionId } });
    }
    // UCL — 5대 리그 합집합
    void competitionId;
    return this.entryApiTeamIds({
      competitionSeason: {
        isCurrent: true,
        competition: { ...screenCompetitionWhere, format: CompetitionFormat.ROUND_ROBIN },
      },
    });
  }

  private async entryApiTeamIds(where: Record<string, unknown>): Promise<Set<number>> {
    const rows = await this.prisma.competitionEntry.findMany({
      where: where as never,
      select: { team: { select: { apiTeamId: true } } },
    });
    return new Set(rows.map((r) => r.team.apiTeamId));
  }

  private async collectOne(
    cs: { id: number; competitionId: number; competition: { name: string; apiCompetitionId: number; format: CompetitionFormat; topFlightCompetitionId: number | null }; season: { year: number } },
    teamIdByApi: Map<number, number>,
  ): Promise<L2CompetitionResult> {
    const league = cs.competition.apiCompetitionId;
    const season = cs.season.year;
    const label = `${cs.competition.name} ${season}`;

    const [roundsRes, fixturesRes] = await Promise.all([
      this.api.get<string[]>('/fixtures/rounds', { league, season }),
      this.api.get<ApiFixture[]>('/fixtures', { league, season }),
    ]);
    const roundNames = roundsRes.response;
    const fixtures = fixturesRes.response;

    const result: L2CompetitionResult = {
      name: cs.competition.name,
      seasonYear: season,
      rounds: 0,
      matches: 0,
      standings: 0,
      cutRound: null,
      droppedRounds: 0,
      unknownRounds: [],
      missingTeams: [],
    };

    if (roundNames.length === 0 || fixtures.length === 0) {
      // 시즌 등록 전이거나 일정 미발표. 실패가 아니라 "아직 없음" (DATA_RULES 5-4)
      this.logger.warn(`${label}: 라운드 ${roundNames.length} · 경기 ${fixtures.length} — 건너뜀`);
      return result;
    }

    const topFlight = await this.topFlightApiTeamIds(cs.id, cs.competitionId, cs.competition.format, cs.competition.topFlightCompetitionId);
    const refs: FixtureRef[] = fixtures.map((f) => ({
      round: f.league.round,
      homeApiTeamId: f.teams.home.id,
      awayApiTeamId: f.teams.away.id,
      kickoffAt: f.fixture.date,
    }));
    const scope = resolveRoundScope({ roundNames, fixtures: refs, topFlightApiTeamIds: topFlight });

    result.unknownRounds = scope.unknownRounds;
    result.droppedRounds = scope.rounds.filter((r) => !r.included).length;
    if (scope.cutOrdinal === null) {
      this.logger.warn(`${label}: 1부 팀이 한 라운드에도 없다 — 아무것도 저장하지 않는다`);
      return result;
    }
    result.cutRound = scope.rounds[scope.cutOrdinal].name;

    // 1. 라운드
    const included = scope.rounds.filter((r) => r.included);
    const roundRows = included.map((r) => ({
      competition_season_id: cs.id,
      name: r.name,
      ordinal: r.ordinal,
      team_count: r.teamCount,
      match_count: r.matchCount,
      is_late_stage: r.isLateStage,
      has_top_flight: r.hasTopFlight,
      first_kickoff_at: r.firstKickoffAt,
    }));
    const roundRes = await batchUpsert<(typeof roundRows)[number], { id: number; name: string }>(this.prisma, {
      table: 'competition_rounds',
      columns: {
        competition_season_id: 'int', name: 'text', ordinal: 'int', team_count: 'int',
        match_count: 'int', is_late_stage: 'boolean', has_top_flight: 'boolean', first_kickoff_at: 'timestamptz',
      },
      conflict: ['competition_season_id', 'name'],
      returning: ['id', 'name'],
    }, roundRows);
    result.rounds = roundRes.rows;
    const roundIdByName = new Map(roundRes.returned.map((r) => [r.name, r.id]));
    const detailByName = new Map(included.map((r) => [r.name, r.detailEligible]));

    // 2. 경기장 — 중립 경기장 등 L0 에 없던 것이 나온다
    const venueRows = fixtures
      .filter((f) => f.fixture.venue.id && f.fixture.venue.name && roundIdByName.has(f.league.round))
      .map((f) => ({ api_venue_id: f.fixture.venue.id as number, name: f.fixture.venue.name as string, city: f.fixture.venue.city }));
    const venueRes = await batchUpsert<(typeof venueRows)[number], { id: number; api_venue_id: number }>(this.prisma, {
      table: 'venues',
      columns: { api_venue_id: 'int', name: 'text', city: 'text' },
      conflict: ['api_venue_id'],
      update: ['name', 'city'],
      returning: ['id', 'api_venue_id'],
    }, venueRows);
    const venueIdByApi = new Map(venueRes.returned.map((v) => [v.api_venue_id, v.id]));

    // 3. 경기
    const missing = new Set<number>();
    const matchRows = fixtures
      .filter((f) => roundIdByName.has(f.league.round))
      .map((f) => {
        const home = teamIdByApi.get(f.teams.home.id);
        const away = teamIdByApi.get(f.teams.away.id);
        if (home === undefined) missing.add(f.teams.home.id);
        if (away === undefined) missing.add(f.teams.away.id);
        if (home === undefined || away === undefined) return null;
        const winner = f.teams.home.winner === true ? home : f.teams.away.winner === true ? away : null;
        return {
          api_fixture_id: f.fixture.id,
          competition_season_id: cs.id,
          round_id: roundIdByName.get(f.league.round) as number,
          kickoff_at: f.fixture.date,
          status_short: f.fixture.status.short,
          status_long: f.fixture.status.long,
          elapsed: f.fixture.status.elapsed,
          extra_elapsed: f.fixture.status.extra,
          venue_id: f.fixture.venue.id ? (venueIdByApi.get(f.fixture.venue.id) ?? null) : null,
          referee: f.fixture.referee,
          home_team_id: home,
          away_team_id: away,
          goals_home: f.goals.home,
          goals_away: f.goals.away,
          ht_home: f.score.halftime.home,
          ht_away: f.score.halftime.away,
          ft_home: f.score.fulltime.home,
          ft_away: f.score.fulltime.away,
          et_home: f.score.extratime.home,
          et_away: f.score.extratime.away,
          pen_home: f.score.penalty.home,
          pen_away: f.score.penalty.away,
          winner_team_id: winner,
          detail_eligible: detailByName.get(f.league.round) ?? false,
          as_of: new Date().toISOString(),
        };
      })
      .filter((r): r is NonNullable<typeof r> => r !== null);
    result.missingTeams = [...missing].sort((a, b) => a - b);
    if (missing.size > 0) {
      this.logger.warn(`${label}: DB 에 없는 팀 ${missing.size}개 — 그 경기는 건너뛴다. L0 를 다시 돌린다`);
    }

    const matchRes = await batchUpsert<(typeof matchRows)[number]>(this.prisma, {
      table: 'matches',
      columns: {
        api_fixture_id: 'int', competition_season_id: 'int', round_id: 'int', kickoff_at: 'timestamptz',
        status_short: 'text', status_long: 'text', elapsed: 'int', extra_elapsed: 'int',
        venue_id: 'int', referee: 'text', home_team_id: 'int', away_team_id: 'int',
        goals_home: 'int', goals_away: 'int', ht_home: 'int', ht_away: 'int', ft_home: 'int', ft_away: 'int',
        et_home: 'int', et_away: 'int', pen_home: 'int', pen_away: 'int',
        winner_team_id: 'int', detail_eligible: 'boolean', as_of: 'timestamptz',
      },
      conflict: ['api_fixture_id'],
      // has_* · detail_checked_at · data_version · tie_id · leg 은 L3~L5·L2-b 의 것이다.
      // 재실행이 저쪽 진행 상태를 지우면 안 된다
      update: [
        'competition_season_id', 'round_id', 'kickoff_at', 'status_short', 'status_long', 'elapsed', 'extra_elapsed',
        'venue_id', 'referee', 'home_team_id', 'away_team_id',
        'goals_home', 'goals_away', 'ht_home', 'ht_away', 'ft_home', 'ft_away',
        'et_home', 'et_away', 'pen_home', 'pen_away', 'winner_team_id', 'detail_eligible', 'as_of',
      ],
      updatedAtColumn: 'updated_at',
    }, matchRows);
    result.matches = matchRes.rows;

    // 4. 순위 — 컵은 순위표가 없다 (DATA_RULES 5-3)
    if (cs.competition.format !== CompetitionFormat.KNOCKOUT) {
      result.standings = await this.collectStandings(cs.id, league, season, label, teamIdByApi);
    }

    this.logger.log(
      `${label}: 라운드 ${result.rounds}(제외 ${result.droppedRounds}) · 경기 ${result.matches} · 순위 ${result.standings}` +
        (result.cutRound ? ` · 컷 "${result.cutRound}"` : ''),
    );
    return result;
  }

  private async collectStandings(competitionSeasonId: number, league: number, season: number, label: string, teamIdByApi: Map<number, number>): Promise<number> {
    const { response } = await this.api.get<ApiStandings[]>('/standings', { league, season });
    const groups = response[0]?.league?.standings ?? [];
    const rows = groups.flat().flatMap((r) => {
      const teamId = teamIdByApi.get(r.team.id);
      if (teamId === undefined) return [];
      return [{
        competition_season_id: competitionSeasonId,
        team_id: teamId,
        // NULL 은 unique 인덱스에서 서로 다른 값이라 중복이 들어온다. 항상 값을 넣는다
        group_name: r.group || label,
        rank: r.rank,
        points: r.points,
        played: r.all.played, win: r.all.win, draw: r.all.draw, lose: r.all.lose,
        goals_for: r.all.goals.for, goals_against: r.all.goals.against, goal_diff: r.goalsDiff,
        home_played: r.home.played, home_win: r.home.win, home_draw: r.home.draw, home_lose: r.home.lose,
        home_gf: r.home.goals.for, home_ga: r.home.goals.against,
        away_played: r.away.played, away_win: r.away.win, away_draw: r.away.draw, away_lose: r.away.lose,
        away_gf: r.away.goals.for, away_ga: r.away.goals.against,
        form: r.form, description: r.description, status: r.status,
        as_of: new Date().toISOString(),
      }];
    });

    if (rows.length === 0) {
      // 리그페이즈 시작 전이면 비어 있다. 실패가 아니다
      this.logger.warn(`${label}: 순위표 0건 — 아직 시작 전`);
      return 0;
    }

    const res = await batchUpsert<(typeof rows)[number]>(this.prisma, {
      table: 'standings',
      columns: {
        competition_season_id: 'int', team_id: 'int', group_name: 'text', rank: 'int', points: 'int',
        played: 'int', win: 'int', draw: 'int', lose: 'int',
        goals_for: 'int', goals_against: 'int', goal_diff: 'int',
        home_played: 'int', home_win: 'int', home_draw: 'int', home_lose: 'int', home_gf: 'int', home_ga: 'int',
        away_played: 'int', away_win: 'int', away_draw: 'int', away_lose: 'int', away_gf: 'int', away_ga: 'int',
        form: 'text', description: 'text', status: 'text', as_of: 'timestamptz',
      },
      conflict: ['competition_season_id', 'team_id', 'group_name'],
      updatedAtColumn: 'updated_at',
    }, rows);
    return res.rows;
  }
}
