import { Module } from '@nestjs/common';
import { ApiFootballClient } from './api-football.client.js';
import { QuotaService } from './quota.service.js';

@Module({
  providers: [ApiFootballClient, QuotaService],
  exports: [ApiFootballClient, QuotaService],
})
export class ApiFootballModule {}
