import { Module } from '@nestjs/common';
import { ApiFootballModule } from '../api-football/api-football.module.js';
import { IngestionRunService } from '../ingestion-run.service.js';
import { L0Service } from './l0.service.js';

@Module({
  imports: [ApiFootballModule],
  providers: [IngestionRunService, L0Service],
  exports: [L0Service],
})
export class L0Module {}
