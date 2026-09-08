import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { validateEnv } from './config/env.validation.js';
import { PrismaModule } from './prisma/prisma.module.js';
import { HealthModule } from './health/health.module.js';
import { ApiFootballModule } from './ingestion/api-football/api-football.module.js';
import { L0Module } from './ingestion/l0/l0.module.js';
import { L1Module } from './ingestion/l1/l1.module.js';
import { L2Module } from './ingestion/l2/l2.module.js';
import { L6Module } from './ingestion/l6/l6.module.js';
import { BackfillModule } from './ingestion/backfill/backfill.module.js';
import { LogoModule } from './ingestion/logos/logo.module.js';
import { ProbeModule } from './ingestion/probe/probe.module.js';
import { CompetitionModule } from './competition/competition.module.js';
import { TeamModule } from './team/team.module.js';
import { MatchModule } from './match/match.module.js';
import { StandingModule } from './standing/standing.module.js';

/**
 * 모듈 경계 (BACKEND_GUIDE):
 *   competition/ team/ player/ squad/ match/ standing/ statistics/  ← 도메인 (Phase 1~2)
 *   ingestion/                                                       ← API-Football 수집
 *   realtime/                                                        ← Gateway (Phase 2)
 *   ai/                                                              ← Phase 5
 * 지금은 골격만 — Prisma · 환경변수 · 헬스체크 · 스케줄러 등록.
 */
@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validate: validateEnv,
      envFilePath: ['.env.local', '.env'],
    }),
    ScheduleModule.forRoot(),
    PrismaModule,
    HealthModule,
    ApiFootballModule,
    L0Module,
    L1Module,
    L2Module,
    L6Module,
    BackfillModule,
    LogoModule,
    ProbeModule,
    CompetitionModule,
    TeamModule,
    MatchModule,
    StandingModule,
  ],
})
export class AppModule {}
