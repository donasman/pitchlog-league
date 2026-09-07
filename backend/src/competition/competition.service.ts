/**
 * 대회 조회 — 추적 대회 17개(리그 6 · 컵 6 · 슈퍼컵 5)와 그 시즌.
 * 응답 조립 규칙은 competition.dto.ts 주석. 이 서비스는 DB 만 본다 — 외부 API 호출 금지 (CLAUDE.md).
 */
import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { latestOf } from '../common/as-of.js';
import { dataStateOf } from '../common/data-state.js';
import { names } from '../common/names.dto.js';
import { parseRef, toRef } from '../common/ref.js';
import { seasonLabel } from '../common/season-label.js';
import { COMPETITION_BY_API_ID } from '../ingestion/l0/competitions.catalog.js';
import type { Competition, CompetitionSeason, Season, BackfillJob } from '../generated/prisma/client.js';
import type { CompetitionDetailDto, CompetitionListDto, CompetitionSummaryDto, SeasonSummaryDto } from './competition.dto.js';

type SeasonRow = CompetitionSeason & { season: Season; backfillJob: BackfillJob | null };
type CompetitionRow = Competition & { seasons: SeasonRow[]; topFlight: Competition | null };

const SEASON_INCLUDE = {
  seasons: { include: { season: true, backfillJob: true }, orderBy: { season: { year: 'desc' as const } } },
  topFlight: true,
};

@Injectable()
export class CompetitionService {
  constructor(private readonly prisma: PrismaService) {}

  async list(): Promise<CompetitionListDto> {
    const rows = await this.prisma.competition.findMany({
      where: { isTracked: true },
      include: SEASON_INCLUDE,
      orderBy: { displayOrder: 'asc' },
    });
    return {
      items: rows.map((r) => this.summary(r)),
      asOf: latestOf(...rows.map((r) => r.updatedAt), ...rows.flatMap((r) => r.seasons.map((s) => s.asOf))),
    };
  }

  async detail(ref: string): Promise<CompetitionDetailDto> {
    const apiId = parseRef(ref, '대회 ref');
    const row = await this.prisma.competition.findFirst({ where: { apiCompetitionId: apiId, isTracked: true }, include: SEASON_INCLUDE });
    if (!row) throw new NotFoundException(`대회가 없다: ${ref}`);
    return {
      ...this.summary(row),
      seasons: row.seasons.map((s) => this.season(s)),
      topFlightRef: row.topFlight ? toRef(row.topFlight.apiCompetitionId, row.topFlight.name) : null,
      asOf: latestOf(row.updatedAt, ...row.seasons.map((s) => s.asOf)),
    };
  }

  /** ref → 내부 id. 팀 목록 등 다른 모듈이 대회 필터를 풀 때 쓴다 */
  async resolve(ref: string): Promise<CompetitionRow> {
    const apiId = parseRef(ref, '대회 ref');
    const row = await this.prisma.competition.findFirst({ where: { apiCompetitionId: apiId, isTracked: true }, include: SEASON_INCLUDE });
    if (!row) throw new NotFoundException(`대회가 없다: ${ref}`);
    return row;
  }

  summary(r: CompetitionRow): CompetitionSummaryDto {
    const current = r.seasons.find((s) => s.isCurrent) ?? null;
    return {
      ref: toRef(r.apiCompetitionId, r.name),
      apiId: r.apiCompetitionId,
      ...names(r.name, COMPETITION_BY_API_ID.get(r.apiCompetitionId)?.shortName),
      country: r.country,
      countryCode: r.countryCode,
      type: r.type,
      format: r.format,
      logoUrl: r.logoUrl,
      displayOrder: r.displayOrder,
      currentSeason: current ? this.season(current) : null,
    };
  }

  season(s: SeasonRow): SeasonSummaryDto {
    return {
      year: s.season.year,
      label: seasonLabel(s.season.year),
      status: s.status,
      isCurrent: s.isCurrent,
      dataState: dataStateOf(s.backfillJob),
      startDate: s.startDate ? s.startDate.toISOString().slice(0, 10) : null,
      endDate: s.endDate ? s.endDate.toISOString().slice(0, 10) : null,
    };
  }
}
