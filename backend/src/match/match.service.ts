/**
 * 경기 조회 — 목록(대회·시즌·KST 날짜·팀 필터, 페이지 없음)과 단건.
 * 응답 조립 규칙은 match.dto.ts 주석. 이 서비스는 DB 만 본다 — 외부 API 호출 금지 (CLAUDE.md).
 * has_* · statsState · leg 는 읽기만 한다 — 올리는 쪽은 L2/L5 수집이다.
 */
import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { latestOf } from '../common/as-of.js';
import { kstDayRange } from '../common/kst-date.js';
import { parseRef } from '../common/ref.js';
import { seasonLabel } from '../common/season-label.js';
import { CompetitionService } from '../competition/competition.service.js';
import { TeamService } from '../team/team.service.js';
import { screenCompetitionWhere } from '../ingestion/screen-scope.js';
import type { Competition, CompetitionRound, CompetitionSeason, Match, Prisma, Season, Team, Venue } from '../generated/prisma/client.js';
import { competitionRef, type MatchDto, type MatchListDto, type MatchListQueryDto, type ScoreDto } from './match.dto.js';

type MatchRow = Match & {
  homeTeam: Team;
  awayTeam: Team;
  venue: Venue | null;
  round: CompetitionRound;
  competitionSeason: CompetitionSeason & { competition: Competition; season: Season };
};

const MATCH_INCLUDE = {
  homeTeam: true,
  awayTeam: true,
  venue: true,
  round: true,
  competitionSeason: { include: { competition: true, season: true } },
} as const;

const score = (home: number | null, away: number | null): ScoreDto => ({ home, away });

@Injectable()
export class MatchService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly competitions: CompetitionService,
    private readonly teams: TeamService,
  ) {}

  async list(q: MatchListQueryDto): Promise<MatchListDto> {
    const where: Prisma.MatchWhereInput = {};
    let season: MatchListDto['season'] = null;

    if (q.competition !== undefined) {
      // 대회 지정 → 시즌을 하나로 확정한다 (team.service 와 같은 규칙)
      const comp = await this.competitions.resolve(q.competition);
      const cs =
        q.season !== undefined
          ? comp.seasons.find((s) => s.season.year === q.season)
          : (comp.seasons.find((s) => s.isCurrent) ?? comp.seasons[0]);
      if (!cs) throw new NotFoundException(`${q.competition} 에 ${q.season ?? '현재'} 시즌이 없다`);
      where.competitionSeasonId = cs.id;
      season = this.competitions.season(cs);
    } else {
      // 생략 → 화면 6대회. season 생략이면 각 대회의 현재 시즌
      where.competitionSeason = {
        competition: screenCompetitionWhere,
        ...(q.season !== undefined ? { season: { year: q.season } } : { isCurrent: true }),
      };
    }

    const range = kstDayRange(q.from, q.to);
    if (range.gte || range.lt) where.kickoffAt = range;

    if (q.team !== undefined) {
      const apiTeamId = parseRef(q.team, '팀 ref');
      const team = await this.prisma.team.findUnique({ where: { apiTeamId }, select: { id: true } });
      if (!team) throw new NotFoundException(`팀이 없다: ${q.team}`);
      where.OR = [{ homeTeamId: team.id }, { awayTeamId: team.id }];
    }

    // 페이지 상한 — 기본 100 · 최대 500 (DTO 에서 검증됨). total 은 limit 적용 전 카운트라 count/findMany 를 한 트랜잭션으로.
    const limit = q.limit ?? 100;
    const [total, rows] = await this.prisma.$transaction([
      this.prisma.match.count({ where }),
      this.prisma.match.findMany({
        where,
        include: MATCH_INCLUDE,
        orderBy: [{ kickoffAt: 'asc' }, { apiFixtureId: 'asc' }],
        take: limit,
      }),
    ]);
    const items = rows.map((m) => this.toDto(m));
    return {
      items,
      total,
      hasMore: total > items.length,
      season,
      asOf: latestOf(...rows.flatMap((m) => [m.asOf, m.updatedAt])),
    };
  }

  async detail(ref: string): Promise<MatchDto> {
    const apiFixtureId = parseRef(ref, '경기 ref');
    const row = await this.prisma.match.findUnique({ where: { apiFixtureId }, include: MATCH_INCLUDE });
    if (!row) throw new NotFoundException(`경기가 없다: ${ref}`);
    return this.toDto(row);
  }

  toDto(m: MatchRow): MatchDto {
    const home = this.teams.summary(m.homeTeam);
    const away = this.teams.summary(m.awayTeam);
    const winnerTeamRef =
      m.winnerTeamId === null ? null : m.winnerTeamId === m.homeTeamId ? home.ref : m.winnerTeamId === m.awayTeamId ? away.ref : null;
    return {
      id: m.apiFixtureId,
      kickoffAt: m.kickoffAt.toISOString(),
      statusShort: m.statusShort,
      statusLong: m.statusLong,
      elapsed: m.elapsed,
      extraElapsed: m.extraElapsed,
      statsState: m.statsState,
      confirmedAt: m.confirmedAt ? m.confirmedAt.toISOString() : null,
      goals: score(m.goalsHome, m.goalsAway),
      ht: score(m.htHome, m.htAway),
      ft: score(m.ftHome, m.ftAway),
      et: score(m.etHome, m.etAway),
      pen: score(m.penHome, m.penAway),
      winnerTeamRef,
      home,
      away,
      competition: competitionRef(m.competitionSeason.competition),
      season: { year: m.competitionSeason.season.year, label: seasonLabel(m.competitionSeason.season.year) },
      round: { name: m.round.name, ordinal: m.round.ordinal, matchCount: m.round.matchCount, isLateStage: m.round.isLateStage },
      venue: m.venue ? { name: m.venue.name, city: m.venue.city } : null,
      referee: m.referee,
      leg: m.leg,
      detailEligible: m.detailEligible,
      hasEvents: m.hasEvents,
      hasLineups: m.hasLineups,
      hasTeamStats: m.hasTeamStats,
      hasPlayerStats: m.hasPlayerStats,
      asOf: latestOf(m.asOf, m.updatedAt),
    };
  }
}
