import { Module } from '@nestjs/common';
import { ApiFootballModule } from '../api-football/api-football.module.js';
import { L3LineupsService } from './lineups.service.js';
import { L3EventsService } from './events.service.js';

/**
 * L3 — 경기 상세 두 갈래(lineups·events).
 * 오케스트레이터·스케줄러는 다음 판에서 붙인다. 지금은 단일 매치 서비스만 export 한다.
 * PrismaModule 은 @Global 이라 여기서 import 하지 않는다.
 */
@Module({
  imports: [ApiFootballModule],
  providers: [L3LineupsService, L3EventsService],
  exports: [L3LineupsService, L3EventsService],
})
export class L3Module {}
