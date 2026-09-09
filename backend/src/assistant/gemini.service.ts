/**
 * Gemini function-calling 어시스턴트 서비스.
 *
 * 흐름:
 *   1. system prompt + user question 을 contents 로 시작.
 *   2. tools = [{functionDeclarations: registry 10개}] · toolConfig.mode = AUTO 로 generateContent.
 *   3. 응답에 functionCalls 있으면 각 call 을 registry.call → evidence·data 에 누적,
 *      functionResponse Part 를 contents 에 append 후 재호출.
 *   4. functionCalls 없으면 response.text 를 answer 로 확정.
 *
 * 상한:
 *   - 도구 호출 총 MAX_TOOL_CALLS(5) 회. 넘으면 마지막 응답 text 로 answer, truncated:true.
 *   - 전체 REQUEST_TIMEOUT_MS(30_000) 밖으로 나가면 AbortController 로 진행 중 호출을 취소하고,
 *     지금까지 evidence·data 로 truncated:true 반환.
 *
 * 왜 parametersJsonSchema 인가:
 *   - registry 의 argsSchema 는 `additionalProperties: false` 등 OpenAPI 3.0 Schema 밖 필드를 쓴다.
 *   - SDK 는 `parameters` (OpenAPI 서브셋) 와 `parametersJsonSchema` (raw JSON Schema) 를 나눠 두고
 *     상호 배타로 정의한다 (node_modules/@google/genai/dist/genai.d.ts:5295~5298).
 *   - argsSchema 를 그대로 넘기려면 parametersJsonSchema 다. e2e Case 4 도 원문 description 을 확인한다.
 *
 * 왜 GEMINI_API_KEY 미설정 시 부팅은 살리는가:
 *   - 로컬 개발자가 어시스턴트 없이도 조회 API 를 띄울 수 있어야 한다.
 *   - 대신 ask() 시점에 명확히 503 을 낸다.
 */
import { HttpException, HttpStatus, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GoogleGenAI, type Content, type FunctionDeclaration } from '@google/genai';
import { AssistantToolRegistry } from './assistant-tool.registry.js';
import type { AssistantTool, ToolResult } from './assistant.types.js';

export const MAX_TOOL_CALLS = 5;
export const REQUEST_TIMEOUT_MS = 30_000;

export const SYSTEM_PROMPT =
  '너는 PitchLog 축구 데이터 어시스턴트다.\n' +
  '규칙:\n' +
  '1. 도구를 부르지 않고는 숫자·순위·기록을 말하지 않는다.\n' +
  "2. 도구로 답할 수 없는 것은 '그 데이터는 아직 없다' 고 말하고 추측하지 않는다.\n" +
  "3. null 은 0 이 아니라 '측정 안 됨' 이다.\n" +
  '4. 답변 언어는 질문 언어를 따른다.\n' +
  '5. 마크다운 표(| ... |)를 쓰지 않는다. 표가 필요한 답은 짧은 문장으로 요약하고 상세는 근거 데이터에 맡긴다.';

export interface AskEvidence {
  tool: string;
  args: Record<string, unknown>;
  asOf: string;
}

export interface AskResult {
  answer: string;
  evidence: AskEvidence[];
  data: unknown[];
  truncated: boolean;
  model: string;
}

export interface AskOpts {
  timeoutMs?: number;
  maxToolCalls?: number;
}

/**
 * SDK 최소 인터페이스 — 테스트에서 Mock 으로 갈아 끼우려고 남긴다.
 * client.models.generateContent 만 쓰는 좁은 스펙.
 */
export interface GeminiClientLike {
  models: {
    generateContent: (params: {
      model: string;
      contents: Content[];
      config?: {
        systemInstruction?: string;
        tools?: Array<{ functionDeclarations: FunctionDeclaration[] }>;
        toolConfig?: { functionCallingConfig?: { mode?: string } };
        abortSignal?: AbortSignal;
      };
    }) => Promise<{
      text?: string;
      functionCalls?: Array<{ name?: string; args?: Record<string, unknown> }>;
      /** 모델 턴 원문. Gemini 3 계열은 functionCall part 에 thoughtSignature 를 실어 보내고,
       *  다음 요청에 그 part 를 **그대로** 되돌려주지 않으면 400 INVALID_ARGUMENT 가 난다.
       *  (2026-09-09 실측: "Function call is missing a thought_signature in functionCall parts") */
      candidates?: Array<{ content?: Content }>;
    }>;
  };
}

/** registry 의 AssistantTool 을 Gemini FunctionDeclaration 으로 변환한다 (raw JSON Schema 경로) */
export function toFunctionDeclaration(tool: AssistantTool): FunctionDeclaration {
  return {
    name: tool.name,
    description: tool.description,
    // additionalProperties: false 등을 그대로 살리려면 parametersJsonSchema.
    // `parameters` 는 OpenAPI 3.0 Schema 서브셋만 받는다 (SDK d.ts:5295).
    parametersJsonSchema: tool.argsSchema,
  };
}

@Injectable()
export class GeminiService {
  private readonly logger = new Logger(GeminiService.name);
  private readonly client: GeminiClientLike | null;
  private readonly modelName: string;
  /** 테스트에서 setClient 로 갈아 끼울 수 있게 held (production 은 생성자에서만 세팅).
   *  `null` 도 유효한 override 값(= 강제 미설정)이므로 sentinel 로 활성 여부를 별도 관리한다.
   *  (2026-09-09 실측: .env 에 GEMINI_API_KEY 가 있으면 `setClient(null)` 이 실 client 로 폴백돼 e2e Case 1 이 깨졌다) */
  private clientOverride: GeminiClientLike | null = null;
  private overrideActive = false;

  constructor(
    private readonly config: ConfigService,
    private readonly registry: AssistantToolRegistry,
  ) {
    const apiKey = this.config.get<string>('GEMINI_API_KEY');
    this.modelName = this.config.get<string>('GEMINI_MODEL') ?? 'gemini-3.5-flash';
    if (apiKey && apiKey.length > 0) {
      this.client = new GoogleGenAI({ apiKey }) as unknown as GeminiClientLike;
    } else {
      this.client = null;
      this.logger.warn('GEMINI_API_KEY 미설정 — POST /api/assistant 는 503 을 낸다');
    }
  }

  /** 테스트 전용 — MockGeminiClient 를 주입한다. `null` 을 넘기면 실 client 로 폴백하지 않고 강제 미설정. */
  setClient(client: GeminiClientLike | null): void {
    this.clientOverride = client;
    this.overrideActive = true;
  }

  private getClient(): GeminiClientLike | null {
    return this.overrideActive ? this.clientOverride : this.client;
  }

  async ask(question: string, opts: AskOpts = {}): Promise<AskResult> {
    const client = this.getClient();
    if (!client) {
      throw new HttpException('assistant.error.not_configured', HttpStatus.SERVICE_UNAVAILABLE);
    }

    const maxToolCalls = opts.maxToolCalls ?? MAX_TOOL_CALLS;
    const timeoutMs = opts.timeoutMs ?? REQUEST_TIMEOUT_MS;

    const evidence: AskEvidence[] = [];
    const data: unknown[] = [];
    let truncated = false;

    // 도구 10개를 FunctionDeclaration 으로 변환 — 매 호출마다 같은 배열
    const functionDeclarations = this.registry.getAll().map(toFunctionDeclaration);

    // contents 는 user 발화로 시작. system 은 config.systemInstruction 로 별도.
    const contents: Content[] = [{ role: 'user', parts: [{ text: question }] }];

    const controller = new AbortController();
    const timeoutHandle = setTimeout(() => {
      controller.abort();
    }, timeoutMs);

    let lastAnswer = '';

    try {
      for (let step = 0; step <= maxToolCalls; step++) {
        // 상한 초과: maxToolCalls 회 부른 뒤 한 번 더 재호출해 최종 텍스트를 뽑되, 도구가 또 오면 truncated
        let response: Awaited<ReturnType<GeminiClientLike['models']['generateContent']>>;
        try {
          response = await client.models.generateContent({
            model: this.modelName,
            contents,
            config: {
              systemInstruction: SYSTEM_PROMPT,
              tools: [{ functionDeclarations }],
              toolConfig: { functionCallingConfig: { mode: 'AUTO' } },
              abortSignal: controller.signal,
            },
          });
        } catch (cause) {
          throw this.wrapSdkError(cause, controller.signal.aborted);
        }

        lastAnswer = response.text ?? lastAnswer;

        const calls = response.functionCalls ?? [];
        if (calls.length === 0) {
          // 답 확정
          return {
            answer: lastAnswer,
            evidence,
            data,
            truncated,
            model: this.modelName,
          };
        }

        // 상한을 넘겼으면 마지막 텍스트로 확정하고 truncated
        if (step >= maxToolCalls) {
          truncated = true;
          return {
            answer: lastAnswer,
            evidence,
            data,
            truncated,
            model: this.modelName,
          };
        }

        // 모델이 예측한 functionCall 을 그대로 contents 에 넣고 (role:'model'), 각 결과를 functionResponse Part 로 append
        // 모델 턴은 **응답 원문을 그대로** 되돌린다 — 재구성하면 thoughtSignature 가 떨어져 400 이 난다.
        // 원문이 없을 때만 name·args 로 최소 복원한다 (테스트 Mock 경로).
        const modelContent = response.candidates?.[0]?.content;
        contents.push(
          modelContent ?? {
            role: 'model',
            parts: calls.map((c) => ({ functionCall: { name: c.name ?? '', args: c.args ?? {} } })),
          },
        );

        const responseParts: Array<{ functionResponse: { name: string; response: Record<string, unknown> } }> = [];
        for (const c of calls) {
          const name = c.name ?? '';
          const args = c.args ?? {};
          let result: ToolResult;
          try {
            result = await this.registry.call(name, args);
          } catch (cause) {
            // 도구 자체 오류(BadRequest·NotFound 등)는 응답 파트로 감싸 모델에 되돌린다 — 모델이 재시도하거나 사용자에게 상황을 설명하게
            const msg = cause instanceof Error ? cause.message : String(cause);
            responseParts.push({ functionResponse: { name, response: { error: msg } } });
            continue;
          }
          const { tool, args: appliedArgs, asOf } = result;
          const argsObj = appliedArgs && typeof appliedArgs === 'object' ? (appliedArgs as Record<string, unknown>) : {};
          evidence.push({ tool, args: argsObj, asOf });
          data.push(result.data);
          responseParts.push({
            functionResponse: {
              name,
              // SDK 는 { response: Record<string, unknown> } 를 기대한다. 원 데이터가 배열/객체 어떤 형태여도 여기 감싼다.
              response: { result: result.data, asOf: result.asOf },
            },
          });
        }
        contents.push({ role: 'user', parts: responseParts });
      }

      // 이론상 여기 도달 안 함 (루프 안에서 return) — 안전망
      return { answer: lastAnswer, evidence, data, truncated: true, model: this.modelName };
    } finally {
      clearTimeout(timeoutHandle);
    }
  }

  /** SDK 오류를 HttpException 으로 매핑 */
  private wrapSdkError(cause: unknown, aborted: boolean): HttpException {
    if (aborted) {
      return new HttpException('assistant.error.timeout', HttpStatus.GATEWAY_TIMEOUT);
    }
    // @google/genai ApiError 는 { status: number } 를 갖는다 (d.ts:538~542)
    const status = extractStatus(cause);
    if (status === 429) {
      return new HttpException('assistant.error.rate_limited', HttpStatus.TOO_MANY_REQUESTS);
    }
    this.logger.warn(`Gemini call failed (status=${status ?? 'unknown'}): ${errMessage(cause)}`);
    return new HttpException('assistant.error.model_error', HttpStatus.BAD_GATEWAY);
  }
}

function extractStatus(cause: unknown): number | undefined {
  if (cause && typeof cause === 'object' && 'status' in cause) {
    const v = (cause as { status: unknown }).status;
    if (typeof v === 'number') return v;
  }
  return undefined;
}

function errMessage(cause: unknown): string {
  if (cause instanceof Error) return cause.message;
  return String(cause);
}
