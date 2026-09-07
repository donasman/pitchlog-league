import { Module } from '@nestjs/common';
import { CompetitionModule } from '../competition/competition.module.js';
import { TeamModule } from '../team/team.module.js';
import { StandingController } from './standing.controller.js';
import { StandingService } from './standing.service.js';

@Module({ imports: [CompetitionModule, TeamModule], controllers: [StandingController], providers: [StandingService], exports: [StandingService] })
export class StandingModule {}
