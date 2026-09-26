import { Module } from '@nestjs/common';
import { LiveController } from './live.controller.js';
import { LiveService } from './live.service.js';

/**
 * LiveModule — /api/live 만 담당.
 * PrismaModule 은 @Global 이라 imports 불필요.
 * CompetitionModule/TeamModule 은 imports 하지 않는다 — LiveService 는 자체 findMany 로 조회하고
 * 축약 DTO 매핑도 자체 (TeamSummaryDto 재사용 이득이 없음).
 */
@Module({
  controllers: [LiveController],
  providers: [LiveService],
})
export class LiveModule {}
