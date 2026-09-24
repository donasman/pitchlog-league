import { Module } from '@nestjs/common';
import { ApiFootballModule } from '../api-football/api-football.module.js';
import { LiveObserverService } from './live-observer.service.js';

/**
 * L4 관측 모드 모듈. PrismaModule 은 이미 @Global 이라 imports 에 넣지 않는다.
 */
@Module({
  imports: [ApiFootballModule],
  providers: [LiveObserverService],
  exports: [LiveObserverService],
})
export class L4Module {}
