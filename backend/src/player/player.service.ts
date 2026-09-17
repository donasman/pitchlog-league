/**
 * 선수 조회. 상세는 선수 본인 + 현재 소속(SquadEntry validTo IS NULL 최신 시즌) + 시즌 통계 전부.
 * 응답 조립 규칙은 player.dto.ts 주석. 이 서비스는 DB 만 본다 — 외부 API 호출 금지 (BACKEND_GUIDE).
 */
import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { latestOf } from '../common/as-of.js';
import { NameLookup } from '../common/name-lookup.js';
import { parseRef } from '../common/ref.js';
import { DEFAULT_LOCALE, type Locale } from '../common/locale.js';
import { seasonLabel } from '../common/season-label.js';
import { TeamService } from '../team/team.service.js';
import { competitionRef } from '../match/match.dto.js';
import { Prisma, type Competition, type CompetitionSeason, type Player, type PlayerSeasonStat, type Season, type SquadEntry, type Team } from '../generated/prisma/client.js';
import {
  playerRef,
  type PlayerDetailDto,
  type PlayerSeasonStatDto,
  type PlayerTotalsDto,
  type SeasonBreakdownDto,
  type SeasonTotalsDto,
} from './player.dto.js';

type SeasonStatRow = PlayerSeasonStat & {
  team: Team;
  competitionSeason: CompetitionSeason & { competition: Competition; season: Season };
};

type SquadRow = SquadEntry & { team: Team };

const FINISHED_STATUSES = ['FT', 'AET', 'PEN'] as const;

type PlayerRow = Player & {
  seasonStats: SeasonStatRow[];
  squadEntries: SquadRow[];
};

@Injectable()
export class PlayerService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly teams: TeamService,
  ) {}

  async detail(ref: string, locale: Locale = DEFAULT_LOCALE): Promise<PlayerDetailDto> {
    const apiId = parseRef(ref, '선수 ref');
    const player = (await this.prisma.player.findUnique({
      where: { apiPlayerId: apiId },
      include: {
        seasonStats: {
          include: { team: true, competitionSeason: { include: { competition: true, season: true } } },
          orderBy: [
            { competitionSeason: { season: { year: 'desc' } } },
            { competitionSeason: { competition: { displayOrder: 'asc' } } },
          ],
        },
        squadEntries: {
          where: { validTo: null },
          orderBy: { seasonYear: 'desc' },
          take: 1,
          include: { team: true },
        },
      },
    })) as PlayerRow | null;
    if (!player) throw new NotFoundException(`선수가 없다: ${ref}`);

    const current = player.squadEntries[0] ?? null;
    // 현재 시즌 seasonTotals (feat/statistics-per-competition · 2026-09-17)
    // 랭킹 API 가 대회별로 갈렸으므로 시즌 통합 수치는 여기서만 볼 수 있다.
    const seasonTotals = await this.currentSeasonTotals(player.id);

    const lookup = new NameLookup(this.prisma, locale);
    await lookup.loadFor({
      players: [player.id],
      teams: [
        ...(current ? [current.team.id] : []),
        ...player.seasonStats.map((s) => s.team.id),
      ],
      competitions: [
        ...player.seasonStats.map((s) => s.competitionSeason.competition.id),
        ...(seasonTotals?.breakdown.map((b) => b.competitionId) ?? []),
      ],
    });
    const seasonStats = player.seasonStats.map((s) => this.seasonStat(s, lookup));
    return {
      ...playerRef(player, lookup),
      firstname: player.firstname,
      lastname: player.lastname,
      nationality: player.nationality,
      birthDate: player.birthDate ? player.birthDate.toISOString().slice(0, 10) : null,
      birthPlace: player.birthPlace,
      birthCountry: player.birthCountry,
      heightCm: player.heightCm,
      weightKg: player.weightKg,
      primaryTeam: current ? this.teams.summary(current.team, lookup) : null,
      jerseyNumber: current?.jerseyNumber ?? null,
      position: current?.position ?? null,
      seasonStats,
      totals: this.totals(player.seasonStats),
      seasonTotals: seasonTotals ? this.buildSeasonTotals(seasonTotals, lookup) : null,
      asOf: latestOf(player.updatedAt, ...player.seasonStats.map((s) => s.asOf)),
    };
  }

  /**
   * 현재 시즌의 추적 대회 pms 통합 · 그 선수가 뛴 모든 대회를 breakdown 으로.
   * 득점 0인 대회도 포함 (출전 사실이 정보다).
   * 반환값은 lookup 이 로케일 이름을 채우기 전 원시 형태 — buildSeasonTotals 에서 마무리.
   */
  private async currentSeasonTotals(playerId: number): Promise<{
    seasonYear: number;
    goals: number; assists: number; apps: number; minutes: number;
    yellowCards: number; redCards: number;
    breakdown: Array<{ competition: Competition; goals: number; assists: number; apps: number; minutes: number; displayOrder: number; competitionId: number }>;
  } | null> {
    interface BreakdownRow {
      competition_id: number;
      season_year: number;
      display_order: number;
      goals: bigint | number;
      assists: bigint | number;
      apps: bigint | number;
      minutes: bigint | number;
      yellow_cards: bigint | number;
      red_cards: bigint | number;
    }
    // 현재 시즌 (isCurrent=true) · isTracked 대회 · FT/AET/PEN 완료 · detail_checked_at 있음
    const rows = await this.prisma.$queryRaw<BreakdownRow[]>`
      SELECT
        c.id AS competition_id,
        s.year AS season_year,
        c.display_order AS display_order,
        SUM(pms.goals_total)::bigint AS goals,
        SUM(pms.assists)::bigint AS assists,
        COUNT(DISTINCT pms.match_id)::bigint AS apps,
        SUM(pms.minutes)::bigint AS minutes,
        SUM(pms.yellow_cards)::bigint AS yellow_cards,
        SUM(pms.red_cards)::bigint AS red_cards
      FROM player_match_stats pms
      JOIN matches m ON m.id = pms.match_id
      JOIN competition_seasons cs ON cs.id = pms.competition_season_id
      JOIN competitions c ON c.id = cs.competition_id
      JOIN seasons s ON s.id = cs.season_id
      WHERE pms.player_id = ${playerId}
        AND cs.is_current = true
        AND c.is_tracked = true
        AND m.status_short IN (${Prisma.join(FINISHED_STATUSES as unknown as string[])})
        AND m.detail_checked_at IS NOT NULL
      GROUP BY c.id, s.year, c.display_order
      ORDER BY c.display_order ASC
    `;
    if (rows.length === 0) return null;

    const compRows = await this.prisma.competition.findMany({
      where: { id: { in: rows.map((r) => Number(r.competition_id)) } },
    });
    const compById = new Map(compRows.map((c) => [c.id, c]));

    const seasonYear = Number(rows[0].season_year);
    let goals = 0, assists = 0, apps = 0, minutes = 0, yellow = 0, red = 0;
    const breakdown: Array<{ competition: Competition; goals: number; assists: number; apps: number; minutes: number; displayOrder: number; competitionId: number }> = [];
    for (const r of rows) {
      const compId = Number(r.competition_id);
      const c = compById.get(compId);
      if (!c) continue;
      const g = Number(r.goals);
      const a = Number(r.assists);
      const ap = Number(r.apps);
      const mn = Number(r.minutes);
      goals += g;
      assists += a;
      apps += ap;
      minutes += mn;
      yellow += Number(r.yellow_cards);
      red += Number(r.red_cards);
      breakdown.push({
        competition: c,
        goals: g,
        assists: a,
        apps: ap,
        minutes: mn,
        displayOrder: Number(r.display_order),
        competitionId: compId,
      });
    }
    return { seasonYear, goals, assists, apps, minutes, yellowCards: yellow, redCards: red, breakdown };
  }

  private buildSeasonTotals(
    raw: NonNullable<Awaited<ReturnType<PlayerService['currentSeasonTotals']>>>,
    lookup: NameLookup,
  ): SeasonTotalsDto {
    const breakdown: SeasonBreakdownDto[] = raw.breakdown.map((b) => ({
      competition: competitionRef(b.competition, lookup),
      goals: b.goals,
      assists: b.assists,
      apps: b.apps,
      minutes: b.minutes,
    }));
    return {
      season: { year: raw.seasonYear, label: seasonLabel(raw.seasonYear) },
      goals: raw.goals,
      assists: raw.assists,
      apps: raw.apps,
      minutes: raw.minutes,
      yellowCards: raw.yellowCards,
      redCards: raw.redCards,
      breakdown,
    };
  }

  private seasonStat(s: SeasonStatRow, lookup?: NameLookup): PlayerSeasonStatDto {
    return {
      competition: competitionRef(s.competitionSeason.competition, lookup),
      season: { year: s.competitionSeason.season.year, label: seasonLabel(s.competitionSeason.season.year) },
      team: this.teams.summary(s.team, lookup),
      appearances: s.appearances,
      starts: s.lineupsCount,
      minutes: s.minutes,
      goals: s.goals,
      assists: s.assists,
      yellowCards: s.yellowCards,
      yellowredCards: s.yellowredCards,
      redCards: s.redCards,
    };
  }

  /**
   * 커리어 합계. assists 는 하나라도 null 이면 null — SUM 안 한다.
   * "측정 안 됨" 을 0 으로 접으면 화면에 도움 0 개로 표시된다 (실제 커리어와 다르다).
   */
  private totals(stats: PlayerSeasonStat[]): PlayerTotalsDto {
    const assistsHasNull = stats.some((s) => s.assists === null);
    return {
      appearances: stats.reduce((a, s) => a + s.appearances, 0),
      minutes: stats.reduce((a, s) => a + s.minutes, 0),
      goals: stats.reduce((a, s) => a + s.goals, 0),
      assists: assistsHasNull ? null : stats.reduce((a, s) => a + (s.assists ?? 0), 0),
      yellowCards: stats.reduce((a, s) => a + s.yellowCards, 0),
      redCards: stats.reduce((a, s) => a + s.redCards, 0),
    };
  }
}
