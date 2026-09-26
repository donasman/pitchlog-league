/**
 * batchUpsert 단위 스펙 — Prisma 를 목킹해 생성되는 SQL 텍스트만 검증한다.
 * 실제 PG 왕복은 `test/batch-upsert.e2e-spec.ts` 가 담당한다.
 *
 * updateWhere 옵션이 도입된 이유:
 *   L2 매일 upsert 가 진행 중 경기(LIVE_STATUSES) 의 라이브 컬럼을 캐시된 옛 값으로 덮어쓰지
 *   않도록 ON CONFLICT DO UPDATE 에 WHERE 절을 붙일 수 있어야 한다.
 */
import { Prisma } from '../generated/prisma/client.js';
import type { PrismaClient } from '../generated/prisma/client.js';
import { batchUpsert } from './batch-upsert.js';
import { LIVE_STATUSES } from '../ingestion/l4/status-rank.js';

interface FakeRow extends Record<string, unknown> {
  ext_id: number;
  name: string;
  status_short: string;
}

interface FakeDb {
  $queryRaw: ReturnType<typeof vi.fn>;
  $executeRaw: ReturnType<typeof vi.fn>;
}

/** batchUpsert 는 db 를 `Pick<PrismaClient, '$queryRaw'|'$executeRaw'>` 로 받는다 — 시그니처 정합을 위해 캐스팅 */
function makeDb(): FakeDb {
  return {
    $queryRaw: vi.fn().mockResolvedValue([]),
    $executeRaw: vi.fn().mockResolvedValue(0),
  };
}

function asPrismaLike(db: FakeDb): Pick<PrismaClient, '$queryRaw' | '$executeRaw'> {
  return db as unknown as Pick<PrismaClient, '$queryRaw' | '$executeRaw'>;
}

/** 마지막 호출된 $executeRaw 인자의 Prisma.Sql 텍스트를 뽑는다 (파라미터 자리는 `$1` 형태) */
function lastExecuteSql(db: FakeDb): string {
  const call = db.$executeRaw.mock.calls[db.$executeRaw.mock.calls.length - 1];
  const arg = call?.[0] as Prisma.Sql;
  return arg.sql;
}

/** 마지막 호출된 $queryRaw 인자의 Prisma.Sql 텍스트를 뽑는다 */
function lastQuerySql(db: FakeDb): string {
  const call = db.$queryRaw.mock.calls[db.$queryRaw.mock.calls.length - 1];
  const arg = call?.[0] as Prisma.Sql;
  return arg.sql;
}

const baseSpec = {
  table: 'matches',
  columns: { ext_id: 'int', name: 'text', status_short: 'text' } as const,
  conflict: ['ext_id'] as const,
} as const;

const rows: FakeRow[] = [{ ext_id: 1, name: 'a', status_short: 'FT' }];

describe('batchUpsert · updateWhere', () => {
  it('updateWhere 미지정 → 생성 SQL 에 WHERE 없음 (기존 동작 유지)', async () => {
    const db = makeDb();
    await batchUpsert<FakeRow>(asPrismaLike(db), { ...baseSpec, update: ['name', 'status_short'] }, rows);

    const sql = lastExecuteSql(db);
    expect(sql).toContain('ON CONFLICT');
    expect(sql).toContain('DO UPDATE SET');
    expect(sql).not.toContain('WHERE');
  });

  it('updateWhere 지정 → SQL 에 WHERE + 원본 조건 리터럴이 그대로 포함', async () => {
    const db = makeDb();
    await batchUpsert<FakeRow>(
      asPrismaLike(db),
      {
        ...baseSpec,
        update: ['name', 'status_short'],
        updateWhere: Prisma.sql`"matches"."status_short" NOT IN ('1H','HT')`,
      },
      rows,
    );

    const sql = lastExecuteSql(db);
    // SET 뒤에 WHERE 가 붙는다
    expect(sql).toMatch(/DO UPDATE SET[\s\S]+WHERE/);
    expect(sql).toContain(`"matches"."status_short" NOT IN ('1H','HT')`);
  });

  it('update: [] (DO NOTHING) 이고 updateWhere 지정 → SQL 에 WHERE 없음 (조용히 무시)', async () => {
    const db = makeDb();
    await batchUpsert<FakeRow>(
      asPrismaLike(db),
      {
        ...baseSpec,
        update: [],
        updateWhere: Prisma.sql`"matches"."status_short" = 'NS'`,
      },
      rows,
    );

    const sql = lastExecuteSql(db);
    expect(sql).toContain('DO NOTHING');
    expect(sql).not.toContain('WHERE');
    // DO NOTHING 이므로 SET 절 자체가 없어야 한다
    expect(sql).not.toContain('DO UPDATE SET');
  });

  it('updateWhere + updatedAtColumn → SET 에 "updated_at" = now() 포함 · WHERE 는 SET 뒤에 온다', async () => {
    const db = makeDb();
    await batchUpsert<FakeRow>(
      asPrismaLike(db),
      {
        ...baseSpec,
        update: ['name', 'status_short'],
        updatedAtColumn: 'updated_at',
        updateWhere: Prisma.sql`"matches"."status_short" <> 'LIVE'`,
      },
      rows,
    );

    const sql = lastExecuteSql(db);
    expect(sql).toContain('"updated_at" = now()');
    const setIdx = sql.indexOf('DO UPDATE SET');
    const whereIdx = sql.indexOf('WHERE');
    expect(setIdx).toBeGreaterThan(0);
    expect(whereIdx).toBeGreaterThan(setIdx);
    expect(sql).toContain(`"matches"."status_short" <> 'LIVE'`);
  });

  it('returning 지정 + updateWhere → $queryRaw 경로에도 WHERE 가 포함된다', async () => {
    const db = makeDb();
    db.$queryRaw.mockResolvedValueOnce([{ id: 1, ext_id: 1 }]);
    await batchUpsert<FakeRow, { id: number; ext_id: number }>(
      asPrismaLike(db),
      {
        ...baseSpec,
        update: ['name', 'status_short'],
        returning: ['id', 'ext_id'],
        updateWhere: Prisma.sql`"matches"."status_short" NOT IN ('1H')`,
      },
      rows,
    );

    const sql = lastQuerySql(db);
    expect(sql).toContain('RETURNING');
    expect(sql).toContain('WHERE');
    expect(sql).toContain(`"matches"."status_short" NOT IN ('1H')`);
  });

  it('L2 가 쓰는 리터럴 문자열이 LIVE_STATUSES 와 순서 무관 동일해야 한다 (l4/status-rank.ts 와 값 정합)', async () => {
    // l2.service.ts 는 SQL 리터럴로 상태 목록을 박아 넣는다 (파라미터 바인딩이 불가한 IN 절 인용을 피하기 위해).
    // 이 검사는 status-rank.ts 의 LIVE_STATUSES 를 바꾸면 l2.service.ts 도 함께 바꾸도록 강제한다.
    const l2Src = await import('node:fs/promises').then((fs) =>
      fs.readFile(new URL('../ingestion/l2/l2.service.ts', import.meta.url), 'utf8'),
    );
    // IN ('1H','HT','2H',...) 리터럴을 뽑는다 (NOT IN · IN 어느 형태든 매칭)
    const m = /"matches"\."status_short"\s+IN\s+\(([^)]+)\)/.exec(l2Src);
    expect(m, 'l2.service.ts 에서 status_short IN 리터럴을 찾지 못했다').not.toBeNull();
    const literalTokens = (m![1].match(/'([^']+)'/g) ?? []).map((s) => s.slice(1, -1));
    expect([...literalTokens].sort()).toEqual([...LIVE_STATUSES].sort());
  });

  it('L2 updateWhere 에 kickoff_at > now() - interval \'6 hours\' 가드가 살아 있다 (L4 실패 복구용)', async () => {
    // fix/l4-live-window-bounds: L4 가 FT 를 놓쳤을 때 L2 매일 upsert 가 다시 덮어 복구할 수 있어야 한다.
    // 이 검사는 킥오프 6시간 만료 규칙이 사라지면 실패한다.
    const l2Src = await import('node:fs/promises').then((fs) =>
      fs.readFile(new URL('../ingestion/l2/l2.service.ts', import.meta.url), 'utf8'),
    );
    expect(l2Src).toContain(`"matches"."kickoff_at" > now() - interval '6 hours'`);
  });
});
