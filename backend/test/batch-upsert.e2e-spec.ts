/**
 * 배치 upsert 헬퍼 — 실제 PG 에서 다섯 함정(중복키 · null 캐스트 · enum · 청크 · updated_at)을 검증한다.
 * 도메인 테이블을 건드리지 않도록 임시 테이블을 만들어 쓴다.
 */
import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { Prisma, PrismaClient, SeasonStatus } from '../src/generated/prisma/client.js';
import { batchUpsert, dedupeByKey } from '../src/prisma/batch-upsert.js';

const TABLE = '_batch_upsert_spec';

interface Row extends Record<string, unknown> {
  ext_id: number;
  name: string;
  count: number | null;
  status: SeasonStatus;
  meta: Record<string, unknown> | null;
  seen_at: Date | null;
}

describe('batchUpsert (e2e)', () => {
  const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL, max: 2 }) });

  beforeAll(async () => {
    await prisma.$executeRawUnsafe(`DROP TABLE IF EXISTS "${TABLE}"`);
    await prisma.$executeRawUnsafe(`
      CREATE TABLE "${TABLE}" (
        id SERIAL PRIMARY KEY,
        ext_id INTEGER NOT NULL UNIQUE,
        name TEXT NOT NULL,
        count INTEGER,
        status "SeasonStatus" NOT NULL,
        meta JSONB,
        seen_at TIMESTAMPTZ(6),
        created_at TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
        updated_at TIMESTAMPTZ(6) NOT NULL
      )`);
  });

  afterAll(async () => {
    await prisma.$executeRawUnsafe(`DROP TABLE IF EXISTS "${TABLE}"`);
    await prisma.$disconnect();
  });

  const spec = {
    table: TABLE,
    columns: { ext_id: 'int', name: 'text', count: 'int', status: '"SeasonStatus"', meta: 'jsonb', seen_at: 'timestamptz' },
    conflict: ['ext_id'],
    updatedAtColumn: 'updated_at',
    returning: ['id', 'ext_id'],
  } as const;

  it('첫 행이 전부 null 이어도 캐스트 덕에 들어가고, RETURNING 으로 id 매핑을 받는다', async () => {
    const rows: Row[] = [
      { ext_id: 1, name: 'a', count: null, status: SeasonStatus.UPCOMING, meta: null, seen_at: null },
      { ext_id: 2, name: 'b', count: 5, status: SeasonStatus.FINISHED, meta: { x: 1 }, seen_at: new Date('2026-01-01T00:00:00Z') },
    ];
    const r = await batchUpsert<Row, { id: number; ext_id: number }>(prisma, spec, rows);
    expect(r).toMatchObject({ rows: 2, deduped: 0, statements: 1 });
    expect(r.returned.map((x) => x.ext_id).sort()).toEqual([1, 2]);
    const stored = await prisma.$queryRaw<{ ext_id: number; count: number | null; status: string; meta: unknown }[]>(
      Prisma.sql`SELECT ext_id, count, status, meta FROM ${Prisma.raw(`"${TABLE}"`)} ORDER BY ext_id`,
    );
    expect(stored).toEqual([
      { ext_id: 1, count: null, status: 'UPCOMING', meta: null },
      { ext_id: 2, count: 5, status: 'FINISHED', meta: { x: 1 } },
    ]);
  });

  it('두 번 넣으면 UPDATE 되고 id 는 그대로, updated_at 만 바뀐다', async () => {
    const before = await prisma.$queryRaw<{ id: number; updated_at: Date }[]>(
      Prisma.sql`SELECT id, updated_at FROM ${Prisma.raw(`"${TABLE}"`)} WHERE ext_id = 2`,
    );
    await new Promise((res) => setTimeout(res, 5));
    const r = await batchUpsert<Row, { id: number; ext_id: number }>(prisma, spec, [
      { ext_id: 2, name: 'b2', count: null, status: SeasonStatus.IN_PROGRESS, meta: null, seen_at: null },
    ]);
    const after = await prisma.$queryRaw<{ id: number; name: string; count: number | null; updated_at: Date }[]>(
      Prisma.sql`SELECT id, name, count, updated_at FROM ${Prisma.raw(`"${TABLE}"`)} WHERE ext_id = 2`,
    );
    expect(r.returned[0]?.id).toBe(before[0]?.id);
    expect(after[0]).toMatchObject({ id: before[0]?.id, name: 'b2', count: null });
    expect(after[0]!.updated_at.getTime()).toBeGreaterThan(before[0]!.updated_at.getTime());
  });

  it('같은 충돌키가 한 배치에 두 번 있으면 dedupe 되어 뒤의 행이 이긴다 (PG "affect row a second time" 회피)', async () => {
    const r = await batchUpsert<Row>(prisma, { ...spec, returning: undefined }, [
      { ext_id: 3, name: 'first', count: 1, status: SeasonStatus.UPCOMING, meta: null, seen_at: null },
      { ext_id: 3, name: 'second', count: 2, status: SeasonStatus.UPCOMING, meta: null, seen_at: null },
    ]);
    expect(r).toMatchObject({ rows: 1, deduped: 1 });
    const stored = await prisma.$queryRaw<{ name: string }[]>(Prisma.sql`SELECT name FROM ${Prisma.raw(`"${TABLE}"`)} WHERE ext_id = 3`);
    expect(stored).toEqual([{ name: 'second' }]);
  });

  it('update 를 지정하면 그 컬럼만 덮어쓴다 (first_seen 류 보존)', async () => {
    await batchUpsert<Row>(prisma, { ...spec, returning: undefined, update: ['name'] }, [
      { ext_id: 3, name: 'third', count: 99, status: SeasonStatus.FINISHED, meta: null, seen_at: null },
    ]);
    const stored = await prisma.$queryRaw<{ name: string; count: number; status: string }[]>(
      Prisma.sql`SELECT name, count, status FROM ${Prisma.raw(`"${TABLE}"`)} WHERE ext_id = 3`,
    );
    expect(stored).toEqual([{ name: 'third', count: 2, status: 'UPCOMING' }]);
  });

  it('파라미터 한도에 맞춰 청크로 나눠 보낸다', async () => {
    const rows: Row[] = Array.from({ length: 2_500 }, (_, i) => ({
      ext_id: 10_000 + i, name: `t${i}`, count: i, status: SeasonStatus.UPCOMING, meta: { i }, seen_at: null,
    }));
    const r = await batchUpsert<Row, { id: number }>(prisma, spec, rows);
    expect(r.statements).toBe(3); // 1,000 · 1,000 · 500
    expect(r.returned).toHaveLength(2_500);
    const [{ n }] = await prisma.$queryRaw<{ n: bigint }[]>(Prisma.sql`SELECT count(*)::bigint AS n FROM ${Prisma.raw(`"${TABLE}"`)} WHERE ext_id >= 10000`);
    expect(Number(n)).toBe(2_500);
  });

  it('빈 입력이면 쿼리를 보내지 않는다', async () => {
    expect(await batchUpsert<Row>(prisma, spec, [])).toEqual({ rows: 0, deduped: 0, statements: 0, returned: [] });
  });

  it('식별자·타입 검증 — SQL 주입 여지가 있는 이름은 거부한다', async () => {
    await expect(batchUpsert(prisma, { ...spec, table: 'x"; DROP TABLE t; --' }, [{ ext_id: 1 } as unknown as Row])).rejects.toThrow('식별자');
    await expect(batchUpsert(prisma, { ...spec, columns: { ...spec.columns, name: 'text); --' } }, [{ ext_id: 1 } as unknown as Row])).rejects.toThrow('PG 타입');
  });

  it('dedupeByKey 는 복합키도 다룬다', () => {
    const { rows, deduped } = dedupeByKey([{ a: 1, b: 1, v: 'x' }, { a: 1, b: 2, v: 'y' }, { a: 1, b: 1, v: 'z' }], ['a', 'b']);
    expect(deduped).toBe(1);
    expect(rows.map((r) => r.v)).toEqual(['z', 'y']);
  });
});
