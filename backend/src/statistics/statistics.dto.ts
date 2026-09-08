/**
 * 통계·랭킹 응답 DTO — Swagger 스펙이 계약이다 (NEXT_STEPS 6장).
 * 두 모드:
 *   A. competition 지정 → 그 대회·시즌 하나의 TopRanking 을 rank 순으로 그대로.
 *      → items[].breakdown 은 없음, competition · season 세팅.
 *   B. competition 생략 → 화면 6대회 각각 top{limit} 를 모아 playerId 로 SUM 후 재정렬.
 *      → items[].breakdown 필수(대회별 원 값 · 시즌), competition · season 은 null (R4).
 * 데이터 없는 대회의 랭킹은 items:[] 200 (D18 — unavailableReason 안 쓴다).
 */
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { CompetitionRefDto, SeasonRefDto } from '../match/match.dto.js';
import { TeamSummaryDto } from '../team/team.dto.js';
import { PlayerRefDto } from '../player/player.dto.js';

export class RankingsQueryDto {
  @ApiPropertyOptional({ description: '대회 ref. 생략하면 화면 6대회 전부 합산 (모드 B)', example: '39-premier-league' })
  @IsOptional()
  @IsString()
  competition?: string;

  @ApiPropertyOptional({ description: '시즌(시작 연도). 생략하면 각 대회의 현재 시즌', example: 2026 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(2000)
  @Max(2100)
  season?: number;

  // 기존 조회 API 에 없던 규약. 랭킹 UI 표시량 상한.
  @ApiPropertyOptional({ description: '반환 상한. 1..100, 기본 10', example: 10, minimum: 1, maximum: 100, default: 10 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 10;
}

/** 모드 B — items[].breakdown 한 조각. 각 대회의 실제 시즌을 같이 보낸다 (R4) */
export class BreakdownEntryDto {
  @ApiProperty({ type: CompetitionRefDto })
  competition!: CompetitionRefDto;

  @ApiProperty({ type: SeasonRefDto })
  season!: SeasonRefDto;

  @ApiProperty({ description: '이 대회에서의 원 값 (그 대회 top{limit} 에 든 값)', example: 8 })
  value!: number;
}

export class RankRowDto {
  @ApiProperty({ example: 1 })
  rank!: number;

  @ApiProperty({ description: '모드 A: 대회 원 값. 모드 B: 대회별 합산', example: 22 })
  value!: number;

  @ApiProperty({ type: PlayerRefDto })
  player!: PlayerRefDto;

  @ApiProperty({ type: TeamSummaryDto, description: '모드 A: TopRanking.team. 모드 B: 이 선수가 가장 높은 rank 를 기록한 대회의 team' })
  team!: TeamSummaryDto;

  @ApiPropertyOptional({ type: [BreakdownEntryDto], description: '모드 B 에서만 존재. 이 선수가 든 각 대회의 원 값·시즌' })
  breakdown?: BreakdownEntryDto[];
}

export class RankingListDto {
  @ApiPropertyOptional({ type: CompetitionRefDto, nullable: true, description: '모드 A: 요청 대회. 모드 B: null' })
  competition!: CompetitionRefDto | null;

  @ApiPropertyOptional({ type: SeasonRefDto, nullable: true, description: '모드 A: 실제로 적용된 시즌. 모드 B: null (시즌은 items[].breakdown 안에)' })
  season!: SeasonRefDto | null;

  @ApiProperty({ type: [RankRowDto], description: '모드 A: rank 오름차순. 모드 B: 합산 값 내림차순으로 재부여된 rank' })
  items!: RankRowDto[];

  @ApiProperty({ description: '데이터 기준 시각 (ISO 8601)' })
  asOf!: string;
}
