/**
 * SchedulerModule — env 로 잡 등록을 통제하는 DynamicModule.
 *
 * 조건부 등록:
 *   SCHEDULER_ENABLED != 'true'   → SchedulerStateService 만 · 잡 0개 (부팅 로그 "disabled")
 *   SCHEDULER_ENABLED == 'true'   → QuotaSnapshotJob 등록 (API 키 있을 때만)
 *   + BACKFILL_WORKER_ENABLED     → BackfillWorkerJob 등록 (API 키 있을 때만)
 *   + L2_DAILY_ENABLED            → L2DailyJob 등록 (API 키 있을 때만)
 *   + L1_WEEKLY_ENABLED           → L1WeeklyJob 등록 (API 키 있을 때만)
 *   + LIVE_POLLER_ENABLED         → LivePollerJob 등록 (API 키 있을 때만)
 *
 * API_FOOTBALL_KEY 없으면 잡 등록 안 함 (부팅 로그 경고 · 부팅은 성공 — 안전장치).
 *
 * 동시 실행 정책 (4-b-2 04):
 *   세 이송 잡(backfill · l2-daily · l1-weekly)은 서로 독립. matches 컬럼 소유권이
 *   이미 분리되어 있어(L2 는 스코어·라운드·순위 · L3~L5 는 detail_*, l2.service.ts L18-19)
 *   같은 시각에 돌아도 안전하다. 각 잡은 자기 겹침만 in-memory 플래그로 방지.
 *   quota 는 백필 워커만 매 경기 앞에서 /status 로 확인 — L2/L1 는 소요 콜 수가 예산 대비
 *   미미해(L2 대회당 3콜 × 12 ≈ 36, L1 팀당 1콜) 별도 방어를 두지 않는다.
 *
 * @Global — SchedulerStateService 는 어디서든 inject 가능 (HealthController 가 씀).
 * 한 번만 등록되도록 app.module 에서만 forRoot() 호출.
 */
import { DynamicModule, Global, Logger, Module, type Provider } from '@nestjs/common';
import { ApiFootballModule } from '../ingestion/api-football/api-football.module.js';
import { BackfillModule } from '../ingestion/backfill/backfill.module.js';
import { L1Module } from '../ingestion/l1/l1.module.js';
import { L2Module } from '../ingestion/l2/l2.module.js';
import { L4Module } from '../ingestion/l4/l4.module.js';
import { SchedulerStateService } from './scheduler-state.service.js';
import { BackfillWorkerJob } from './backfill-worker.job.js';
import { L1WeeklyJob } from './l1-weekly.job.js';
import { L2DailyJob } from './l2-daily.job.js';
import { LivePollerJob } from './live-poller.job.js';
import { QuotaSnapshotJob } from './quota-snapshot.job.js';

@Global()
@Module({})
export class SchedulerModule {
  static forRoot(): DynamicModule {
    const logger = new Logger('SchedulerModule');
    const enabled = process.env.SCHEDULER_ENABLED === 'true';
    const backfillWorkerEnabled = process.env.BACKFILL_WORKER_ENABLED === 'true';
    const l2DailyEnabled = process.env.L2_DAILY_ENABLED === 'true';
    const l1WeeklyEnabled = process.env.L1_WEEKLY_ENABLED === 'true';
    const livePollerEnabled = process.env.LIVE_POLLER_ENABLED === 'true';
    const hasApiKey = !!process.env.API_FOOTBALL_KEY;

    const providers: Provider[] = [SchedulerStateService];
    const imports: DynamicModule['imports'] = [];

    if (!enabled) {
      logger.log('scheduler: disabled (SCHEDULER_ENABLED != true)');
      return {
        module: SchedulerModule,
        global: true,
        providers,
        exports: [SchedulerStateService],
      };
    }

    // /status 스냅숏 잡 — API 호출이라 키가 있을 때만
    if (hasApiKey) {
      imports.push(ApiFootballModule);
      providers.push(QuotaSnapshotJob);
    } else {
      logger.warn('scheduler: API_FOOTBALL_KEY 없음 — quota-snapshot 등록 건너뜀');
    }

    // 백필 잡 — 개별 스위치 + API 키 필요
    if (backfillWorkerEnabled) {
      if (hasApiKey) {
        imports.push(BackfillModule);
        providers.push(BackfillWorkerJob);
      } else {
        logger.warn(
          'scheduler: BACKFILL_WORKER_ENABLED=true 이지만 API_FOOTBALL_KEY 없음 — backfill-worker 등록 건너뜀',
        );
      }
    } else {
      logger.log('scheduler: BACKFILL_WORKER_ENABLED != true — backfill-worker 등록 건너뜀');
    }

    // L2 매일 잡 — 개별 스위치 + API 키 필요 (4-b-2)
    if (l2DailyEnabled) {
      if (hasApiKey) {
        imports.push(L2Module);
        providers.push(L2DailyJob);
      } else {
        logger.warn(
          'scheduler: L2_DAILY_ENABLED=true 이지만 API_FOOTBALL_KEY 없음 — l2-daily 등록 건너뜀',
        );
      }
    } else {
      logger.log('scheduler: L2_DAILY_ENABLED != true — l2-daily 등록 건너뜀');
    }

    // L1 매주 잡 — 개별 스위치 + API 키 필요 (4-b-2)
    if (l1WeeklyEnabled) {
      if (hasApiKey) {
        imports.push(L1Module);
        providers.push(L1WeeklyJob);
      } else {
        logger.warn(
          'scheduler: L1_WEEKLY_ENABLED=true 이지만 API_FOOTBALL_KEY 없음 — l1-weekly 등록 건너뜀',
        );
      }
    } else {
      logger.log('scheduler: L1_WEEKLY_ENABLED != true — l1-weekly 등록 건너뜀');
    }

    // L4 라이브 폴러 (관측 모드) — 개별 스위치 + API 키 필요
    if (livePollerEnabled) {
      if (hasApiKey) {
        imports.push(L4Module);
        providers.push(LivePollerJob);
      } else {
        logger.warn(
          'scheduler: LIVE_POLLER_ENABLED=true 이지만 API_FOOTBALL_KEY 없음 — live-poller 등록 건너뜀',
        );
      }
    } else {
      logger.log('scheduler: LIVE_POLLER_ENABLED != true — live-poller 등록 건너뜀');
    }

    logger.log(
      `scheduler: enabled · jobs=[${providers
        .filter((p) => p !== SchedulerStateService)
        .map((p) => (typeof p === 'function' ? p.name : String(p)))
        .join(', ') || '없음'}]`,
    );

    return {
      module: SchedulerModule,
      global: true,
      imports,
      providers,
      exports: [SchedulerStateService],
    };
  }
}
