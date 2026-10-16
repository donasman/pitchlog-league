/**
 * L1WeeklyJob 유닛 — L1Service 는 mock.
 *
 * 케이스:
 *   (a) SchedulerModule.forRoot 조건부 등록
 *   (b) tick 겹침 방지
 *   (c) 3분류: ok · partial · error
 *   (d) classifyL1Summary — partial 여부만
 */
import { describe, expect, it, beforeEach, vi } from 'vitest';
import type { ConfigService } from '@nestjs/config';
import type { SchedulerRegistry } from '@nestjs/schedule';
import { L1WeeklyJob, classifyL1Summary } from './l1-weekly.job.js';
import { SchedulerStateService } from './scheduler-state.service.js';
import { SchedulerModule } from './scheduler.module.js';
import type { EnvironmentVariables } from '../config/env.validation.js';
import type { L1Service, L1Summary } from '../ingestion/l1/l1.service.js';

function makeSummary(partial = false): L1Summary {
  return {
    seasonYear: 2026,
    today: '2026-09-24',
    teams: { target: 12, covered: 12, skippedEmpty: 0, skippedShrunk: 0, skippedBackfill: 0, failed: 0 },
    players: 456,
    counts: { arrived: 3, left: 2, moved: 1, changed: 4, unchanged: 400, sameDayFixed: 0 },
    ambiguous: [],
    skipped: [],
    ...(partial ? { partial: true } : {}),
  };
}

describe('classifyL1Summary', () => {
  it('partial 없음 → ok', () => {
    expect(classifyL1Summary(makeSummary(false))).toBe('ok');
  });
  it('partial=true → partial', () => {
    expect(classifyL1Summary(makeSummary(true))).toBe('partial');
  });
});

describe('SchedulerModule.forRoot — L1_WEEKLY_ENABLED 조건부 등록', () => {
  const originalEnv = { ...process.env };
  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  it('SCHEDULER_ENABLED=true · L1_WEEKLY_ENABLED=true · API 키 있으면 L1WeeklyJob 등록', () => {
    process.env.SCHEDULER_ENABLED = 'true';
    process.env.L1_WEEKLY_ENABLED = 'true';
    process.env.API_FOOTBALL_KEY = 'x'.repeat(20);
    const dyn = SchedulerModule.forRoot();
    const names = (dyn.providers ?? []).map((p) => (typeof p === 'function' ? p.name : String(p)));
    expect(names).toContain('L1WeeklyJob');
  });

  it('L1_WEEKLY_ENABLED=false 면 미등록', () => {
    process.env.SCHEDULER_ENABLED = 'true';
    process.env.L1_WEEKLY_ENABLED = 'false';
    process.env.API_FOOTBALL_KEY = 'x'.repeat(20);
    const dyn = SchedulerModule.forRoot();
    const names = (dyn.providers ?? []).map((p) => (typeof p === 'function' ? p.name : String(p)));
    expect(names).not.toContain('L1WeeklyJob');
  });

  it('API 키 없으면 미등록', () => {
    process.env.SCHEDULER_ENABLED = 'true';
    process.env.L1_WEEKLY_ENABLED = 'true';
    delete process.env.API_FOOTBALL_KEY;
    const dyn = SchedulerModule.forRoot();
    const names = (dyn.providers ?? []).map((p) => (typeof p === 'function' ? p.name : String(p)));
    expect(names).not.toContain('L1WeeklyJob');
  });
});

describe('L1WeeklyJob.tick', () => {
  let job: L1WeeklyJob;
  let state: SchedulerStateService;
  let l1: { run: ReturnType<typeof vi.fn> };
  let registry: Partial<SchedulerRegistry>;
  const config: Partial<ConfigService> = {
    get: vi.fn((key: string) => (key === 'L1_WEEKLY_CRON' ? '30 5 * * 1' : undefined)),
  };

  beforeEach(() => {
    state = new SchedulerStateService();
    l1 = { run: vi.fn() };
    registry = { addCronJob: vi.fn() };
    job = new L1WeeklyJob(
      config as unknown as ConfigService<EnvironmentVariables, true>,
      registry as SchedulerRegistry,
      l1 as unknown as L1Service,
      state,
    );
  });

  it('(b) 겹침 방지 — running=true 면 l1.run 미호출', async () => {
    state.markL1WeeklyStart();
    await job.tick();
    expect(l1.run).not.toHaveBeenCalled();
    expect(state.isL1WeeklyRunning()).toBe(true);
  });

  it('(c1) ok — partial 없음 · teams·players 저장', async () => {
    l1.run.mockResolvedValue(makeSummary(false));
    await job.tick();
    const s = state.getL1WeeklyState();
    expect(s.lastOutcome).toBe('ok');
    expect(s.lastTeams).toEqual({ target: 12, covered: 12, failed: 0 });
    expect(s.lastPlayers).toBe(456);
    expect(s.lastError).toBeNull();
    expect(s.running).toBe(false);
  });

  it('(c2) partial — L1Summary.partial=true', async () => {
    l1.run.mockResolvedValue(makeSummary(true));
    await job.tick();
    expect(state.getL1WeeklyState().lastOutcome).toBe('partial');
  });

  it('(c3) error — run() throw · teams/players=null', async () => {
    l1.run.mockRejectedValue(new Error('boom'));
    await job.tick();
    const s = state.getL1WeeklyState();
    expect(s.lastOutcome).toBe('error');
    expect(s.lastError).toBe('boom');
    expect(s.lastTeams).toBeNull();
    expect(s.lastPlayers).toBeNull();
    expect(s.running).toBe(false);
  });
});
