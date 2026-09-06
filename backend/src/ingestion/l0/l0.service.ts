/**
 * L0 — 기준 데이터 · 시즌당 1회 (BACKEND_FEATURES 1장 L0 #1~#5)
 *
 * 순서 (SCHEMA_DESIGN 2-4 부모-먼저):
 *   competitions → seasons → competition_seasons → venues → teams → competition_entries
 *
 * 콜: /leagues?id= 17콜 (시즌 없이 부르면 전 시즌이 온다) + /teams 17대회 × 5시즌 = 약 100콜
 * 멱등: 전부 api_*_id 기준 upsert. 두 번 돌려도 같은 결과.
 * 쿼리: 대회·시즌은 Prisma upsert(대회당 ≈11쿼리), 팀·경기장·참가는 batchUpsert 로 대회시즌당 3문장.
 *
 * ⚠ 커버리지 플래그는 저장만 하고 수집 조건으로 쓰지 않는다 (DATA_RULES 6장).
 */
import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';
import { ApiFootballClient } from '../api-football/api-football.client.js';
import { IngestionRunService } from '../ingestion-run.service.js';
import type { ApiLeague, ApiLeagueSeason, ApiTeam } from '../api-football/api-football.types.js';
import { COMPETITIONS, SEASON_YEARS, type CatalogEntry } from './competitions.catalog.js';
import { IngestionLayer, SeasonStatus } from '../../generated/prisma/client.js';
import { batchUpsert } from '../../prisma/batch-upsert.js';

export interface L0Summary {
  competitions: number;
  competitionSeasons: number;
  teams: number;
  venues: number;
  entries: number;
  skipped: string[];
  partial?: boolean;
}

@Injectable()
export class L0Service {
  private readonly logger = new Logger(L0Service.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly api: ApiFootballClient,
    private readonly runs: IngestionRunService,
  ) {}

  async run(): Promise<L0Summary> {
    return this.runs.wrap(IngestionLayer.L0, null, async () => {
      const summary: L0Summary = { competitions: 0, competitionSeasons: 0, teams: 0, venues: 0, entries: 0, skipped: [] };

      // 1. 대회 + 시즌 — 카탈로그 순서대로. 컵의 topFlight 가 먼저 존재해야 하므로 리그부터 (displayOrder 정렬)
      const ordered = [...COMPETITIONS].sort((a, b) => a.displayOrder - b.displayOrder);
      const competitionIdByApi = new Map<number, number>();
      for (const entry of ordered) {
        const res = await this.upsertCompetitionWithSeasons(entry, competitionIdByApi);
        if (!res) { summary.skipped.push(`${entry.name}: /leagues 응답 없음`); continue; }
        competitionIdByApi.set(entry.apiId, res.competitionId);
        summary.competitions++;
        summary.competitionSeasons += res.seasons;
      }

      // 2. 팀 · 경기장 · 참가 관계 — 대회시즌마다
      // 순서가 결과를 정한다: 팀·경기장은 마지막에 쓴 시즌 값이 남으므로 오래된 시즌 → 최신 시즌,
      // first_seen_competition_id 는 같은 시즌 안에서 displayOrder 앞선 대회. 두 번 돌려도 같은 결과가 되는 조건.
      const seasons = await this.prisma.competitionSeason.findMany({
        where: { competition: { isTracked: true }, season: { year: { in: [...SEASON_YEARS] } } },
        include: { competition: true, season: true },
        orderBy: [{ season: { year: 'asc' } }, { competition: { displayOrder: 'asc' } }],
      });
      for (const cs of seasons) {
        try {
          const r = await this.upsertTeamsFor(cs.id, cs.competition.id, cs.competition.apiCompetitionId, cs.season.year, cs.competition.name);
          summary.teams += r.teams; summary.venues += r.venues; summary.entries += r.entries;
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          this.logger.warn(`${cs.competition.name} ${cs.season.year} 팀 수집 실패 — ${msg}`);
          summary.skipped.push(`${cs.competition.name} ${cs.season.year}: ${msg}`);
          summary.partial = true;
        }
      }

      this.logger.log(
        `L0 완료 — 대회 ${summary.competitions} · 대회시즌 ${summary.competitionSeasons} · 팀 ${summary.teams} · 경기장 ${summary.venues} · 참가 ${summary.entries}` +
          (summary.skipped.length ? ` · 건너뜀 ${summary.skipped.length}` : ''),
      );
      return summary;
    });
  }

  /** /leagues?id= 1콜 → competitions 1행 + 대상 시즌 N행 */
  private async upsertCompetitionWithSeasons(
    entry: CatalogEntry,
    idByApi: Map<number, number>,
  ): Promise<{ competitionId: number; seasons: number } | null> {
    const { response } = await this.api.get<ApiLeague[]>('/leagues', { id: entry.apiId });
    const league = response[0];
    if (!league) return null;

    const topFlightCompetitionId = entry.topFlightApiId ? (idByApi.get(entry.topFlightApiId) ?? null) : null;
    if (entry.topFlightApiId && !topFlightCompetitionId) {
      this.logger.warn(`${entry.name}: 1부 리그(${entry.topFlightApiId})가 아직 없다 — 카탈로그 순서 확인`);
    }

    // 이름은 카탈로그(우리 표기)가 기준. API 는 스페인·독일·이탈리아 슈퍼컵을 전부 "Super Cup" 이라 부르고
    // LaLiga 를 "La Liga" 로 준다 (2026-09-07 실측) — 그대로 저장하면 화면에 같은 이름이 셋 뜬다
    const competition = await this.prisma.competition.upsert({
      where: { apiCompetitionId: entry.apiId },
      create: {
        apiCompetitionId: entry.apiId,
        name: entry.name,
        country: league.country.name,
        countryCode: league.country.code,
        logoUrl: league.league.logo,
        type: entry.type,
        format: entry.format,
        topFlightCompetitionId,
        isTracked: true,
        displayOrder: entry.displayOrder,
      },
      update: {
        name: entry.name,
        country: league.country.name,
        countryCode: league.country.code,
        logoUrl: league.league.logo,
        type: entry.type,
        format: entry.format,
        topFlightCompetitionId,
        isTracked: true,
        displayOrder: entry.displayOrder,
      },
    });

    const wanted = league.seasons.filter((s) => (SEASON_YEARS as readonly number[]).includes(s.year));
    const missing = (SEASON_YEARS as readonly number[]).filter((y) => !wanted.some((s) => s.year === y));
    if (missing.length) {
      // 코파델레이·쿠프드프랑스는 2026 시즌이 아직 등록 전일 수 있다 (실측). 정상 — 다음 L0 에서 들어온다
      this.logger.warn(`${entry.name}: 시즌 미제공 ${missing.join(', ')}`);
    }

    // 현재 시즌은 대회당 하나 — partial unique index 가 강제하므로 트랜잭션 안에서 먼저 비운다
    const currentYear = wanted.find((s) => s.current)?.year ?? null;
    await this.prisma.$transaction(async (tx) => {
      if (currentYear !== null) {
        await tx.competitionSeason.updateMany({
          where: { competitionId: competition.id, isCurrent: true, NOT: { season: { year: currentYear } } },
          data: { isCurrent: false },
        });
      }
      for (const s of wanted) {
        const season = await tx.season.upsert({ where: { year: s.year }, create: { year: s.year }, update: {} });
        const data = this.seasonData(s);
        await tx.competitionSeason.upsert({
          where: { competitionId_seasonId: { competitionId: competition.id, seasonId: season.id } },
          create: { competitionId: competition.id, seasonId: season.id, apiSeasonValue: s.year, ...data },
          update: data,
        });
      }
    }, { timeout: 30_000 });

    return { competitionId: competition.id, seasons: wanted.length };
  }

  private seasonData(s: ApiLeagueSeason) {
    const start = s.start ? new Date(s.start) : null;
    const end = s.end ? new Date(s.end) : null;
    const now = Date.now();
    const status =
      end && end.getTime() < now ? SeasonStatus.FINISHED
      : start && start.getTime() > now ? SeasonStatus.UPCOMING
      : SeasonStatus.IN_PROGRESS;
    return {
      startDate: start,
      endDate: end,
      status,
      isCurrent: s.current,
      coverage: s.coverage as object,
      asOf: new Date(),
    };
  }

  /**
   * /teams?league=&season= 1콜 → venues · teams · competition_entries — 테이블당 1문장, 총 3문장.
   *
   * 트랜잭션으로 묶지 않는다: 세 upsert 모두 멱등이라 중간에 끊겨도 다음 실행이 같은 결과로 수렴하고,
   * 인터랙티브 트랜잭션은 Supabase 왕복(≈60ms)이 쌓이면 5초 한도를 넘긴다 (2026-09-07 실측).
   * 부모-먼저 순서(SCHEMA_DESIGN 2-4)만 지키면 고아 행은 생기지 않는다.
   */
  private async upsertTeamsFor(competitionSeasonId: number, competitionId: number, apiCompetitionId: number, year: number, label: string) {
    const { response } = await this.api.get<ApiTeam[]>('/teams', { league: apiCompetitionId, season: year });
    if (response.length === 0) {
      // 시즌 등록 전이거나 컵 참가팀 미확정. 실패가 아니라 "아직 없음"
      this.logger.warn(`${label} ${year}: 팀 0건`);
      return { teams: 0, venues: 0, entries: 0 };
    }

    // 1. venues — 같은 경기장을 두 팀이 쓰는 경우(공유 구장)는 헬퍼가 dedupe 한다
    const venueRows = response
      .filter(({ venue }) => venue.id && venue.name)
      .map(({ team, venue }) => ({
        api_venue_id: venue.id as number, name: venue.name as string, city: venue.city, country: team.country,
        capacity: venue.capacity, surface: venue.surface, image_url: venue.image,
      }));
    const venues = await batchUpsert<(typeof venueRows)[number], { id: number; api_venue_id: number }>(this.prisma, {
      table: 'venues',
      columns: { api_venue_id: 'int', name: 'text', city: 'text', country: 'text', capacity: 'int', surface: 'text', image_url: 'text' },
      conflict: ['api_venue_id'],
      returning: ['id', 'api_venue_id'],
    }, venueRows);
    const venueIdByApi = new Map(venues.returned.map((v) => [v.api_venue_id, v.id]));

    // 2. teams — first_seen_competition_id 는 최초 INSERT 때만 (update 목록에서 제외)
    const teamRows = response.map(({ team, venue }) => ({
      api_team_id: team.id, name: team.name, code: team.code, country: team.country, founded: team.founded, logo_url: team.logo,
      venue_id: venue.id ? (venueIdByApi.get(venue.id) ?? null) : null,
      first_seen_competition_id: competitionId,
    }));
    const teams = await batchUpsert<(typeof teamRows)[number], { id: number; api_team_id: number }>(this.prisma, {
      table: 'teams',
      columns: { api_team_id: 'int', name: 'text', code: 'text', country: 'text', founded: 'int', logo_url: 'text', venue_id: 'int', first_seen_competition_id: 'int' },
      conflict: ['api_team_id'],
      update: ['name', 'code', 'country', 'founded', 'logo_url', 'venue_id'],
      updatedAtColumn: 'updated_at',
      returning: ['id', 'api_team_id'],
    }, teamRows);

    // 3. competition_entries — 갱신할 컬럼이 없으니 DO NOTHING
    const entryRows = teams.returned.map((t) => ({ competition_season_id: competitionSeasonId, team_id: t.id }));
    const entries = await batchUpsert<(typeof entryRows)[number]>(this.prisma, {
      table: 'competition_entries',
      columns: { competition_season_id: 'int', team_id: 'int' },
      conflict: ['competition_season_id', 'team_id'],
      update: [],
    }, entryRows);

    this.logger.log(`${label} ${year}: 팀 ${teams.rows} · 경기장 ${venues.rows} · 참가 ${entries.rows}`);
    return { teams: teams.rows, venues: venues.rows, entries: entries.rows };
  }
}
