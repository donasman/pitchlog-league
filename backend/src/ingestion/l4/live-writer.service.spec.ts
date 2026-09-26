/**
 * LiveWriterService 유닛 — prisma.$executeRaw 를 mock.
 * 조건부 UPDATE 하나만 부르고, 반환 rows(=number) 로 written/blocked 판정한다.
 * SELECT 후 UPDATE 금지 — 이 파일이 규칙을 보증한다.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { LiveWriterService } from './live-writer.service.js';
import type { PrismaService } from '../../prisma/prisma.service.js';

/** TaggedTemplate 형태로 실제 실행되는 $executeRaw 를 흉내낸다.
 *  vi.fn 인자로 전달된 template strings 를 join 해 SQL 문자열을 얻는다. */
function tagToString(template: unknown, values: unknown[]): string {
  const strings = template as TemplateStringsArray;
  // strings.raw 를 join 해도 되지만 Prisma.sql 이 만들어낸 template 은 raw 없이 오기도 한다.
  // Array.from 으로 강제 배열화.
  const arr = Array.from(strings as unknown as ArrayLike<string>);
  let out = arr[0] ?? '';
  for (let i = 0; i < values.length; i++) {
    out += `?${i + 1}` + (arr[i + 1] ?? '');
  }
  return out;
}

describe('LiveWriterService', () => {
  let prisma: {
    $executeRaw: ReturnType<typeof vi.fn>;
  };
  let writer: LiveWriterService;

  beforeEach(() => {
    prisma = { $executeRaw: vi.fn() };
    writer = new LiveWriterService(prisma as unknown as PrismaService);
  });

  const baseInput = {
    apiFixtureId: 12345,
    statusShort: '1H',
    statusLong: 'First Half',
    elapsed: 30,
    extraElapsed: null,
    goalsHome: 1,
    goalsAway: 0,
    htHome: null,
    htAway: null,
    ftHome: null,
    ftAway: null,
    etHome: null,
    etAway: null,
    penHome: null,
    penAway: null,
  };

  it('(1) cur 없음 (신규 · WHERE 통과) → UPDATE 반환 1 → written=1', async () => {
    prisma.$executeRaw.mockResolvedValueOnce(1);
    const r = await writer.write(baseInput);
    expect(r).toEqual({ written: 1, blocked: 0 });
    expect(prisma.$executeRaw).toHaveBeenCalledTimes(1);
  });

  it('(2) cur=2H 70 · next=2H 68 — DB WHERE 실패 (0 rows) → blocked=1', async () => {
    prisma.$executeRaw.mockResolvedValueOnce(0);
    const r = await writer.write({
      ...baseInput,
      statusShort: '2H',
      elapsed: 68,
    });
    expect(r).toEqual({ written: 0, blocked: 1 });
  });

  it('(3) cur=1H 40 · next=HT 45 — rank 상승 → UPDATE 반환 1 → written=1', async () => {
    prisma.$executeRaw.mockResolvedValueOnce(1);
    const r = await writer.write({
      ...baseInput,
      statusShort: 'HT',
      elapsed: 45,
    });
    expect(r).toEqual({ written: 1, blocked: 0 });
  });

  it('(4) SQL 문자열에 data_version + 1 · as_of=now() · updated_at=now() 포함', async () => {
    prisma.$executeRaw.mockResolvedValueOnce(1);
    await writer.write(baseInput);

    const call = prisma.$executeRaw.mock.calls[0];
    const [template, ...values] = call;
    const sql = tagToString(template, values);

    expect(sql).toMatch(/"data_version"\s*=\s*"data_version"\s*\+\s*1/);
    expect(sql).toMatch(/"as_of"\s*=\s*now\(\)/);
    expect(sql).toMatch(/"updated_at"\s*=\s*now\(\)/);
    // 조건부 UPDATE (WHERE 절 존재)
    expect(sql).toMatch(/UPDATE\s+"matches"/);
    expect(sql).toMatch(/WHERE\s+"api_fixture_id"/);
  });

  it('(5) 입력 파라미터가 UPDATE 인자로 전달됨 (statusShort · elapsed · apiFixtureId · 스코어)', async () => {
    prisma.$executeRaw.mockResolvedValueOnce(1);
    await writer.write({ ...baseInput, statusShort: 'HT', elapsed: 45 });

    // $executeRaw 는 tagged template — 첫 인자 template.strings, 나머지가 값.
    // Prisma.sql 로 만든 중첩 조각 안의 CASE 리터럴('NS' 등) 은 template.strings 로 노출되지 않는다
    // (조각은 최종 SQL 로 서버에서만 합쳐진다). 그래서 이 검사는 값 배열에 기대 파라미터가
    // 다 넘어가는지만 확인한다. 역행 가드 SQL 자체의 정합은 status-rank.spec.ts 가 검사한다.
    const call = prisma.$executeRaw.mock.calls[0];
    const [, ...values] = call;
    // 첫 인자(template) 뒤 값들을 평탄화해 Prisma.Sql 조각과 원시값을 모두 포함.
    const flat: unknown[] = [];
    const collect = (v: unknown): void => {
      if (v && typeof v === 'object' && 'values' in (v as Record<string, unknown>)) {
        const inner = (v as { values?: unknown[] }).values;
        if (Array.isArray(inner)) for (const x of inner) collect(x);
      } else {
        flat.push(v);
      }
    };
    for (const v of values) collect(v);

    // 페이로드 값들이 파라미터 슬롯 어딘가에 들어가 있어야 한다.
    expect(flat).toContain('HT');
    expect(flat).toContain(45);
    expect(flat).toContain(12345);
    expect(flat).toContain('First Half');
  });

  it('(6) 두 번 호출하지 않음 — SELECT 후 UPDATE 금지 규칙', async () => {
    prisma.$executeRaw.mockResolvedValueOnce(0);
    await writer.write(baseInput);
    // $executeRaw 는 정확히 1번만 · SELECT (queryRaw) 는 존재조차 안 함
    expect(prisma.$executeRaw).toHaveBeenCalledTimes(1);
  });

  it('(7) winnerTeamId 는 write 페이로드에 없음 (SET 목록에 등장 안 함)', async () => {
    prisma.$executeRaw.mockResolvedValueOnce(1);
    await writer.write(baseInput);

    const call = prisma.$executeRaw.mock.calls[0];
    const [template, ...values] = call;
    const sql = tagToString(template, values);

    expect(sql).not.toMatch(/winner_team_id/);
  });
});
