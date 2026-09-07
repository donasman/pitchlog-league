import { Module } from '@nestjs/common';
import { CompetitionController } from './competition.controller.js';
import { CompetitionService } from './competition.service.js';

@Module({ controllers: [CompetitionController], providers: [CompetitionService], exports: [CompetitionService] })
export class CompetitionModule {}
