/**
 * MCP 도구 공용 타입 — 04 결정 P3 · P5 그대로.
 *
 * AssistantTool: 이름 · description · JSON Schema · handler 넷.
 * ToolResult: 서비스 반환을 감싼 wrapper. asOf 는 서비스 DTO 의 asOf 복사 (M5-a).
 *   list_matches 자동 컷이 걸리면 truncated/total 추가, 아니면 없음.
 */

export interface JsonSchema {
  type: 'object';
  properties: Record<string, unknown>;
  required?: readonly string[];
  additionalProperties: false;
}

export interface AssistantTool<Args = Record<string, unknown>, Data = unknown> {
  name: string;
  description: string;
  argsSchema: JsonSchema;
  handler: (args: Args) => Promise<Data>;
}

export interface ToolResult<Data = unknown> {
  tool: string;
  args: unknown;
  asOf: string;
  data: Data;
  truncated?: true;
  total?: number;
}
