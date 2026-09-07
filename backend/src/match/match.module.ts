import { Module } from '@nestjs/common';
import { CompetitionModule } from '../competition/competition.module.js';
import { TeamModule } from '../team/team.module.js';
import { MatchController } from './match.controller.js';
import { MatchService } from './match.service.js';

@Module({ imports: [CompetitionModule, TeamModule], controllers: [MatchController], providers: [MatchService], exports: [MatchService] })
export class MatchModule {}
