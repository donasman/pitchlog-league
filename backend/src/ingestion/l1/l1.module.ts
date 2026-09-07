import { Module } from '@nestjs/common';
import { ApiFootballModule } from '../api-football/api-football.module.js';
import { IngestionRunService } from '../ingestion-run.service.js';
import { L1Service } from './l1.service.js';

@Module({
  imports: [ApiFootballModule],
  providers: [IngestionRunService, L1Service],
  exports: [L1Service],
})
export class L1Module {}
