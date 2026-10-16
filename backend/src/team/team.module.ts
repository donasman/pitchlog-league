import { Module } from '@nestjs/common';
import { CompetitionModule } from '../competition/competition.module.js';
import { TeamController } from './team.controller.js';
import { TeamService } from './team.service.js';

@Module({ imports: [CompetitionModule], controllers: [TeamController], providers: [TeamService], exports: [TeamService] })
export class TeamModule {}
