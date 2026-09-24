import { describe, it, expect } from 'vitest';
import {
  selectDbTargets,
  selectProbeTargets,
  chunkIds,
  decidePeriod,
  classifyTransition,
  FT_TTL_MS,
  WINDOW_LOOKBACK_MS,
  WINDOW_LOOKAHEAD_MS,
} from './live-window.js';
import type { LiveDbRow, MemoryFilter, ProbeEntry, LivePollerConfig } from './live-window.js';

function emptyMemory(): MemoryFilter {
  return { finishedAt: new Map(), excluded: new Set() };
}

function row(id: number, kickoffAt: Date, overrides: Partial<LiveDbRow> = {}): LiveDbRow {
  return {
    apiFixtureId: id,
    kickoffAt,
    statusShort: 'NS',
    elapsed: null,
    extraElapsed: null,
    goalsHome: null,
    goalsAway: null,
    ...overrides,
  };
}

function probe(id: number, kickoffAt: Date): ProbeEntry {
  return {
    apiFixtureId: id,
    kickoffAt,
    statusShort: 'NS',
    home: 'H',
    away: 'A',
    homeGoals: null,
    awayGoals: null,
    seenAt: kickoffAt,
  };
}

describe('selectDbTargets', () => {
  const now = new Date('2026-09-24T12:00:00Z');

  it('kickoff 창 안: now-1h 통과 · now-4h 정확히 유지 · now-4h-1s 제외', () => {
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
    const exactlyFourHoursAgo = new Date(now.getTime() - WINDOW_LOOKBACK_MS);
    const overFourHours = new Date(now.getTime() - WINDOW_LOOKBACK_MS - 1000);

    const rows: LiveDbRow[] = [
      row(1, oneHourAgo),
      row(2, exactlyFourHoursAgo),
      row(3, overFourHours),
    ];

    const ids = selectDbTargets(rows, emptyMemory(), now);
    expect(ids).toContain(1);
    expect(ids).toContain(2);
    expect(ids).not.toContain(3);
  });

  it('kickoff 창 안: now+5m 정확히 유지 · now+6m 제외', () => {
    const exactlyFive = new Date(now.getTime() + WINDOW_LOOKAHEAD_MS);
    const overFive = new Date(now.getTime() + WINDOW_LOOKAHEAD_MS + 60_000);

    const rows: LiveDbRow[] = [row(10, exactlyFive), row(11, overFive)];
    const ids = selectDbTargets(rows, emptyMemory(), now);
    expect(ids).toContain(10);
    expect(ids).not.toContain(11);
  });

  it('excluded set 히트 제외', () => {
    const inWindow = new Date(now.getTime() - 60_000);
    const mem = emptyMemory();
    mem.excluded.add(42);

    const rows: LiveDbRow[] = [row(41, inWindow), row(42, inWindow)];
    const ids = selectDbTargets(rows, mem, now);
    expect(ids).toContain(41);
    expect(ids).not.toContain(42);
  });

  it('finishedAt 10분 이내면 유지 · 10분 초과면 제외', () => {
    const inWindow = new Date(now.getTime() - 60_000);
    const mem = emptyMemory();
    // 5분 전 FT: 유지
    mem.finishedAt.set(100, new Date(now.getTime() - 5 * 60 * 1000));
    // 11분 전 FT: 제외
    mem.finishedAt.set(101, new Date(now.getTime() - FT_TTL_MS - 60 * 1000));

    const rows: LiveDbRow[] = [row(100, inWindow), row(101, inWindow)];
    const ids = selectDbTargets(rows, mem, now);
    expect(ids).toContain(100);
    expect(ids).not.toContain(101);
  });
});

describe('selectProbeTargets', () => {
  it('kickoff 창 밖 probe 제외 · excluded 제외 · 3건 중 1건 통과', () => {
    const now = new Date('2026-09-24T12:00:00Z');
    const inWindow = new Date(now.getTime() - 10 * 60 * 1000);
    const outWindow = new Date(now.getTime() + 60 * 60 * 1000); // now+1h → 제외

    const probes = new Map<number, ProbeEntry>();
    probes.set(1, probe(1, inWindow)); // 통과 후보
    probes.set(2, probe(2, inWindow)); // excluded 로 제외
    probes.set(3, probe(3, outWindow)); // 창 밖 제외

    const mem = emptyMemory();
    mem.excluded.add(2);

    const ids = selectProbeTargets(probes, mem, now);
    expect(ids).toEqual([1]);
  });
});

describe('chunkIds', () => {
  it('빈 입력 → []', () => {
    expect(chunkIds([])).toEqual([]);
  });

  it('20 이하 → 하나의 하이픈-join 문자열', () => {
    const ids = Array.from({ length: 15 }, (_, i) => i + 1);
    const chunks = chunkIds(ids, 20);
    expect(chunks).toHaveLength(1);
    expect(chunks[0]).toBe(ids.join('-'));
  });

  it('21 → 두 청크 (20+1) · 마지막 청크는 "21"', () => {
    const ids = Array.from({ length: 21 }, (_, i) => i + 1);
    const chunks = chunkIds(ids, 20);
    expect(chunks).toHaveLength(2);
    expect(chunks[0]).toBe(ids.slice(0, 20).join('-'));
    expect(chunks[1]).toBe('21');
  });
});

describe('decidePeriod', () => {
  const cfg: LivePollerConfig = {
    slowAt: 1000,
    stopAt: 2000,
    periodSec: 60,
    slowPeriodSec: 300,
  };

  it('usedToday=null → 정상 · stopped=false', () => {
    const r = decidePeriod(null, cfg);
    expect(r).toEqual({ periodSec: 60, stopped: false, reason: null });
  });

  it('used < slowAt → 정상 주기', () => {
    const r = decidePeriod(500, cfg);
    expect(r).toEqual({ periodSec: 60, stopped: false, reason: null });
  });

  it('slowAt <= used < stopAt → slowPeriodSec', () => {
    const r = decidePeriod(1500, cfg);
    expect(r).toEqual({ periodSec: 300, stopped: false, reason: null });
  });

  it('used >= stopAt → stopped=true reason=quota_stop', () => {
    const r = decidePeriod(2500, cfg);
    expect(r.stopped).toBe(true);
    expect(r.reason).toBe('quota_stop');
    expect(r.periodSec).toBe(60);
  });
});

describe('classifyTransition', () => {
  it('prev=null → none', () => {
    expect(
      classifyTransition(null, { statusShort: '1H', goalsHome: 0, goalsAway: 0 }),
    ).toBe('none');
  });

  it('status only', () => {
    expect(
      classifyTransition(
        { statusShort: 'NS', goalsHome: 0, goalsAway: 0 },
        { statusShort: '1H', goalsHome: 0, goalsAway: 0 },
      ),
    ).toBe('status');
  });

  it('score only', () => {
    expect(
      classifyTransition(
        { statusShort: '1H', goalsHome: 0, goalsAway: 0 },
        { statusShort: '1H', goalsHome: 1, goalsAway: 0 },
      ),
    ).toBe('score');
  });

  it('both · same', () => {
    expect(
      classifyTransition(
        { statusShort: '1H', goalsHome: 0, goalsAway: 0 },
        { statusShort: 'HT', goalsHome: 1, goalsAway: 0 },
      ),
    ).toBe('both');
    expect(
      classifyTransition(
        { statusShort: '1H', goalsHome: 0, goalsAway: 0 },
        { statusShort: '1H', goalsHome: 0, goalsAway: 0 },
      ),
    ).toBe('none');
  });
});
