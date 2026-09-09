/**
 * MCP 도구 레지스트리 — 이름 중복 방지 · ajv 인자 검증 · 서비스 호출 · wrapper 조립.
 *
 * 계약 (04 결정):
 *   - asOf 는 서비스 DTO 의 asOf 를 그대로 복사 (M5-a). 없으면 throw — 서비스 shape 파손 조기 발견.
 *   - list_matches 만 자동 컷: items.length > limit 이면 앞에서 자르고 wrapper 에 {truncated: true, total: 원 길이} 추가.
 *   - wrapper.args 는 "적용된 실제 인자" — ajv useDefaults 로 채워진 값 + list_matches 자동 default 반영.
 *
 * ajv 는 assistant-tools 판의 B 조각(cli/mcp.ts · package.json)이 설치한다.
 * A 조각(현재 이 판)만 있는 시점엔 `import Ajv from 'ajv'` 가 미해결이라 tsc 가 실패할 수 있다 —
 * 정상이다. B 통합 후 verifier 가 통합 tsc 를 돌린다.
 */
import { Ajv, type ValidateFunction } from 'ajv';
import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { CompetitionService } from '../competition/competition.service.js';
import { MatchService } from '../match/match.service.js';
import { PlayerService } from '../player/player.service.js';
import { StandingService } from '../standing/standing.service.js';
import { StatisticsService } from '../statistics/statistics.service.js';
import { TeamService } from '../team/team.service.js';
import type { AssistantTool, ToolResult } from './assistant.types.js';
import { applyListMatchesDefaults, buildAssistantTools } from './tools/index.js';
import type { MatchListDto, MatchListQueryDto } from '../match/match.dto.js';

/** data.asOf 를 꺼낸다 — 없으면 throw (M5-a: 폴백 없음) */
function extractAsOf(data: unknown, toolName: string): string {
  if (data && typeof data === 'object' && 'asOf' in data) {
    const raw = (data as { asOf: unknown }).asOf;
    if (typeof raw === 'string') return raw;
  }
  throw new Error(`assistant tool ${toolName}: service returned no asOf`);
}

@Injectable()
export class AssistantToolRegistry {
  private readonly tools = new Map<string, AssistantTool>();
  private readonly ajv: Ajv;
  private readonly validators = new Map<string, ValidateFunction>();

  constructor(
    private readonly competitions: CompetitionService,
    private readonly teams: TeamService,
    private readonly matches: MatchService,
    private readonly standings: StandingService,
    private readonly stats: StatisticsService,
    private readonly players: PlayerService,
  ) {
    // useDefaults: true — schemas.ts 의 limit default 를 args 에 채워 넣는다.
    // coerceTypes: false — LLM 이 문자열로 정수를 보내면 400 을 낸다 (숨기지 않는다).
    this.ajv = new Ajv({ allErrors: true, useDefaults: true, coerceTypes: false });
    for (const t of buildAssistantTools({
      competitions: this.competitions,
      teams: this.teams,
      matches: this.matches,
      standings: this.standings,
      stats: this.stats,
      players: this.players,
    })) {
      this.register(t);
    }
  }

  register(tool: AssistantTool): void {
    if (this.tools.has(tool.name)) throw new Error(`assistant tool 이름 중복: ${tool.name}`);
    this.tools.set(tool.name, tool);
    this.validators.set(tool.name, this.ajv.compile(tool.argsSchema));
  }

  getAll(): AssistantTool[] {
    return [...this.tools.values()];
  }

  get(name: string): AssistantTool | undefined {
    return this.tools.get(name);
  }

  async call(name: string, rawArgs: unknown): Promise<ToolResult> {
    const tool = this.tools.get(name);
    if (!tool) throw new NotFoundException(`도구가 없다: ${name}`);
    const validate = this.validators.get(name);
    if (!validate) throw new Error(`assistant tool ${name}: validator 미등록`);

    // useDefaults 가 args 를 변형하므로 원본은 건드리지 않는다.
    const base = rawArgs && typeof rawArgs === 'object' ? { ...(rawArgs as Record<string, unknown>) } : {};
    if (!validate(base)) {
      throw new BadRequestException(`assistant tool ${name} 인자가 스키마와 다르다: ${this.ajv.errorsText(validate.errors)}`);
    }

    if (name === 'list_matches') {
      return this.callListMatches(tool, base as MatchListQueryDto & { limit?: number });
    }

    const data = await tool.handler(base);
    return { tool: name, args: base, asOf: extractAsOf(data, name), data };
  }

  /** list_matches 특수 처리 — 자동 default 채우고, items.length > limit 이면 자른 뒤 truncated/total 추가 */
  private async callListMatches(
    tool: AssistantTool,
    rawArgs: MatchListQueryDto & { limit?: number },
  ): Promise<ToolResult<MatchListDto>> {
    const filled = applyListMatchesDefaults(rawArgs);
    const data = (await tool.handler(filled as unknown as Record<string, unknown>)) as MatchListDto;
    const asOf = extractAsOf(data, tool.name);

    const total = data.items.length;
    if (total > filled.limit) {
      const cut: MatchListDto = { ...data, items: data.items.slice(0, filled.limit) };
      return { tool: tool.name, args: filled, asOf, data: cut, truncated: true, total };
    }
    return { tool: tool.name, args: filled, asOf, data };
  }
}
