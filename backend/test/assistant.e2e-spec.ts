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
 */
import 'dotenv/config';
import { Test } from '@nestjs/testing';
import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { ConfigService } from '@nestjs/config';
import { AppModule } from '../src/app.module.js';
import { setupApp } from '../src/app.setup.js';
import { AssistantToolRegistry } from '../src/assistant/assistant-tool.registry.js';
import { GeminiService, toFunctionDeclaration, type GeminiClientLike } from '../src/assistant/gemini.service.js';
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
