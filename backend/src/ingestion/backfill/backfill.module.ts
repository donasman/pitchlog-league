import { Module } from '@nestjs/common';
import { ApiFootballModule } from '../api-football/api-football.module.js';
import { L3Module } from '../l3/l3.module.js';
import { L5Module } from '../l5/l5.module.js';
import { IngestionRunService } from '../ingestion-run.service.js';
import { BackfillJobService } from './backfill-job.service.js';
import { MatchDetailsBackfillService } from './match-details-backfill.service.js';

/**
 * PrismaModule 은 @Global 이라 여기서 import 하지 않는다.
 * L6Module 도 IngestionRunService 를 providers 로 가진다 — 같은 인스턴스가 아니라 별개다.
 * IngestionRunService 는 상태가 없으므로 문제 없다.
 */
@Module({
  imports: [ApiFootballModule, L3Module, L5Module],
  providers: [BackfillJobService, MatchDetailsBackfillService, IngestionRunService],
  exports: [BackfillJobService, MatchDetailsBackfillService],
})
export class BackfillModule {}
