/**
 * GET /api/live 응답 DTO.
 *
 * 계약 요지:
 *   - LIVE_STATUSES 는 진행 중 (kickoff ≥ now-6h) · TERMINAL_STATUSES 는 최근 종료 (kickoff ≥ now-5h · ≈ FT 후 3h).
 *   - CompetitionRefDto · ScoreDto 는 match.dto.ts 의 것 그대로 재사용 (재정의 금지).
 *   - TeamRefDto 는 여기서 신설한 축약형 — TeamSummaryDto 를 상속하지 않는다.
 *   - `dataVersion` · 항목 단위 `asOf` · 응답 단위 `asOf` 를 제공한다.
 */
import { ApiProperty } from '@nestjs/swagger';
import { NamesDto } from '../../common/names.dto.js';
import { CompetitionRefDto, ScoreDto } from '../../match/match.dto.js';

export class TeamRefDto extends NamesDto {
  @ApiProperty({ description: '팀 ref = `<apiTeamId>-<slug>`', example: '33-manchester-united' })
  ref!: string;

  @ApiProperty({ description: 'API-Football team id', example: 33 })
  apiId!: number;

  @ApiProperty({ nullable: true, type: String })
  logoUrl!: string | null;
}

export class LiveMatchDto {
  @ApiProperty({ description: 'API-Football fixture id', example: 1234567 })
  id!: number;

  @ApiProperty({ description: '킥오프 (ISO 8601, UTC)', example: '2026-11-22T15:00:00.000Z' })
  kickoffAt!: string;

  @ApiProperty({ type: CompetitionRefDto })
  competition!: CompetitionRefDto;

  @ApiProperty({ type: TeamRefDto })
  home!: TeamRefDto;

  @ApiProperty({ type: TeamRefDto })
  away!: TeamRefDto;

  @ApiProperty({ description: 'API-Football status.short 원문', example: '2H' })
  statusShort!: string;

  @ApiProperty({ nullable: true, type: Number, description: '진행 분', example: 67 })
  elapsed!: number | null;

  @ApiProperty({ nullable: true, type: Number, description: '추가 시간 분' })
  extraElapsed!: number | null;

  @ApiProperty({ type: ScoreDto, description: '현재 스코어 (API goals 원문)' })
  goals!: ScoreDto;

  @ApiProperty({ description: 'matches.data_version — L4 쓰기가 있을 때마다 +1', example: 3 })
  dataVersion!: number;

  @ApiProperty({ description: '항목 단위 asOf (ISO 8601, UTC)' })
  asOf!: string;
}

export class LiveResponseDto {
  @ApiProperty({ description: '응답 asOf (ISO 8601, UTC)' })
  asOf!: string;

  @ApiProperty({ type: [LiveMatchDto], description: 'kickoffAt asc · apiFixtureId asc' })
  matches!: LiveMatchDto[];
}
