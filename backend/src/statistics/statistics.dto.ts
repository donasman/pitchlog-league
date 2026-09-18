/**
 * 통계·랭킹 응답 DTO — Swagger 스펙이 계약이다 (NEXT_STEPS 6장).
 *
 * 소스는 `player_match_stats` 자체 집계 (2026-09-17 · feat/statistics-self-aggregation · DATA_RULES 8장).
 * `top_rankings` 는 더 이상 조회 경로가 아니다.
 *
 * 두 모드:
 *   A. competition 지정 → 그 대회·시즌의 pms 를 선수별 SUM · 값 내림차순 · rank 부여.
 *      → items[].breakdown 은 없음, competition · season 세팅.
 *   B. competition 생략 → 그 시즌의 추적 대회 19개 (ingestScopeWhere) 전부에서 SUM.
 *      **대회별 상위 N 을 자른 뒤 더하지 않는다** — 전수 합산 후 한 번만 자른다 (이번 판의 핵심 수정).
 *      → items[].breakdown 은 그 선수가 실제로 값을 낸 대회만, 대회별 원 값·시즌.
 *      → competition · season 은 null.
 *
 * 응답에 `coverage: { finished, collected, ratio }` 를 포함해 "이 통계가 몇 %의 경기를 근거로 하는지"
 * 를 알린다. 백필-2 진행 중이거나 새 시즌 초기에는 낮게 나오는 것이 정상.
 *
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

  @ApiPropertyOptional({ description: '응답 로케일. `ko`|`en`. 유효하지 않으면 조용히 기본 `ko` 로 폴백', example: 'ko' })
  @IsOptional()
  @IsString()
  locale?: string;
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

  @ApiProperty({ description: '모드 A: 그 대회시즌 SUM. 모드 B: 그 시즌의 추적 대회 전부에서 SUM', example: 22 })
  value!: number;

  @ApiProperty({ description: '그 범위의 출전 경기 수 (COUNT DISTINCT match_id · 결정적 정렬의 2차 키)', example: 12 })
  appearances!: number;

  @ApiProperty({ type: PlayerRefDto })
  player!: PlayerRefDto;

  @ApiProperty({ type: TeamSummaryDto, description: '그 범위에서 출전 수가 가장 많은 팀. 동수면 가장 최근 경기의 팀' })
  team!: TeamSummaryDto;

  @ApiPropertyOptional({ type: [BreakdownEntryDto], description: '모드 B 에서만 존재. 그 선수가 실제로 값을 낸 대회의 원 값·시즌. 값 내림차순 · 대회 displayOrder 오름차순' })
  breakdown?: BreakdownEntryDto[];
}

export class CoverageDto {
  @ApiProperty({ description: '그 범위의 종료 경기 수 (status_short ∈ FT/AET/PEN)', example: 154 })
  finished!: number;

  @ApiProperty({ description: '그중 상세 수집이 끝난 경기 수 (detail_checked_at IS NOT NULL)', example: 132 })
  collected!: number;

  @ApiProperty({ description: 'collected / finished · 소수점 셋째 자리 반올림 · finished=0 이면 0. 이 통계가 몇 %의 경기를 근거로 하는지', example: 0.857 })
  ratio!: number;
}

export class RankingListDto {
  @ApiPropertyOptional({ type: CompetitionRefDto, nullable: true, description: '모드 A: 요청 대회. 모드 B: null' })
  competition!: CompetitionRefDto | null;

  @ApiPropertyOptional({ type: SeasonRefDto, nullable: true, description: '모드 A: 실제로 적용된 시즌. 모드 B: null (시즌은 items[].breakdown 안에)' })
  season!: SeasonRefDto | null;

  @ApiProperty({ type: [RankRowDto], description: '값 내림차순 · 동점은 (출전 수 적은 순 → player id) 결정적' })
  items!: RankRowDto[];

  @ApiProperty({ type: CoverageDto, description: '이 통계가 몇 %의 경기를 근거로 하는지 · 백필-2 진행 중이면 낮음' })
  coverage!: CoverageDto;

  @ApiProperty({ description: '집계에 포함된 경기들의 최신 as_of (ISO 8601)' })
  asOf!: string;
}
