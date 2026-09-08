import { Module } from '@nestjs/common';
import { CompetitionModule } from '../competition/competition.module.js';
import { TeamModule } from '../team/team.module.js';
import { StatisticsController } from './statistics.controller.js';
import { StatisticsService } from './statistics.service.js';

@Module({
  imports: [CompetitionModule, TeamModule],
  controllers: [StatisticsController],
  providers: [StatisticsService],
  exports: [StatisticsService],
})
export class StatisticsModule {}
