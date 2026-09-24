/**
 * L2DailyJob 유닛 — L2Service 는 mock. 외부 API·DB 접근 없음.
 *
 * 케이스:
 *   (a) SchedulerModule.forRoot 조건부 등록: 스위치·API 키 조합
 *   (b) tick 겹침 방지: state.running=true 면 l2.run 미호출
 *   (c) 3분류: ok · partial · error
 *   (d) classifyL2Summary — partial 여부만 본다
 */
import { describe, expect, it, beforeEach, vi } from 'vitest';
import type { ConfigService } from '@nestjs/config';
import type { SchedulerRegistry } from '@nestjs/schedule';
import { L2DailyJob, classifyL2Summary } from './l2-daily.job.js';
import { SchedulerStateService } from './scheduler-state.service.js';
import { SchedulerModule } from './scheduler.module.js';
import type { EnvironmentVariables } from '../config/env.validation.js';
import type { L2Service, L2Summary } from '../ingestion/l2/l2.service.js';

function makeSummary(partial = false, totals = { rounds: 229, matches: 2566, standings: 204 }): L2Summary {
  return {
    competitions: [],
    totals,
    skipped: [],
    ...(partial ? { partial: true } : {}),
  };
}

describe('classifyL2Summary (2분류 · error 는 catch)', () => {
  it('partial 없음 → ok', () => {
    expect(classifyL2Summary(makeSummary(false))).toBe('ok');
  });
  it('partial=true → partial', () => {
    expect(classifyL2Summary(makeSummary(true))).toBe('partial');
  });
});

describe('SchedulerModule.forRoot — L2_DAILY_ENABLED 조건부 등록', () => {
  const originalEnv = { ...process.env };
  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  it('SCHEDULER_ENABLED=true · L2_DAILY_ENABLED=true · API 키 있으면 L2DailyJob 등록', () => {
    process.env.SCHEDULER_ENABLED = 'true';
    process.env.L2_DAILY_ENABLED = 'true';
    process.env.API_FOOTBALL_KEY = 'x'.repeat(20);
    const dyn = SchedulerModule.forRoot();
    const names = (dyn.providers ?? []).map((p) => (typeof p === 'function' ? p.name : String(p)));
    expect(names).toContain('L2DailyJob');
  });

  it('L2_DAILY_ENABLED=false 면 L2DailyJob 미등록', () => {
    process.env.SCHEDULER_ENABLED = 'true';
    process.env.L2_DAILY_ENABLED = 'false';
    process.env.API_FOOTBALL_KEY = 'x'.repeat(20);
    const dyn = SchedulerModule.forRoot();
    const names = (dyn.providers ?? []).map((p) => (typeof p === 'function' ? p.name : String(p)));
    expect(names).not.toContain('L2DailyJob');
  });

  it('L2_DAILY_ENABLED=true 지만 API 키 없으면 미등록 (부팅은 성공)', () => {
    process.env.SCHEDULER_ENABLED = 'true';
    process.env.L2_DAILY_ENABLED = 'true';
    delete process.env.API_FOOTBALL_KEY;
    const dyn = SchedulerModule.forRoot();
    const names = (dyn.providers ?? []).map((p) => (typeof p === 'function' ? p.name : String(p)));
    expect(names).not.toContain('L2DailyJob');
  });
});

describe('L2DailyJob.tick', () => {
  let job: L2DailyJob;
  let state: SchedulerStateService;
  let l2: { run: ReturnType<typeof vi.fn> };
  let registry: Partial<SchedulerRegistry>;
  const config: Partial<ConfigService> = {
    get: vi.fn((key: string) => (key === 'L2_DAILY_CRON' ? '10 4 * * *' : undefined)),
  };

  beforeEach(() => {
    state = new SchedulerStateService();
    l2 = { run: vi.fn() };
    registry = { addCronJob: vi.fn() };
    job = new L2DailyJob(
      config as unknown as ConfigService<EnvironmentVariables, true>,
      registry as SchedulerRegistry,
      l2 as unknown as L2Service,
      state,
    );
  });

  it('(b) 겹침 방지 — running=true 면 l2.run 미호출', async () => {
    state.markL2DailyStart();
    await job.tick();
    expect(l2.run).not.toHaveBeenCalled();
    expect(state.isL2DailyRunning()).toBe(true);
  });

  it('(c1) ok — partial 없음 · totals 저장', async () => {
    l2.run.mockResolvedValue(makeSummary(false));
    await job.tick();
    const s = state.getL2DailyState();
    expect(s.lastOutcome).toBe('ok');
    expect(s.lastTotals).toEqual({ rounds: 229, matches: 2566, standings: 204 });
    expect(s.lastError).toBeNull();
    expect(s.running).toBe(false);
  });

  it('(c2) partial — L2Summary.partial=true', async () => {
    l2.run.mockResolvedValue(makeSummary(true));
    await job.tick();
    expect(state.getL2DailyState().lastOutcome).toBe('partial');
  });

  it('(c3) error — run() throw · lastError 저장 · totals=null', async () => {
    l2.run.mockRejectedValue(new Error('boom'));
    await job.tick();
    const s = state.getL2DailyState();
    expect(s.lastOutcome).toBe('error');
    expect(s.lastError).toBe('boom');
    expect(s.lastTotals).toBeNull();
    expect(s.running).toBe(false);
  });

  it('l2.run 은 옵션 없이 호출 (스케줄러가 --all-seasons 를 켜지 않는다)', async () => {
    l2.run.mockResolvedValue(makeSummary(false));
    await job.tick();
    expect(l2.run).toHaveBeenCalledWith();
  });
});
