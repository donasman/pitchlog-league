/**
 * LiveService.list 단위 스펙 — Prisma 를 목킹해 findMany 인자만 검증한다.
 *
 * fix/l4-live-window-bounds 배경:
 *   이전 판은 `finishedAt` 컬럼 참조로 런타임 PrismaClientValidationError 를 냈다
 *   (Match 모델에 없는 컬럼 · schema.prisma 437-508). 이 스펙은 다음을 강제한다:
 *     1) where 인자 어디에도 finishedAt 키가 없다
 *     2) LIVE_STATUSES 창은 now − 6h, TERMINAL_STATUSES 창은 now − 5h 를 kickoff_at 로 근사
 *     3) 정렬은 kickoffAt asc → apiFixtureId asc
 *     4) 빈 결과에서도 asOf 는 now.toISOString() 과 정확히 일치
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { LiveService } from './live.service.js';
import {
  LIVE_LOOKBACK_MS,
  RECENTLY_FINISHED_LOOKBACK_MS,
  LIVE_STATUSES,
  TERMINAL_STATUSES,
} from '../ingestion/l4/status-rank.js';
import type { PrismaService } from '../prisma/prisma.service.js';

describe('LiveService.list', () => {
  const findMany = vi.fn();
  const prisma = { match: { findMany } } as unknown as PrismaService;
  const svc = new LiveService(prisma);
  const now = new Date('2026-09-27T12:00:00Z');

  beforeEach(() => {
    findMany.mockReset();
    findMany.mockResolvedValue([]);
  });

  it('(1) where.AND 첫 요소는 competitionSeason.competition.isTracked === true', async () => {
    await svc.list(now);
    const arg = findMany.mock.calls[0]![0] as { where: { AND: unknown[] } };
    expect(arg.where.AND[0]).toEqual({
      competitionSeason: { competition: { isTracked: true } },
    });
  });

  it('(2) where.AND[1].OR 는 두 원소이고 각각 statusShort in + kickoffAt gte · finishedAt 키가 어디에도 없다', async () => {
    await svc.list(now);
    const arg = findMany.mock.calls[0]![0] as {
      where: { AND: Array<{ OR?: Array<Record<string, unknown>> }> };
    };
    const or = arg.where.AND[1]!.OR;
    expect(Array.isArray(or)).toBe(true);
    expect(or).toHaveLength(2);

    // 두 원소 모두 statusShort · kickoffAt 두 키만 가져야 한다 (AND · finishedAt 없음)
    for (const clause of or!) {
      const keys = Object.keys(clause);
      expect(keys.sort()).toEqual(['kickoffAt', 'statusShort']);
      expect(clause).not.toHaveProperty('finishedAt');
      expect(clause).not.toHaveProperty('AND');
    }

    // 인자 전체를 문자열로 직렬화해도 finishedAt 이 없어야 한다
    expect(JSON.stringify(arg)).not.toContain('finishedAt');
  });

  it('(3) LIVE 케이스 kickoffAt.gte = now − 6h · TERMINAL 케이스 kickoffAt.gte = now − 5h', async () => {
    await svc.list(now);
    const arg = findMany.mock.calls[0]![0] as {
      where: {
        AND: Array<{
          OR?: Array<{ statusShort: { in: string[] }; kickoffAt: { gte: Date } }>;
        }>;
      };
    };
    const or = arg.where.AND[1]!.OR!;

    const liveClause = or.find((c) => c.statusShort.in[0] === LIVE_STATUSES[0]);
    const terminalClause = or.find((c) => c.statusShort.in[0] === TERMINAL_STATUSES[0]);
    expect(liveClause, 'LIVE 절이 있어야 한다').toBeDefined();
    expect(terminalClause, 'TERMINAL 절이 있어야 한다').toBeDefined();

    // 리터럴 값도 status-rank.ts 와 동일해야 한다
    expect(liveClause!.statusShort.in).toEqual([...LIVE_STATUSES]);
    expect(terminalClause!.statusShort.in).toEqual([...TERMINAL_STATUSES]);

    expect(liveClause!.kickoffAt.gte.getTime()).toBe(now.getTime() - LIVE_LOOKBACK_MS);
    expect(terminalClause!.kickoffAt.gte.getTime()).toBe(
      now.getTime() - RECENTLY_FINISHED_LOOKBACK_MS,
    );

    // 값 자체가 스킬 지시 값과 정확히 일치하는지도 확인 (6h · 5h)
    expect(now.getTime() - liveClause!.kickoffAt.gte.getTime()).toBe(6 * 60 * 60 * 1000);
    expect(now.getTime() - terminalClause!.kickoffAt.gte.getTime()).toBe(5 * 60 * 60 * 1000);
  });

  it('(4) orderBy 는 [{kickoffAt:asc}, {apiFixtureId:asc}]', async () => {
    await svc.list(now);
    const arg = findMany.mock.calls[0]![0] as { orderBy: unknown };
    expect(arg.orderBy).toEqual([
      { kickoffAt: 'asc' },
      { apiFixtureId: 'asc' },
    ]);
  });

  it('(5) 빈 결과 → { matches: [], asOf: now.toISOString() }', async () => {
    findMany.mockResolvedValueOnce([]);
    const res = await svc.list(now);
    expect(res).toEqual({
      asOf: now.toISOString(),
      matches: [],
    });
  });
});
