import { Module } from '@nestjs/common';
import { ApiFootballModule } from '../api-football/api-football.module.js';
import { IngestionRunService } from '../ingestion-run.service.js';
import { L2Service } from './l2.service.js';

@Module({
  imports: [ApiFootballModule],
  providers: [IngestionRunService, L2Service],
  exports: [L2Service],
})
export class L2Module {}
