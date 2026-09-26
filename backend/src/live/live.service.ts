/**
 * GET /api/live 서비스 — DB 만 본다 (외부 API 호출 금지 · CLAUDE.md 백엔드 규칙).
 *
 * 필터:
 *   1) statusShort ∈ LIVE_STATUSES      AND kickoff_at ≥ now − 6h  (진행 중 · 6h 여유 · A매치·연장 포함)
 *   2) statusShort ∈ TERMINAL_STATUSES  AND kickoff_at ≥ now − 5h  (최근 종료 · ≈ FT 후 3h)
 *   3) 대회는 is_tracked = true 만
 *
 * 정렬: kickoffAt asc, apiFixtureId asc.
 * 매핑: 축약 TeamRefDto · CompetitionRefDto · ScoreDto 만 담는다 (통계·라운드·베뉴 없음).
 * dataVersion 은 매 응답에 포함 — 프론트 라이브 폴러가 변화 여부를 안다.
 */
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { toRef } from '../common/ref.js';
import { names } from '../common/names.dto.js';
import { COMPETITION_BY_API_ID } from '../ingestion/l0/competitions.catalog.js';
import type { Competition, Match, Team, CompetitionSeason, Season } from '../generated/prisma/client.js';
import {
  LIVE_STATUSES,
  TERMINAL_STATUSES,
  LIVE_LOOKBACK_MS,
  RECENTLY_FINISHED_LOOKBACK_MS,
} from '../ingestion/l4/status-rank.js';
import type { LiveMatchDto, LiveResponseDto, TeamRefDto } from './dto/live-match.dto.js';
import type { CompetitionRefDto } from '../match/match.dto.js';

type LiveMatchRow = Match & {
  homeTeam: Team;
  awayTeam: Team;
  competitionSeason: CompetitionSeason & { competition: Competition; season: Season };
};

@Injectable()
export class LiveService {
  constructor(private readonly prisma: PrismaService) {}

  async list(now: Date = new Date()): Promise<LiveResponseDto> {
    const liveAfter = new Date(now.getTime() - LIVE_LOOKBACK_MS);
    const finishedAfter = new Date(now.getTime() - RECENTLY_FINISHED_LOOKBACK_MS);

    const rows = (await this.prisma.match.findMany({
      where: {
        AND: [
          { competitionSeason: { competition: { isTracked: true } } },
          {
            OR: [
              {
                statusShort: { in: [...LIVE_STATUSES] },
                kickoffAt: { gte: liveAfter },
              },
              {
                statusShort: { in: [...TERMINAL_STATUSES] },
                kickoffAt: { gte: finishedAfter },
              },
            ],
          },
        ],
      },
      include: {
        homeTeam: true,
        awayTeam: true,
        competitionSeason: { include: { competition: true, season: true } },
      },
      orderBy: [{ kickoffAt: 'asc' }, { apiFixtureId: 'asc' }],
    })) as LiveMatchRow[];

    return {
      asOf: now.toISOString(),
      matches: rows.map((m) => this.toDto(m)),
    };
  }

  private toDto(m: LiveMatchRow): LiveMatchDto {
    return {
      id: m.apiFixtureId,
      kickoffAt: m.kickoffAt.toISOString(),
      competition: this.competitionRef(m.competitionSeason.competition),
      home: this.teamRef(m.homeTeam),
      away: this.teamRef(m.awayTeam),
      statusShort: m.statusShort,
      elapsed: m.elapsed,
      extraElapsed: m.extraElapsed,
      goals: { home: m.goalsHome, away: m.goalsAway },
      dataVersion: m.dataVersion,
      asOf: (m.asOf ?? m.updatedAt).toISOString(),
    };
  }

  private competitionRef(c: Competition): CompetitionRefDto {
    // match.dto.ts:77 competitionRef 와 동일한 조립 규칙 (lookup 없이 원본만).
    return {
      ref: toRef(c.apiCompetitionId, c.name),
      apiId: c.apiCompetitionId,
      ...names(c.name, COMPETITION_BY_API_ID.get(c.apiCompetitionId)?.shortName),
      type: c.type,
      format: c.format,
    };
  }

  private teamRef(t: Team): TeamRefDto {
    // team.service.ts:93 summary 와 동일한 조립 규칙 (lookup 없이 원본만).
    return {
      ref: toRef(t.apiTeamId, t.name),
      apiId: t.apiTeamId,
      ...names(t.name, t.shortName ?? t.code),
      logoUrl: t.logoUrl,
    };
  }
}
