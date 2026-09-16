/**
 * BackfillWorkerJob 유닛 — MatchDetailsBackfillService 는 mock. 외부 API·DB 접근 없음.
 *
 * 케이스:
 *   (a) SchedulerModule.forRoot 조건부 등록: disabled 시 BackfillWorkerJob provider 없음
 *   (b) tick 겹침 방지: state.running=true 면 backfill.run 미호출
 *   (c) 3분류: cap_reached · no_targets · error · done→no_targets 4갈래
 */
import { describe, expect, it, beforeEach, vi } from 'vitest';
import type { ConfigService } from '@nestjs/config';
import type { SchedulerRegistry } from '@nestjs/schedule';
import { BackfillWorkerJob, classifyReason } from './backfill-worker.job.js';
import { SchedulerStateService } from './scheduler-state.service.js';
import { SchedulerModule } from './scheduler.module.js';
import type { EnvironmentVariables } from '../config/env.validation.js';
import type { MatchDetailsBackfillService, BackfillStopReason, BackfillDetailsResult } from '../ingestion/backfill/match-details-backfill.service.js';

function makeResult(overallStopped: BackfillStopReason, totalProcessed = 0): BackfillDetailsResult {
  return {
    perSeason: [],
    totalProcessed,
    totalFailed: 0,
    overallStopped,
    dryRun: false,
  };
}

describe('classifyReason (3분류 매핑)', () => {
  it('cap_reached', () => {
    expect(classifyReason('quota_exhausted')).toBe('cap_reached');
    expect(classifyReason('daily_cap')).toBe('cap_reached');
    expect(classifyReason('limit_reached')).toBe('cap_reached');
  });
  it('no_targets', () => {
    expect(classifyReason('no_targets')).toBe('no_targets');
    expect(classifyReason('done')).toBe('no_targets');
  });
  it('error', () => {
    expect(classifyReason('error')).toBe('error');
  });
});

describe('SchedulerModule.forRoot (조건부 등록)', () => {
  const originalEnv = { ...process.env };
  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  it('SCHEDULER_ENABLED != true 면 SchedulerStateService 만 · 잡 0', () => {
    process.env.SCHEDULER_ENABLED = 'false';
    process.env.BACKFILL_WORKER_ENABLED = 'true';
    process.env.API_FOOTBALL_KEY = 'x'.repeat(20);
    const dyn = SchedulerModule.forRoot();
    const names = (dyn.providers ?? []).map((p) => (typeof p === 'function' ? p.name : String(p)));
    expect(names).toContain('SchedulerStateService');
    expect(names).not.toContain('BackfillWorkerJob');
    expect(names).not.toContain('QuotaSnapshotJob');
  });

  it('SCHEDULER_ENABLED=true · BACKFILL_WORKER_ENABLED=true · API 키 있으면 잡 등록', () => {
    process.env.SCHEDULER_ENABLED = 'true';
    process.env.BACKFILL_WORKER_ENABLED = 'true';
    process.env.API_FOOTBALL_KEY = 'x'.repeat(20);
    const dyn = SchedulerModule.forRoot();
    const names = (dyn.providers ?? []).map((p) => (typeof p === 'function' ? p.name : String(p)));
    expect(names).toContain('BackfillWorkerJob');
    expect(names).toContain('QuotaSnapshotJob');
  });

  it('SCHEDULER_ENABLED=true 지만 API_FOOTBALL_KEY 없으면 잡 등록 안 함 (부팅은 성공)', () => {
    process.env.SCHEDULER_ENABLED = 'true';
    process.env.BACKFILL_WORKER_ENABLED = 'true';
    delete process.env.API_FOOTBALL_KEY;
    const dyn = SchedulerModule.forRoot();
    const names = (dyn.providers ?? []).map((p) => (typeof p === 'function' ? p.name : String(p)));
    expect(names).not.toContain('BackfillWorkerJob');
    expect(names).not.toContain('QuotaSnapshotJob');
  });
});

describe('BackfillWorkerJob.tick', () => {
  let job: BackfillWorkerJob;
  let state: SchedulerStateService;
  let backfill: { run: ReturnType<typeof vi.fn> };
  let config: Partial<ConfigService>;
  let registry: Partial<SchedulerRegistry>;

  beforeEach(() => {
    state = new SchedulerStateService();
    backfill = { run: vi.fn() };
    config = { get: vi.fn((key: string) => (key === 'BACKFILL_WORKER_LIMIT' ? 200 : '5 * * * *')) };
    registry = { addCronJob: vi.fn() };
    job = new BackfillWorkerJob(
      config as unknown as ConfigService<EnvironmentVariables, true>,
      registry as SchedulerRegistry,
      backfill as unknown as MatchDetailsBackfillService,
      state,
    );
  });

  it('(b) 겹침 방지 — running=true 면 backfill.run 미호출', async () => {
    state.markBackfillStart();
    await job.tick();
    expect(backfill.run).not.toHaveBeenCalled();
    // 상태는 유지 (여전히 running)
    expect(state.isBackfillRunning()).toBe(true);
  });

  it('(c1) cap_reached — daily_cap → outcome=cap_reached · lastProcessed=50', async () => {
    backfill.run.mockResolvedValue(makeResult('daily_cap', 50));
    await job.tick();
    const s = state.getBackfillWorkerState();
    expect(s.lastOutcome).toBe('cap_reached');
    expect(s.lastProcessed).toBe(50);
    expect(s.lastError).toBeNull();
    expect(s.running).toBe(false);
  });

  it('(c2) no_targets — no_targets → outcome=no_targets · processed=0', async () => {
    backfill.run.mockResolvedValue(makeResult('no_targets', 0));
    await job.tick();
    const s = state.getBackfillWorkerState();
    expect(s.lastOutcome).toBe('no_targets');
    expect(s.lastProcessed).toBe(0);
  });

  it('(c3) done → no_targets 로 분류 (사이트가 하루 지연으로 완전)', async () => {
    backfill.run.mockResolvedValue(makeResult('done', 100));
    await job.tick();
    expect(state.getBackfillWorkerState().lastOutcome).toBe('no_targets');
  });

  it('(c4) error — run() 이 throw · outcome=error · lastError 메시지 저장', async () => {
    backfill.run.mockRejectedValue(new Error('boom'));
    await job.tick();
    const s = state.getBackfillWorkerState();
    expect(s.lastOutcome).toBe('error');
    expect(s.lastError).toBe('boom');
    expect(s.running).toBe(false);
  });
});
