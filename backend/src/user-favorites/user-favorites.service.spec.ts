/**
 * UserFavoritesService 단위 스펙 — Prisma mock.
 *
 * 케이스:
 *   1. teamRefs.length === 11 → 400 favorites_limit_exceeded
 *   2. 다른 문자열이지만 같은 apiId 두 개 → 400 favorites_duplicate
 *   3. 없는 ref (parseRef 실패 또는 team miss) → 400 favorites_unknown_team + details 원문 ref
 *   4. 정상 3개 → 200 · items.length===3 · position 0/1/2
 *   5. GET · 즐겨찾기 없음 → items===[]
 *   6. GET · 즐겨찾기 3개 → position 순 정렬
 */
import { BadRequestException } from '@nestjs/common';
import { UserFavoritesService } from './user-favorites.service.js';

// Prisma mock 헬퍼. 각 케이스에서 필요한 메서드만 채워 넣는다.
interface UserFavRow {
  userId: string;
  teamId: number;
  position: number;
  team: {
    id: number;
    apiTeamId: number;
    name: string;
    shortName: string | null;
    code: string | null;
    country: string | null;
    founded: number | null;
    logoUrl: string | null;
  };
}

function makePrismaMock(opts: {
  findManyReturn?: UserFavRow[];
  teamFindManyReturn?: { id: number; apiTeamId: number }[];
} = {}): {
  prisma: unknown;
  transactionCalls: { deleteCount: number; createCount: number; createData: unknown[] };
  findManyCalls: unknown[];
} {
  const findManyCalls: unknown[] = [];
  const transactionCalls = { deleteCount: 0, createCount: 0, createData: [] as unknown[] };

  const prisma = {
    userFavoriteTeam: {
      findMany: async (args: unknown): Promise<UserFavRow[]> => {
        findManyCalls.push(args);
        return opts.findManyReturn ?? [];
      },
      deleteMany: () => {
        // 트랜잭션 안에서 실행될 promise-like 를 흉내낸다.
        return {
          _kind: 'deleteMany',
        };
      },
      createMany: (arg: { data: unknown[] }) => {
        return {
          _kind: 'createMany',
          data: arg.data,
        };
      },
    },
    team: {
      findMany: async (): Promise<{ id: number; apiTeamId: number }[]> =>
        opts.teamFindManyReturn ?? [],
    },
    localizedName: {
      findMany: async (): Promise<[]> => [],
    },
    $transaction: async (
      ops: Array<{ _kind: string; data?: unknown[] }>,
    ): Promise<unknown[]> => {
      for (const op of ops) {
        if (op._kind === 'deleteMany') transactionCalls.deleteCount += 1;
        if (op._kind === 'createMany') {
          transactionCalls.createCount += 1;
          transactionCalls.createData = op.data ?? [];
        }
      }
      return [];
    },
  };

  return { prisma, transactionCalls, findManyCalls };
}

const USER_ID = '00000000-0000-0000-0000-000000000001';

function makeTeamRow(overrides: Partial<UserFavRow['team']>): UserFavRow['team'] {
  return {
    id: overrides.id ?? 1,
    apiTeamId: overrides.apiTeamId ?? 33,
    name: overrides.name ?? 'Team',
    shortName: overrides.shortName ?? null,
    code: overrides.code ?? null,
    country: overrides.country ?? null,
    founded: overrides.founded ?? null,
    logoUrl: overrides.logoUrl ?? null,
  };
}

describe('UserFavoritesService.replace — 검증 실패 (Prisma mock)', () => {
  it('1. teamRefs 11개 → 400 favorites_limit_exceeded', async () => {
    const { prisma } = makePrismaMock();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const svc = new UserFavoritesService(prisma as any);
    const teamRefs = Array.from({ length: 11 }, (_, i) => `${100 + i}-team`);
    let err: unknown;
    try {
      await svc.replace(USER_ID, { teamRefs }, 'ko');
    } catch (e) {
      err = e;
    }
    expect(err).toBeInstanceOf(BadRequestException);
    const resp = (err as BadRequestException).getResponse();
    expect(resp).toEqual({ code: 'favorites_limit_exceeded' });
  });

  it('2. 다른 문자열이지만 같은 apiId → 400 favorites_duplicate', async () => {
    const { prisma } = makePrismaMock({
      // 두 ref 모두 apiId=33 이 존재해야 unknown 이 아닌 duplicate 로 간다
      teamFindManyReturn: [{ id: 1, apiTeamId: 33 }],
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const svc = new UserFavoritesService(prisma as any);
    let err: unknown;
    try {
      await svc.replace(USER_ID, { teamRefs: ['33-manchester-united', '33-mufc'] }, 'ko');
    } catch (e) {
      err = e;
    }
    expect(err).toBeInstanceOf(BadRequestException);
    expect((err as BadRequestException).getResponse()).toEqual({ code: 'favorites_duplicate' });
  });

  it('3. 없는 ref → 400 favorites_unknown_team + details 원문 ref', async () => {
    const { prisma } = makePrismaMock({
      // apiId=33 만 존재. apiId=99 는 없음 → unknown 에 원문 "99-nope" 이 들어가야 한다
      teamFindManyReturn: [{ id: 1, apiTeamId: 33 }],
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const svc = new UserFavoritesService(prisma as any);
    let err: unknown;
    try {
      await svc.replace(USER_ID, { teamRefs: ['33-manchester-united', '99-nope'] }, 'ko');
    } catch (e) {
      err = e;
    }
    expect(err).toBeInstanceOf(BadRequestException);
    const resp = (err as BadRequestException).getResponse() as { code: string; details: string[] };
    expect(resp.code).toBe('favorites_unknown_team');
    expect(resp.details).toEqual(['99-nope']);
  });
});

describe('UserFavoritesService.replace — 정상 (Prisma mock)', () => {
  it('4. 정상 3개 → items.length===3 · position 0/1/2', async () => {
    const teams = [
      { id: 1, apiTeamId: 33 },
      { id: 2, apiTeamId: 40 },
      { id: 3, apiTeamId: 42 },
    ];
    // 반환용 findMany 는 replace 가 끝난 뒤 list 를 다시 부를 때 실행된다
    const finalRows: UserFavRow[] = [
      { userId: USER_ID, teamId: 1, position: 0, team: makeTeamRow({ id: 1, apiTeamId: 33, name: 'Manchester United' }) },
      { userId: USER_ID, teamId: 2, position: 1, team: makeTeamRow({ id: 2, apiTeamId: 40, name: 'Liverpool' }) },
      { userId: USER_ID, teamId: 3, position: 2, team: makeTeamRow({ id: 3, apiTeamId: 42, name: 'Arsenal' }) },
    ];
    const { prisma, transactionCalls } = makePrismaMock({
      teamFindManyReturn: teams,
      findManyReturn: finalRows,
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const svc = new UserFavoritesService(prisma as any);
    const out = await svc.replace(
      USER_ID,
      { teamRefs: ['33-manchester-united', '40-liverpool', '42-arsenal'] },
      'ko',
    );

    expect(out.items).toHaveLength(3);
    expect(out.items.map((i) => i.position)).toEqual([0, 1, 2]);
    expect(out.items.map((i) => i.apiId)).toEqual([33, 40, 42]);
    expect(transactionCalls.deleteCount).toBe(1);
    expect(transactionCalls.createCount).toBe(1);
    expect(transactionCalls.createData).toEqual([
      { userId: USER_ID, teamId: 1, position: 0 },
      { userId: USER_ID, teamId: 2, position: 1 },
      { userId: USER_ID, teamId: 3, position: 2 },
    ]);
  });
});

describe('UserFavoritesService.list — GET (Prisma mock)', () => {
  it('5. 즐겨찾기 없음 → items===[]', async () => {
    const { prisma } = makePrismaMock({ findManyReturn: [] });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const svc = new UserFavoritesService(prisma as any);
    const out = await svc.list(USER_ID, 'ko');
    expect(out.items).toEqual([]);
    expect(typeof out.asOf).toBe('string');
  });

  it('6. 즐겨찾기 3개 → position 오름차순 정렬 (findMany orderBy 계약)', async () => {
    // 서비스는 prisma orderBy: {position:'asc'} 를 요청하고 반환값을 그대로 매핑한다.
    // 여기서는 findMany 가 정렬된 결과를 반환하도록 시뮬레이션 · orderBy 요청 여부도 검증.
    const rows: UserFavRow[] = [
      { userId: USER_ID, teamId: 1, position: 0, team: makeTeamRow({ id: 1, apiTeamId: 33, name: 'Manchester United' }) },
      { userId: USER_ID, teamId: 2, position: 1, team: makeTeamRow({ id: 2, apiTeamId: 40, name: 'Liverpool' }) },
      { userId: USER_ID, teamId: 3, position: 2, team: makeTeamRow({ id: 3, apiTeamId: 42, name: 'Arsenal' }) },
    ];
    const { prisma, findManyCalls } = makePrismaMock({ findManyReturn: rows });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const svc = new UserFavoritesService(prisma as any);
    const out = await svc.list(USER_ID, 'ko');
    expect(out.items.map((i) => i.position)).toEqual([0, 1, 2]);
    expect(out.items.map((i) => i.apiId)).toEqual([33, 40, 42]);
    // findMany 는 orderBy: {position:'asc'} 로 호출된다
    expect(findManyCalls).toHaveLength(1);
    const call = findManyCalls[0] as { orderBy: { position: string }; where: { userId: string } };
    expect(call.orderBy).toEqual({ position: 'asc' });
    expect(call.where).toEqual({ userId: USER_ID });
  });
});
