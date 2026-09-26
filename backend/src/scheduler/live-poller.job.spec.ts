/**
 * LivePollerJob 유닛 — LiveObserverService 는 mock. 외부 API·DB 접근 없음.
 *
 * fake timers 로 self-rescheduling 을 검증한다.
 * l2-daily.job.spec.ts 의 패턴 그대로 (Nest Testing Module 안 씀 · new + vi.fn()).
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import type { ConfigService } from '@nestjs/config';
import { SchedulerStateService } from './scheduler-state.service.js';
import { LivePollerJob } from './live-poller.job.js';
import type { LiveObserverService, TickResult } from '../ingestion/l4/live-observer.service.js';
import type { EnvironmentVariables } from '../config/env.validation.js';

function mkResult(over: Partial<TickResult> = {}): TickResult {
  return {
    targets: 0,
    liveCount: 0,
    chunks: 0,
    bytes: 0,
    ms: 0,
    used: null,
    wouldWrite: 0,
    written: 0,
    blocked: 0,
    isProbe: false,
    transitions: [],
    details: [],
    ...over,
  };
}

function mkConfig(
  over: Partial<Record<string, unknown>> = {},
): ConfigService<EnvironmentVariables, true> {
  const values: Record<string, unknown> = {
    LIVE_POLLER_PERIOD_SEC: 15,
    LIVE_POLLER_SLOW_PERIOD_SEC: 30,
    LIVE_POLLER_SLOW_AT: 6000,
    LIVE_POLLER_STOP_AT: 7000,
    LIVE_POLLER_PROBE_FIXTURE_IDS: '',
    LIVE_POLLER_MODE: 'observe',
    ...over,
  };
  return { get: vi.fn((k: string) => values[k]) } as unknown as ConfigService<
    EnvironmentVariables,
    true
  >;
}

describe('LivePollerJob', () => {
  let observer: { tick: ReturnType<typeof vi.fn>; refreshProbe: ReturnType<typeof vi.fn> };
  let state: SchedulerStateService;
  let job: LivePollerJob;

  beforeEach(() => {
    vi.useFakeTimers();
    process.env.SCHEDULER_ENABLED = 'true';
    process.env.LIVE_POLLER_ENABLED = 'true';
    process.env.API_FOOTBALL_KEY = 'test-key';
    observer = {
      tick: vi.fn().mockResolvedValue(mkResult()),
      refreshProbe: vi.fn().mockResolvedValue({ used: null, results: 0, missing: 0 }),
    };
    state = new SchedulerStateService();
    job = new LivePollerJob(mkConfig(), observer as unknown as LiveObserverService, state);
  });

  afterEach(() => {
    job.onModuleDestroy();
    vi.useRealTimers();
    delete process.env.SCHEDULER_ENABLED;
    delete process.env.LIVE_POLLER_ENABLED;
    delete process.env.API_FOOTBALL_KEY;
  });

  it('(1) LIVE_POLLER_ENABLED=false → 스킵 로그 · state.enabled 미변경 · 타이머 없음', () => {
    process.env.LIVE_POLLER_ENABLED = 'false';
    job.onModuleInit();
    expect(state.getLivePollerState().enabled).toBe(false);
    expect(vi.getTimerCount()).toBe(0);
  });

  it('(2) 재진입 skip — running=true 면 observer.tick 미호출', async () => {
    job.onModuleInit();
    state.markLivePollerStart(15);
    await vi.advanceTimersByTimeAsync(0);
    expect(observer.tick).not.toHaveBeenCalled();
  });

  it('(3) 대상 0 tick → observer.tick 1회 · 다음 tick 은 LIVE_IDLE_CHECK_SEC(60s) 뒤', async () => {
    observer.tick.mockResolvedValueOnce(mkResult({ targets: 0 }));
    job.onModuleInit();
    await vi.advanceTimersByTimeAsync(0);
    expect(observer.tick).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(59_999);
    expect(observer.tick).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(1);
    expect(observer.tick).toHaveBeenCalledTimes(2);
  });

  it('(4) used>=stopAt → stopped=quota_stop · 다음 tick 은 UTC 자정까지 대기', async () => {
    // 자정 근처가 아닌 시각으로 고정 — 남은 시간이 15s 를 넘도록.
    vi.setSystemTime(new Date('2026-09-24T12:00:00.000Z'));
    observer.tick.mockResolvedValueOnce(mkResult({ targets: 3, used: 7100 }));
    job.onModuleInit();
    await vi.advanceTimersByTimeAsync(0);
    expect(state.getLivePollerState().stoppedReason).toBe('quota_stop');
    await vi.advanceTimersByTimeAsync(15_001);
    expect(observer.tick).toHaveBeenCalledTimes(1);
  });

  it('(5) onModuleDestroy → 이후 재예약 안 됨', async () => {
    job.onModuleInit();
    await vi.advanceTimersByTimeAsync(0);
    const before = observer.tick.mock.calls.length;
    job.onModuleDestroy();
    await vi.advanceTimersByTimeAsync(60_000);
    expect(observer.tick.mock.calls.length).toBe(before);
  });

  it('(6) UTC 자정 롤오버 — 두 번째 tick 이 다음 날이면 callsToday 는 그 tick 의 콜수만', async () => {
    const d1 = new Date('2026-09-24T23:59:59.000Z');
    vi.setSystemTime(d1);
    observer.tick.mockResolvedValueOnce(mkResult({ targets: 2, chunks: 1 }));
    job.onModuleInit();
    await vi.advanceTimersByTimeAsync(0);
    const afterFirst = state.getLivePollerState();
    expect(afterFirst.callsToday).toBeGreaterThanOrEqual(1);

    const d2 = new Date('2026-09-25T00:00:15.000Z');
    vi.setSystemTime(d2);
    observer.tick.mockResolvedValueOnce(mkResult({ targets: 2, chunks: 1 }));
    await vi.advanceTimersByTimeAsync(15_000);
    const afterSecond = state.getLivePollerState();
    expect(afterSecond.callsToday).toBe(1);
  });

  it('(7) probeIds 값 있으면 onModuleInit 이 refreshProbe 즉시 1회 호출', async () => {
    job = new LivePollerJob(
      mkConfig({ LIVE_POLLER_PROBE_FIXTURE_IDS: '1628999,1629003,1629005' }),
      observer as unknown as LiveObserverService,
      state,
    );
    observer.tick.mockResolvedValueOnce(mkResult({ targets: 1, chunks: 1 }));
    job.onModuleInit();
    // refreshProbe 는 마이크로태스크로 즉시 시작 · 그 뒤 첫 tick(0ms) 실행
    await vi.advanceTimersByTimeAsync(0);
    await Promise.resolve();
    await Promise.resolve();
    expect(observer.refreshProbe).toHaveBeenCalledTimes(1);
    const s = state.getLivePollerState();
    expect(s.callsToday).toBeGreaterThanOrEqual(1);
  });

  it('(8) 강등 유지 — used=6100 관측 후 fetchStatus=false tick 3회 모두 30초 예약', async () => {
    // 각 tick 마다 observer.tick 반환값이 시나리오를 결정 (mock 은 fetchStatus 인자 무시)
    observer.tick
      .mockResolvedValueOnce(mkResult({ targets: 1, chunks: 1, used: 6100 })) // tick1: /status 관측 6100
      .mockResolvedValueOnce(mkResult({ targets: 1, chunks: 1, used: null })) // tick2: /status 미호출
      .mockResolvedValueOnce(mkResult({ targets: 1, chunks: 1, used: null })) // tick3: /status 미호출
      .mockResolvedValueOnce(mkResult({ targets: 1, chunks: 1, used: null })); // tick4: 안 실행되어야 함

    job.onModuleInit();

    // tick1 (0ms 뒤) — used=6100 관측 → 30s 강등
    await vi.advanceTimersByTimeAsync(0);
    expect(observer.tick).toHaveBeenCalledTimes(1);
    expect(state.getLivePollerState().periodSec).toBe(30);

    // tick2 (30s 뒤) — used=null 이지만 lastKnownUsed=6100 → 여전히 30s 예약
    await vi.advanceTimersByTimeAsync(30_000);
    expect(observer.tick).toHaveBeenCalledTimes(2);
    expect(state.getLivePollerState().periodSec).toBe(30);

    // tick3 (다시 30s 뒤) — 강등 유지
    await vi.advanceTimersByTimeAsync(30_000);
    expect(observer.tick).toHaveBeenCalledTimes(3);
    expect(state.getLivePollerState().periodSec).toBe(30);

    // tick3 뒤 다시 30s 예약된 상태에서 15s 만 지나가면 tick 안 나감 (15s 예약이었으면 여기서 4번째 실행)
    await vi.advanceTimersByTimeAsync(15_000);
    expect(observer.tick).toHaveBeenCalledTimes(3);
  });

  // ── 2판 (L4 쓰기 모드) ──

  it("(9) LIVE_POLLER_MODE=observe 부팅 — state.mode='observe' · observer.tick 이 mode='observe' 로 호출", async () => {
    job = new LivePollerJob(
      mkConfig({ LIVE_POLLER_MODE: 'observe' }),
      observer as unknown as LiveObserverService,
      state,
    );
    observer.tick.mockResolvedValueOnce(mkResult({ targets: 1, chunks: 1 }));
    job.onModuleInit();
    expect(state.getLivePollerState().mode).toBe('observe');
    await vi.advanceTimersByTimeAsync(0);
    expect(observer.tick).toHaveBeenCalledTimes(1);
    const call = observer.tick.mock.calls[0];
    // 마지막 인자가 TickOpts
    const opts = call[call.length - 1] as { fetchStatus: boolean; mode: string };
    expect(opts.mode).toBe('observe');
  });

  it("(10) LIVE_POLLER_MODE=write 부팅 — state.mode='write' · observer.tick 이 mode='write' 로 호출", async () => {
    job = new LivePollerJob(
      mkConfig({ LIVE_POLLER_MODE: 'write' }),
      observer as unknown as LiveObserverService,
      state,
    );
    observer.tick.mockResolvedValueOnce(mkResult({ targets: 1, chunks: 1, written: 1 }));
    job.onModuleInit();
    expect(state.getLivePollerState().mode).toBe('write');
    await vi.advanceTimersByTimeAsync(0);
    expect(observer.tick).toHaveBeenCalledTimes(1);
    const call = observer.tick.mock.calls[0];
    const opts = call[call.length - 1] as { fetchStatus: boolean; mode: string };
    expect(opts.mode).toBe('write');
    // written/blocked 이 state 에 누적
    const s = state.getLivePollerState();
    expect(s.writtenToday).toBe(1);
    expect(s.blockedToday).toBe(0);
  });

  it('(11) idle tick (targets=0 · prev/now 모두 창 닫힘) — "live-poller tick · " 정상 로그 억제', async () => {
    const logSpy = vi.spyOn(job['logger'], 'log');
    observer.tick.mockResolvedValueOnce(mkResult({ targets: 0 }));
    job.onModuleInit();
    await vi.advanceTimersByTimeAsync(0);
    // 정상 tick 로그는 "live-poller tick · " 로 시작한다 (transitions/details 는 " transition"·" detail" 이라 접두가 다르다)
    const idleTickLog = logSpy.mock.calls.find(
      (c) => typeof c[0] === 'string' && (c[0] as string).startsWith('live-poller tick · '),
    );
    expect(idleTickLog).toBeUndefined();
  });
});
