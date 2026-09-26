import { describe, it, expect } from 'vitest';

import {
  isWriteAllowed,
  statusRank,
  LIVE_LOOKBACK_MS,
  RECENTLY_FINISHED_LOOKBACK_MS,
} from './status-rank.js';

describe('statusRank', () => {
  it('상태 코드별 순위를 반환한다 (SUSP/INT/LIVE 는 null)', () => {
    // NS · TBD = 0
    expect(statusRank('NS')).toBe(0);
    expect(statusRank('TBD')).toBe(0);

    // 하프 단계
    expect(statusRank('1H')).toBe(1);
    expect(statusRank('HT')).toBe(2);
    expect(statusRank('2H')).toBe(3);
    expect(statusRank('ET')).toBe(4);
    expect(statusRank('BT')).toBe(5);
    expect(statusRank('P')).toBe(6);

    // 종료
    expect(statusRank('FT')).toBe(7);
    expect(statusRank('AET')).toBe(7);
    expect(statusRank('PEN')).toBe(7);

    // 무산/조기종료
    expect(statusRank('PST')).toBe(8);
    expect(statusRank('CANC')).toBe(8);
    expect(statusRank('ABD')).toBe(8);
    expect(statusRank('AWD')).toBe(8);
    expect(statusRank('WO')).toBe(8);

    // 알 수 없는 rank
    expect(statusRank('SUSP')).toBeNull();
    expect(statusRank('INT')).toBeNull();
    expect(statusRank('LIVE')).toBeNull();
    expect(statusRank('XYZ')).toBeNull();
  });
});

describe('isWriteAllowed', () => {
  it('cur 이 null 이면 항상 허용', () => {
    expect(isWriteAllowed(null, { statusShort: 'NS', elapsed: null })).toBe(true);
    expect(isWriteAllowed(null, { statusShort: 'FT', elapsed: 90 })).toBe(true);
    expect(isWriteAllowed(null, { statusShort: 'SUSP', elapsed: 45 })).toBe(true);
  });

  it('1H → HT 는 허용 (rank 1 → 2)', () => {
    expect(
      isWriteAllowed(
        { statusShort: '1H', elapsed: 45 },
        { statusShort: 'HT', elapsed: 45 },
      ),
    ).toBe(true);
  });

  it('FT → 2H 는 차단 (rank 7 > rank 3)', () => {
    expect(
      isWriteAllowed(
        { statusShort: 'FT', elapsed: 90 },
        { statusShort: '2H', elapsed: 70 },
      ),
    ).toBe(false);
  });

  it('2H 70 → 2H 68 은 차단 (같은 rank · elapsed 감소)', () => {
    expect(
      isWriteAllowed(
        { statusShort: '2H', elapsed: 70 },
        { statusShort: '2H', elapsed: 68 },
      ),
    ).toBe(false);
  });

  it('2H 70 → 2H 70 은 허용 (같은 rank · 같은 elapsed — 스코어만 변경 가능)', () => {
    expect(
      isWriteAllowed(
        { statusShort: '2H', elapsed: 70 },
        { statusShort: '2H', elapsed: 70 },
      ),
    ).toBe(true);
  });

  it('2H → SUSP 허용 그리고 SUSP → 2H 도 허용 (SUSP 는 같은 rank 로 취급)', () => {
    // 2H → SUSP : nextRank null 이면 curRank(3) 를 그대로 취급 → 같은 rank
    expect(
      isWriteAllowed(
        { statusShort: '2H', elapsed: 70 },
        { statusShort: 'SUSP', elapsed: 70 },
      ),
    ).toBe(true);

    // SUSP → 2H : curRank null · nextRank 3 → compareCur 를 newRank 로 맞춰 같은 rank
    expect(
      isWriteAllowed(
        { statusShort: 'SUSP', elapsed: 70 },
        { statusShort: '2H', elapsed: 70 },
      ),
    ).toBe(true);
  });

  it('NS → PST 는 허용 (rank 0 → 8)', () => {
    expect(
      isWriteAllowed(
        { statusShort: 'NS', elapsed: null },
        { statusShort: 'PST', elapsed: null },
      ),
    ).toBe(true);
  });
});

describe('lookback 상수', () => {
  it('LIVE_LOOKBACK_MS 는 6h · RECENTLY_FINISHED_LOOKBACK_MS 는 5h', () => {
    expect(LIVE_LOOKBACK_MS).toBe(6 * 60 * 60 * 1000);
    expect(RECENTLY_FINISHED_LOOKBACK_MS).toBe(5 * 60 * 60 * 1000);
  });
});
