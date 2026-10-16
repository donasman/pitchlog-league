import { describe, expect, it, vi } from 'vitest';
import { NameLookup } from './name-lookup.js';
import type { PrismaService } from '../prisma/prisma.service.js';

/** loadFor 는 undefined/null id 를 조용히 필터해야 한다 (search raw SQL 결과가 예기치 않게 undefined 를 낼 때 방어). */
describe('NameLookup.loadFor', () => {
  it("locale='en' 은 findMany 를 부르지 않는다 (no-op)", async () => {
    const findMany = vi.fn().mockResolvedValue([]);
    const prisma = { localizedName: { findMany } } as unknown as PrismaService;
    const lu = new NameLookup(prisma, 'en');
    await lu.loadFor({ teams: [1, 2, 3] });
    expect(findMany).not.toHaveBeenCalled();
  });

  it('undefined/null · 중복 · NaN 을 필터해서 IN 배열에 넣는다', async () => {
    const findMany = vi.fn().mockResolvedValue([]);
    const prisma = { localizedName: { findMany } } as unknown as PrismaService;
    const lu = new NameLookup(prisma, 'ko');
    await lu.loadFor({ teams: [1, undefined, 2, null, 1, Number.NaN] });
    expect(findMany).toHaveBeenCalledTimes(1);
    const args = findMany.mock.calls[0][0];
    expect(args.where.entityId.in).toEqual([1, 2]);
  });

  it('빈 배열은 쿼리 자체를 부르지 않는다', async () => {
    const findMany = vi.fn().mockResolvedValue([]);
    const prisma = { localizedName: { findMany } } as unknown as PrismaService;
    const lu = new NameLookup(prisma, 'ko');
    await lu.loadFor({ teams: [undefined, null] });
    expect(findMany).not.toHaveBeenCalled();
  });

  it('로드 후 team(id) 로 override 조회', async () => {
    const findMany = vi.fn().mockResolvedValue([
      { entityId: 50, name: '맨체스터 시티', shortName: '맨시티' },
    ]);
    const prisma = { localizedName: { findMany } } as unknown as PrismaService;
    const lu = new NameLookup(prisma, 'ko');
    await lu.loadFor({ teams: [50] });
    expect(lu.team(50)).toEqual({ name: '맨체스터 시티', shortName: '맨시티' });
    expect(lu.team(999)).toBeUndefined();
  });
});
