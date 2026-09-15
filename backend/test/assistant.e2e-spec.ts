/**
 * POST /api/assistant e2e — apiId 대역 999_xxx (assistant answer 판 전용).
 * 네트워크 없다 — Gemini 클라이언트는 MockGeminiClient 로 갈아 끼운다.
 *
 * Case 1: GEMINI_API_KEY 미설정 → 503 · 'assistant.error.not_configured'
 * Case 2: DTO 검증 — question 빈 문자열/501자/필드 없음 → 400
 * Case 3: toFunctionDeclaration 변환 → 10개 · name·description·parametersJsonSchema 존재 · schema.type === 'object'
 * Case 4: description 3상태 문구 보존 ('do not conflate'·'not measured'·'API did not provide' 셋 다)
 * Case 5: MockGeminiClient 로 도구 호출 상한 5회 검증 → truncated:true · evidence.length === 5
 * Case 6: MAX_TOOL_EXECUTIONS 8 — step 마다 3개 functionCall 을 반환해도 실행 8회에서 컷
 * Case 7: 최상위 asOf 가 evidence 중 최소값 (사전순 = 시간순 min)
 * Case 8 (E2): geminiRequests 카운터 — 정상(도구 1회+최종 = 2) · 에러(mock throw 시 = 1) 두 경로
 * Case 9 (E2): ASSISTANT_DEBUG_HEADERS=true 게이트 ON 시 X-Gemini-Requests 헤더 실림
 */
import 'dotenv/config';
import { Test } from '@nestjs/testing';
import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { ConfigService } from '@nestjs/config';
import { AppModule } from '../src/app.module.js';
import { setupApp } from '../src/app.setup.js';
import { AssistantToolRegistry } from '../src/assistant/assistant-tool.registry.js';
import { GeminiService, toFunctionDeclaration, buildTruncatedFallback, type GeminiClientLike } from '../src/assistant/gemini.service.js';
import type { AssistantTool, ToolResult } from '../src/assistant/assistant.types.js';

describe('POST /api/assistant (e2e)', () => {
  // ── Case 1. 키 미설정 → 503 ─────────────────────────────
  describe('Case 1: GEMINI_API_KEY 미설정 → 503', () => {
    let app: INestApplication;
    const originalKey = process.env.GEMINI_API_KEY;

    beforeAll(async () => {
      // 환경변수를 지운 상태로 앱을 부팅한다 — GeminiService 생성자에서 client=null 이 된다.
      // ConfigModule 이 .env 를 재로드해 값을 되살릴 수 있으므로, 부팅 후 setClient(null) 로
      // 강제 미설정을 명시한다 (사용자 .env 에 GEMINI_API_KEY 가 있는 환경에서도 통과).
      delete process.env.GEMINI_API_KEY;
      const mod = await Test.createTestingModule({ imports: [AppModule] }).compile();
      app = setupApp(mod.createNestApplication());
      await app.init();
      app.get(GeminiService).setClient(null);
    });

    afterAll(async () => {
      await app?.close();
      if (originalKey !== undefined) process.env.GEMINI_API_KEY = originalKey;
    });

    it('POST 시 503 · not_configured', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/assistant')
        .send({ question: '아무거나' })
        .expect(503);
      expect(res.body.message).toBe('assistant.error.not_configured');
    });
  });

  // ── Case 2 · 3 · 4 · 5 는 앱을 공유 (키 있는 상태 · Mock 클라이언트) ────
  describe('공유 앱 (Mock 클라이언트 · 키 있음)', () => {
    let app: INestApplication;
    let registry: AssistantToolRegistry;
    let gemini: GeminiService;
    const originalKey = process.env.GEMINI_API_KEY;

    beforeAll(async () => {
      // 어떤 값이든 있으면 GeminiService 는 실 client 를 만들지만 setClient 로 Mock 을 씌운다
      process.env.GEMINI_API_KEY = 'test-key-not-used';
      const mod = await Test.createTestingModule({ imports: [AppModule] }).compile();
      app = setupApp(mod.createNestApplication());
      await app.init();
      registry = app.get(AssistantToolRegistry);
      gemini = app.get(GeminiService);
    });

    afterAll(async () => {
      await app?.close();
      if (originalKey === undefined) delete process.env.GEMINI_API_KEY;
      else process.env.GEMINI_API_KEY = originalKey;
    });

    // ── Case 2. DTO 검증 ──────────────────────────────────
    describe('Case 2: DTO 검증', () => {
      it('question=""  → 400', async () => {
        // 빈 문자열은 Mock 이 호출되지 않도록 답 없는 Mock 을 붙여도 되지만, 검증에서 걸려야 함
        gemini.setClient(makeStaticAnswerClient('unused'));
        await request(app.getHttpServer()).post('/api/assistant').send({ question: '' }).expect(400);
      });

      it('question=501자 → 400', async () => {
        gemini.setClient(makeStaticAnswerClient('unused'));
        await request(app.getHttpServer())
          .post('/api/assistant')
          .send({ question: 'a'.repeat(501) })
          .expect(400);
      });

      it('question 필드 없음 → 400', async () => {
        gemini.setClient(makeStaticAnswerClient('unused'));
        await request(app.getHttpServer()).post('/api/assistant').send({}).expect(400);
      });
    });

    // ── Case 3. toFunctionDeclaration 변환 ───────────────
    it('Case 3: registry 10개 → FunctionDeclaration 10개 · name·description·parametersJsonSchema · type=object', () => {
      const decls = registry.getAll().map(toFunctionDeclaration);
      expect(decls).toHaveLength(10);
      for (const d of decls) {
        expect(typeof d.name).toBe('string');
        expect(d.name!.length).toBeGreaterThan(0);
        expect(typeof d.description).toBe('string');
        expect(d.description!.length).toBeGreaterThan(0);
        // 우리는 parametersJsonSchema (raw JSON Schema) 경로를 쓴다
        expect(d.parametersJsonSchema).toBeDefined();
        const schema = d.parametersJsonSchema as { type?: string };
        expect(schema.type).toBe('object');
      }
    });

    // ── Case 4. 3상태 문구 보존 ───────────────────────────
    it('Case 4: 모든 FunctionDeclaration.description 에 3상태 문구 3종 존재', () => {
      const decls = registry.getAll().map(toFunctionDeclaration);
      for (const d of decls) {
        // NUMERIC_SEMANTICS 상수의 3상태 토큰들
        // (descriptions.ts:14~19)
        expect(d.description).toContain('do not conflate');
        expect(d.description).toContain('not measured');
        expect(d.description).toContain('Missing-data flags');
      }
    });

    // ── Case 5. Mock 무한 functionCall → 상한 5회 · truncated ─
    it('Case 5: MockGeminiClient 가 무한히 functionCall 반환 → evidence.length===5 · truncated===true', async () => {
      // list_competitions 는 인자 필수 없음 → 안전. 매 응답마다 list_competitions 호출을 반환한다.
      let stepCount = 0;
      const mock: GeminiClientLike = {
        models: {
          async generateContent() {
            stepCount++;
            // 상한이 5 라면 loop step 0..5 = 6번 호출된다 — 마지막(step===5)에는 text 만 넘겨 종료 유도
            return {
              text: `mock text step ${stepCount}`,
              functionCalls: [{ name: 'list_competitions', args: {} }],
            };
          },
        },
      };
      gemini.setClient(mock);
      // ConfigService 는 실 값을 그대로 쓴다 — modelName 은 앱 부팅 때 잡힌 걸 사용
      const cfg = app.get(ConfigService);
      const expectedModel = cfg.get<string>('GEMINI_MODEL') ?? 'gemini-3.5-flash';

      const result = await gemini.ask('무한 도구 호출 반례');
      expect(result.truncated).toBe(true);
      expect(result.evidence).toHaveLength(5);
      // 모든 evidence 가 list_competitions 도구를 부른 것이어야 한다
      for (const e of result.evidence) {
        expect(e.tool).toBe('list_competitions');
        expect(typeof e.asOf).toBe('string');
      }
      expect(result.model).toBe(expectedModel);
      // data 도 5개
      expect(result.data).toHaveLength(5);
      // 마지막 텍스트는 mock 이 준 것
      expect(result.answer).toMatch(/^mock text step /);
    });

    // ── Case 6. step 마다 다수 functionCall → MAX_TOOL_EXECUTIONS 8 컷 ─
    it('Case 6: step 마다 3개 functionCall → executions 상한 8 · evidence.length===8 · truncated===true', async () => {
      // step 상한(5) 은 여유롭게 남긴 채, 실행 카운트 자체가 8 에서 컷되는지 검증.
      // step 1 → 3개 (executions 1,2,3), step 2 → 3개 (4,5,6), step 3 → 3개 중 2개만 실행(7,8) 후 break.
      let stepCount = 0;
      const mock: GeminiClientLike = {
        models: {
          async generateContent() {
            stepCount++;
            if (stepCount >= 4) {
              // 안전망 — outer break 이후 여기 도달하면 안 됨. 도달 시엔 text 만 반환해 종료 유도.
              return { text: `mock text step ${stepCount}`, functionCalls: [] };
            }
            return {
              text: `mock text step ${stepCount}`,
              functionCalls: [
                { name: 'list_competitions', args: {} },
                { name: 'list_competitions', args: {} },
                { name: 'list_competitions', args: {} },
              ],
            };
          },
        },
      };
      gemini.setClient(mock);

      const result = await gemini.ask('실행 상한 반례');
      expect(result.truncated).toBe(true);
      expect(result.evidence).toHaveLength(8);
      expect(result.data).toHaveLength(8);
      // outer break 는 step 3 안에서 발생 — 그 step 이 stepCount===3 이었음
      expect(stepCount).toBe(3);
      // evidence 는 모두 list_competitions
      for (const e of result.evidence) {
        expect(e.tool).toBe('list_competitions');
      }
    });

    // ── Case 10. MAX_TOOL_CALLS 5 · text:undefined → 코드 폴백 ─
    it('Case 10: text:undefined + MAX_TOOL_CALLS → answer 는 buildTruncatedFallback 로 대체', async () => {
      // 모든 step 에서 text 없이 functionCall 만 반환 → step 상한 도달 시 lastAnswer 는 ''.
      // 폴백 조건: truncated===true && lastAnswer.trim()===''.
      const mock: GeminiClientLike = {
        models: {
          async generateContent() {
            return {
              text: undefined,
              functionCalls: [{ name: 'list_competitions', args: {} }],
              candidates: [
                {
                  content: {
                    role: 'model',
                    parts: [{ functionCall: { name: 'list_competitions', args: {} } }],
                  },
                },
              ],
            };
          },
        },
      };
      gemini.setClient(mock);

      const result = await gemini.ask('폴백 반례 · 빈 텍스트');
      expect(result.truncated).toBe(true);
      expect(result.evidence).toHaveLength(5);
      // buildTruncatedFallback 을 그대로 비교 — 결정적 문안
      expect(result.answer).toBe(buildTruncatedFallback(result.evidence));
      expect(result.answer).toContain('찾지 못했습니다');
      expect(result.answer).toContain('list_competitions 5회');
    });

    // ── Case 11. MAX_TOOL_EXECUTIONS 8 컷 · text:undefined → 코드 폴백 ─
    it('Case 11: text:undefined + MAX_TOOL_EXECUTIONS 8 컷 → answer 는 buildTruncatedFallback', async () => {
      // Case 6 과 같은 구조지만 text 없이 반환. outer break 후 안전망 return 자리에서 폴백 적용.
      let stepCount = 0;
      const mock: GeminiClientLike = {
        models: {
          async generateContent() {
            stepCount++;
            // 안전망: outer break 이후 도달하지 않아야 함. 도달 시 원인 파악용으로 text 없이 종료 유도.
            if (stepCount >= 4) {
              return { text: undefined, functionCalls: [] };
            }
            return {
              text: undefined,
              functionCalls: [
                { name: 'list_competitions', args: {} },
                { name: 'list_competitions', args: {} },
                { name: 'list_competitions', args: {} },
              ],
              candidates: [
                {
                  content: {
                    role: 'model',
                    parts: [
                      { functionCall: { name: 'list_competitions', args: {} } },
                      { functionCall: { name: 'list_competitions', args: {} } },
                      { functionCall: { name: 'list_competitions', args: {} } },
                    ],
                  },
                },
              ],
            };
          },
        },
      };
      gemini.setClient(mock);

      const result = await gemini.ask('실행 상한 · 폴백 반례');
      expect(result.truncated).toBe(true);
      expect(result.evidence).toHaveLength(8);
      expect(result.answer).toBe(buildTruncatedFallback(result.evidence));
      expect(result.answer).toContain('list_competitions 8회');
    });

    // ── Case 8 (E2). geminiRequests 카운터 ─────────────────────
    // 정상 경로: 첫 응답이 도구 호출 1개 → 두 번째 응답이 최종 텍스트. generateContent 2회.
    // 에러 경로: 첫 호출부터 throw → wrapSdkError 가 err.geminiRequests = 1 attach.
    it('Case 8: 정상 흐름에서 result.geminiRequests === 2 (도구 1회 + 최종)', async () => {
      let callCount = 0;
      const mock: GeminiClientLike = {
        models: {
          async generateContent() {
            callCount++;
            if (callCount === 1) {
              return {
                text: '도구 호출 중',
                functionCalls: [{ name: 'list_competitions', args: {} }],
              };
            }
            // 두 번째: 최종 텍스트만
            return { text: '최종 답변', functionCalls: [] };
          },
        },
      };
      gemini.setClient(mock);

      const result = await gemini.ask('카운터 정상 경로');
      expect(result.geminiRequests).toBe(2);
      expect(callCount).toBe(2);
      expect(result.answer).toBe('최종 답변');
    });

    it('Case 8: 첫 SDK 호출에서 throw → err.geminiRequests === 1 attach', async () => {
      // Gemini SDK 의 429 형태를 흉내낸다 — { status: 429 } · message 는 임의.
      const sdkError = Object.assign(new Error('{"error":{"code":429,"status":"RESOURCE_EXHAUSTED","message":"quota"}}'), { status: 429 });
      const mock: GeminiClientLike = {
        models: {
          async generateContent() {
            throw sdkError;
          },
        },
      };
      gemini.setClient(mock);

      let caught: unknown;
      try {
        await gemini.ask('카운터 에러 경로');
      } catch (e) {
        caught = e;
      }
      expect(caught).toBeDefined();
      // wrapSdkError 가 HttpException 을 만들어 던지고, geminiService 에서 err.geminiRequests = 1 attach 한다.
      expect((caught as { geminiRequests?: number }).geminiRequests).toBe(1);
    });
  });

  // ── Case 9 (E2). ASSISTANT_DEBUG_HEADERS=true → X-Gemini-Requests 헤더 ─
  //
  // 왜 ConfigService 를 override 하는가:
  //   앞선 describe 의 beforeAll 이 앱을 부팅할 때 validateEnv 가 default 'false' 를
  //   내부에 저장하고 assignVariablesToProcess 로 process.env 에도 'false' 를 세팅한다.
  //   그 뒤 이 Case 9 beforeAll 에서 process.env='true' 로 다시 덮어도 Nest 의
  //   ConfigService 초기화 시점 캐시가 남아 'false' 를 그대로 돌려준다 (실측).
  //   보고를 위해 test 는 ConfigService 를 실측 가능하게 override 해서 게이트 판정 로직
  //   자체(`ConfigService.get(...) === 'true' ? setHeader : noop`) 를 검증한다.
  describe('Case 9: ASSISTANT_DEBUG_HEADERS 게이트', () => {
    let app: INestApplication;
    let gemini: GeminiService;
    const originalKey = process.env.GEMINI_API_KEY;

    beforeAll(async () => {
      process.env.GEMINI_API_KEY = 'test-key-not-used';
      const fakeConfig = {
        get<T>(key: string): T | undefined {
          if (key === 'ASSISTANT_DEBUG_HEADERS') return 'true' as unknown as T;
          if (key === 'GEMINI_MODEL') return 'gemini-3.5-flash' as unknown as T;
          if (key === 'GEMINI_API_KEY') return 'test-key-not-used' as unknown as T;
          return undefined;
        },
      };
      const mod = await Test.createTestingModule({ imports: [AppModule] })
        .overrideProvider(ConfigService)
        .useValue(fakeConfig)
        .compile();
      app = setupApp(mod.createNestApplication());
      await app.init();
      gemini = app.get(GeminiService);
    });

    afterAll(async () => {
      await app?.close();
      if (originalKey === undefined) delete process.env.GEMINI_API_KEY;
      else process.env.GEMINI_API_KEY = originalKey;
    });

    it('게이트 ON · 정상 응답에 x-gemini-requests 헤더 실림', async () => {
      // sanity: 우리가 override 한 ConfigService 가 controller 에 주입돼 있는지.
      expect(app.get(ConfigService).get<string>('ASSISTANT_DEBUG_HEADERS')).toBe('true');

      // 도구 없이 한 번에 최종 답변. generateContent 1회 → 헤더 값 '1'.
      const mock: GeminiClientLike = {
        models: {
          async generateContent() {
            return { text: '단답', functionCalls: [] };
          },
        },
      };
      gemini.setClient(mock);

      // Nest POST 기본 응답 코드는 201 (Created).
      const res = await request(app.getHttpServer())
        .post('/api/assistant')
        .send({ question: '헤더 검사' })
        .expect(201);
      // supertest 헤더 이름은 소문자.
      expect(res.headers['x-gemini-requests']).toBe('1');
      expect(res.body.answer).toBe('단답');
    });
  });

  // ── Case 7. 최상위 asOf = evidence 중 최소값 ────────────────
  // fake AssistantToolRegistry 를 override 로 주입해 asOf 를 매 호출 다르게 통제한다.
  describe('Case 7: 최상위 asOf = evidence 중 최소값 (별도 앱 · fake registry)', () => {
    let app: INestApplication;
    let gemini: GeminiService;
    const originalKey = process.env.GEMINI_API_KEY;

    // 매 call 마다 다른 asOf 를 돌려주는 fake — 순서: 09-07, 09-01, 09-09
    // 실 registry 는 CompetitionService 등에 의존하지만 여기선 getAll·call 만 쓴다.
    const asOfSequence = [
      '2026-09-07T00:00:00.000Z',
      '2026-09-01T00:00:00.000Z',
      '2026-09-09T00:00:00.000Z',
    ];
    let callIdx = 0;
    const fakeTool: AssistantTool = {
      name: 'list_competitions',
      description: 'fake for case 7 (do not conflate · not measured · Missing-data flags placeholder)',
      argsSchema: { type: 'object', properties: {}, additionalProperties: false },
      handler: async () => ({ asOf: asOfSequence[0], items: [] }),
    };
    const fakeRegistry = {
      getAll(): AssistantTool[] {
        return [fakeTool];
      },
      get(name: string): AssistantTool | undefined {
        return name === fakeTool.name ? fakeTool : undefined;
      },
      register(): void {
        // 이 앱에서는 register 를 부르지 않는다.
      },
      async call(name: string, args: unknown): Promise<ToolResult> {
        if (name !== fakeTool.name) throw new Error(`unknown tool ${name}`);
        const asOf = asOfSequence[callIdx % asOfSequence.length]!;
        callIdx++;
        const argsObj = args && typeof args === 'object' ? (args as Record<string, unknown>) : {};
        return { tool: name, args: argsObj, asOf, data: { asOf, items: [] } };
      },
    };

    beforeAll(async () => {
      process.env.GEMINI_API_KEY = 'test-key-not-used';
      callIdx = 0;
      const mod = await Test.createTestingModule({ imports: [AppModule] })
        .overrideProvider(AssistantToolRegistry)
        .useValue(fakeRegistry)
        .compile();
      app = setupApp(mod.createNestApplication());
      await app.init();
      gemini = app.get(GeminiService);
    });

    afterAll(async () => {
      await app?.close();
      if (originalKey === undefined) delete process.env.GEMINI_API_KEY;
      else process.env.GEMINI_API_KEY = originalKey;
    });

    it('evidence 3건의 asOf 가 [09-07, 09-01, 09-09] 이면 최상위 asOf === 09-01', async () => {
      // 3번 도구를 부르고 마지막 step 에서 text 만 반환해 확정. step 4 진입 시 종료.
      let stepCount = 0;
      const mock: GeminiClientLike = {
        models: {
          async generateContent() {
            stepCount++;
            if (stepCount >= 4) {
              return { text: 'final answer', functionCalls: [] };
            }
            return {
              text: `working step ${stepCount}`,
              functionCalls: [{ name: 'list_competitions', args: {} }],
            };
          },
        },
      };
      gemini.setClient(mock);

      const result = await gemini.ask('asOf 최소값 검증');
      expect(result.truncated).toBe(false);
      expect(result.evidence).toHaveLength(3);
      expect(result.evidence.map((e) => e.asOf)).toEqual([
        '2026-09-07T00:00:00.000Z',
        '2026-09-01T00:00:00.000Z',
        '2026-09-09T00:00:00.000Z',
      ]);
      // 사전순 min = 시간순 min
      expect(result.asOf).toBe('2026-09-01T00:00:00.000Z');
      expect(result.answer).toBe('final answer');
    });
  });
});

// ── buildTruncatedFallback 순수 함수 헬퍼 검증 ─────────────
// ask() 안이 아니라 함수 자체의 결정성 검증. e2e-spec 파일 안에 두는 이유:
// Case 10·11 이 이 함수의 결과와 answer 를 비교하므로, 문안이 실수로 바뀌면 함께 걸린다.
describe('buildTruncatedFallback', () => {
  it('evidence 빈 배열이면 괄호 없이 기본 문구만 반환', () => {
    expect(buildTruncatedFallback([])).toBe('요청하신 정보를 찾지 못했습니다.');
  });

  it('도구 1종 5회 → 도구명·횟수 단일 항목', () => {
    const evidence = Array.from({ length: 5 }, () => ({
      tool: 'get_player',
      args: {},
      asOf: '2026-09-15T00:00:00.000Z',
    }));
    expect(buildTruncatedFallback(evidence)).toBe(
      '요청하신 정보를 찾지 못했습니다. (조회한 도구: get_player 5회)',
    );
  });

  it('도구 2종 → 등장 순서대로 " · " 로 잇는다', () => {
    const evidence = [
      { tool: 'list_competitions', args: {}, asOf: '2026-09-15T00:00:00.000Z' },
      { tool: 'list_competitions', args: {}, asOf: '2026-09-15T00:00:00.000Z' },
      { tool: 'get_standings', args: {}, asOf: '2026-09-15T00:00:00.000Z' },
      { tool: 'get_standings', args: {}, asOf: '2026-09-15T00:00:00.000Z' },
      { tool: 'get_standings', args: {}, asOf: '2026-09-15T00:00:00.000Z' },
    ];
    expect(buildTruncatedFallback(evidence)).toBe(
      '요청하신 정보를 찾지 못했습니다. (조회한 도구: list_competitions 2회 · get_standings 3회)',
    );
  });
});

/** functionCalls 없는 정적 응답을 주는 Mock — Case 2 에서 컨트롤러가 gemini.ask 를 못 부르는 걸 확인하기 위해 */
function makeStaticAnswerClient(text: string): GeminiClientLike {
  return {
    models: {
      async generateContent() {
        return { text, functionCalls: [] };
      },
    },
  };
}
