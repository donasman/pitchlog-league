import { ApiProperty } from '@nestjs/swagger';
import type { BackfillOutcome } from '../scheduler/scheduler-state.service.js';

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
}

export class SchedulerJobsDto {
  @ApiProperty({ type: BackfillWorkerStateDto })
  backfillWorker!: BackfillWorkerStateDto;
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
