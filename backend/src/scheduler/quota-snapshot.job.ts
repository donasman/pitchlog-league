/**
 * /status 스냅숏 — 매일 UTC 23:50 (자정 리셋 직전) 그날 최종 사용량을 api_quota_snapshots 에 남긴다.
 *
 * 목적: 자정 리셋 전에 그날 실 사용량 스냅숏 확보. 워커의 실 예산 판정은 매 경기 앞 /status 로 하지만
 * 그날 최종값은 여기서만 안다. api_quota_snapshots 는 감시 기록용 (readCount aggregate 하는 코드 없음).
 *
 * SCHEDULER_ENABLED 만 따른다 (개별 스위치 없음 — 1콜/일 · 실측 정확성 우선).
 */
import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { SchedulerRegistry } from '@nestjs/schedule';
import { CronJob } from 'cron';
import { QuotaService } from '../ingestion/api-football/quota.service.js';

@Injectable()
export class QuotaSnapshotJob implements OnModuleInit {
  private readonly logger = new Logger(QuotaSnapshotJob.name);

  constructor(
    private readonly registry: SchedulerRegistry,
    private readonly quota: QuotaService,
  ) {}

  onModuleInit(): void {
    // UTC 23:50 = KST 08:50. 자정 리셋 직전 스냅숏
    // 위치 인자: (cronTime, onTick, onComplete?, start?, timeZone?)
    const job = new CronJob(
      '50 23 * * *',
      () => {
        void this.tick();
      },
      null,
      false,
      'UTC',
    );
    this.registry.addCronJob('quota-snapshot', job);
    job.start();
    this.logger.log('quota-snapshot registered · cron="50 23 * * *" UTC (KST 08:50)');
  }

  async tick(): Promise<void> {
    try {
      const q = await this.quota.snapshot();
      this.logger.log(`quota-snapshot ${q.used}/${q.limit}`);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      this.logger.error(`quota-snapshot error: ${message}`);
    }
  }
}
