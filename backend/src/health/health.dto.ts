import { ApiProperty } from '@nestjs/swagger';
import type { BackfillOutcome, IngestOutcome } from '../scheduler/scheduler-state.service.js';

export class BackfillWorkerStateDto {
  @ApiProperty({ description: '잡 등록 여부 (SCHEDULER_ENABLED + BACKFILL_WORKER_ENABLED + API 키)' })
  enabled!: boolean;

  @ApiProperty({ description: '이번 트리거 실행 중 여부 (겹침 방지)' })
  running!: boolean;

  @ApiProperty({ nullable: true, type: String, example: '2026-09-16T10:05:00.000Z' })
  lastStartedAt!: string | null;

  @ApiProperty({ nullable: true, type: String, example: '2026-09-16T10:07:30.000Z' })
  lastFinishedAt!: string | null;

  @ApiProperty({ nullable: true, enum: ['cap_reached', 'no_targets', 'error'], type: String })
  lastOutcome!: BackfillOutcome | null;

  @ApiProperty({ nullable: true, type: String, description: '오류 메시지만 (스택 없음)' })
  lastError!: string | null;

  @ApiProperty({ nullable: true, type: Number })
  lastProcessed!: number | null;

  @ApiProperty({ nullable: true, type: Number, description: '마지막으로 처리한 시즌 (시즌 목록 순회 시 · 현재 시즌만이면 null)' })
  currentSeason!: number | null;
}

export class L2DailyTotalsDto {
  @ApiProperty() rounds!: number;
  @ApiProperty() matches!: number;
  @ApiProperty() standings!: number;
}

export class L2DailyStateDto {
  @ApiProperty({ description: '잡 등록 여부 (SCHEDULER_ENABLED + L2_DAILY_ENABLED + API 키)' })
  enabled!: boolean;

  @ApiProperty({ description: '이번 트리거 실행 중 여부' })
  running!: boolean;

  @ApiProperty({ nullable: true, type: String })
  lastStartedAt!: string | null;

  @ApiProperty({ nullable: true, type: String })
  lastFinishedAt!: string | null;

  @ApiProperty({ nullable: true, enum: ['ok', 'partial', 'error'], type: String })
  lastOutcome!: IngestOutcome | null;

  @ApiProperty({ nullable: true, type: String, description: '오류 메시지만' })
  lastError!: string | null;

  @ApiProperty({ nullable: true, type: L2DailyTotalsDto, description: '마지막 L2Summary.totals' })
  lastTotals!: L2DailyTotalsDto | null;
}

export class L1WeeklyTeamsDto {
  @ApiProperty() target!: number;
  @ApiProperty() covered!: number;
  @ApiProperty() failed!: number;
}

export class L1WeeklyStateDto {
  @ApiProperty({ description: '잡 등록 여부 (SCHEDULER_ENABLED + L1_WEEKLY_ENABLED + API 키)' })
  enabled!: boolean;

  @ApiProperty({ description: '이번 트리거 실행 중 여부' })
  running!: boolean;

  @ApiProperty({ nullable: true, type: String })
  lastStartedAt!: string | null;

  @ApiProperty({ nullable: true, type: String })
  lastFinishedAt!: string | null;

  @ApiProperty({ nullable: true, enum: ['ok', 'partial', 'error'], type: String })
  lastOutcome!: IngestOutcome | null;

  @ApiProperty({ nullable: true, type: String, description: '오류 메시지만' })
  lastError!: string | null;

  @ApiProperty({ nullable: true, type: L1WeeklyTeamsDto, description: '마지막 L1Summary.teams 요약' })
  lastTeams!: L1WeeklyTeamsDto | null;

  @ApiProperty({ nullable: true, type: Number })
  lastPlayers!: number | null;
}

export class SchedulerJobsDto {
  @ApiProperty({ type: BackfillWorkerStateDto })
  backfillWorker!: BackfillWorkerStateDto;

  @ApiProperty({ type: L2DailyStateDto })
  l2Daily!: L2DailyStateDto;

  @ApiProperty({ type: L1WeeklyStateDto })
  l1Weekly!: L1WeeklyStateDto;
}

export class SchedulerStateDto {
  @ApiProperty({ description: 'SCHEDULER_ENABLED env 값' })
  enabled!: boolean;

  @ApiProperty({ type: SchedulerJobsDto })
  jobs!: SchedulerJobsDto;
}

export class HealthResponseDto {
  @ApiProperty({ enum: ['ok', 'degraded'] })
  status!: 'ok' | 'degraded';

  @ApiProperty({ description: 'PostgreSQL 연결 여부' })
  db!: boolean;

  @ApiProperty({ description: '데이터 기준 시각 (ISO 8601). 모든 응답 공통', example: '2026-09-06T12:00:00.000Z' })
  asOf!: string;

  @ApiProperty({ type: SchedulerStateDto })
  scheduler!: SchedulerStateDto;
}
