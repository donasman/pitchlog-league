/**
 * 순위표 응답 DTO — Swagger 스펙이 계약이다 (NEXT_STEPS 6장).
 * 컵(KNOCKOUT)은 순위표가 없는 게 정상(DATA_RULES 5-3)이라 404 가 아니라 200 + unavailableReason 이다 —
 * 프론트 StandingsPage 가 "없음(EmptyState)" 과 "실패(ErrorState)" 를 구분해야 하고 4xx 는 실패로 그려진다.
 */
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
import { SeasonSummaryDto } from '../competition/competition.dto.js';
import { CompetitionRefDto } from '../match/match.dto.js';
import { TeamSummaryDto } from '../team/team.dto.js';

export class StandingsQueryDto {
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
}

export const UNAVAILABLE_REASONS = ['KNOCKOUT', 'EMPTY'] as const;
export type UnavailableReason = (typeof UNAVAILABLE_REASONS)[number];

/** 홈/원정 분리 성적 */
export class SplitRecordDto {
  @ApiProperty({ example: 6 })
  played!: number;

  @ApiProperty({ example: 4 })
  win!: number;

  @ApiProperty({ example: 1 })
  draw!: number;

  @ApiProperty({ example: 1 })
  lose!: number;

  @ApiProperty({ description: '득점', example: 12 })
  gf!: number;

  @ApiProperty({ description: '실점', example: 5 })
  ga!: number;
}

export class StandingRowDto {
  @ApiProperty({ type: TeamSummaryDto })
  team!: TeamSummaryDto;

  @ApiPropertyOptional({ type: String, nullable: true, description: '조·리그 이름 원문. 단일 표면 대회 이름', example: 'Premier League' })
  groupName!: string | null;

  @ApiProperty({ example: 1 })
  rank!: number;

  @ApiProperty({ example: 31 })
  points!: number;

  @ApiProperty({ example: 12 })
  played!: number;

  @ApiProperty({ example: 10 })
  win!: number;

  @ApiProperty({ example: 1 })
  draw!: number;

  @ApiProperty({ example: 1 })
  lose!: number;

  @ApiProperty({ example: 28 })
  goalsFor!: number;

  @ApiProperty({ example: 9 })
  goalsAgainst!: number;

  @ApiProperty({ example: 19 })
  goalDiff!: number;

  @ApiProperty({ type: SplitRecordDto })
  home!: SplitRecordDto;

  @ApiProperty({ type: SplitRecordDto })
  away!: SplitRecordDto;

  @ApiPropertyOptional({ type: String, nullable: true, description: '최근 경기 원문 — W/D/L 문자열', example: 'WWDLW' })
  form!: string | null;

  @ApiPropertyOptional({ type: String, nullable: true, description: '구역 설명 원문. 없는 대회가 있다', example: 'Promotion - Champions League (League phase)' })
  description!: string | null;

  @ApiPropertyOptional({ type: String, nullable: true, description: '순위 변동 원문', example: 'same' })
  status!: string | null;

  @ApiProperty({ description: '이 행의 데이터 기준 시각 (ISO 8601)' })
  asOf!: string;
}

export class StandingsTableDto {
  @ApiProperty({ type: CompetitionRefDto })
  competition!: CompetitionRefDto;

  @ApiProperty({ type: SeasonSummaryDto, description: '실제로 적용된 시즌' })
  season!: SeasonSummaryDto;

  @ApiPropertyOptional({
    enum: UNAVAILABLE_REASONS,
    nullable: true,
    description: 'rows 가 빈 이유. KNOCKOUT=컵이라 순위표 자체가 없다(정상) · EMPTY=리그인데 아직 행이 없다(시작 전). 있으면 null',
  })
  unavailableReason!: UnavailableReason | null;

  @ApiProperty({ type: [StandingRowDto], description: 'groupName → rank 순' })
  rows!: StandingRowDto[];

  @ApiProperty({ description: '표의 데이터 기준 시각 (ISO 8601)' })
  asOf!: string;
}

export class StandingsListDto {
  @ApiProperty({ type: [StandingsTableDto], description: 'competition 지정 시 1개, 생략 시 화면 6대회 displayOrder 순' })
  items!: StandingsTableDto[];

  @ApiProperty({ description: '목록 전체의 데이터 기준 시각 (ISO 8601)' })
  asOf!: string;
}
