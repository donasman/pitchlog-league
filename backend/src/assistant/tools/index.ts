/**
 * MCP 도구 10개 정의 — 04 결정 D1 매핑 그대로.
 *
 * 이 파일은 배관 없는 순수 팩토리다: 6서비스를 받아 AssistantTool[] 을 만들고 끝.
 * 실제 배관(등록·검증·wrapper)은 assistant-tool.registry.ts.
 *
 * 규약:
 *   - handler 는 서비스 메서드 한 줄. Prisma·다른 서비스·raw query 금지 (D15).
 *   - description 은 composeDescription() 로만 조립 — 3상태/모드 B/ref hint 를 손으로 붙이지 않는다.
 *   - list_matches 자동 default(from/to = ±7d KST) 는 여기서 채운다 — 서비스에 채워진 인자를 넘긴다.
 */
import type { CompetitionService } from '../../competition/competition.service.js';
import type { MatchService } from '../../match/match.service.js';
import type { PlayerService } from '../../player/player.service.js';
import type { StandingService } from '../../standing/standing.service.js';
import type { StatisticsService } from '../../statistics/statistics.service.js';
import type { TeamService } from '../../team/team.service.js';
import type { CompetitionDetailDto, CompetitionListDto } from '../../competition/competition.dto.js';
import type { MatchDto, MatchListDto, MatchListQueryDto } from '../../match/match.dto.js';
import type { PlayerDetailDto } from '../../player/player.dto.js';
import type { StandingsListDto, StandingsQueryDto } from '../../standing/standing.dto.js';
import type { RankingListDto, RankingsQueryDto } from '../../statistics/statistics.dto.js';
import type { TeamDetailDto, TeamListDto, TeamListQueryDto } from '../../team/team.dto.js';
import type { AssistantTool } from '../assistant.types.js';
import { composeDescription, TOOL_NOTES } from './descriptions.js';
import {
  getCompetitionSchema,
  getMatchSchema,
  getPlayerSchema,
  getStandingsSchema,
  getTeamSchema,
  getTopAssistersSchema,
  getTopScorersSchema,
  listCompetitionsSchema,
  listMatchesSchema,
  listTeamsSchema,
} from './schemas.js';

export interface AssistantServices {
  competitions: CompetitionService;
  teams: TeamService;
  matches: MatchService;
  standings: StandingService;
  stats: StatisticsService;
  players: PlayerService;
}

/** KST `YYYY-MM-DD` — common/kst-date.ts 는 파싱만 하고 오늘 날짜 유틸이 없다. sv-SE 로케일로 파생 (04 확인) */
function kstToday(): Date {
  const label = new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Seoul' });
  // label = 'YYYY-MM-DD' → KST 00:00 을 UTC 로 (kstDayRange 와 같은 방식)
  return new Date(`${label}T00:00:00+09:00`);
}

function kstDateLabel(d: Date): string {
  return d.toLocaleDateString('sv-SE', { timeZone: 'Asia/Seoul' });
}

const DAY_MS = 86_400_000;

/**
 * list_matches 자동 default (D5-new):
 *   - team · from · to 셋 다 undefined 면 from = today-7d, to = today+7d (KST) 로 채운다.
 *   - limit 은 ajv useDefaults 로 이미 50 이 채워져 있다 — 여기서는 안 건드림.
 * 반환값은 서비스로 넘길 실제 인자. wrapper 의 args 도 이 값을 그대로 쓴다.
 */
export function applyListMatchesDefaults(args: MatchListQueryDto & { limit?: number }): MatchListQueryDto & { limit: number } {
  const out = { ...args };
  if (out.team === undefined && out.from === undefined && out.to === undefined) {
    const today = kstToday();
    out.from = kstDateLabel(new Date(today.getTime() - 7 * DAY_MS));
    out.to = kstDateLabel(new Date(today.getTime() + 7 * DAY_MS));
  }
  // ajv 가 default 50 을 채우지만 registry 가 아닌 경로에서도 안전하게
  const limit = out.limit ?? 50;
  return { ...out, limit };
}

/** 도구 10개 생성. registry 가 이 배열을 받아 등록한다. */
export function buildAssistantTools(services: AssistantServices): AssistantTool[] {
  const { competitions, teams, matches, standings, stats, players } = services;

  const listCompetitionsTool: AssistantTool<Record<string, never>, CompetitionListDto> = {
    name: 'list_competitions',
    description: composeDescription(TOOL_NOTES.list_competitions),
    argsSchema: listCompetitionsSchema,
    handler: () => competitions.list(),
  };

  const getCompetitionTool: AssistantTool<{ ref: string }, CompetitionDetailDto> = {
    name: 'get_competition',
    description: composeDescription(TOOL_NOTES.get_competition, { refHint: true }),
    argsSchema: getCompetitionSchema,
    handler: (args) => competitions.detail(args.ref),
  };

  const listTeamsTool: AssistantTool<TeamListQueryDto, TeamListDto> = {
    name: 'list_teams',
    description: composeDescription(TOOL_NOTES.list_teams, { refHint: true }),
    argsSchema: listTeamsSchema,
    handler: (args) => teams.list(args),
  };

  const getTeamTool: AssistantTool<{ ref: string }, TeamDetailDto> = {
    name: 'get_team',
    description: composeDescription(TOOL_NOTES.get_team, { refHint: true }),
    argsSchema: getTeamSchema,
    handler: (args) => teams.detail(args.ref),
  };

  const listMatchesTool: AssistantTool<MatchListQueryDto & { limit?: number }, MatchListDto> = {
    name: 'list_matches',
    description: composeDescription(TOOL_NOTES.list_matches, { modeB: true, refHint: true }),
    argsSchema: listMatchesSchema,
    handler: (args) => {
      // registry 에서 list_matches 특수 처리 시 채워진 인자를 넘기지만,
      // 도구를 팩토리 밖에서 직접 부르는 경우를 위해 여기서도 안전하게 채운다.
      const filled = applyListMatchesDefaults(args);
      // limit 은 서비스에는 넘기지 않는다 — 서비스 DTO 에 없다. wrapper 가 자르는 값.
      const { limit: _limit, ...serviceArgs } = filled;
      void _limit;
      return matches.list(serviceArgs);
    },
  };

  const getMatchTool: AssistantTool<{ fixtureId: string }, MatchDto> = {
    name: 'get_match',
    description: composeDescription(TOOL_NOTES.get_match, { refHint: true }),
    argsSchema: getMatchSchema,
    handler: (args) => matches.detail(args.fixtureId),
  };

  const getStandingsTool: AssistantTool<StandingsQueryDto, StandingsListDto> = {
    name: 'get_standings',
    description: composeDescription(TOOL_NOTES.get_standings, { modeB: true, refHint: true }),
    argsSchema: getStandingsSchema,
    handler: (args) => standings.list(args),
  };

  const getTopScorersTool: AssistantTool<RankingsQueryDto, RankingListDto> = {
    name: 'get_top_scorers',
    description: composeDescription(TOOL_NOTES.get_top_scorers, { modeB: true, refHint: true }),
    argsSchema: getTopScorersSchema,
    handler: (args) => stats.scorers(args),
  };

  const getTopAssistersTool: AssistantTool<RankingsQueryDto, RankingListDto> = {
    name: 'get_top_assisters',
    description: composeDescription(TOOL_NOTES.get_top_assisters, { modeB: true, refHint: true }),
    argsSchema: getTopAssistersSchema,
    handler: (args) => stats.assisters(args),
  };

  const getPlayerTool: AssistantTool<{ ref: string }, PlayerDetailDto> = {
    name: 'get_player',
    description: composeDescription(TOOL_NOTES.get_player, { refHint: true }),
    argsSchema: getPlayerSchema,
    handler: (args) => players.detail(args.ref),
  };

  // DTO 들은 index signature 를 갖지 않아 `AssistantTool<Args, Data>` 를
  // 공용 `AssistantTool<Record<string, unknown>, unknown>` 로 좁혀 캐스팅할 수 없다 —
  // `as unknown as` 를 통해 넓힌다. 실제 handler 는 스키마로 검증된 인자만 받는다.
  return [
    listCompetitionsTool as unknown as AssistantTool,
    getCompetitionTool as unknown as AssistantTool,
    listTeamsTool as unknown as AssistantTool,
    getTeamTool as unknown as AssistantTool,
    listMatchesTool as unknown as AssistantTool,
    getMatchTool as unknown as AssistantTool,
    getStandingsTool as unknown as AssistantTool,
    getTopScorersTool as unknown as AssistantTool,
    getTopAssistersTool as unknown as AssistantTool,
    getPlayerTool as unknown as AssistantTool,
  ];
}
