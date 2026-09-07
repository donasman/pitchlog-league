/**
 * 팀 조회. 목록은 (대회, 시즌) 의 참가팀 = competition_entries. 상세는 팀 + 경기장 + 참가 이력.
 * 스쿼드·순위·최근 경기는 L1·L2 이후 이 DTO 에 붙는다 (BACKEND_FEATURES 2장).
 */
import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { latestOf } from '../common/as-of.js';
import { names } from '../common/names.dto.js';
import { parseRef, toRef } from '../common/ref.js';
import { CompetitionService } from '../competition/competition.service.js';
import type { Team } from '../generated/prisma/client.js';
import type { TeamDetailDto, TeamListDto, TeamListQueryDto, TeamSummaryDto } from './team.dto.js';

@Injectable()
export class TeamService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly competitions: CompetitionService,
  ) {}

  async list(q: TeamListQueryDto): Promise<TeamListDto> {
    const comp = await this.competitions.resolve(q.competition);
    const season =
      q.season !== undefined
        ? comp.seasons.find((s) => s.season.year === q.season)
        : (comp.seasons.find((s) => s.isCurrent) ?? comp.seasons[0]);
    if (!season) throw new NotFoundException(`${q.competition} 에 ${q.season ?? '현재'} 시즌이 없다`);

    const entries = await this.prisma.competitionEntry.findMany({
      where: { competitionSeasonId: season.id },
      include: { team: true },
      orderBy: { team: { name: 'asc' } },
    });
    return {
      competitionRef: toRef(comp.apiCompetitionId, comp.name),
      season: this.competitions.season(season),
      items: entries.map((e) => this.summary(e.team)),
      asOf: latestOf(season.asOf, ...entries.map((e) => e.team.updatedAt)),
    };
  }

  async detail(ref: string): Promise<TeamDetailDto> {
    const apiId = parseRef(ref, '팀 ref');
    const team = await this.prisma.team.findUnique({
      where: { apiTeamId: apiId },
      include: {
        venue: true,
        entries: {
          include: { competitionSeason: { include: { competition: true, season: true } } },
          where: { competitionSeason: { competition: { isTracked: true } } },
        },
      },
    });
    if (!team) throw new NotFoundException(`팀이 없다: ${ref}`);

    // 참가 이력: 대회별로 시즌을 모아 displayOrder 순 · 시즌 최신 먼저
    const byComp = new Map<number, { order: number; ref: string; name: string; seasons: number[] }>();
    for (const e of team.entries) {
      const c = e.competitionSeason.competition;
      const p = byComp.get(c.id) ?? { order: c.displayOrder, ref: toRef(c.apiCompetitionId, c.name), name: c.name, seasons: [] };
      p.seasons.push(e.competitionSeason.season.year);
      byComp.set(c.id, p);
    }
    const participations = [...byComp.values()]
      .sort((a, b) => a.order - b.order)
      .map((p) => ({ competitionRef: p.ref, competitionName: p.name, seasons: p.seasons.sort((a, b) => b - a) }));

    return {
      ...this.summary(team),
      venue: team.venue
        ? { name: team.venue.name, city: team.venue.city, capacity: team.venue.capacity, surface: team.venue.surface, imageUrl: team.venue.imageUrl }
        : null,
      participations,
      asOf: latestOf(team.updatedAt),
    };
  }

  summary(t: Team): TeamSummaryDto {
    return {
      ref: toRef(t.apiTeamId, t.name),
      apiId: t.apiTeamId,
      ...names(t.name, t.shortName ?? t.code),
      code: t.code,
      country: t.country,
      founded: t.founded,
      logoUrl: t.logoUrl,
    };
  }
}
