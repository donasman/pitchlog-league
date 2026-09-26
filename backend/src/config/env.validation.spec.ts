import { validateEnv, NodeEnv, parseLivePollerProbeIds } from './env.validation.js';

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

  describe('스케줄러 env (4-b-1)', () => {
    it('SCHEDULER_ENABLED 기본값은 문자열 "false"', () => {
      const env = validateEnv({ ...base });
      expect(env.SCHEDULER_ENABLED).toBe('false');
      expect(env.BACKFILL_WORKER_ENABLED).toBe('false');
    });

    it("SCHEDULER_ENABLED='yes' 는 거부 (true/false 만)", () => {
      expect(() => validateEnv({ ...base, SCHEDULER_ENABLED: 'yes' })).toThrow(/SCHEDULER_ENABLED/);
    });

    it("BACKFILL_WORKER_ENABLED='yes' 는 거부", () => {
      expect(() => validateEnv({ ...base, BACKFILL_WORKER_ENABLED: 'yes' })).toThrow(/BACKFILL_WORKER_ENABLED/);
    });

    it('BACKFILL_WORKER_LIMIT 기본은 200 · 음수 거부', () => {
      expect(validateEnv({ ...base }).BACKFILL_WORKER_LIMIT).toBe(200);
      expect(() => validateEnv({ ...base, BACKFILL_WORKER_LIMIT: '-1' })).toThrow(/BACKFILL_WORKER_LIMIT/);
      expect(() => validateEnv({ ...base, BACKFILL_WORKER_LIMIT: '0' })).toThrow(/BACKFILL_WORKER_LIMIT/);
    });

    it('BACKFILL_WORKER_CRON 은 5 필드 · 잘못된 형식 거부', () => {
      expect(validateEnv({ ...base, BACKFILL_WORKER_CRON: '5 * * * *' }).BACKFILL_WORKER_CRON).toBe('5 * * * *');
      expect(() => validateEnv({ ...base, BACKFILL_WORKER_CRON: '5 * *' })).toThrow(/BACKFILL_WORKER_CRON/);
    });

    it('기본 BACKFILL_WORKER_CRON 은 "5 * * * *" (매시 5분)', () => {
      expect(validateEnv({ ...base }).BACKFILL_WORKER_CRON).toBe('5 * * * *');
    });
  });

  describe('BACKFILL_WORKER_SEASONS (fix/backfill-worker-seasons)', () => {
    it('기본값은 빈 문자열 (= 현재 시즌만 · 지금 동작 유지)', () => {
      expect(validateEnv({ ...base }).BACKFILL_WORKER_SEASONS).toBe('');
    });

    it('빈 문자열 명시도 허용', () => {
      expect(validateEnv({ ...base, BACKFILL_WORKER_SEASONS: '' }).BACKFILL_WORKER_SEASONS).toBe('');
    });

    it('허용된 시즌 목록 통과 (백필-2 예시)', () => {
      expect(validateEnv({ ...base, BACKFILL_WORKER_SEASONS: '2025,2024,2023,2022' }).BACKFILL_WORKER_SEASONS)
        .toBe('2025,2024,2023,2022');
    });

    it('SEASON_YEARS 밖의 값은 거부 (예: 2020)', () => {
      expect(() => validateEnv({ ...base, BACKFILL_WORKER_SEASONS: '2025,2020' })).toThrow(/BACKFILL_WORKER_SEASONS/);
    });

    it('중복 값은 거부', () => {
      expect(() => validateEnv({ ...base, BACKFILL_WORKER_SEASONS: '2025,2025' })).toThrow(/BACKFILL_WORKER_SEASONS/);
    });

    it('빈 항목은 거부 (연속 쉼표)', () => {
      expect(() => validateEnv({ ...base, BACKFILL_WORKER_SEASONS: '2025,,2024' })).toThrow(/BACKFILL_WORKER_SEASONS/);
    });

    it('숫자 아닌 항목은 거부', () => {
      expect(() => validateEnv({ ...base, BACKFILL_WORKER_SEASONS: 'abc' })).toThrow(/BACKFILL_WORKER_SEASONS/);
    });
  });

  describe('L2 매일 · L1 매주 잡 env (4-b-2)', () => {
    it('기본값 — 두 스위치 모두 false · cron 은 UTC 04:10 / 월 05:30', () => {
      const env = validateEnv({ ...base });
      expect(env.L2_DAILY_ENABLED).toBe('false');
      expect(env.L1_WEEKLY_ENABLED).toBe('false');
      expect(env.L2_DAILY_CRON).toBe('10 4 * * *');
      expect(env.L1_WEEKLY_CRON).toBe('30 5 * * 1');
    });

    it("L2_DAILY_ENABLED='yes' 는 거부", () => {
      expect(() => validateEnv({ ...base, L2_DAILY_ENABLED: 'yes' })).toThrow(/L2_DAILY_ENABLED/);
    });

    it("L1_WEEKLY_ENABLED='yes' 는 거부", () => {
      expect(() => validateEnv({ ...base, L1_WEEKLY_ENABLED: 'yes' })).toThrow(/L1_WEEKLY_ENABLED/);
    });

    it('L2_DAILY_CRON 5 필드 아니면 거부', () => {
      expect(validateEnv({ ...base, L2_DAILY_CRON: '0 5 * * *' }).L2_DAILY_CRON).toBe('0 5 * * *');
      expect(() => validateEnv({ ...base, L2_DAILY_CRON: '5 * *' })).toThrow(/L2_DAILY_CRON/);
    });

    it('L1_WEEKLY_CRON 5 필드 아니면 거부', () => {
      expect(validateEnv({ ...base, L1_WEEKLY_CRON: '0 6 * * 0' }).L1_WEEKLY_CRON).toBe('0 6 * * 0');
      expect(() => validateEnv({ ...base, L1_WEEKLY_CRON: '30 5 *' })).toThrow(/L1_WEEKLY_CRON/);
    });
  });

  describe('BACKFILL_DAILY_CAP (feat/backfill-daily-cap-env)', () => {
    it('기본값은 5700 (미설정 시 현행 동작 유지)', () => {
      expect(validateEnv({ ...base }).BACKFILL_DAILY_CAP).toBe(5700);
    });

    it('운영 예시 6800 통과', () => {
      expect(validateEnv({ ...base, BACKFILL_DAILY_CAP: '6800' }).BACKFILL_DAILY_CAP).toBe(6800);
    });

    it('0 은 거부 (Min 1)', () => {
      expect(() => validateEnv({ ...base, BACKFILL_DAILY_CAP: '0' })).toThrow(/BACKFILL_DAILY_CAP/);
    });

    it('7501 은 거부 (Max 7500 = 하드 한도)', () => {
      expect(() => validateEnv({ ...base, BACKFILL_DAILY_CAP: '7501' })).toThrow(/BACKFILL_DAILY_CAP/);
    });

    it('비정수 "abc" 는 거부', () => {
      expect(() => validateEnv({ ...base, BACKFILL_DAILY_CAP: 'abc' })).toThrow(/BACKFILL_DAILY_CAP/);
    });
  });

  describe('L4 라이브 폴러 env (LIVE_POLLER_*)', () => {
    it('기본값 — enabled=false · period=15 · slow=30 · slowAt=6000 · stopAt=7000 · probeIds=""', () => {
      const env = validateEnv({ ...base });
      expect(env.LIVE_POLLER_ENABLED).toBe('false');
      expect(env.LIVE_POLLER_PERIOD_SEC).toBe(15);
      expect(env.LIVE_POLLER_SLOW_PERIOD_SEC).toBe(30);
      expect(env.LIVE_POLLER_SLOW_AT).toBe(6000);
      expect(env.LIVE_POLLER_STOP_AT).toBe(7000);
      expect(env.LIVE_POLLER_PROBE_FIXTURE_IDS).toBe('');
    });

    it("LIVE_POLLER_ENABLED='yes' 는 거부", () => {
      expect(() => validateEnv({ ...base, LIVE_POLLER_ENABLED: 'yes' })).toThrow(/LIVE_POLLER_ENABLED/);
    });

    it('PERIOD_SEC < 5 거부 · SLOW_PERIOD_SEC > 600 거부', () => {
      expect(() => validateEnv({ ...base, LIVE_POLLER_PERIOD_SEC: '4' })).toThrow(/LIVE_POLLER_PERIOD_SEC/);
      expect(() => validateEnv({ ...base, LIVE_POLLER_SLOW_PERIOD_SEC: '601' })).toThrow(/LIVE_POLLER_SLOW_PERIOD_SEC/);
    });

    it('cross-field — SLOW_AT >= STOP_AT 거부', () => {
      // SLOW_AT == STOP_AT
      expect(() => validateEnv({ ...base, LIVE_POLLER_SLOW_AT: '7000', LIVE_POLLER_STOP_AT: '7000' }))
        .toThrow(/LIVE_POLLER_STOP_AT/);
      // SLOW_AT > STOP_AT
      expect(() => validateEnv({ ...base, LIVE_POLLER_SLOW_AT: '7100', LIVE_POLLER_STOP_AT: '7000' }))
        .toThrow(/LIVE_POLLER_STOP_AT/);
    });

    it('cross-field — PERIOD_SEC >= SLOW_PERIOD_SEC 거부', () => {
      // PERIOD_SEC == SLOW_PERIOD_SEC
      expect(() => validateEnv({ ...base, LIVE_POLLER_PERIOD_SEC: '30', LIVE_POLLER_SLOW_PERIOD_SEC: '30' }))
        .toThrow(/LIVE_POLLER_SLOW_PERIOD_SEC/);
      // PERIOD_SEC > SLOW_PERIOD_SEC
      expect(() => validateEnv({ ...base, LIVE_POLLER_PERIOD_SEC: '60', LIVE_POLLER_SLOW_PERIOD_SEC: '30' }))
        .toThrow(/LIVE_POLLER_SLOW_PERIOD_SEC/);
    });

    it('PROBE_FIXTURE_IDS — 실측 3개 통과 · 21개 거부 · 중복 거부 · 빈 항목 거부', () => {
      // 실측 3개 (KOR 9/28 URU · 10/2 VEN · 10/6 UZB)
      expect(validateEnv({ ...base, LIVE_POLLER_PROBE_FIXTURE_IDS: '1628999,1629003,1629005' })
        .LIVE_POLLER_PROBE_FIXTURE_IDS).toBe('1628999,1629003,1629005');
      // 21 개 거부
      const tooMany = Array.from({ length: 21 }, (_, i) => String(1000 + i)).join(',');
      expect(() => validateEnv({ ...base, LIVE_POLLER_PROBE_FIXTURE_IDS: tooMany }))
        .toThrow(/LIVE_POLLER_PROBE_FIXTURE_IDS/);
      // 중복
      expect(() => validateEnv({ ...base, LIVE_POLLER_PROBE_FIXTURE_IDS: '1628999,1628999' }))
        .toThrow(/LIVE_POLLER_PROBE_FIXTURE_IDS/);
      // 빈 항목 (연속 쉼표)
      expect(() => validateEnv({ ...base, LIVE_POLLER_PROBE_FIXTURE_IDS: '1628999,,1629003' }))
        .toThrow(/LIVE_POLLER_PROBE_FIXTURE_IDS/);
    });

    it('parseLivePollerProbeIds — 빈 문자열 → [] · 값 있으면 정수 배열', () => {
      expect(parseLivePollerProbeIds('')).toEqual([]);
      expect(parseLivePollerProbeIds('1628999,1629003,1629005')).toEqual([1628999, 1629003, 1629005]);
    });

    it("LIVE_POLLER_MODE 기본값은 'observe'", () => {
      expect(validateEnv({ ...base }).LIVE_POLLER_MODE).toBe('observe');
    });

    it("LIVE_POLLER_MODE='write' 통과", () => {
      expect(validateEnv({ ...base, LIVE_POLLER_MODE: 'write' }).LIVE_POLLER_MODE).toBe('write');
    });

    it("LIVE_POLLER_MODE 대문자·오타는 거부", () => {
      expect(() => validateEnv({ ...base, LIVE_POLLER_MODE: 'WRITE' })).toThrow(/LIVE_POLLER_MODE/);
      expect(() => validateEnv({ ...base, LIVE_POLLER_MODE: 'other' })).toThrow(/LIVE_POLLER_MODE/);
    });
  });
});
