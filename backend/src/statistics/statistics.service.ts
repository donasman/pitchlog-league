/**
 * 통계·랭킹 조회 — `player_match_stats` 자체 집계 (2026-09-17 · feat/statistics-self-aggregation).
 *
 * 소스 규칙 (DATA_RULES 8장):
 *   - `player_match_stats` 를 선수·대회시즌 축으로 SUM.
 *   - `match_events` 안 씀 — pms 에 competition_season_id 가 이미 있고, 자책골이 섞이지 않는다.
 *   - 상세 수집이 안 된 경기 (`detail_checked_at IS NULL`) 는 제외 — 통계에 못 반영.
 *   - 종료 경기만 (`status_short IN ('FT','AET','PEN')`).
 *
 * 두 모드:
 *   A. competition 지정 → 그 대회·시즌의 pms 를 SUM · 값 내림차순 · rank 부여.
 *   B. 생략 → 그 시즌의 추적 대회 전부 (ingestScopeWhere · 19개) 에서 SUM.
 *      **대회별 상위 N 을 자른 뒤 더하지 않는다.** 전수 합산 후 한 번만 자른다.
 *      items[].breakdown 은 그 선수가 실제로 값을 낸 대회만.
 *
 * team 결정: 그 범위 최다 출전 팀. 동수면 가장 최근 경기의 팀.
 * 동점 처리: 값 → 출전 수 적은 순 → player id 오름차순 (결정적 정렬).
 *
 * `top_rankings` 는 더 이상 조회 경로가 아니다 (다음 판에서 제거 예정 · SCHEMA_DESIGN 9장).
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
import { ingestScopeWhere } from '../ingestion/screen-scope.js';
import { Prisma, RankingCategory, type Competition, type CompetitionSeason, type Season } from '../generated/prisma/client.js';
import { playerRef } from '../player/player.dto.js';
import type { BreakdownEntryDto, CoverageDto, RankRowDto, RankingListDto, RankingsQueryDto } from './statistics.dto.js';

type CompetitionRow = Awaited<ReturnType<CompetitionService['resolve']>>;
type SeasonRow = CompetitionRow['seasons'][number];

type ScreenCompetitionRow = Competition & {
  seasons: (CompetitionSeason & { season: Season })[];
};

interface AggRow {
  player_id: number;
  value: bigint | number;
  appearances: bigint | number;
}

interface TeamPickRow {
  player_id: number;
  team_id: number;
}

interface BreakdownRow {
  player_id: number;
  competition_season_id: number;
  value: bigint | number;
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
    // 컬럼명은 내부 enum → 화이트리스트 · Prisma.raw 로 sql injection 없음
    const valueCol = category === RankingCategory.SCORERS ? 'goals_total' : 'assists';
    const lookup = new NameLookup(this.prisma, locale);

    let comp: CompetitionRow | null = null;
    let csList: Array<{ cs: { id: number; season: { year: number }; asOf: Date | null }; compId: number; compRef: string; compName: string }> = [];
    let seasonRef: RankingListDto['season'] = null;

    if (q.competition !== undefined) {
      // ── 모드 A ──
      comp = await this.competitions.resolve(q.competition);
      const cs = this.pickSeason(comp, q.season);
      if (!cs) throw new NotFoundException(`${q.competition} 에 ${q.season ?? '현재'} 시즌이 없다`);
      csList = [{ cs, compId: comp.id, compRef: `${comp.apiCompetitionId}`, compName: comp.name }];
      seasonRef = { year: cs.season.year, label: seasonLabel(cs.season.year) };
    } else {
      // ── 모드 B — 추적 대회 19개 전부 (ingestScopeWhere) ──
      const comps = (await this.prisma.competition.findMany({
        where: ingestScopeWhere,
        include: {
          seasons: { include: { season: true }, orderBy: { season: { year: 'desc' } } },
        },
        orderBy: { displayOrder: 'asc' },
      })) as ScreenCompetitionRow[];

      for (const c of comps) {
        const cs =
          q.season !== undefined
            ? c.seasons.find((s) => s.season.year === q.season)
            : (c.seasons.find((s) => s.isCurrent) ?? c.seasons[0]);
        if (cs) csList.push({ cs: { id: cs.id, season: { year: cs.season.year }, asOf: cs.asOf }, compId: c.id, compRef: `${c.apiCompetitionId}`, compName: c.name });
      }
      if (csList.length === 0) {
        return { competition: null, season: null, items: [], coverage: { finished: 0, collected: 0, ratio: 0 }, asOf: latestOf() };
      }
    }

    const csIds = csList.map((x) => x.cs.id);

    // 1) 값·출전 SUM · 상위 limit (결정적 정렬)
    const aggRows = await this.prisma.$queryRaw<AggRow[]>`
      SELECT
        pms.player_id AS player_id,
        SUM(pms.${Prisma.raw(valueCol)})::bigint AS value,
        COUNT(DISTINCT pms.match_id)::bigint AS appearances
      FROM player_match_stats pms
      JOIN matches m ON m.id = pms.match_id
      WHERE pms.competition_season_id IN (${Prisma.join(csIds)})
        AND m.status_short IN (${Prisma.join(FINISHED_STATUSES as unknown as string[])})
        AND m.detail_checked_at IS NOT NULL
      GROUP BY pms.player_id
      HAVING SUM(pms.${Prisma.raw(valueCol)}) > 0
      ORDER BY value DESC, appearances ASC, pms.player_id ASC
      LIMIT ${limit}
    `;

    if (aggRows.length === 0) {
      const coverage = await this.coverageFor(csIds);
      const asOf = await this.asOfFor(csIds);
      return {
        competition: comp ? competitionRef(comp, lookup) : null,
        season: seasonRef,
        items: [],
        coverage,
        asOf: asOf ?? latestOf(),
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

    // 3) player · team 실 데이터 로드
    const [players, teams] = await Promise.all([
      this.prisma.player.findMany({ where: { id: { in: playerIds } } }),
      this.prisma.team.findMany({ where: { id: { in: [...teamByPlayer.values()] } } }),
    ]);
    const playerById = new Map(players.map((p) => [p.id, p]));
    const teamById = new Map(teams.map((t) => [t.id, t]));

    // 4) breakdown (모드 B 만)
    let breakdownByPlayer: Map<number, BreakdownEntryDto[]> | null = null;
    if (comp == null) {
      const bdRows = await this.prisma.$queryRaw<BreakdownRow[]>`
        SELECT
          pms.player_id AS player_id,
          pms.competition_season_id AS competition_season_id,
          SUM(pms.${Prisma.raw(valueCol)})::bigint AS value
        FROM player_match_stats pms
        JOIN matches m ON m.id = pms.match_id
        WHERE pms.player_id IN (${Prisma.join(playerIds)})
          AND pms.competition_season_id IN (${Prisma.join(csIds)})
          AND m.status_short IN (${Prisma.join(FINISHED_STATUSES as unknown as string[])})
          AND m.detail_checked_at IS NOT NULL
        GROUP BY pms.player_id, pms.competition_season_id
        HAVING SUM(pms.${Prisma.raw(valueCol)}) > 0
      `;
      // cs id → { comp, season } 매핑
      const csMeta = new Map<number, (typeof csList)[number]>();
      for (const x of csList) csMeta.set(x.cs.id, x);
      // 그 대회의 원본 competition row 를 가져오기 위해 comps 재조회
      const compRows = await this.prisma.competition.findMany({ where: { id: { in: [...new Set(csList.map((x) => x.compId))] } } });
      const compById = new Map(compRows.map((c) => [c.id, c]));

      // breakdown 항목 · pid 별 그룹 · 값 내림차순 → displayOrder 오름차순
      type Raw = { csId: number; compId: number; value: number };
      const raw = new Map<number, Raw[]>();
      for (const b of bdRows) {
        const pid = Number(b.player_id);
        const csId = Number(b.competition_season_id);
        const meta = csMeta.get(csId);
        if (!meta) continue;
        const arr = raw.get(pid) ?? [];
        arr.push({ csId, compId: meta.compId, value: Number(b.value) });
        raw.set(pid, arr);
      }
      const displayOrderByComp = new Map(compRows.map((c) => [c.id, c.displayOrder]));
      breakdownByPlayer = new Map();
      for (const [pid, entries] of raw) {
        entries.sort((a, b) => {
          if (b.value !== a.value) return b.value - a.value;
          return (displayOrderByComp.get(a.compId) ?? 0) - (displayOrderByComp.get(b.compId) ?? 0);
        });
        breakdownByPlayer.set(
          pid,
          entries.map((e) => {
            const c = compById.get(e.compId);
            const meta = csMeta.get(e.csId);
            return {
              competition: c ? competitionRef(c, lookup) : ({} as BreakdownEntryDto['competition']),
              season: { year: meta?.cs.season.year ?? 0, label: seasonLabel(meta?.cs.season.year ?? 0) },
              value: e.value,
            };
          }),
        );
      }
    }

    // 5) NameLookup 로드
    await lookup.loadFor({
      players: playerIds,
      teams: [...teamByPlayer.values()],
      competitions: comp
        ? [comp.id]
        : [...new Set(csList.map((x) => x.compId))],
    });

    // 6) 조립
    const items: RankRowDto[] = aggRows.map((r, i) => {
      const pid = Number(r.player_id);
      const p = playerById.get(pid);
      const tId = teamByPlayer.get(pid);
      const t = tId !== undefined ? teamById.get(tId) : undefined;
      const row: RankRowDto = {
        rank: i + 1,
        value: Number(r.value),
        appearances: Number(r.appearances),
        player: p ? playerRef(p, lookup) : ({} as RankRowDto['player']),
        team: t ? this.teams.summary(t, lookup) : ({} as RankRowDto['team']),
      };
      if (breakdownByPlayer) {
        row.breakdown = breakdownByPlayer.get(pid) ?? [];
      }
      return row;
    });

    const coverage = await this.coverageFor(csIds);
    const asOf = await this.asOfFor(csIds);

    return {
      competition: comp ? competitionRef(comp, lookup) : null,
      season: seasonRef,
      items,
      coverage,
      asOf: asOf ?? latestOf(...csList.map((x) => x.cs.asOf).filter((d): d is Date => d !== null)),
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
