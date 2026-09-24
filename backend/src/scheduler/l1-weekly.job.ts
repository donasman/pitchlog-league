/**
 * L1 매주 잡 (4-b-2) — @Cron 트리거로 L1Service.run() 을 주 1회 부른다.
 *
 * 기본 시각: 매주 월 UTC 05:30 = KST 14:30 — 백필 워커 매시 5분 트리거·L2 데일리(04:10 UTC)와 겹치지 않는 시각.
 * 이적창은 유럽 여름·겨울 — 평시엔 부상·계약 변동 정도라 주 1회면 충분하다는 판단(4-b-2 04).
 *
 * 종료 분류 (IngestOutcome):
 *   ok      : partial 아님
 *   partial : L1Summary.partial === true (급감 가드로 팀 skipShrunk 발생 등)
 *   error   : run() throw
 *
 * 겹침 방지: SchedulerStateService.l1Weekly.running — 이전 실행 중이면 skip.
 * 재시도 로직 없음 — 다음 트리거가 다시 부른다.
 */
import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SchedulerRegistry } from '@nestjs/schedule';
import { CronJob } from 'cron';
import type { EnvironmentVariables } from '../config/env.validation.js';
import { L1Service, type L1Summary } from '../ingestion/l1/l1.service.js';
import { SchedulerStateService, type IngestOutcome } from './scheduler-state.service.js';

export function classifyL1Summary(summary: L1Summary): IngestOutcome {
  return summary.partial ? 'partial' : 'ok';
}

@Injectable()
export class L1WeeklyJob implements OnModuleInit {
  private readonly logger = new Logger(L1WeeklyJob.name);

  constructor(
    private readonly config: ConfigService<EnvironmentVariables, true>,
    private readonly registry: SchedulerRegistry,
    private readonly l1: L1Service,
    private readonly state: SchedulerStateService,
  ) {}

  onModuleInit(): void {
    const cronTime = this.config.get('L1_WEEKLY_CRON', { infer: true });
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
    this.registry.addCronJob('l1-weekly', job);
    job.start();
    this.state.markL1WeeklyEnabled();
    this.logger.log(`l1-weekly registered · cron="${cronTime}" UTC`);
  }

  async tick(): Promise<void> {
    if (this.state.isL1WeeklyRunning()) {
      this.logger.log('skip: previous run in progress');
      return;
    }
    this.state.markL1WeeklyStart();
    try {
      const summary = await this.l1.run();
      const outcome = classifyL1Summary(summary);
      const teams = {
        target: summary.teams.target,
        covered: summary.teams.covered,
        failed: summary.teams.failed,
      };
      this.state.markL1WeeklyFinish(outcome, teams, summary.players);
      this.logger.log(
        `l1-weekly ${outcome} · teams=${teams.covered}/${teams.target}(failed=${teams.failed}) players=${summary.players}` +
          (summary.skipped.length > 0 ? ` · skipped=[${summary.skipped.join(',')}]` : ''),
      );
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      this.state.markL1WeeklyFinish('error', null, null, message);
      this.logger.error(`l1-weekly error: ${message}`);
    }
  }
}
