import { Module } from '@nestjs/common';
import { ApiFootballModule } from '../api-football/api-football.module.js';
import { LiveObserverService } from './live-observer.service.js';
import { LiveWriterService } from './live-writer.service.js';

/**
 * L4 라이브 모듈. PrismaModule 은 이미 @Global 이라 imports 에 넣지 않는다.
 * 관측(LiveObserverService) + 쓰기(LiveWriterService) 두 서비스를 제공한다.
 * 쓰기 모드 (LIVE_POLLER_MODE=write) 에서만 LiveWriterService.write 가 호출된다 (observer 안에서 @Optional).
 */
@Module({
  imports: [ApiFootballModule],
  providers: [LiveObserverService, LiveWriterService],
  exports: [LiveObserverService, LiveWriterService],
})
export class L4Module {}
