/**
 * 경기 응답 DTO — Swagger 스펙이 계약이다 (NEXT_STEPS 6장).
 * 스코어 5종은 원문 그대로(null 유지 — DATA_RULES 3장) · has_* 는 3값 그대로 · statsState 는 recheck/confirmed 배지의 유일한 소스.
 * CompetitionRefDto · SeasonRefDto · ScoreDto · RoundDto · MatchVenueDto 는 standing 도 같이 쓴다.
 */
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
import { CompetitionFormat, CompetitionType, MatchLeg, StatsState, type Competition } from '../generated/prisma/client.js';
import { NamesDto, names } from '../common/names.dto.js';
import { toRef } from '../common/ref.js';
import { COMPETITION_BY_API_ID } from '../ingestion/l0/competitions.catalog.js';
import { SeasonSummaryDto } from '../competition/competition.dto.js';
import { TeamSummaryDto } from '../team/team.dto.js';

export class MatchListQueryDto {
  @ApiPropertyOptional({ description: '대회 ref. 생략하면 화면 6대회(리그 5 + UCL) 전부', example: '39-premier-league' })
  @IsOptional()
  @IsString()
  competition?: string;

  @ApiPropertyOptional({ description: '시즌(시작 연도). 생략하면 현재 시즌', example: 2026 })
  @IsOptional()
  @IsInt()
  @Min(2000)
  @Max(2100)
  season?: number;

  @ApiPropertyOptional({ description: 'KST 날짜(포함) `YYYY-MM-DD` — 이 날 00:00 KST 부터', example: '2026-11-23' })
  @IsOptional()
  @IsString()
  from?: string;

  @ApiPropertyOptional({ description: 'KST 날짜(포함) `YYYY-MM-DD` — 이 날 23:59:59 KST 까지', example: '2026-11-29' })
  @IsOptional()
  @IsString()
  to?: string;

  @ApiPropertyOptional({ description: '팀 ref — 홈·원정 어느 쪽이든', example: '33-manchester-united' })
  @IsOptional()
  @IsString()
  team?: string;

  @ApiPropertyOptional({ description: '한 응답의 최대 경기 수. 기본 100, 최대 500', minimum: 1, maximum: 500, default: 100, example: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(500)
  limit?: number;
}

export class CompetitionRefDto extends NamesDto {
  @ApiProperty({ example: '39-premier-league' })
  ref!: string;

  @ApiProperty({ description: 'API-Football league id', example: 39 })
  apiId!: number;

  @ApiProperty({ enum: CompetitionType })
  type!: CompetitionType;

  @ApiProperty({ enum: CompetitionFormat, description: 'ROUND_ROBIN=순위표 · KNOCKOUT=대진표 · LEAGUE_PHASE_KNOCKOUT=둘 다' })
  format!: CompetitionFormat;
}

/** 대회 행 → 참조 조각. shortDisplayName 은 카탈로그 상수(competition.service 와 같은 방식) */
export function competitionRef(c: Competition): CompetitionRefDto {
  return {
    ref: toRef(c.apiCompetitionId, c.name),
    apiId: c.apiCompetitionId,
    ...names(c.name, COMPETITION_BY_API_ID.get(c.apiCompetitionId)?.shortName),
    type: c.type,
    format: c.format,
  };
}

export class SeasonRefDto {
  @ApiProperty({ description: 'API-Football 시즌 값 = 시작 연도', example: 2026 })
  year!: number;

  @ApiProperty({ description: '표시 라벨', example: '2026-27' })
  label!: string;
}

/** 스코어 한 쌍. 없으면 둘 다 null — 0 이 아니다 (DATA_RULES 3장) */
export class ScoreDto {
  @ApiPropertyOptional({ type: Number, nullable: true, example: 2 })
  home!: number | null;

  @ApiPropertyOptional({ type: Number, nullable: true, example: 1 })
  away!: number | null;
}

export class RoundDto {
  @ApiProperty({ description: 'API 원문', example: 'Regular Season - 12' })
  name!: string;

  @ApiProperty({ description: '시간순', example: 12 })
  ordinal!: number;

  @ApiPropertyOptional({ type: Number, nullable: true, example: 10 })
  matchCount!: number | null;

  @ApiProperty({ description: '16강 이상(컵)' })
  isLateStage!: boolean;
}

export class MatchVenueDto {
  @ApiProperty({ example: 'Old Trafford' })
  name!: string;

  @ApiPropertyOptional({ type: String, nullable: true, example: 'Manchester' })
  city!: string | null;
}

export class MatchDto {
  @ApiProperty({ description: 'API-Football fixture id = 경기 ref', example: 1234567 })
  id!: number;

  @ApiProperty({ description: '킥오프 (ISO 8601, UTC)', example: '2026-11-22T15:00:00.000Z' })
  kickoffAt!: string;

  @ApiProperty({ description: 'API 상태 코드 원문 — NS · 1H · HT · 2H · FT · AET · PEN · PST …', example: 'FT' })
  statusShort!: string;

  @ApiPropertyOptional({ type: String, nullable: true, example: 'Match Finished' })
  statusLong!: string | null;

  @ApiPropertyOptional({ type: Number, nullable: true, description: '진행 분', example: 90 })
  elapsed!: number | null;

  @ApiPropertyOptional({ type: Number, nullable: true, description: '추가 시간 분' })
  extraElapsed!: number | null;

  @ApiProperty({ enum: StatsState, description: '통계 확정 상태 — 프론트 recheck/confirmed 배지의 유일한 소스. L2 는 NONE 만 쓴다' })
  statsState!: StatsState;

  @ApiPropertyOptional({ type: String, nullable: true, description: 'CONFIRMED 가 된 시각 (ISO 8601)' })
  confirmedAt!: string | null;

  @ApiProperty({ type: ScoreDto, description: '현재 스코어 (연장·승부차기 반영된 API goals)' })
  goals!: ScoreDto;

  @ApiProperty({ type: ScoreDto, description: '전반 종료' })
  ht!: ScoreDto;

  @ApiProperty({ type: ScoreDto, description: '후반 종료' })
  ft!: ScoreDto;

  @ApiProperty({ type: ScoreDto, description: '연장. 없었으면 null/null' })
  et!: ScoreDto;

  @ApiProperty({ type: ScoreDto, description: '승부차기. 없었으면 null/null' })
  pen!: ScoreDto;

  @ApiPropertyOptional({ type: String, nullable: true, description: '승자 팀 ref. 무승부·미종료면 null', example: '33-manchester-united' })
  winnerTeamRef!: string | null;

  @ApiProperty({ type: TeamSummaryDto })
  home!: TeamSummaryDto;

  @ApiProperty({ type: TeamSummaryDto })
  away!: TeamSummaryDto;

  @ApiProperty({ type: CompetitionRefDto })
  competition!: CompetitionRefDto;

  @ApiProperty({ type: SeasonRefDto })
  season!: SeasonRefDto;

  @ApiProperty({ type: RoundDto })
  round!: RoundDto;

  @ApiPropertyOptional({ type: MatchVenueDto, nullable: true })
  venue!: MatchVenueDto | null;

  @ApiPropertyOptional({ type: String, nullable: true, example: 'M. Oliver' })
  referee!: string | null;

  @ApiPropertyOptional({ enum: MatchLeg, nullable: true, description: '녹아웃 1차전/2차전/단판. 리그는 null' })
  leg!: MatchLeg | null;

  @ApiProperty({ description: '컷오프 규칙 결과 — false 면 이벤트·라인업·통계를 받지 않는다' })
  detailEligible!: boolean;

  @ApiPropertyOptional({ type: Boolean, nullable: true, description: '3값: null=미확인 · false=확인했고 없음 · true=있음' })
  hasEvents!: boolean | null;

  @ApiPropertyOptional({ type: Boolean, nullable: true, description: '3값: null=미확인 · false=확인했고 없음 · true=있음' })
  hasLineups!: boolean | null;

  @ApiPropertyOptional({ type: Boolean, nullable: true, description: '3값: null=미확인 · false=확인했고 없음 · true=있음' })
  hasTeamStats!: boolean | null;

  @ApiPropertyOptional({ type: Boolean, nullable: true, description: '3값: null=미확인 · false=확인했고 없음 · true=있음' })
  hasPlayerStats!: boolean | null;

  @ApiProperty({ description: '데이터 기준 시각 (ISO 8601)' })
  asOf!: string;
}

export class MatchListDto {
  @ApiProperty({ type: [MatchDto], description: '킥오프 오름차순. limit 만큼 앞에서 자른다' })
  items!: MatchDto[];

  @ApiProperty({ description: '필터 조건을 만족하는 전체 경기 수 (limit 적용 전)', example: 342 })
  total!: number;

  @ApiProperty({ description: 'items.length < total — 잘렸는지 여부. 프론트가 limit 을 늘려 다시 부르는 판단에 쓴다' })
  hasMore!: boolean;

  @ApiPropertyOptional({ type: SeasonSummaryDto, nullable: true, description: 'competition 지정 시 실제로 적용된 시즌. 생략 시 null' })
  season!: SeasonSummaryDto | null;

  @ApiProperty({ description: '목록 전체의 데이터 기준 시각 (ISO 8601)' })
  asOf!: string;
}
