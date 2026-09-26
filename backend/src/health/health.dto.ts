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

export class LivePollerStateDto {
  @ApiProperty({ description: '잡 등록 여부 (SCHEDULER_ENABLED + LIVE_POLLER_ENABLED + API_FOOTBALL_KEY)' })
  enabled!: boolean;

  @ApiProperty({ description: '이번 tick 실행 중 여부' })
  running!: boolean;

  @ApiProperty({ description: '이번 tick 에 폴링 창이 열려 있는가 (대상 > 0)' })
  windowOpen!: boolean;

  @ApiProperty({ description: '현재 주기 (초)' })
  periodSec!: number;

  @ApiProperty({ nullable: true, enum: ['quota_stop'], type: String, description: '정지 사유 (없으면 null · UTC 자정 롤오버 시 자동 해제)' })
  stoppedReason!: 'quota_stop' | null;

  @ApiProperty({ description: '이번 tick 폴링 대상 수 (DB + probe 합)' })
  targets!: number;

  @ApiProperty({ description: '이번 tick 응답 중 라이브 상태 경기 수' })
  liveCount!: number;

  @ApiProperty({ nullable: true, type: String })
  lastTickAt!: string | null;

  @ApiProperty({ nullable: true, type: Number })
  lastTickMs!: number | null;

  @ApiProperty({ description: '오늘(UTC) 최대 tick 소요 ms' })
  maxTickMsToday!: number;

  @ApiProperty({ description: '오늘(UTC) 누적 tick 수' })
  ticksToday!: number;

  @ApiProperty({ description: '오늘(UTC) 누적 /fixtures 호출 수 (/status 는 제외)' })
  callsToday!: number;

  @ApiProperty({ nullable: true, type: Number, description: '마지막 /status 응답 requests.current (관측 판)' })
  lastUsed!: number | null;

  @ApiProperty({ description: '오늘(UTC) 누적 wouldWrite (직전 관측값 대비 변경 필드 수 · probe 제외)' })
  wouldWriteToday!: number;

  @ApiProperty({ nullable: true, type: String, description: '오류 메시지만 (스택 없음)' })
  lastError!: string | null;

  @ApiProperty({ enum: ['observe', 'write'], description: '쓰기 모드 (LIVE_POLLER_MODE)' })
  mode!: 'observe' | 'write';

  @ApiProperty({ description: '오늘(UTC) 누적 성공 쓰기 수 (L4 조건부 UPDATE 성공)' })
  writtenToday!: number;

  @ApiProperty({ description: '오늘(UTC) 누적 역행 가드 차단 수 (조건부 UPDATE 0행)' })
  blockedToday!: number;
}

export class SchedulerJobsDto {
  @ApiProperty({ type: BackfillWorkerStateDto })
  backfillWorker!: BackfillWorkerStateDto;

  @ApiProperty({ type: L2DailyStateDto })
  l2Daily!: L2DailyStateDto;

  @ApiProperty({ type: L1WeeklyStateDto })
  l1Weekly!: L1WeeklyStateDto;

  @ApiProperty({ type: LivePollerStateDto })
  livePoller!: LivePollerStateDto;
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
