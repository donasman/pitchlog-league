/**
 * 통계·랭킹 조회 — TopRanking 을 읽어 두 모드로 낸다.
 *   A. competition 지정 → 그 대회·시즌 하나의 rank 를 그대로.
 *   B. 생략 → 화면 6대회 각각 top{limit} 를 모아 playerId 로 SUM → 재정렬.
 *
 * 응답 조립 규칙은 statistics.dto.ts 주석. 이 서비스는 DB 만 본다 — 외부 API 호출 금지 (BACKEND_GUIDE).
 * TopRanking 은 API 공식 순위(SCHEMA_DESIGN 9장). 자체 계산이 아니다.
 */
import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { latestOf } from '../common/as-of.js';
import { seasonLabel } from '../common/season-label.js';
import { CompetitionService } from '../competition/competition.service.js';
import { TeamService } from '../team/team.service.js';
import { competitionRef } from '../match/match.dto.js';
import { screenCompetitionWhere } from '../ingestion/screen-scope.js';
import { RankingCategory, type Competition, type CompetitionSeason, type Player, type Season, type Team, type TopRanking } from '../generated/prisma/client.js';
import { playerRef } from '../player/player.dto.js';
import type { BreakdownEntryDto, RankRowDto, RankingListDto, RankingsQueryDto } from './statistics.dto.js';

type CompetitionRow = Awaited<ReturnType<CompetitionService['resolve']>>;
type SeasonRow = CompetitionRow['seasons'][number];
type TopRankingRow = TopRanking & { player: Player; team: Team };

// 화면 6대회 목록에서 각 대회의 시즌을 고르기 위한 얕은 include 형태
type ScreenCompetitionRow = Competition & {
  seasons: (CompetitionSeason & { season: Season })[];
};

@Injectable()
export class StatisticsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly competitions: CompetitionService,
    private readonly teams: TeamService,
  ) {}

  scorers(q: RankingsQueryDto): Promise<RankingListDto> {
    return this.ranking(RankingCategory.SCORERS, q);
  }

  assisters(q: RankingsQueryDto): Promise<RankingListDto> {
    return this.ranking(RankingCategory.ASSISTS, q);
  }

  private async ranking(category: RankingCategory, q: RankingsQueryDto): Promise<RankingListDto> {
    const limit = q.limit ?? 10;

    if (q.competition !== undefined) {
      // ── 모드 A ──
      const comp = await this.competitions.resolve(q.competition);
      const cs = this.pickSeason(comp, q.season);
      if (!cs) throw new NotFoundException(`${q.competition} 에 ${q.season ?? '현재'} 시즌이 없다`);

      const rows = (await this.prisma.topRanking.findMany({
        where: { competitionSeasonId: cs.id, category },
        include: { player: true, team: true },
        orderBy: { rank: 'asc' },
        take: limit,
      })) as TopRankingRow[];

      return {
        competition: competitionRef(comp),
        season: { year: cs.season.year, label: seasonLabel(cs.season.year) },
        items: rows.map((r) => this.rowFromDb(r)),
        asOf: latestOf(...rows.map((r) => r.asOf), cs.asOf),
      };
    }

    // ── 모드 B — 화면 6대회 합산 ──
    const comps = (await this.prisma.competition.findMany({
      where: screenCompetitionWhere,
      include: {
        seasons: { include: { season: true }, orderBy: { season: { year: 'desc' } } },
      },
      orderBy: { displayOrder: 'asc' },
    })) as ScreenCompetitionRow[];

    const targets: { comp: ScreenCompetitionRow; cs: ScreenCompetitionRow['seasons'][number] }[] = [];
    for (const c of comps) {
      const cs =
        q.season !== undefined
          ? c.seasons.find((s) => s.season.year === q.season)
          : (c.seasons.find((s) => s.isCurrent) ?? c.seasons[0]);
      if (cs) targets.push({ comp: c, cs });
    }
    if (targets.length === 0) {
      return { competition: null, season: null, items: [], asOf: latestOf() };
    }

    const perComp = await Promise.all(
      targets.map(({ comp, cs }) =>
        this.prisma.topRanking
          .findMany({
            where: { competitionSeasonId: cs.id, category },
            include: { player: true, team: true },
            orderBy: { rank: 'asc' },
            take: limit,
          })
          .then((rows) => ({ comp, cs, rows: rows as TopRankingRow[] })),
      ),
    );

    // 선수별 합산. latestTeam 은 최상위 rank 대회의 team 으로 정한다
    type Aggregate = {
      player: Player;
      team: Team;
      best: number;
      total: number;
      breakdown: BreakdownEntryDto[];
    };
    const byPlayer = new Map<number, Aggregate>();
    for (const { comp, cs, rows } of perComp) {
      for (const r of rows) {
        let entry = byPlayer.get(r.playerId);
        if (!entry) {
          entry = { player: r.player, team: r.team, best: r.rank, total: 0, breakdown: [] };
          byPlayer.set(r.playerId, entry);
        }
        if (r.rank < entry.best) {
          entry.team = r.team;
          entry.best = r.rank;
        }
        entry.total += r.value;
        entry.breakdown.push({
          competition: competitionRef(comp),
          season: { year: cs.season.year, label: seasonLabel(cs.season.year) },
          value: r.value,
        });
      }
    }

    const sorted = [...byPlayer.values()]
      .sort((a, b) => b.total - a.total)
      .slice(0, limit)
      .map<RankRowDto>((entry, i) => ({
        rank: i + 1,
        value: entry.total,
        player: playerRef(entry.player),
        team: this.teams.summary(entry.team),
        breakdown: entry.breakdown,
      }));

    const allRows = perComp.flatMap((x) => x.rows);
    return {
      competition: null,
      season: null,
      items: sorted,
      asOf: latestOf(...allRows.map((r) => r.asOf)),
    };
  }

  private rowFromDb(r: TopRankingRow): RankRowDto {
    return {
      rank: r.rank,
      value: r.value,
      player: playerRef(r.player),
      team: this.teams.summary(r.team),
    };
  }

  /** season 지정 → 그 해, 생략 → 현재 → 최신 (team.service · standing.service 와 같은 규칙) */
  private pickSeason(comp: CompetitionRow, year: number | undefined): SeasonRow | undefined {
    return year !== undefined ? comp.seasons.find((s) => s.season.year === year) : (comp.seasons.find((s) => s.isCurrent) ?? comp.seasons[0]);
  }
}
