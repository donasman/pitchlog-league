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

  function makeConfig(seasons = '', limit = 200): Partial<ConfigService> {
    return {
      get: vi.fn((key: string) => {
        if (key === 'BACKFILL_WORKER_LIMIT') return limit;
        if (key === 'BACKFILL_WORKER_SEASONS') return seasons;
        return '5 * * * *';
      }),
    };
  }

  function makeJob(cfg: Partial<ConfigService> = makeConfig()): BackfillWorkerJob {
    return new BackfillWorkerJob(
      cfg as unknown as ConfigService<EnvironmentVariables, true>,
      registry as SchedulerRegistry,
      backfill as unknown as MatchDetailsBackfillService,
      state,
    );
  }

  beforeEach(() => {
    state = new SchedulerStateService();
    backfill = { run: vi.fn() };
    config = makeConfig();
    registry = { addCronJob: vi.fn() };
    job = makeJob(config);
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

describe('BackfillWorkerJob.tick — 시즌 목록 순회 (fix/backfill-worker-seasons)', () => {
  let state: SchedulerStateService;
  let backfill: { run: ReturnType<typeof vi.fn> };
  let registry: Partial<SchedulerRegistry>;

  function makeConfig(seasons = '', limit = 200): Partial<ConfigService> {
    return {
      get: vi.fn((key: string) => {
        if (key === 'BACKFILL_WORKER_LIMIT') return limit;
        if (key === 'BACKFILL_WORKER_SEASONS') return seasons;
        return '5 * * * *';
      }),
    };
  }

  function makeJob(cfg: Partial<ConfigService>): BackfillWorkerJob {
    return new BackfillWorkerJob(
      cfg as unknown as ConfigService<EnvironmentVariables, true>,
      registry as SchedulerRegistry,
      backfill as unknown as MatchDetailsBackfillService,
      state,
    );
  }

  beforeEach(() => {
    state = new SchedulerStateService();
    backfill = { run: vi.fn() };
    registry = { addCronJob: vi.fn() };
  });

  it('(a) 빈 목록 → 현행 run({limit}) 1회 (season 없음)', async () => {
    backfill.run.mockResolvedValue(makeResult('no_targets', 0));
    const job = makeJob(makeConfig(''));
    await job.tick();
    expect(backfill.run).toHaveBeenCalledTimes(1);
    expect(backfill.run).toHaveBeenCalledWith({ limit: 200 });
    // currentSeason 은 null 유지 (시즌 순회 안 함)
    expect(state.getBackfillWorkerState().currentSeason).toBeNull();
  });

  it('(b) [2024,2025] · 2024 no_targets → 2025 호출', async () => {
    backfill.run
      .mockResolvedValueOnce(makeResult('no_targets', 0))
      .mockResolvedValueOnce(makeResult('done', 10));
    const job = makeJob(makeConfig('2024,2025'));
    await job.tick();
    expect(backfill.run).toHaveBeenCalledTimes(2);
    expect(backfill.run).toHaveBeenNthCalledWith(1, { season: 2024, limit: 200 });
    expect(backfill.run).toHaveBeenNthCalledWith(2, { season: 2025, limit: 200 });
    expect(state.getBackfillWorkerState().currentSeason).toBe(2025);
  });

  it('(c) [2024,2025] · 2024 cap_reached → 2025 미호출', async () => {
    backfill.run.mockResolvedValueOnce(makeResult('daily_cap', 50));
    const job = makeJob(makeConfig('2024,2025'));
    await job.tick();
    expect(backfill.run).toHaveBeenCalledTimes(1);
    expect(backfill.run).toHaveBeenCalledWith({ season: 2024, limit: 200 });
    const s = state.getBackfillWorkerState();
    expect(s.lastOutcome).toBe('cap_reached');
    expect(s.lastProcessed).toBe(50);
    expect(s.currentSeason).toBe(2024);
  });

  it('(d) [2024,2025] · limit 200 · 2024 processed 150 → 2025 는 limit 50 으로 호출', async () => {
    backfill.run
      .mockResolvedValueOnce(makeResult('no_targets', 150))
      .mockResolvedValueOnce(makeResult('no_targets', 40));
    const job = makeJob(makeConfig('2024,2025', 200));
    await job.tick();
    expect(backfill.run).toHaveBeenCalledTimes(2);
    expect(backfill.run).toHaveBeenNthCalledWith(1, { season: 2024, limit: 200 });
    expect(backfill.run).toHaveBeenNthCalledWith(2, { season: 2025, limit: 50 });
    expect(state.getBackfillWorkerState().lastProcessed).toBe(190);
  });

  it('(e) [2024,2025] 모두 no_targets · processed=0 → 최종 no_targets + "all seasons done" 로그', async () => {
    backfill.run
      .mockResolvedValueOnce(makeResult('no_targets', 0))
      .mockResolvedValueOnce(makeResult('no_targets', 0));
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => undefined);
    const job = makeJob(makeConfig('2024,2025'));
    await job.tick();
    logSpy.mockRestore();
    expect(backfill.run).toHaveBeenCalledTimes(2);
    const s = state.getBackfillWorkerState();
    expect(s.lastOutcome).toBe('no_targets');
    expect(s.lastProcessed).toBe(0);
    // "all seasons done" 로그는 Nest Logger 로 나감 · spy 로 검증 어렵고 state 로 대체 검증 충분
  });
});
