/**
 * 선수 조회. 상세는 선수 본인 + 현재 소속(SquadEntry validTo IS NULL 최신 시즌) + 시즌 통계 전부.
 * 응답 조립 규칙은 player.dto.ts 주석. 이 서비스는 DB 만 본다 — 외부 API 호출 금지 (BACKEND_GUIDE).
 */
import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { latestOf } from '../common/as-of.js';
import { parseRef } from '../common/ref.js';
import { seasonLabel } from '../common/season-label.js';
import { TeamService } from '../team/team.service.js';
import { competitionRef } from '../match/match.dto.js';
import type { Competition, CompetitionSeason, Player, PlayerSeasonStat, Season, SquadEntry, Team } from '../generated/prisma/client.js';
import {
  playerRef,
  type PlayerDetailDto,
  type PlayerSeasonStatDto,
  type PlayerTotalsDto,
} from './player.dto.js';

type SeasonStatRow = PlayerSeasonStat & {
  team: Team;
  competitionSeason: CompetitionSeason & { competition: Competition; season: Season };
};

type SquadRow = SquadEntry & { team: Team };

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

  async detail(ref: string): Promise<PlayerDetailDto> {
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
    const seasonStats = player.seasonStats.map((s) => this.seasonStat(s));
    return {
      ...playerRef(player),
      firstname: player.firstname,
      lastname: player.lastname,
      nationality: player.nationality,
      birthDate: player.birthDate ? player.birthDate.toISOString().slice(0, 10) : null,
      birthPlace: player.birthPlace,
      birthCountry: player.birthCountry,
      heightCm: player.heightCm,
      weightKg: player.weightKg,
      primaryTeam: current ? this.teams.summary(current.team) : null,
      jerseyNumber: current?.jerseyNumber ?? null,
      position: current?.position ?? null,
      seasonStats,
      totals: this.totals(player.seasonStats),
      asOf: latestOf(player.updatedAt, ...player.seasonStats.map((s) => s.asOf)),
    };
  }

  private seasonStat(s: SeasonStatRow): PlayerSeasonStatDto {
    return {
      competition: competitionRef(s.competitionSeason.competition),
      season: { year: s.competitionSeason.season.year, label: seasonLabel(s.competitionSeason.season.year) },
      team: this.teams.summary(s.team),
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
