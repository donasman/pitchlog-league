/**
 * L2 매일 잡 (4-b-2) — @Cron 트리거로 L2Service.run() 을 하루 한 번 부른다.
 *
 * 기본 시각: UTC 04:10 = KST 13:10 — 유럽 저녁 경기(최대 22:00 UTC) 종료 뒤,
 * 백필 워커의 24h 컷(kickoff < now-24h)이 어제 경기를 잡기 전에 상태를 갱신한다.
 *
 * 종료 분류 (IngestOutcome):
 *   ok      : partial 아님
 *   partial : L2Summary.partial === true (컷 라운드 미판정 · missingTeams 등)
 *   error   : run() throw · classifyReason 은 없다 (L2 는 사유값을 안 준다)
 *
 * 겹침 방지: SchedulerStateService.l2Daily.running — 이전 실행 중이면 skip.
 * 재시도 로직 없음 — 다음 트리거가 다시 부른다.
 *
 * 옵션 없이 부른다 → 현재 시즌 · 화면 6대회 스코프 (l2.service.ts 기본).
 * `--all-seasons` 백필은 CLI 전용, 여기서는 절대 켜지 않는다.
 */
import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SchedulerRegistry } from '@nestjs/schedule';
import { CronJob } from 'cron';
import type { EnvironmentVariables } from '../config/env.validation.js';
import { L2Service, type L2Summary } from '../ingestion/l2/l2.service.js';
import { SchedulerStateService, type IngestOutcome } from './scheduler-state.service.js';

export function classifyL2Summary(summary: L2Summary): IngestOutcome {
  return summary.partial ? 'partial' : 'ok';
}

@Injectable()
export class L2DailyJob implements OnModuleInit {
  private readonly logger = new Logger(L2DailyJob.name);

  constructor(
    private readonly config: ConfigService<EnvironmentVariables, true>,
    private readonly registry: SchedulerRegistry,
    private readonly l2: L2Service,
    private readonly state: SchedulerStateService,
  ) {}

  onModuleInit(): void {
    const cronTime = this.config.get('L2_DAILY_CRON', { infer: true });
    // 위치 인자: (cronTime, onTick, onComplete?, start?, timeZone?) — UTC 로 고정.
    const job = new CronJob(
      cronTime,
      () => {
        void this.tick();
      },
      null,
      false,
      'UTC',
    );
    this.registry.addCronJob('l2-daily', job);
    job.start();
    this.state.markL2DailyEnabled();
    this.logger.log(`l2-daily registered · cron="${cronTime}" UTC`);
  }

  async tick(): Promise<void> {
    if (this.state.isL2DailyRunning()) {
      this.logger.log('skip: previous run in progress');
      return;
    }
    this.state.markL2DailyStart();
    try {
      const summary = await this.l2.run();
      const outcome = classifyL2Summary(summary);
      this.state.markL2DailyFinish(outcome, summary.totals);
      this.logger.log(
        `l2-daily ${outcome} · rounds=${summary.totals.rounds} matches=${summary.totals.matches} standings=${summary.totals.standings}` +
          (summary.skipped.length > 0 ? ` · skipped=[${summary.skipped.join(',')}]` : ''),
      );
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      this.state.markL2DailyFinish('error', null, message);
      this.logger.error(`l2-daily error: ${message}`);
    }
  }
}
