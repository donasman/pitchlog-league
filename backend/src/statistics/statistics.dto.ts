/**
 * 통계·랭킹 응답 DTO — Swagger 스펙이 계약이다 (NEXT_STEPS 6장).
 *
 * 소스는 `player_match_stats` 자체 집계 (2026-09-17 · DATA_RULES 8장).
 * `top_rankings` 는 더 이상 조회 경로가 아니다.
 *
 * **대회별 순위만.** 2차 개정 (2026-09-17 · feat/statistics-per-competition):
 *   - `competition` 필수 — 없으면 400. 전 대회 통합 랭킹은 폐기.
 *   - 이유: 리그 경기와 컵 1라운드는 상대 수준이 달라 같은 칸에서 줄 세울 수 없다
 *     (실측: 통합 3위 필립 티츠 7골 중 4골이 DFB 포칼 1경기).
 *   - 시즌 전 대회를 가로지르는 합계는 `/api/players/:ref` 응답의 `seasonTotals` 로 이동.
 *   - `breakdown` 필드는 랭킹에서 제거 — 단일 대회이므로 의미 없음.
 *
 * **정렬 (결정적)**: 골 내림 → 도움 내림 → 출전시간 적은 순 → 선수 id 오름.
 *
 * 응답에 `coverage: { finished, collected, ratio }` 를 포함해 "이 통계가 몇 %의 경기를 근거로 하는지"
 * 를 알린다. 백필-2 진행 중이거나 새 시즌 초기에는 낮게 나오는 것이 정상.
 *
 * 데이터 없는 대회시즌의 랭킹은 items:[] 200 (D18 — unavailableReason 안 쓴다).
 */
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { CompetitionRefDto, SeasonRefDto } from '../match/match.dto.js';
import { TeamSummaryDto } from '../team/team.dto.js';
import { PlayerRefDto } from '../player/player.dto.js';

export class RankingsQueryDto {
  @ApiProperty({ description: '대회 ref — **필수** (2026-09-17 · 전 대회 통합 랭킹 폐기). 컵·유럽 대항전 포함 19대회 전부 지원', example: '39-premier-league' })
  @IsString()
  competition!: string;

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

export class RankRowDto {
  @ApiProperty({ example: 1 })
  rank!: number;

  @ApiProperty({ description: '그 대회시즌의 선수별 SUM (SCORERS=goals_total · ASSISTS=assists)', example: 4 })
  value!: number;

  @ApiProperty({ description: '그 범위의 출전 경기 수 (COUNT DISTINCT match_id)', example: 4 })
  appearances!: number;

  @ApiProperty({ description: '그 범위의 출전시간 SUM (분 · 결정적 정렬의 3차 키)', example: 360 })
  minutes!: number;

  @ApiProperty({ description: 'SCORERS 응답에서도 assists 를 같이 노출 (정렬 규칙의 2차 키 · 프론트가 표시)', example: 0 })
  assists!: number;

  @ApiProperty({ type: PlayerRefDto })
  player!: PlayerRefDto;

  @ApiProperty({ type: TeamSummaryDto, description: '그 범위에서 출전 수가 가장 많은 팀. 동수면 가장 최근 경기의 팀' })
  team!: TeamSummaryDto;
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
  @ApiProperty({ type: CompetitionRefDto, description: '요청 대회' })
  competition!: CompetitionRefDto;

  @ApiProperty({ type: SeasonRefDto, description: '실제로 적용된 시즌 (season 생략 시 현재 시즌)' })
  season!: SeasonRefDto;

  @ApiProperty({ type: [RankRowDto], description: '골 내림 → 도움 내림 → 출전시간 적은 순 → 선수 id 오름 (결정적)' })
  items!: RankRowDto[];

  @ApiProperty({ type: CoverageDto, description: '이 통계가 몇 %의 경기를 근거로 하는지 · 백필-2 진행 중이면 낮음' })
  coverage!: CoverageDto;

  @ApiProperty({ description: '집계에 포함된 경기들의 최신 as_of (ISO 8601)' })
  asOf!: string;
}
