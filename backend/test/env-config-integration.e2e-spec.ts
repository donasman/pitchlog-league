/**
 * fix/debug-header-gate 05a T2 — ConfigModule 저장 경로 진단.
 *
 * app.module.ts 의 ConfigModule.forRoot 인자를 그대로 복사하고
 * ignoreEnvFile: true 만 추가한다 (테스트 대상은 앱과 동일한 검증·저장 경로).
 * AppModule 은 부팅하지 않는다 — DB 접속 없음, 원격 DB 가드 무관.
 *
 * assert: process.env.ASSISTANT_DEBUG_HEADERS='true' 세팅 뒤
 *   app.get(ConfigService).get('ASSISTANT_DEBUG_HEADERS') 가 문자열 'true' 를 돌려주는지.
 * 실패면 원인 (나) — ConfigModule 이 validateEnv 결과를 저장하는 방식이 값을 바꾼다.
 */
import 'reflect-metadata';
import { Test } from '@nestjs/testing';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { validateEnv } from '../src/config/env.validation.js';

describe('T2: ConfigModule 저장 경로 — ASSISTANT_DEBUG_HEADERS', () => {
  const prevValue = process.env.ASSISTANT_DEBUG_HEADERS;
  const prevDb = process.env.DATABASE_URL;

  beforeAll(() => {
    process.env.ASSISTANT_DEBUG_HEADERS = 'true';
    // validateEnv 는 DATABASE_URL 필수. 이 진단은 값 자체를 검사하지 않으므로 형식만 맞춘다.
    if (!process.env.DATABASE_URL) {
      process.env.DATABASE_URL = 'postgresql://u:p@localhost:5432/db';
    }
  });

  afterAll(() => {
    if (prevValue === undefined) delete process.env.ASSISTANT_DEBUG_HEADERS;
    else process.env.ASSISTANT_DEBUG_HEADERS = prevValue;
    if (prevDb === undefined) delete process.env.DATABASE_URL;
    else process.env.DATABASE_URL = prevDb;
  });

  it("실 ConfigModule 부팅 시 ConfigService.get() 이 문자열 'true' 를 돌려준다", async () => {
    const mod = await Test.createTestingModule({
      imports: [
        // app.module.ts:36~40 인자 그대로 복사 + ignoreEnvFile: true 만 추가
        ConfigModule.forRoot({
          isGlobal: true,
          validate: validateEnv,
          envFilePath: ['.env.local', '.env'],
          ignoreEnvFile: true,
        }),
      ],
    }).compile();

    const config = mod.get(ConfigService);
    const value = config.get<string>('ASSISTANT_DEBUG_HEADERS');
    // 결함 지점: boolean 캐스팅되거나 default 'false' 로 덮이면 여기서 실패
    expect(typeof value).toBe('string');
    expect(value).toBe('true');

    await mod.close();
  });
});
