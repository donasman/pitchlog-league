import { Module } from '@nestjs/common';
import { ApiFootballModule } from '../api-football/api-football.module.js';
import { L5TeamStatsService } from './team-stats.service.js';
import { L5PlayerStatsService } from './player-stats.service.js';

/**
 * L5 — 팀 통계 · 선수 통계 두 갈래.
 * 오케스트레이터·스케줄러는 다음 판에서 붙인다. 지금은 단일 매치 서비스만 export 한다.
 * PrismaModule 은 @Global 이라 여기서 import 하지 않는다.
 */
@Module({
  imports: [ApiFootballModule],
  providers: [L5TeamStatsService, L5PlayerStatsService],
  exports: [L5TeamStatsService, L5PlayerStatsService],
})
export class L5Module {}
