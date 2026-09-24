/**
 * L4 라이브 폴러 (관측 모드) — LivePollerJob.
 *
 * self-rescheduling setTimeout 루프:
 *   - onModuleInit 에서 첫 tick 을 0ms 뒤에 예약
 *   - 각 tick 이 끝나면 다음 tick 을 (idle→60s · slow→cfg.slowPeriodSec · quota_stop→UTC 자정 · 정상→cfg.periodSec) 후에 예약
 *   - 겹침 방지: SchedulerStateService.livePoller.running — running=true 면 skip · 다음 tick 만 예약
 *
 * A매치 probe:
 *   - onModuleInit 즉시 1회 refreshProbe (probeIds.length>0 일 때)
 *   - 매시 정각(UTC) 마다 refreshProbe 재실행 (self-rescheduling)
 *   - probe 호출은 probeCallsSinceLastTick 에 더해두었다가 다음 tick 의 state 반영 시 callsToday 에 합산
 *
 * 종료 사유:
 *   - quota_stop: TickResult.used >= LIVE_POLLER_STOP_AT — 다음 tick 을 UTC 자정까지 미룸
 *
 * env 3중 스위치 (SCHEDULER_ENABLED · LIVE_POLLER_ENABLED · API_FOOTBALL_KEY):
 *   - SchedulerModule 이 이미 필터링하지만 방어적으로 재확인 (테스트도 이 경로 검증)
 */
import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { EnvironmentVariables } from '../config/env.validation.js';
import { parseLivePollerProbeIds } from '../config/env.validation.js';
import { LiveObserverService, type TickResult } from '../ingestion/l4/live-observer.service.js';
import { LIVE_IDLE_CHECK_SEC, decidePeriod } from '../ingestion/l4/live-window.js';
import type {
  LivePollerConfig,
  MemoryFilter,
  ProbeEntry,
  LastSeen,
} from '../ingestion/l4/live-window.js';
import { SchedulerStateService } from './scheduler-state.service.js';

@Injectable()
export class LivePollerJob implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(LivePollerJob.name);

  private tickTimer: ReturnType<typeof setTimeout> | null = null;
  private probeTimer: ReturnType<typeof setTimeout> | null = null;

  private readonly memory: MemoryFilter = { finishedAt: new Map(), excluded: new Set() };
  private readonly probes: Map<number, ProbeEntry> = new Map();
  private readonly lastSeen: Map<number, LastSeen> = new Map();

  private lastStatusAt: Date | null = null;
  private probeCallsSinceLastTick = 0;

  private cfg!: LivePollerConfig;
  private probeIds: number[] = [];
  private registered = false;
  private destroyed = false;

  constructor(
    private readonly config: ConfigService<EnvironmentVariables, true>,
    private readonly observer: LiveObserverService,
    private readonly state: SchedulerStateService,
  ) {}

  onModuleInit(): void {
    const schedulerOn = process.env.SCHEDULER_ENABLED === 'true';
    const enabled = process.env.LIVE_POLLER_ENABLED === 'true';
    const hasKey = !!process.env.API_FOOTBALL_KEY;
    if (!schedulerOn || !enabled || !hasKey) {
      if (!enabled) {
        this.logger.log('live-poller: LIVE_POLLER_ENABLED != true — 등록 건너뜀');
      } else if (!hasKey) {
        this.logger.warn('live-poller: API_FOOTBALL_KEY 없음 — 등록 건너뜀');
      }
      return;
    }

    this.cfg = {
      periodSec: this.config.get('LIVE_POLLER_PERIOD_SEC', { infer: true }),
      slowPeriodSec: this.config.get('LIVE_POLLER_SLOW_PERIOD_SEC', { infer: true }),
      slowAt: this.config.get('LIVE_POLLER_SLOW_AT', { infer: true }),
      stopAt: this.config.get('LIVE_POLLER_STOP_AT', { infer: true }),
    };
    this.probeIds = parseLivePollerProbeIds(
      this.config.get('LIVE_POLLER_PROBE_FIXTURE_IDS', { infer: true }),
    );

    this.state.markLivePollerEnabled();
    this.registered = true;
    this.logger.log(
      `live-poller registered · period=${this.cfg.periodSec}s · slowAt=${this.cfg.slowAt} · stopAt=${this.cfg.stopAt}`,
    );
    if (this.probeIds.length > 0) {
      this.logger.log(
        `live-poller probe registered · ids=${this.probeIds.join(',')} · refresh=hourly`,
      );
      void this.refreshProbeAndReschedule(new Date());
    }

    this.scheduleTick(0);
  }

  onModuleDestroy(): void {
    this.destroyed = true;
    if (this.tickTimer !== null) clearTimeout(this.tickTimer);
    if (this.probeTimer !== null) clearTimeout(this.probeTimer);
    this.tickTimer = null;
    this.probeTimer = null;
  }

  // ── private ──

  private msUntilNextHour(now: Date): number {
    const next = new Date(now);
    next.setUTCHours(now.getUTCHours() + 1, 0, 0, 0);
    return Math.max(1_000, next.getTime() - now.getTime());
  }

  private msUntilNextUtcMidnight(now: Date): number {
    const next = new Date(now);
    next.setUTCHours(24, 0, 0, 0);
    return Math.max(1_000, next.getTime() - now.getTime());
  }

  private scheduleTick(delayMs: number): void {
    if (this.destroyed) return;
    this.tickTimer = setTimeout(() => {
      void this.runTick();
    }, delayMs);
  }

  private scheduleProbeRefresh(now: Date): void {
    if (this.destroyed || this.probeIds.length === 0) return;
    this.probeTimer = setTimeout(() => {
      void this.refreshProbeAndReschedule(new Date());
    }, this.msUntilNextHour(now));
  }

  private async refreshProbeAndReschedule(now: Date): Promise<void> {
    this.probeTimer = null;
    if (this.destroyed) return;
    if (this.probeIds.length === 0) return;
    try {
      const r = await this.observer.refreshProbe(now, this.probes, this.probeIds);
      this.probeCallsSinceLastTick += 1;
      this.logger.log(
        `live-poller probe fetch · used=${r.used ?? '-'} results=${r.results}`,
      );
      if (r.missing > 0) {
        this.logger.warn(`live-poller probe missing · ids=${r.missing}`);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      this.logger.error(`live-poller probe error: ${msg}`);
    }
    this.scheduleProbeRefresh(now);
  }

  private async runTick(): Promise<void> {
    this.tickTimer = null;
    if (this.destroyed) return;

    if (this.state.isLivePollerRunning()) {
      this.logger.log('skip: previous run in progress');
      this.scheduleTick(this.cfg.periodSec * 1000);
      return;
    }

    const now = new Date();
    this.state.markLivePollerStart(this.cfg.periodSec, now);

    const fetchStatus =
      this.lastStatusAt === null ||
      now.getTime() - this.lastStatusAt.getTime() >= 60_000;

    let result: TickResult;
    let error: string | null = null;
    try {
      result = await this.observer.tick(now, this.memory, this.probes, this.lastSeen, {
        fetchStatus,
      });
      if (fetchStatus && result.used !== null) this.lastStatusAt = now;
    } catch (err) {
      error = err instanceof Error ? err.message : String(err);
      this.logger.error(`live-poller error: ${error}`);
      result = {
        targets: 0,
        liveCount: 0,
        chunks: 0,
        bytes: 0,
        ms: 0,
        used: null,
        wouldWrite: 0,
        isProbe: false,
        transitions: [],
        details: [],
      };
    }

    const prevOpen = this.state.getLivePollerState().windowOpen;
    const nowOpen = result.targets > 0;
    if (!prevOpen && nowOpen) {
      this.logger.log(`live-poller window open · targets=${result.targets}`);
    }

    this.state.markLivePollerTick({
      now,
      ms: result.ms,
      targets: result.targets,
      liveCount: result.liveCount,
      calls: result.chunks + this.probeCallsSinceLastTick,
      used: result.used,
      wouldWrite: result.wouldWrite,
      windowOpen: nowOpen,
      periodSec: this.cfg.periodSec,
      error,
    });
    this.probeCallsSinceLastTick = 0;

    if (error === null) {
      const usedStr = result.used === null ? '-' : String(result.used);
      const suffix = result.isProbe ? ' · probe' : '';
      this.logger.log(
        `live-poller tick · targets=${result.targets} live=${result.liveCount} chunks=${result.chunks}` +
          ` bytes=${result.bytes} ms=${result.ms} used=${usedStr} period=${this.cfg.periodSec}s` +
          ` wouldWrite=${result.wouldWrite}${suffix}`,
      );
      if (result.ms > this.cfg.periodSec * 1000 * 0.7) {
        this.logger.warn(
          `live-poller tick slow · ms=${result.ms} > 70% of ${this.cfg.periodSec}s`,
        );
      }
      for (const t of result.transitions) {
        this.logger.log(
          `live-poller transition · ${t.apiFixtureId} ${t.home}-${t.away} ` +
            `${t.prev}→${t.next} ${t.goalsHome ?? 0}-${t.goalsAway ?? 0}`,
        );
      }
      for (const d of result.details) {
        const s = d.isProbe ? ' · probe' : '';
        this.logger.log(
          `live-poller detail · ${d.apiFixtureId} events=${d.events} lineups=${d.lineups} ` +
            `statistics=${d.statistics} players=${d.players}${s}`,
        );
      }
    }

    if (prevOpen && !nowOpen) {
      const s = this.state.getLivePollerState();
      this.logger.log(
        `live-poller window closed · ticks=${s.ticksToday} calls=${s.callsToday} maxMs=${s.maxTickMsToday}`,
      );
    }

    let nextMs: number;
    if (result.targets === 0) {
      nextMs = LIVE_IDLE_CHECK_SEC * 1000;
    } else {
      const dec = decidePeriod(result.used, this.cfg);
      if (dec.stopped) {
        this.state.markLivePollerStop('quota_stop', now);
        this.logger.log(
          `live-poller stop · used=${result.used} ≥ ${this.cfg.stopAt}`,
        );
        nextMs = this.msUntilNextUtcMidnight(now);
      } else {
        if (dec.periodSec !== this.cfg.periodSec) {
          this.logger.log(
            `live-poller slow · used=${result.used} ≥ ${this.cfg.slowAt} · period=${dec.periodSec}s`,
          );
        }
        nextMs = dec.periodSec * 1000;
      }
    }
    this.scheduleTick(nextMs);
  }
}
