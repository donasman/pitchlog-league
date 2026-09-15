import { validateEnv, NodeEnv } from './env.validation.js';

const base = { DATABASE_URL: 'postgresql://u:p@localhost:5432/db' };

describe('validateEnv', () => {
  it('필수값이 있으면 기본값을 채워 통과한다', () => {
    const env = validateEnv({ ...base });
    expect(env.NODE_ENV).toBe(NodeEnv.Development);
    expect(env.PORT).toBe(3000);
    expect(env.DATABASE_URL).toBe(base.DATABASE_URL);
  });

  it('DATABASE_URL 이 없으면 부팅을 막는다', () => {
    expect(() => validateEnv({})).toThrow(/DATABASE_URL/);
  });

  it('문자열 PORT 를 숫자로 바꾸고 범위를 검사한다', () => {
    expect(validateEnv({ ...base, PORT: '8080' }).PORT).toBe(8080);
    expect(() => validateEnv({ ...base, PORT: '70000' })).toThrow(/PORT/);
  });

  it('NODE_ENV 는 세 값만 허용한다', () => {
    expect(() => validateEnv({ ...base, NODE_ENV: 'staging' })).toThrow(/NODE_ENV/);
  });

  it('API_FOOTBALL_KEY 는 선택이지만 있으면 길이를 검사한다', () => {
    expect(validateEnv({ ...base }).API_FOOTBALL_KEY).toBeUndefined();
    expect(() => validateEnv({ ...base, API_FOOTBALL_KEY: 'short' })).toThrow(/API_FOOTBALL_KEY/);
  });

  // fix/debug-header-gate 05a T1 — 컨트롤러 게이트가 문자열 === 'true' 비교이므로
  // validateEnv 는 이 필드를 문자열로 유지해야 한다. enableImplicitConversion 이
  // 'true' 를 boolean 캐스팅하면 게이트가 조용히 꺼진다.
  describe('ASSISTANT_DEBUG_HEADERS 타입 유지 (M3 결함 재발 방지)', () => {
    it("입력 'true' 를 문자열 그대로 유지한다", () => {
      const env = validateEnv({ ...base, ASSISTANT_DEBUG_HEADERS: 'true' });
      expect(typeof env.ASSISTANT_DEBUG_HEADERS).toBe('string');
      expect(env.ASSISTANT_DEBUG_HEADERS).toBe('true');
    });
    it("기본값도 문자열 'false'", () => {
      const env = validateEnv({ ...base });
      expect(typeof env.ASSISTANT_DEBUG_HEADERS).toBe('string');
      expect(env.ASSISTANT_DEBUG_HEADERS).toBe('false');
    });
    it("오타 'flase' 는 부팅을 막는다 — @IsIn 방어", () => {
      // 실 결함 재발 방지: 2026-09-15 사용자 .env 에 flase 오타가 있었고
      // @IsString 만으로는 통과해 게이트가 조용히 꺼졌다.
      expect(() => validateEnv({ ...base, ASSISTANT_DEBUG_HEADERS: 'flase' }))
        .toThrow(/ASSISTANT_DEBUG_HEADERS/);
    });
  });
});
