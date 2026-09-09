/**
 * AssistantModule — MCP 도구 레지스트리만 provide/export 한다.
 *
 * 이 판(A 조각) 시점에는 AppModule 에 등록되지 않는다 — B 조각(cli/mcp.ts) 이 stdio 서버에서 이 모듈을 부트한다.
 * B 통합 전에는 부팅에도 안 붙고 e2e 도 없다. tsc/lint 만 통과하면 된다.
 */
import { Module } from '@nestjs/common';
import { CompetitionModule } from '../competition/competition.module.js';
import { MatchModule } from '../match/match.module.js';
import { PlayerModule } from '../player/player.module.js';
import { StandingModule } from '../standing/standing.module.js';
import { StatisticsModule } from '../statistics/statistics.module.js';
import { TeamModule } from '../team/team.module.js';
import { AssistantToolRegistry } from './assistant-tool.registry.js';

@Module({
  imports: [CompetitionModule, TeamModule, MatchModule, StandingModule, StatisticsModule, PlayerModule],
  providers: [AssistantToolRegistry],
  exports: [AssistantToolRegistry],
})
export class AssistantModule {}
