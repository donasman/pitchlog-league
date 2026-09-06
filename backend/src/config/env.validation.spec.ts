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
});
