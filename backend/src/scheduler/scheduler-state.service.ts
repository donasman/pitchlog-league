/**
 * 스케줄러 잡의 in-memory 상태 — 재시작 시 초기화.
 * /health 가 이 상태를 읽어 잡 등록 여부·마지막 실행 결과를 노출한다.
 *
 * 상태 저장 대상은 잡 실행 흐름 파악에 필요한 최소값만 (`lastError` 는 메시지만 · 스택 없음).
 * 비밀값·에러 스택은 절대 넣지 않는다 (/health 응답에 노출됨).
 */
import { Injectable } from '@nestjs/common';

export type BackfillOutcome = 'cap_reached' | 'no_targets' | 'error';

/** L2/L1 갱신 잡의 종료 분류 — L2Summary.partial · L1Summary.partial 을 반영한다. */
export type IngestOutcome = 'ok' | 'partial' | 'error';

export interface BackfillWorkerState {
  enabled: boolean;
  running: boolean;
  lastStartedAt: string | null;
  lastFinishedAt: string | null;
  lastOutcome: BackfillOutcome | null;
  lastError: string | null;
  lastProcessed: number | null;
  /** 마지막으로 처리를 시도한 시즌 (시즌 목록 순회 시 · 현재 시즌만이면 null) */
  currentSeason: number | null;
}

export interface L2DailyState {
  enabled: boolean;
  running: boolean;
  lastStartedAt: string | null;
  lastFinishedAt: string | null;
  lastOutcome: IngestOutcome | null;
  lastError: string | null;
  /** 마지막 L2Summary.totals — rounds·matches·standings */
  lastTotals: { rounds: number; matches: number; standings: number } | null;
}

export interface L1WeeklyState {
  enabled: boolean;
  running: boolean;
  lastStartedAt: string | null;
  lastFinishedAt: string | null;
  lastOutcome: IngestOutcome | null;
  lastError: string | null;
  /** 마지막 L1Summary — 팀 커버리지 · 선수 수 */
  lastTeams: { target: number; covered: number; failed: number } | null;
  lastPlayers: number | null;
}

@Injectable()
export class SchedulerStateService {
  private readonly backfillWorker: BackfillWorkerState = {
    enabled: false,
    running: false,
    lastStartedAt: null,
    lastFinishedAt: null,
    lastOutcome: null,
    lastError: null,
    lastProcessed: null,
    currentSeason: null,
  };

  private readonly l2Daily: L2DailyState = {
    enabled: false,
    running: false,
    lastStartedAt: null,
    lastFinishedAt: null,
    lastOutcome: null,
    lastError: null,
    lastTotals: null,
  };

  private readonly l1Weekly: L1WeeklyState = {
    enabled: false,
    running: false,
    lastStartedAt: null,
    lastFinishedAt: null,
    lastOutcome: null,
    lastError: null,
    lastTeams: null,
    lastPlayers: null,
  };

  markBackfillEnabled(): void {
    this.backfillWorker.enabled = true;
  }

  isBackfillRunning(): boolean {
    return this.backfillWorker.running;
  }

  markBackfillStart(): void {
    this.backfillWorker.running = true;
    this.backfillWorker.lastStartedAt = new Date().toISOString();
    this.backfillWorker.lastFinishedAt = null;
    this.backfillWorker.currentSeason = null;
  }

  markBackfillCurrentSeason(season: number | null): void {
    this.backfillWorker.currentSeason = season;
  }

  markBackfillFinish(outcome: BackfillOutcome, processed: number, error?: string): void {
    this.backfillWorker.running = false;
    this.backfillWorker.lastFinishedAt = new Date().toISOString();
    this.backfillWorker.lastOutcome = outcome;
    this.backfillWorker.lastProcessed = processed;
    this.backfillWorker.lastError = error ?? null;
  }

  getBackfillWorkerState(): BackfillWorkerState {
    return { ...this.backfillWorker };
  }

  // ── L2 매일 (4-b-2) ──

  markL2DailyEnabled(): void {
    this.l2Daily.enabled = true;
  }

  isL2DailyRunning(): boolean {
    return this.l2Daily.running;
  }

  markL2DailyStart(): void {
    this.l2Daily.running = true;
    this.l2Daily.lastStartedAt = new Date().toISOString();
    this.l2Daily.lastFinishedAt = null;
  }

  markL2DailyFinish(
    outcome: IngestOutcome,
    totals: L2DailyState['lastTotals'],
    error?: string,
  ): void {
    this.l2Daily.running = false;
    this.l2Daily.lastFinishedAt = new Date().toISOString();
    this.l2Daily.lastOutcome = outcome;
    this.l2Daily.lastTotals = totals;
    this.l2Daily.lastError = error ?? null;
  }

  getL2DailyState(): L2DailyState {
    return { ...this.l2Daily };
  }

  // ── L1 매주 (4-b-2) ──

  markL1WeeklyEnabled(): void {
    this.l1Weekly.enabled = true;
  }

  isL1WeeklyRunning(): boolean {
    return this.l1Weekly.running;
  }

  markL1WeeklyStart(): void {
    this.l1Weekly.running = true;
    this.l1Weekly.lastStartedAt = new Date().toISOString();
    this.l1Weekly.lastFinishedAt = null;
  }

  markL1WeeklyFinish(
    outcome: IngestOutcome,
    teams: L1WeeklyState['lastTeams'],
    players: number | null,
    error?: string,
  ): void {
    this.l1Weekly.running = false;
    this.l1Weekly.lastFinishedAt = new Date().toISOString();
    this.l1Weekly.lastOutcome = outcome;
    this.l1Weekly.lastTeams = teams;
    this.l1Weekly.lastPlayers = players;
    this.l1Weekly.lastError = error ?? null;
  }

  getL1WeeklyState(): L1WeeklyState {
    return { ...this.l1Weekly };
  }
}
