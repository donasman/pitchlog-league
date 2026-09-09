/**
 * POST /api/assistant e2e — apiId 대역 999_xxx (assistant answer 판 전용).
 * 네트워크 없다 — Gemini 클라이언트는 MockGeminiClient 로 갈아 끼운다.
 *
 * Case 1: GEMINI_API_KEY 미설정 → 503 · 'assistant.error.not_configured'
 * Case 2: DTO 검증 — question 빈 문자열/501자/필드 없음 → 400
 * Case 3: toFunctionDeclaration 변환 → 10개 · name·description·parametersJsonSchema 존재 · schema.type === 'object'
 * Case 4: description 3상태 문구 보존 ('do not conflate'·'not measured'·'API did not provide' 셋 다)
 * Case 5: MockGeminiClient 로 도구 호출 상한 5회 검증 → truncated:true · evidence.length === 5
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

describe('POST /api/assistant (e2e)', () => {
  // ── Case 1. 키 미설정 → 503 ─────────────────────────────
  describe('Case 1: GEMINI_API_KEY 미설정 → 503', () => {
    let app: INestApplication;
    const originalKey = process.env.GEMINI_API_KEY;

    beforeAll(async () => {
      // 환경변수를 지운 상태로 앱을 부팅한다 — GeminiService 생성자에서 client=null 이 된다
      delete process.env.GEMINI_API_KEY;
      const mod = await Test.createTestingModule({ imports: [AppModule] }).compile();
      app = setupApp(mod.createNestApplication());
      await app.init();
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
