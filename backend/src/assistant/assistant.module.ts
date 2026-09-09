/**
 * AssistantModule — 도구 레지스트리 + HTTP 어시스턴트(GeminiService + Controller).
 *
 * 두 진입점:
 *   1. HTTP POST /api/assistant (AssistantController → GeminiService → AssistantToolRegistry)
 *   2. MCP stdio 서버 (cli/mcp.ts → AssistantToolRegistry 만)
 *
 * exports: 다른 모듈이 registry·service 를 직접 쓸 수 있게 열어 둔다.
 */
import { Module } from '@nestjs/common';
import { CompetitionModule } from '../competition/competition.module.js';
import { MatchModule } from '../match/match.module.js';
import { PlayerModule } from '../player/player.module.js';
import { StandingModule } from '../standing/standing.module.js';
import { StatisticsModule } from '../statistics/statistics.module.js';
import { TeamModule } from '../team/team.module.js';
import { AssistantController } from './assistant.controller.js';
import { AssistantRateLimitGuard } from './assistant-rate-limit.guard.js';
import { AssistantToolRegistry } from './assistant-tool.registry.js';
import { GeminiService } from './gemini.service.js';

@Module({
  imports: [CompetitionModule, TeamModule, MatchModule, StandingModule, StatisticsModule, PlayerModule],
  controllers: [AssistantController],
  providers: [AssistantToolRegistry, GeminiService, AssistantRateLimitGuard],
  exports: [AssistantToolRegistry, GeminiService],
})
export class AssistantModule {}
