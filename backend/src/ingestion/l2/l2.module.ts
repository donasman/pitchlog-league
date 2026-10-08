import { Module } from '@nestjs/common';
import { ApiFootballModule } from '../api-football/api-football.module.js';
import { IngestionRunService } from '../ingestion-run.service.js';
import { L0Module } from '../l0/l0.module.js';
import { L2Service } from './l2.service.js';

@Module({
  // L0Module — missingTeams 시 /teams 재수집을 L0 코드에 위임한다 (teams·venues·competition_entries 는 L0 소유)
  imports: [ApiFootballModule, L0Module],
  providers: [IngestionRunService, L2Service],
  exports: [L2Service],
})
export class L2Module {}
