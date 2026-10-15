/**
 * QuotaService — 기록 없는 current() · 기록 있는 snapshot() · 만료 임박 warn 하루 1회.
 *
 *   Q1. current() — INSERT 0회 · 반환 { used, limit, overWarn, expiresOn }
 *   Q2. snapshot() — INSERT 1회 (callsUsed·limitDay·plan·expiresOn) · 반환 키가 Q1 과 같다
 *   Q3. 만료 10일 남음 · 같은 UTC 날 current() 2회 + snapshot() 1회 → 만료 warn 정확히 1회
 *   Q4. Q3 이어서 다음 UTC 날로 넘어가 current() 1회 → 만료 warn 누적 2회
 *   Q5. 만료 30일 남음 · used 6000 → 만료 warn 0회 · overWarn true · 경고선 warn 1회
 *
 * /status 는 ApiFootballClient.get mock 이 ApiEnvelope<ApiStatus> 로 준다. 시간은 fake timer.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import type { Logger } from '@nestjs/common';
import type { PrismaService } from '../../prisma/prisma.service.js';
import type { ApiFootballClient } from './api-football.client.js';
import type { ApiEnvelope, ApiStatus } from './api-football.types.js';
import { QuotaService } from './quota.service.js';

const DAY_MS = 86_400_000;
/** 기준 시각 — UTC 정오. KST 로는 21시라 23:00Z 로 옮기면 로컬 날짜만 바뀐다 */
const NOW = new Date('2026-10-15T12:00:00.000Z');
const LIMIT_DAY = 7_500;

/** 실제 /status 봉투 형태 (api-football.types.ts ApiEnvelope · ApiStatus) */
function statusEnvelope(current: number, end: Date): ApiEnvelope<ApiStatus> {
  return {
    get: 'status',
    parameters: {},
    errors: [],
    results: 1,
    paging: { current: 1, total: 1 },
    response: {
      account: { firstname: 'Test', lastname: 'User', email: 'test@example.com' },
      subscription: { plan: 'Pro', end: end.toISOString(), active: true },
      requests: { current, limit_day: LIMIT_DAY },
    },
  };
}

/** 로그 출력은 막고 호출만 센다 — 선례 src/ingestion/l3/lineups.service.spec.ts */
function quietLogger(service: QuotaService) {
  const logger = (service as unknown as { logger: Logger }).logger;
  return {
    warn: vi.spyOn(logger, 'warn').mockImplementation(() => undefined),
    log: vi.spyOn(logger, 'log').mockImplementation(() => undefined),
    debug: vi.spyOn(logger, 'debug').mockImplementation(() => undefined),
  };
}

describe('QuotaService — current() · snapshot() · 만료 warn 하루 1회', () => {
  let api: { get: ReturnType<typeof vi.fn> };
  let prisma: { apiQuotaSnapshot: { create: ReturnType<typeof vi.fn> } };
  let service: QuotaService;
  let spies: ReturnType<typeof quietLogger>;

  const warnsWith = (text: string) => spies.warn.mock.calls.filter(([msg]) => String(msg).includes(text));
  const expiryWarns = () => warnsWith('구독 만료 임박');

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(NOW);
    api = { get: vi.fn() };
    prisma = { apiQuotaSnapshot: { create: vi.fn(async () => ({})) } };
    service = new QuotaService(api as unknown as ApiFootballClient, prisma as unknown as PrismaService);
    spies = quietLogger(service);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('Q1. current() 는 /status 1콜만 하고 INSERT 하지 않는다 · 반환 { used, limit, overWarn, expiresOn }', async () => {
    const end = new Date(NOW.getTime() + 60 * DAY_MS);
    api.get.mockResolvedValue(statusEnvelope(1_234, end));

    const res = await service.current();

    expect(api.get).toHaveBeenCalledTimes(1);
    expect(api.get).toHaveBeenCalledWith('/status');
    expect(prisma.apiQuotaSnapshot.create).not.toHaveBeenCalled();
    expect(res).toEqual({ used: 1_234, limit: LIMIT_DAY, overWarn: false, expiresOn: end });
    // 경고선 아래 · 만료 먼 날 — debug 1줄 · warn 없음
    expect(spies.debug).toHaveBeenCalledWith(`API 사용량 1234/${LIMIT_DAY}`);
    expect(spies.warn).not.toHaveBeenCalled();
  });

  it('Q2. snapshot() 은 INSERT 1회 (callsUsed·limitDay·plan·expiresOn) · 반환 키는 current() 와 같다', async () => {
    const end = new Date(NOW.getTime() + 60 * DAY_MS);
    api.get.mockResolvedValue(statusEnvelope(1_234, end));

    const res = await service.snapshot();

    expect(api.get).toHaveBeenCalledTimes(1);
    expect(prisma.apiQuotaSnapshot.create).toHaveBeenCalledTimes(1);
    expect(prisma.apiQuotaSnapshot.create).toHaveBeenCalledWith({
      data: { callsUsed: 1_234, limitDay: LIMIT_DAY, plan: 'Pro', expiresOn: end },
    });
    expect(Object.keys(res).sort()).toEqual(['expiresOn', 'limit', 'overWarn', 'used']);
    expect(res).toEqual({ used: 1_234, limit: LIMIT_DAY, overWarn: false, expiresOn: end });
  });

  /** Q3·Q4 공통 — 만료 10일 남음 · 같은 UTC 날(12:00Z → 23:00Z) 에 current 2회 + snapshot 1회 */
  const sameUtcDayThreeChecks = async () => {
    const end = new Date(NOW.getTime() + 10 * DAY_MS);
    api.get.mockResolvedValue(statusEnvelope(1_234, end));
    await service.current();
    vi.setSystemTime(new Date('2026-10-15T18:00:00.000Z'));
    await service.current();
    vi.setSystemTime(new Date('2026-10-15T23:00:00.000Z'));
    await service.snapshot();
  };

  it('Q3. 만료 10일 남음 · 같은 UTC 날 current() 2회 + snapshot() 1회 → 만료 warn 정확히 1회', async () => {
    await sameUtcDayThreeChecks();

    expect(api.get).toHaveBeenCalledTimes(3);
    expect(prisma.apiQuotaSnapshot.create).toHaveBeenCalledTimes(1);
    expect(expiryWarns()).toHaveLength(1);
    expect(String(expiryWarns()[0][0])).toBe('API-Football 구독 만료 임박: 2026-10-25');
  });

  it('Q4. Q3 이어서 다음 UTC 날로 넘어가 current() 1회 → 만료 warn 누적 2회', async () => {
    await sameUtcDayThreeChecks();
    expect(expiryWarns()).toHaveLength(1);

    vi.setSystemTime(new Date('2026-10-16T00:00:01.000Z'));
    await service.current();

    expect(expiryWarns()).toHaveLength(2);
  });

  it('Q5. 만료 30일 남음 · used 6000 → 만료 warn 0회 · overWarn true · 경고선 warn 1회', async () => {
    const end = new Date(NOW.getTime() + 30 * DAY_MS);
    api.get.mockResolvedValue(statusEnvelope(6_000, end));

    const res = await service.current();

    expect(res.overWarn).toBe(true);
    expect(expiryWarns()).toHaveLength(0);
    expect(warnsWith('경고선')).toHaveLength(1);
    expect(String(warnsWith('경고선')[0][0])).toBe(`API 사용량 6000/${LIMIT_DAY} — 경고선 6000 초과`);
    expect(prisma.apiQuotaSnapshot.create).not.toHaveBeenCalled();
  });
});
