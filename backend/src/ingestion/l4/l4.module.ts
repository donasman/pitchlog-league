import { Module } from '@nestjs/common';
import { ApiFootballModule } from '../api-football/api-football.module.js';
import { L2Module } from '../l2/l2.module.js';
import { L3Module } from '../l3/l3.module.js';
import { L5Module } from '../l5/l5.module.js';
import { LiveObserverService } from './live-observer.service.js';
import { LiveWriterService } from './live-writer.service.js';
import { LiveFinalizerService } from './live-finalizer.service.js';

/**
 * L4 라이브 모듈. PrismaModule 은 이미 @Global 이라 imports 에 넣지 않는다.
 * 관측(LiveObserverService) + 쓰기(LiveWriterService) + FT 시 즉시 상세 저장(LiveFinalizerService · 3판) 을 제공한다.
 * - 쓰기 모드 (LIVE_POLLER_MODE=write) 에서만 LiveWriterService.write 가 호출된다 (observer 안에서 @Optional).
 * - LIVE_FT_DETAILS_ENABLED=true 여야 LiveFinalizerService 가 호출된다 (observer 안에서 @Optional).
 *
 * L2Module 은 collectStandings 재사용 · L3/L5Module 은 persist 재사용 (판 A 에서 이미 public 화).
 */
@Module({
  imports: [ApiFootballModule, L2Module, L3Module, L5Module],
  providers: [LiveObserverService, LiveWriterService, LiveFinalizerService],
  exports: [LiveObserverService, LiveWriterService, LiveFinalizerService],
})
export class L4Module {}
