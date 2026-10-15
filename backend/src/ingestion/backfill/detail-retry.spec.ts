import {
  DETAIL_MAX_ATTEMPTS,
  DETAIL_RETRY_BACKOFF_MS,
  detailRetryWhere,
  detailTargetWhere,
  isDetailGiveUp,
} from './detail-retry.js';

const now = new Date('2026-10-15T12:00:00.000Z');

const retryOr = [
  { detailAttempts: 0 },
  { detailAttempts: 1, detailLastAttemptAt: { lt: new Date('2026-10-15T11:00:00.000Z') } },
  { detailAttempts: 2, detailLastAttemptAt: { lt: new Date('2026-10-15T06:00:00.000Z') } },
];

describe('detail-retry 상수', () => {
  it('상한 3회 · 백오프 1h·6h — 백오프 칸 수는 상한 − 1', () => {
    expect(DETAIL_MAX_ATTEMPTS).toBe(3);
    expect(DETAIL_RETRY_BACKOFF_MS).toEqual([3_600_000, 21_600_000]);
    expect(DETAIL_MAX_ATTEMPTS).toBe(DETAIL_RETRY_BACKOFF_MS.length + 1);
  });
});

describe('detailRetryWhere', () => {
  it('0회는 즉시 · 1회는 1h 전 · 2회는 6h 전보다 이른 시도만', () => {
    expect(detailRetryWhere(now)).toEqual({ OR: retryOr });
  });
});

describe('detailTargetWhere', () => {
  it('대상 조건 — 종료 상태 · 킥오프 24h 전 · 재시도 창', () => {
    expect(detailTargetWhere(42, now)).toEqual({
      competitionSeasonId: 42,
      detailEligible: true,
      detailCheckedAt: null,
      statusShort: { in: ['FT', 'AET', 'PEN'] },
      kickoffAt: { lt: new Date('2026-10-14T12:00:00.000Z') },
      OR: retryOr,
    });
  });

  it('id 조건이 없다 — 커서(id > cursor) 회귀 방지', () => {
    const w = detailTargetWhere(42, now);
    expect('id' in w).toBe(false);
  });
});

describe('isDetailGiveUp', () => {
  it.each([
    [false, 3, true],
    [false, 2, false],
    [true, 3, false],
    [false, 4, true],
  ])('promoted=%s · attemptsAfter=%s → %s', (promoted, attemptsAfter, expected) => {
    expect(isDetailGiveUp(promoted, attemptsAfter)).toBe(expected);
  });
});
