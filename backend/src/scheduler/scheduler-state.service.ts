/**
 * 스케줄러 잡의 in-memory 상태 — 재시작 시 초기화.
 * /health 가 이 상태를 읽어 잡 등록 여부·마지막 실행 결과를 노출한다.
 *
 * 상태 저장 대상은 잡 실행 흐름 파악에 필요한 최소값만 (`lastError` 는 메시지만 · 스택 없음).
 * 비밀값·에러 스택은 절대 넣지 않는다 (/health 응답에 노출됨).
 */
import { Injectable } from '@nestjs/common';

export type BackfillOutcome = 'cap_reached' | 'no_targets' | 'error';

export interface BackfillWorkerState {
  enabled: boolean;
  running: boolean;
  lastStartedAt: string | null;
  lastFinishedAt: string | null;
  lastOutcome: BackfillOutcome | null;
  lastError: string | null;
  lastProcessed: number | null;
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
}
