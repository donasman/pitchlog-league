import { Module } from '@nestjs/common';
import { ApiFootballModule } from '../api-football/api-football.module.js';
import { IngestionRunService } from '../ingestion-run.service.js';
import { BackfillModule } from '../backfill/backfill.module.js';
import { L6Service } from './l6.service.js';
import { PlayerSeasonStatsService } from './player-season-stats.service.js';
import { RankingsService } from './rankings.service.js';
import { TeamSeasonStatsService } from './team-season-stats.service.js';

/** PrismaModule 은 @Global 이라 여기서 import 하지 않는다 */
@Module({
  imports: [ApiFootballModule, BackfillModule],
  providers: [IngestionRunService, PlayerSeasonStatsService, RankingsService, TeamSeasonStatsService, L6Service],
  exports: [L6Service],
})
export class L6Module {}
