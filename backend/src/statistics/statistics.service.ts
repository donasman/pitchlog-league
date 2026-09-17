/**
 * 통계·랭킹 조회 — `player_match_stats` 자체 집계 · 대회별 순위만 (2026-09-17 · feat/statistics-per-competition).
 *
 * 소스 규칙 (DATA_RULES 8장):
 *   - `player_match_stats` 를 선수·대회시즌 축으로 SUM.
 *   - `match_events` 안 씀 — pms 에 competition_season_id 가 이미 있고, 자책골이 섞이지 않는다.
 *   - 상세 수집이 안 된 경기 (`detail_checked_at IS NULL`) 는 제외.
 *   - 종료 경기만 (`status_short IN ('FT','AET','PEN')`).
 *
 * 2차 개정: `competition` 필수. 전 대회 통합 랭킹은 폐기 (`/api/players/:ref` 의 `seasonTotals` 로 이동).
 * 이유: 리그 경기와 컵 1라운드는 상대 수준이 달라 같은 칸에서 줄 세울 수 없다 —
 *       통합 3위 필립 티츠 7골 중 4골이 DFB 포칼 1경기 (실측).
 *
 * 컵·유럽 대항전 포함 19대회 전부 지원 (`competitions.resolve` 는 `isTracked=true` 만 요구).
 *
 * team 결정: 그 범위 최다 출전 팀. 동수면 가장 최근 경기의 팀.
 * 정렬: 골 내림 → 도움 내림 → 출전시간 적은 순 → 선수 id 오름 (결정적).
 */
import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { latestOf } from '../common/as-of.js';
import { NameLookup } from '../common/name-lookup.js';
import { DEFAULT_LOCALE, type Locale } from '../common/locale.js';
import { seasonLabel } from '../common/season-label.js';
import { CompetitionService } from '../competition/competition.service.js';
import { TeamService } from '../team/team.service.js';
import { competitionRef } from '../match/match.dto.js';
import { Prisma, RankingCategory } from '../generated/prisma/client.js';
import { playerRef } from '../player/player.dto.js';
import type { CoverageDto, RankRowDto, RankingListDto, RankingsQueryDto } from './statistics.dto.js';

type CompetitionRow = Awaited<ReturnType<CompetitionService['resolve']>>;
type SeasonRow = CompetitionRow['seasons'][number];

interface AggRow {
  player_id: number;
  goals: bigint | number;
  assists: bigint | number;
  minutes: bigint | number;
  appearances: bigint | number;
}

interface TeamPickRow {
  player_id: number;
  team_id: number;
}

interface CoverageRow {
  finished: bigint | number;
  collected: bigint | number;
}

interface AsOfRow {
  as_of: Date | null;
}

const FINISHED_STATUSES = ['FT', 'AET', 'PEN'] as const;

@Injectable()
export class StatisticsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly competitions: CompetitionService,
    private readonly teams: TeamService,
  ) {}

  scorers(q: RankingsQueryDto, locale: Locale = DEFAULT_LOCALE): Promise<RankingListDto> {
    return this.ranking(RankingCategory.SCORERS, q, locale);
  }

  assisters(q: RankingsQueryDto, locale: Locale = DEFAULT_LOCALE): Promise<RankingListDto> {
    return this.ranking(RankingCategory.ASSISTS, q, locale);
  }

  private async ranking(category: RankingCategory, q: RankingsQueryDto, locale: Locale): Promise<RankingListDto> {
    const limit = q.limit ?? 10;
    // 정렬 대상 컬럼 (SCORERS=goals · ASSISTS=assists). 값 필터·1차 정렬 키.
    const valueCol = category === RankingCategory.SCORERS ? 'goals' : 'assists';
    const lookup = new NameLookup(this.prisma, locale);

    const comp = await this.competitions.resolve(q.competition);
    const cs = this.pickSeason(comp, q.season);
    if (!cs) throw new NotFoundException(`${q.competition} 에 ${q.season ?? '현재'} 시즌이 없다`);

    const csIds = [cs.id];
    const seasonRef = { year: cs.season.year, label: seasonLabel(cs.season.year) };

    // 1) 값·도움·출전시간·출전수 SUM · 상위 limit
    // 정렬 (결정적): goals DESC → assists DESC → minutes ASC → player_id ASC.
    // HAVING SUM(valueCol) > 0 로 값이 0 인 선수는 제외 (랭킹에 의미 없음).
    const orderExpr = valueCol === 'goals'
      ? Prisma.sql`goals DESC, assists DESC, minutes ASC, pms.player_id ASC`
      : Prisma.sql`assists DESC, goals DESC, minutes ASC, pms.player_id ASC`;

    const aggRows = await this.prisma.$queryRaw<AggRow[]>`
      SELECT
        pms.player_id AS player_id,
        SUM(pms.goals_total)::bigint AS goals,
        SUM(pms.assists)::bigint AS assists,
        SUM(pms.minutes)::bigint AS minutes,
        COUNT(DISTINCT pms.match_id)::bigint AS appearances
      FROM player_match_stats pms
      JOIN matches m ON m.id = pms.match_id
      WHERE pms.competition_season_id IN (${Prisma.join(csIds)})
        AND m.status_short IN (${Prisma.join(FINISHED_STATUSES as unknown as string[])})
        AND m.detail_checked_at IS NOT NULL
      GROUP BY pms.player_id
      HAVING SUM(pms.${Prisma.raw(valueCol === 'goals' ? 'goals_total' : 'assists')}) > 0
      ORDER BY ${orderExpr}
      LIMIT ${limit}
    `;

    // NameLookup 로드 (competition 은 항상 하나)
    if (aggRows.length === 0) {
      await lookup.loadFor({ competitions: [comp.id] });
      const coverage = await this.coverageFor(csIds);
      const asOf = await this.asOfFor(csIds);
      return {
        competition: competitionRef(comp, lookup),
        season: seasonRef,
        items: [],
        coverage,
        asOf: asOf ?? latestOf(cs.asOf ?? new Date()),
      };
    }

    const playerIds = aggRows.map((r) => Number(r.player_id));

    // 2) 팀 결정: 그 범위 최다 출전 팀 · 동수면 가장 최근 경기의 팀
    const teamRows = await this.prisma.$queryRaw<TeamPickRow[]>`
      SELECT DISTINCT ON (t.player_id) t.player_id, t.team_id
      FROM (
        SELECT
          pms.player_id,
          pms.team_id,
          COUNT(DISTINCT pms.match_id) AS apps,
          MAX(m.kickoff_at) AS last_kickoff
        FROM player_match_stats pms
        JOIN matches m ON m.id = pms.match_id
        WHERE pms.player_id IN (${Prisma.join(playerIds)})
          AND pms.competition_season_id IN (${Prisma.join(csIds)})
          AND m.status_short IN (${Prisma.join(FINISHED_STATUSES as unknown as string[])})
          AND m.detail_checked_at IS NOT NULL
        GROUP BY pms.player_id, pms.team_id
      ) t
      ORDER BY t.player_id, t.apps DESC, t.last_kickoff DESC, t.team_id ASC
    `;
    const teamByPlayer = new Map<number, number>();
    for (const t of teamRows) teamByPlayer.set(Number(t.player_id), Number(t.team_id));

    // 3) player · team · competition 실 데이터 로드
    const [players, teams] = await Promise.all([
      this.prisma.player.findMany({ where: { id: { in: playerIds } } }),
      this.prisma.team.findMany({ where: { id: { in: [...teamByPlayer.values()] } } }),
    ]);
    const playerById = new Map(players.map((p) => [p.id, p]));
    const teamById = new Map(teams.map((t) => [t.id, t]));

    // 4) NameLookup
    await lookup.loadFor({
      players: playerIds,
      teams: [...teamByPlayer.values()],
      competitions: [comp.id],
    });

    // 5) 조립
    const items: RankRowDto[] = aggRows.map((r, i) => {
      const pid = Number(r.player_id);
      const p = playerById.get(pid);
      const tId = teamByPlayer.get(pid);
      const t = tId !== undefined ? teamById.get(tId) : undefined;
      return {
        rank: i + 1,
        value: Number(valueCol === 'goals' ? r.goals : r.assists),
        appearances: Number(r.appearances),
        minutes: Number(r.minutes),
        assists: Number(r.assists),
        player: p ? playerRef(p, lookup) : ({} as RankRowDto['player']),
        team: t ? this.teams.summary(t, lookup) : ({} as RankRowDto['team']),
      };
    });

    const coverage = await this.coverageFor(csIds);
    const asOf = await this.asOfFor(csIds);

    return {
      competition: competitionRef(comp, lookup),
      season: seasonRef,
      items,
      coverage,
      asOf: asOf ?? latestOf(cs.asOf ?? new Date()),
    };
  }

  /** 이 통계가 몇 %의 경기를 근거로 하는지. finished=0 이면 ratio=0. */
  private async coverageFor(csIds: number[]): Promise<CoverageDto> {
    if (csIds.length === 0) return { finished: 0, collected: 0, ratio: 0 };
    const [row] = await this.prisma.$queryRaw<CoverageRow[]>`
      SELECT
        COUNT(*) FILTER (WHERE m.status_short IN (${Prisma.join(FINISHED_STATUSES as unknown as string[])}))::bigint AS finished,
        COUNT(*) FILTER (
          WHERE m.status_short IN (${Prisma.join(FINISHED_STATUSES as unknown as string[])})
            AND m.detail_checked_at IS NOT NULL
        )::bigint AS collected
      FROM matches m
      WHERE m.competition_season_id IN (${Prisma.join(csIds)})
    `;
    const finished = Number(row?.finished ?? 0);
    const collected = Number(row?.collected ?? 0);
    const ratio = finished === 0 ? 0 : Math.round((collected / finished) * 1000) / 1000;
    return { finished, collected, ratio };
  }

  /** 집계에 포함된 경기들의 최신 as_of. */
  private async asOfFor(csIds: number[]): Promise<string | null> {
    if (csIds.length === 0) return null;
    const [row] = await this.prisma.$queryRaw<AsOfRow[]>`
      SELECT MAX(m.as_of) AS as_of
      FROM matches m
      WHERE m.competition_season_id IN (${Prisma.join(csIds)})
        AND m.status_short IN (${Prisma.join(FINISHED_STATUSES as unknown as string[])})
        AND m.detail_checked_at IS NOT NULL
    `;
    return row?.as_of ? new Date(row.as_of).toISOString() : null;
  }

  private pickSeason(comp: CompetitionRow, year: number | undefined): SeasonRow | undefined {
    return year !== undefined ? comp.seasons.find((s) => s.season.year === year) : (comp.seasons.find((s) => s.isCurrent) ?? comp.seasons[0]);
  }
}
