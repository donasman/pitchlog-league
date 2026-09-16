/**
 * 백필 워커 — @Cron 트리거로 MatchDetailsBackfillService.run 을 반복 호출한다.
 *
 * 종료 사유 3분류 (BackfillStopReason 6종 → outcome 3종):
 *   cap_reached: quota_exhausted | daily_cap | limit_reached
 *   no_targets : no_targets | done
 *   error      : error | 예상치 못한 throw (quota.snapshot 실패 등)
 *
 * 겹침 방지: SchedulerStateService.running 플래그 · 이전 실행 중이면 skip.
 * 재시도 로직 없음 — 커서(backfill_jobs.cursor_match_id) 가 재개를 보장한다.
 *
 * CronJob 은 SchedulerRegistry.addCronJob 으로 프로그램적 등록 — env 값을 부팅 시 검증할 수 있고
 * (잘못된 cron 은 CronJob 생성자가 throw), 조건부 등록도 SchedulerModule 이 결정한다.
 */
import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SchedulerRegistry } from '@nestjs/schedule';
import { CronJob } from 'cron';
import { parseBackfillWorkerSeasons, type EnvironmentVariables } from '../config/env.validation.js';
import {
  MatchDetailsBackfillService,
  type BackfillStopReason,
} from '../ingestion/backfill/match-details-backfill.service.js';
import { SchedulerStateService, type BackfillOutcome } from './scheduler-state.service.js';

const CAP_REASONS: readonly BackfillStopReason[] = ['quota_exhausted', 'daily_cap', 'limit_reached'];
const DONE_REASONS: readonly BackfillStopReason[] = ['no_targets', 'done'];

export function classifyReason(reason: BackfillStopReason): BackfillOutcome {
  if (CAP_REASONS.includes(reason)) return 'cap_reached';
  if (DONE_REASONS.includes(reason)) return 'no_targets';
  return 'error';
}

@Injectable()
export class BackfillWorkerJob implements OnModuleInit {
  private readonly logger = new Logger(BackfillWorkerJob.name);

  constructor(
    private readonly config: ConfigService<EnvironmentVariables, true>,
    private readonly registry: SchedulerRegistry,
    private readonly backfill: MatchDetailsBackfillService,
    private readonly state: SchedulerStateService,
  ) {}

  onModuleInit(): void {
    const cronTime = this.config.get('BACKFILL_WORKER_CRON', { infer: true });
    const limit = this.config.get('BACKFILL_WORKER_LIMIT', { infer: true });
    // CronJob 생성자가 잘못된 표현식이면 여기서 throw — 부팅이 명확히 실패한다.
    // 위치 인자: (cronTime, onTick, onComplete?, start?, timeZone?)
    const job = new CronJob(
      cronTime,
      () => {
        void this.tick();
      },
    );
    this.registry.addCronJob('backfill-worker', job);
    job.start();
    this.state.markBackfillEnabled();
    this.logger.log(`backfill-worker registered · cron="${cronTime}" · limit=${limit}`);
  }

  async tick(): Promise<void> {
    if (this.state.isBackfillRunning()) {
      this.logger.log('skip: previous run in progress');
      return;
    }
    this.state.markBackfillStart();
    const totalLimit = this.config.get('BACKFILL_WORKER_LIMIT', { infer: true });
    const seasonsStr = this.config.get('BACKFILL_WORKER_SEASONS', { infer: true });
    const seasons = parseBackfillWorkerSeasons(seasonsStr);

    try {
      if (seasons.length === 0) {
        // 시즌 목록 미지정 — 현행 동작 (현재 시즌만)
        const result = await this.backfill.run({ limit: totalLimit });
        const outcome = classifyReason(result.overallStopped);
        this.state.markBackfillFinish(outcome, result.totalProcessed);
        this.logger.log(
          `backfill-worker ${outcome} · processed=${result.totalProcessed} · failed=${result.totalFailed} · stop=${result.overallStopped}`,
        );
        return;
      }

      // 시즌 목록 순회 — 앞에서부터 · no_targets 는 다음 시즌 · cap/error 는 즉시 중단.
      // 각 시즌 limit 은 남은 예산(totalLimit - totalProcessed).
      let totalProcessed = 0;
      let totalFailed = 0;
      let finalOutcome: BackfillOutcome = 'no_targets';
      const perSeasonLog: string[] = [];

      for (const season of seasons) {
        this.state.markBackfillCurrentSeason(season);
        const remaining = totalLimit - totalProcessed;
        if (remaining <= 0) {
          finalOutcome = 'cap_reached';
          break;
        }
        const result = await this.backfill.run({ season, limit: remaining });
        const outcome = classifyReason(result.overallStopped);
        totalProcessed += result.totalProcessed;
        totalFailed += result.totalFailed;
        perSeasonLog.push(`${season}: processed=${result.totalProcessed} failed=${result.totalFailed}`);

        if (outcome === 'no_targets') continue;
        if (outcome === 'cap_reached' || outcome === 'error') {
          finalOutcome = outcome;
          break;
        }
      }

      // 모든 시즌이 no_targets 이고 processed=0 → 백필-2 완료 신호
      if (finalOutcome === 'no_targets' && totalProcessed === 0) {
        this.logger.log('all seasons done');
      }

      this.state.markBackfillFinish(finalOutcome, totalProcessed);
      this.logger.log(
        `backfill-worker ${finalOutcome} · ${perSeasonLog.join(' · ')} · total=${totalProcessed} failed=${totalFailed}`,
      );
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      this.state.markBackfillFinish('error', 0, message);
      this.logger.error(`backfill-worker error: ${message}`);
    }
  }
}
