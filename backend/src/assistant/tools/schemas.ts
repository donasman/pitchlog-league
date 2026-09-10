/**
 * MCP 도구 인자 JSON Schema — ajv 검증에 그대로 넘긴다.
 *
 * 규칙 (M7-a):
 *   - ref pattern 은 일관 `^\\d{1,9}(-[a-z0-9-]*)?$` — common/ref.ts:29 REF 와 같은 정규식
 *   - additionalProperties: false — LLM 이 스키마 밖 인자를 넣지 못하게
 *   - required 는 문자 그대로 필수인 것만 (competition·season 은 대부분 선택)
 *
 * limit 기본값(list_matches=50, 랭킹=10) 은 ajv useDefaults 로 채워진다 —
 * registry 안에서 { useDefaults: true } 로 컴파일.
 */
import type { JsonSchema } from '../assistant.types.js';

/** `<apiId>` 또는 `<apiId>-<slug>` — common/ref.ts:29 REF 와 같은 정규식 */
const REF_PATTERN = '^\\d{1,9}(-[a-z0-9-]*)?$';

/** KST 날짜 `YYYY-MM-DD` — common/kst-date.ts:7 DAY 와 같은 형식 */
const DATE_PATTERN = '^\\d{4}-\\d{2}-\\d{2}$';

const SEASON: Record<string, unknown> = {
  type: 'integer',
  minimum: 2000,
  maximum: 2100,
  description: 'Season start year (e.g. 2026 = 2026-27). Omit → current season of the competition.',
};

export const listCompetitionsSchema: JsonSchema = {
  type: 'object',
  properties: {},
  additionalProperties: false,
};

export const getCompetitionSchema: JsonSchema = {
  type: 'object',
  properties: {
    ref: {
      type: 'string',
      pattern: REF_PATTERN,
      description: 'Competition ref, e.g. "39-premier-league" or just "39".',
    },
  },
  required: ['ref'],
  additionalProperties: false,
};

export const listTeamsSchema: JsonSchema = {
  type: 'object',
  properties: {
    competition: {
      type: 'string',
      pattern: REF_PATTERN,
      description: 'Competition ref (required — no whole-competitions team list exists).',
    },
    season: SEASON,
  },
  required: ['competition'],
  additionalProperties: false,
};

export const getTeamSchema: JsonSchema = {
  type: 'object',
  properties: {
    ref: {
      type: 'string',
      pattern: REF_PATTERN,
      description: 'Team ref, e.g. "33-manchester-united" or just "33".',
    },
  },
  required: ['ref'],
  additionalProperties: false,
};

export const listMatchesSchema: JsonSchema = {
  type: 'object',
  properties: {
    competition: {
      type: 'string',
      pattern: REF_PATTERN,
      description: 'Competition ref. Omit → aggregate across the 6 display competitions.',
    },
    season: SEASON,
    from: {
      type: 'string',
      pattern: DATE_PATTERN,
      description: 'KST date, inclusive lower bound (YYYY-MM-DD).',
    },
    to: {
      type: 'string',
      pattern: DATE_PATTERN,
      description: 'KST date, inclusive upper bound (YYYY-MM-DD).',
    },
    team: {
      type: 'string',
      pattern: REF_PATTERN,
      description: 'Team ref — matches where the team was home or away.',
    },
    limit: {
      type: 'integer',
      minimum: 1,
      maximum: 200,
      // 2026-09-10 사용자: default 50 → 10 (어시스턴트 도구 경로만 · HTTP /api/matches 는 100 유지).
      // maximum 200 유지 — "최근 100경기" 같은 명시 요청은 막지 않는다.
      // registry ajv useDefaults:true (assistant-tool.registry.ts:50) 가 빈 인자에 이 default 를 채운다.
      default: 10,
      description: 'Result cap. Default 10 (assistant tool path); wrapper carries {truncated, total} when applied.',
    },
  },
  additionalProperties: false,
};

export const getMatchSchema: JsonSchema = {
  type: 'object',
  properties: {
    fixtureId: {
      type: 'string',
      pattern: REF_PATTERN,
      description: 'Match ref — API-Football fixture id, e.g. "1234567".',
    },
  },
  required: ['fixtureId'],
  additionalProperties: false,
};

export const getStandingsSchema: JsonSchema = {
  type: 'object',
  properties: {
    competition: {
      type: 'string',
      pattern: REF_PATTERN,
      description: 'Competition ref. Omit → all 6 display competitions.',
    },
    season: SEASON,
  },
  additionalProperties: false,
};

export const getTopScorersSchema: JsonSchema = {
  type: 'object',
  properties: {
    competition: {
      type: 'string',
      pattern: REF_PATTERN,
      description: 'Competition ref. Omit → aggregate across the 6 display competitions (Mode B).',
    },
    season: SEASON,
    limit: {
      type: 'integer',
      minimum: 1,
      maximum: 100,
      default: 10,
      description: 'Number of ranking rows to return.',
    },
  },
  additionalProperties: false,
};

export const getTopAssistersSchema: JsonSchema = {
  type: 'object',
  properties: {
    competition: {
      type: 'string',
      pattern: REF_PATTERN,
      description: 'Competition ref. Omit → aggregate across the 6 display competitions (Mode B).',
    },
    season: SEASON,
    limit: {
      type: 'integer',
      minimum: 1,
      maximum: 100,
      default: 10,
      description: 'Number of ranking rows to return.',
    },
  },
  additionalProperties: false,
};

export const getPlayerSchema: JsonSchema = {
  type: 'object',
  properties: {
    ref: {
      type: 'string',
      pattern: REF_PATTERN,
      description: 'Player ref, e.g. "909-lionel-messi" or just "909".',
    },
  },
  required: ['ref'],
  additionalProperties: false,
};
