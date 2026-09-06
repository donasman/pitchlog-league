/**
 * 배치 upsert — 행 단위 `prisma.x.upsert()` 대신 테이블당 1쿼리.
 *
 *   INSERT INTO t (c1, c2, ...) VALUES ($1::int, $2::text, ...), (...)
 *   ON CONFLICT (k1, k2) DO UPDATE SET c2 = EXCLUDED.c2, ...
 *   RETURNING id, k1, k2
 *
 * 왜 raw SQL 인가 (SCHEMA_DESIGN 11장 · 설계검토 B-2):
 *   - Supabase 왕복 60ms 기준 20팀 × 3 upsert = 4초. 백필(경기 5,000 · 이벤트 수십만 행)은 행 단위로는 불가능.
 *   - Prisma 의 upsert 는 조건이 맞을 때만 ON CONFLICT 로 나가고 아니면 SELECT+INSERT 2쿼리.
 *     여기서는 항상 ON CONFLICT 로 나간다는 것을 코드가 보장한다.
 *
 * 알려진 함정과 처리:
 *   1. 한 문장 안에 같은 충돌키가 두 번 있으면 PG 가 "cannot affect row a second time" 으로 거부
 *      → 충돌키 기준 dedupe (뒤에 온 행이 이긴다).
 *   2. 첫 행이 null 이면 타입 추론 실패 → 모든 값에 명시적 캐스트.
 *   3. enum 컬럼은 PG enum 타입명으로 캐스트해야 한다 → columns 에 '"SeasonStatus"' 처럼 지정.
 *   4. 파라미터 65,535개 한도 → 컬럼 수로 나눈 청크 크기로 분할.
 *   5. `@updatedAt` 은 Prisma 클라이언트가 채우는 값이라 raw 에서는 빠진다 → updatedAtColumn 으로 now() 지정.
 *
 * 대상 테이블은 관계 없이 평평한 컬럼만 다룬다. 관계 id(예: venue_id)는 호출자가 먼저 부모를 upsert 해
 * RETURNING 으로 받은 id 를 채워 넘긴다 (SCHEMA_DESIGN 2-4 부모-먼저).
 */
import { Prisma } from '../generated/prisma/client.js';
import type { PrismaClient } from '../generated/prisma/client.js';

/** PG 캐스트 타입. enum 은 따옴표 포함 ('"SeasonStatus"'), jsonb 는 값을 JSON 문자열로 넘긴다 */
export type PgType = 'int' | 'bigint' | 'text' | 'boolean' | 'numeric' | 'date' | 'timestamptz' | 'jsonb' | (string & {});

export interface BatchUpsertSpec<Row extends Record<string, unknown>> {
  /** 테이블명 (Prisma @@map 값) */
  table: string;
  /** 컬럼명(@map) → PG 타입. 이 순서로 INSERT 한다. 키는 Row 의 키와 같아야 한다 */
  columns: { [K in keyof Row & string]: PgType };
  /** ON CONFLICT 대상 컬럼 — unique 인덱스가 있어야 한다 */
  conflict: readonly (keyof Row & string)[];
  /**
   * DO UPDATE SET 대상. 생략 시 충돌키를 제외한 전부.
   * 빈 배열이면 DO NOTHING — 단, RETURNING 이 기존 행을 돌려주지 않으므로 returning 과 같이 쓰지 말 것.
   */
  update?: readonly (keyof Row & string)[];
  /** `updated_at` 처럼 INSERT·UPDATE 양쪽에서 now() 로 채울 컬럼 */
  updatedAtColumn?: string;
  /** RETURNING 컬럼. 보통 ['id', ...conflict] 로 외부키 → 내부 id 매핑을 받는다 */
  returning?: readonly string[];
  /** 청크당 최대 행 수 (기본: 파라미터 한도에서 계산, 최대 1,000) */
  chunkSize?: number;
}

export interface BatchUpsertResult<Ret = Record<string, unknown>> {
  /** 실제로 보낸 행 수 (dedupe 후) */
  rows: number;
  /** dedupe 로 제거된 행 수 */
  deduped: number;
  /** 실행한 INSERT 문 수 */
  statements: number;
  /** RETURNING 결과 (returning 지정 시). 입력 순서와 무관 */
  returned: Ret[];
}

const PG_MAX_PARAMS = 65_535;
const MAX_CHUNK = 1_000;

/** 식별자 인용 — 컬럼·테이블명은 코드 상수라 파라미터가 아니지만, 예약어 충돌 방지로 항상 따옴표 */
function ident(name: string): Prisma.Sql {
  if (!/^[a-z_][a-z0-9_]*$/i.test(name)) throw new Error(`식별자가 아니다: ${name}`);
  return Prisma.raw(`"${name}"`);
}

function castOf(type: string): Prisma.Sql {
  // '"SeasonStatus"' 처럼 따옴표 포함 enum 타입명도 그대로 허용
  if (!/^("[A-Za-z_][A-Za-z0-9_]*"|[a-z_][a-z0-9_ ]*(\(\d+(,\d+)?\))?(\[\])?)$/.test(type)) {
    throw new Error(`PG 타입이 아니다: ${type}`);
  }
  return Prisma.raw(type);
}

function toParam(value: unknown, type: string): unknown {
  if (value === undefined) return null;
  if (type === 'jsonb' && value !== null && typeof value !== 'string') return JSON.stringify(value);
  return value;
}

/** 충돌키 기준 dedupe — 마지막 행이 이긴다 */
export function dedupeByKey<Row extends Record<string, unknown>>(rows: readonly Row[], keys: readonly (keyof Row & string)[]): { rows: Row[]; deduped: number } {
  const map = new Map<string, Row>();
  for (const r of rows) map.set(keys.map((k) => String(r[k])).join('\u001f'), r);
  return { rows: [...map.values()], deduped: rows.length - map.size };
}

export async function batchUpsert<Row extends Record<string, unknown>, Ret = Record<string, unknown>>(
  db: Pick<PrismaClient, '$queryRaw' | '$executeRaw'>,
  spec: BatchUpsertSpec<Row>,
  input: readonly Row[],
): Promise<BatchUpsertResult<Ret>> {
  const cols = Object.keys(spec.columns) as (keyof Row & string)[];
  if (cols.length === 0) throw new Error(`${spec.table}: 컬럼이 없다`);
  for (const k of spec.conflict) if (!cols.includes(k)) throw new Error(`${spec.table}: 충돌키 ${k} 가 columns 에 없다`);

  const updateCols: readonly (keyof Row & string)[] = spec.update ?? cols.filter((c) => !spec.conflict.includes(c));
  for (const k of updateCols) if (!cols.includes(k)) throw new Error(`${spec.table}: update 컬럼 ${k} 가 columns 에 없다`);
  if (updateCols.length === 0 && !spec.updatedAtColumn && spec.returning?.length) {
    throw new Error(`${spec.table}: DO NOTHING 은 기존 행을 RETURNING 하지 않는다 — update 를 지정하거나 returning 을 빼라`);
  }

  const { rows, deduped } = dedupeByKey(input, spec.conflict);
  const result: BatchUpsertResult<Ret> = { rows: rows.length, deduped, statements: 0, returned: [] };
  if (rows.length === 0) return result;

  const chunkSize = Math.max(1, Math.min(spec.chunkSize ?? MAX_CHUNK, Math.floor(PG_MAX_PARAMS / cols.length)));

  const colList = Prisma.join(cols.map(ident));
  const conflictList = Prisma.join(spec.conflict.map(ident));
  const setParts = updateCols.map((c) => Prisma.sql`${ident(c)} = EXCLUDED.${ident(c)}`);
  if (spec.updatedAtColumn) setParts.push(Prisma.sql`${ident(spec.updatedAtColumn)} = now()`);
  const insertCols = spec.updatedAtColumn ? Prisma.sql`${colList}, ${ident(spec.updatedAtColumn)}` : colList;
  const onConflict =
    setParts.length > 0
      ? Prisma.sql`ON CONFLICT (${conflictList}) DO UPDATE SET ${Prisma.join(setParts)}`
      : Prisma.sql`ON CONFLICT (${conflictList}) DO NOTHING`;
  const returning = spec.returning?.length ? Prisma.sql` RETURNING ${Prisma.join(spec.returning.map(ident))}` : Prisma.empty;

  for (let i = 0; i < rows.length; i += chunkSize) {
    const chunk = rows.slice(i, i + chunkSize);
    const values = Prisma.join(
      chunk.map((r) => {
        const cells = cols.map((c) => Prisma.sql`${toParam(r[c], spec.columns[c])}::${castOf(spec.columns[c])}`);
        if (spec.updatedAtColumn) cells.push(Prisma.sql`now()`);
        return Prisma.sql`(${Prisma.join(cells)})`;
      }),
    );
    const query = Prisma.sql`INSERT INTO ${ident(spec.table)} (${insertCols}) VALUES ${values} ${onConflict}${returning}`;
    if (spec.returning?.length) {
      const rets = await db.$queryRaw<Ret[]>(query);
      result.returned.push(...rets);
    } else {
      await db.$executeRaw(query);
    }
    result.statements++;
  }
  return result;
}
