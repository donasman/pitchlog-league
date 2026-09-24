import { describe, it, expect, beforeEach, vi } from 'vitest';
import { LiveObserverService } from './live-observer.service.js';
import type { LiveDbRow, MemoryFilter, ProbeEntry, LastSeen } from './live-window.js';
import type { ApiFootballClient } from '../api-football/api-football.client.js';
import type { PrismaService } from '../../prisma/prisma.service.js';

function emptyMemory(): MemoryFilter {
  return { finishedAt: new Map(), excluded: new Set() };
}

function dbRow(id: number, kickoffAt: Date, overrides: Partial<LiveDbRow> = {}): LiveDbRow {
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

function fixtureItem(
  id: number,
  short: string,
  elapsed: number | null,
  extra: number | null,
  gh: number | null,
  ga: number | null,
  homeName = 'Home',
  awayName = 'Away',
  extra_fields: Record<string, unknown> = {},
): unknown {
  return {
    fixture: {
      id,
      date: '2026-09-24T12:00:00+00:00',
      status: { short, elapsed, extra },
    },
    teams: {
      home: { id: id * 10, name: homeName, winner: null },
      away: { id: id * 10 + 1, name: awayName, winner: null },
    },
    goals: { home: gh, away: ga },
    ...extra_fields,
  };
}

function envelope(response: unknown[]): { get: string; parameters: Record<string, string>; errors: []; results: number; paging: { current: number; total: number }; response: unknown[] } {
  return {
    get: '/fixtures',
    parameters: {},
    errors: [],
    results: response.length,
    paging: { current: 1, total: 1 },
    response,
  };
}

describe('LiveObserverService', () => {
  let client: { get: ReturnType<typeof vi.fn> };
  let prisma: {
    match: {
      findMany: ReturnType<typeof vi.fn>;
      update: ReturnType<typeof vi.fn>;
      upsert: ReturnType<typeof vi.fn>;
      create: ReturnType<typeof vi.fn>;
    };
    $executeRaw: ReturnType<typeof vi.fn>;
    $executeRawUnsafe: ReturnType<typeof vi.fn>;
    $queryRaw: ReturnType<typeof vi.fn>;
  };
  let service: LiveObserverService;

  beforeEach(() => {
    client = { get: vi.fn() };
    prisma = {
      match: {
        findMany: vi.fn().mockResolvedValue([]),
        update: vi.fn(),
        upsert: vi.fn(),
        create: vi.fn(),
      },
      $executeRaw: vi.fn(),
      $executeRawUnsafe: vi.fn(),
      $queryRaw: vi.fn(),
    };
    service = new LiveObserverService(
      client as unknown as ApiFootballClient,
      prisma as unknown as PrismaService,
    );
  });

  it('(1) 대상 0 — client.get 0회 · findMany 1회 · chunks 0 · used null', async () => {
    // findMany 는 default []. probes 빈 map.
    const now = new Date('2026-09-24T12:00:00Z');
    const probes = new Map<number, ProbeEntry>();
    const lastSeen = new Map<number, LastSeen>();
    const memory = emptyMemory();

    const result = await service.tick(now, memory, probes, lastSeen, { fetchStatus: true });

    expect(prisma.match.findMany).toHaveBeenCalledTimes(1);
    expect(client.get).not.toHaveBeenCalled();
    expect(result.targets).toBe(0);
    expect(result.chunks).toBe(0);
    expect(result.used).toBeNull();
    expect(result.wouldWrite).toBe(0);
  });

  it('(2) Prisma 쓰기 스파이 호출 0 — update/upsert/create/$executeRaw* 모두 0', async () => {
    const now = new Date('2026-09-24T12:00:00Z');
    const inWindow = new Date(now.getTime() - 60_000);
    prisma.match.findMany.mockResolvedValueOnce([dbRow(1, inWindow, { statusShort: '1H' })]);
    client.get.mockImplementation(async (path: string) => {
      if (path === '/status') {
        return { response: { requests: { current: 100, limit_day: 7500 } } };
      }
      return envelope([fixtureItem(1, '1H', 30, null, 0, 0)]);
    });

    const memory = emptyMemory();
    const probes = new Map<number, ProbeEntry>();
    const lastSeen = new Map<number, LastSeen>();

    await service.tick(now, memory, probes, lastSeen, { fetchStatus: true });

    expect(prisma.match.update).not.toHaveBeenCalled();
    expect(prisma.match.upsert).not.toHaveBeenCalled();
    expect(prisma.match.create).not.toHaveBeenCalled();
    expect(prisma.$executeRaw).not.toHaveBeenCalled();
    expect(prisma.$executeRawUnsafe).not.toHaveBeenCalled();
  });

  it('(3) 첫 관측 wouldWrite = DB 와 비교 · 두 번째 같은 응답 tick → wouldWrite=0', async () => {
    const now = new Date('2026-09-24T12:00:00Z');
    const inWindow = new Date(now.getTime() - 60_000);

    // DB 는 NS · elapsed=null · goalsHome=null · goalsAway=null.
    // 응답: 1H · elapsed=30 · goals 1-0 → 5 컬럼 중 4 개 다름 → 행 단위 wouldWrite=1
    prisma.match.findMany.mockResolvedValue([dbRow(1, inWindow, { statusShort: 'NS' })]);
    client.get.mockImplementation(async (path: string) => {
      if (path === '/status') return { response: { requests: { current: 100, limit_day: 7500 } } };
      return envelope([fixtureItem(1, '1H', 30, null, 1, 0)]);
    });

    const memory = emptyMemory();
    const probes = new Map<number, ProbeEntry>();
    const lastSeen = new Map<number, LastSeen>();

    const r1 = await service.tick(now, memory, probes, lastSeen, { fetchStatus: false });
    expect(r1.wouldWrite).toBe(1);

    // 두 번째 tick — 같은 응답 · lastSeen 이 채워졌으므로 diff 0 → wouldWrite=0
    const r2 = await service.tick(now, memory, probes, lastSeen, { fetchStatus: false });
    expect(r2.wouldWrite).toBe(0);
  });

  it('(4) probe 매치는 wouldWrite=0 (첫 관측도) · lastSeen 갱신은 됨', async () => {
    const now = new Date('2026-09-24T12:00:00Z');
    const inWindow = new Date(now.getTime() - 60_000);

    // DB 대상 없음 · probe 만
    prisma.match.findMany.mockResolvedValue([]);
    client.get.mockImplementation(async () => envelope([fixtureItem(999, '1H', 30, null, 1, 0)]));

    const memory = emptyMemory();
    const probes = new Map<number, ProbeEntry>();
    probes.set(999, {
      apiFixtureId: 999,
      kickoffAt: inWindow,
      statusShort: 'NS',
      home: 'H',
      away: 'A',
      homeGoals: null,
      awayGoals: null,
      seenAt: inWindow,
    });
    const lastSeen = new Map<number, LastSeen>();

    const result = await service.tick(now, memory, probes, lastSeen, { fetchStatus: false });
    expect(result.wouldWrite).toBe(0);
    expect(result.isProbe).toBe(true);
    expect(lastSeen.get(999)).toEqual({
      statusShort: '1H',
      elapsed: 30,
      extraElapsed: null,
      goalsHome: 1,
      goalsAway: 0,
    });
  });

  it('(5) probe 병합 — dbTargets=2 + probeTargets=1 → chunks=1 · targets=3 · isProbe=true', async () => {
    const now = new Date('2026-09-24T12:00:00Z');
    const inWindow = new Date(now.getTime() - 60_000);

    prisma.match.findMany.mockResolvedValue([
      dbRow(1, inWindow, { statusShort: 'NS' }),
      dbRow(2, inWindow, { statusShort: 'NS' }),
    ]);
    client.get.mockImplementation(async () =>
      envelope([
        fixtureItem(1, 'NS', null, null, null, null),
        fixtureItem(2, 'NS', null, null, null, null),
        fixtureItem(999, 'NS', null, null, null, null),
      ]),
    );

    const memory = emptyMemory();
    const probes = new Map<number, ProbeEntry>();
    probes.set(999, {
      apiFixtureId: 999,
      kickoffAt: inWindow,
      statusShort: 'NS',
      home: 'H',
      away: 'A',
      homeGoals: null,
      awayGoals: null,
      seenAt: inWindow,
    });
    const lastSeen = new Map<number, LastSeen>();

    const result = await service.tick(now, memory, probes, lastSeen, { fetchStatus: false });
    expect(result.targets).toBe(3);
    expect(result.chunks).toBe(1);
    expect(result.isProbe).toBe(true);
  });

  it('(6) 25 대상 → chunks=2 · /fixtures 두 번 호출', async () => {
    const now = new Date('2026-09-24T12:00:00Z');
    const inWindow = new Date(now.getTime() - 60_000);

    const rows: LiveDbRow[] = Array.from({ length: 25 }, (_, i) =>
      dbRow(i + 1, inWindow, { statusShort: 'NS' }),
    );
    prisma.match.findMany.mockResolvedValue(rows);

    // 두 번의 청크 호출 각각 응답
    const chunkAResponse = envelope(
      Array.from({ length: 20 }, (_, i) => fixtureItem(i + 1, 'NS', null, null, null, null)),
    );
    const chunkBResponse = envelope(
      Array.from({ length: 5 }, (_, i) => fixtureItem(21 + i, 'NS', null, null, null, null)),
    );

    let call = 0;
    client.get.mockImplementation(async (path: string) => {
      if (path === '/fixtures') {
        call += 1;
        return call === 1 ? chunkAResponse : chunkBResponse;
      }
      return { response: { requests: { current: 0, limit_day: 7500 } } };
    });

    const memory = emptyMemory();
    const probes = new Map<number, ProbeEntry>();
    const lastSeen = new Map<number, LastSeen>();

    const result = await service.tick(now, memory, probes, lastSeen, { fetchStatus: false });
    expect(result.targets).toBe(25);
    expect(result.chunks).toBe(2);
    const fixtureCalls = client.get.mock.calls.filter((c: unknown[]) => c[0] === '/fixtures');
    expect(fixtureCalls).toHaveLength(2);
  });

  it('(7) /status 호출: opts.fetchStatus=false → client.get(/status) 0회 · used=null', async () => {
    const now = new Date('2026-09-24T12:00:00Z');
    const inWindow = new Date(now.getTime() - 60_000);
    prisma.match.findMany.mockResolvedValue([dbRow(1, inWindow, { statusShort: 'NS' })]);
    client.get.mockImplementation(async () => envelope([fixtureItem(1, 'NS', null, null, null, null)]));

    const memory = emptyMemory();
    const probes = new Map<number, ProbeEntry>();
    const lastSeen = new Map<number, LastSeen>();

    const result = await service.tick(now, memory, probes, lastSeen, { fetchStatus: false });
    const statusCalls = client.get.mock.calls.filter((c: unknown[]) => c[0] === '/status');
    expect(statusCalls).toHaveLength(0);
    expect(result.used).toBeNull();
  });

  it('(8) 전이 · detail — status 변경 → transitions · 첫 관측 FT → details · Array.isArray 아님 필드는 -1', async () => {
    const now = new Date('2026-09-24T12:00:00Z');
    const inWindow = new Date(now.getTime() - 60_000);
    // 두 매치: 1 은 이미 lastSeen 에 있고 status 가 바뀜 · 2 는 첫 관측 FT
    prisma.match.findMany.mockResolvedValue([
      dbRow(1, inWindow, { statusShort: '1H' }),
      dbRow(2, inWindow, { statusShort: 'NS' }),
    ]);

    client.get.mockImplementation(async () =>
      envelope([
        // 매치 1 전이: 1H → HT (events 등이 없음 → -1)
        fixtureItem(1, 'HT', 45, null, 0, 0),
        // 매치 2 첫 관측 FT · events 3건 · lineups 2개 · statistics 배열 · players 없음
        fixtureItem(2, 'FT', 90, null, 1, 1, 'H2', 'A2', {
          events: [{}, {}, {}],
          lineups: [{}, {}],
          statistics: [{}, {}],
        }),
      ]),
    );

    const memory = emptyMemory();
    const probes = new Map<number, ProbeEntry>();
    const lastSeen = new Map<number, LastSeen>();
    // 매치 1 의 이전 관측 상태
    lastSeen.set(1, { statusShort: '1H', elapsed: 40, extraElapsed: null, goalsHome: 0, goalsAway: 0 });

    const result = await service.tick(now, memory, probes, lastSeen, { fetchStatus: false });

    // 매치 1 은 status 전이 → transitions 포함
    const t1 = result.transitions.find((t) => t.apiFixtureId === 1);
    expect(t1).toBeDefined();
    expect(t1?.kind).toBe('status');

    // 매치 2 는 첫 관측 FT → details 포함
    const d2 = result.details.find((d) => d.apiFixtureId === 2);
    expect(d2).toBeDefined();
    expect(d2?.events).toBe(3);
    expect(d2?.lineups).toBe(2);
    expect(d2?.statistics).toBe(2);
    expect(d2?.players).toBe(-1); // 응답에 없음 → -1

    // 매치 1 detail 도 있어야 함 (전이 발생)
    const d1 = result.details.find((d) => d.apiFixtureId === 1);
    expect(d1).toBeDefined();
    expect(d1?.events).toBe(-1);
    expect(d1?.lineups).toBe(-1);
    expect(d1?.statistics).toBe(-1);
    expect(d1?.players).toBe(-1);
  });

  it('(9) AET 관측 → memory.finishedAt 등록 · 10분+1초 뒤 selectDbTargets 에서 제외', async () => {
    const t1 = new Date('2026-09-24T12:00:00Z');
    const inWindow = new Date(t1.getTime() - 60_000);

    prisma.match.findMany.mockResolvedValue([dbRow(111, inWindow, { statusShort: '1H' })]);
    client.get.mockImplementation(async () =>
      envelope([fixtureItem(111, 'AET', 120, null, 2, 1)]),
    );

    const memory = emptyMemory();
    const probes = new Map<number, ProbeEntry>();
    const lastSeen = new Map<number, LastSeen>();

    await service.tick(t1, memory, probes, lastSeen, { fetchStatus: false });

    // AET 는 FINAL_TERMINAL_STATUSES · memory.finishedAt 에 등록
    expect(memory.finishedAt.get(111)).toEqual(t1);

    // 10분+1초 뒤 · DB 는 여전히 관측 모드라 status 갱신 안 했다고 가정 (같은 row 반환)
    const t2 = new Date(t1.getTime() + 10 * 60 * 1000 + 1000);
    prisma.match.findMany.mockResolvedValue([dbRow(111, inWindow, { statusShort: '1H' })]);
    client.get.mockClear();

    const r = await service.tick(t2, memory, probes, lastSeen, { fetchStatus: false });

    // finishedAt+10min TTL 초과 → 제외 · targets=0 · /fixtures 미호출
    expect(r.targets).toBe(0);
    expect(r.chunks).toBe(0);
    expect(client.get).not.toHaveBeenCalled();
  });
});
