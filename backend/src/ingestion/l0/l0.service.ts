/**
 * L0 — 기준 데이터 · 시즌당 1회 (BACKEND_FEATURES 1장 L0 #1~#5)
 *
 * 순서 (SCHEMA_DESIGN 2-4 부모-먼저):
 *   competitions → seasons → competition_seasons → venues → teams → competition_entries
 *
 * 콜: /leagues?id= 17콜 (시즌 없이 부르면 전 시즌이 온다) + /teams 17대회 × 5시즌 = 약 100콜
 * 멱등: 전부 api_*_id 기준 upsert. 두 번 돌려도 같은 결과.
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
      const seasons = await this.prisma.competitionSeason.findMany({
        where: { competition: { isTracked: true }, season: { year: { in: [...SEASON_YEARS] } } },
        include: { competition: true, season: true },
      });
      for (const cs of seasons) {
        try {
          const r = await this.upsertTeamsFor(cs.id, cs.competition.apiCompetitionId, cs.season.year, cs.competition.name);
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

    const competition = await this.prisma.competition.upsert({
      where: { apiCompetitionId: entry.apiId },
      create: {
        apiCompetitionId: entry.apiId,
        name: league.league.name,
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
        name: league.league.name,
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
    });

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

  /** /teams?league=&season= 1콜 → venues · teams · competition_entries */
  private async upsertTeamsFor(competitionSeasonId: number, apiCompetitionId: number, year: number, label: string) {
    const { response } = await this.api.get<ApiTeam[]>('/teams', { league: apiCompetitionId, season: year });
    if (response.length === 0) {
      // 시즌 등록 전이거나 컵 참가팀 미확정. 실패가 아니라 "아직 없음"
      this.logger.warn(`${label} ${year}: 팀 0건`);
      return { teams: 0, venues: 0, entries: 0 };
    }

    let venues = 0;
    await this.prisma.$transaction(async (tx) => {
      for (const { team, venue } of response) {
        let venueId: number | null = null;
        if (venue.id && venue.name) {
          const v = await tx.venue.upsert({
            where: { apiVenueId: venue.id },
            create: { apiVenueId: venue.id, name: venue.name, city: venue.city, country: team.country, capacity: venue.capacity, surface: venue.surface, imageUrl: venue.image },
            update: { name: venue.name, city: venue.city, country: team.country, capacity: venue.capacity, surface: venue.surface, imageUrl: venue.image },
          });
          venueId = v.id;
          venues++;
        }
        const t = await tx.team.upsert({
          where: { apiTeamId: team.id },
          create: {
            apiTeamId: team.id, name: team.name, code: team.code, country: team.country,
            founded: team.founded, logoUrl: team.logo, venueId,
            firstSeenCompetitionId: (await tx.competitionSeason.findUniqueOrThrow({ where: { id: competitionSeasonId }, select: { competitionId: true } })).competitionId,
          },
          update: { name: team.name, code: team.code, country: team.country, founded: team.founded, logoUrl: team.logo, venueId },
        });
        await tx.competitionEntry.upsert({
          where: { competitionSeasonId_teamId: { competitionSeasonId, teamId: t.id } },
          create: { competitionSeasonId, teamId: t.id },
          update: {},
        });
      }
    });

    this.logger.log(`${label} ${year}: 팀 ${response.length}`);
    return { teams: response.length, venues, entries: response.length };
  }
}
