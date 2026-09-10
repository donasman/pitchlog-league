/**
 * registry ajv useDefaults 실효 default 검증 — C2 (2026-09-10 사용자 조건).
 *
 * 배경: list_matches limit default 가 두 자리에 있었다:
 *   - schemas.ts (ajv useDefaults 로 채워짐)                  ← 최초 유효
 *   - tools/index.ts applyListMatchesDefaults (registry.call 안)  ← ajv 이후
 * 값이 어긋난 걸 아무도 몰라서 어시스턴트 실효 limit 이 50 이었다 (기대: 10).
 * 값만 고치면 재발한다 — 이 테스트가 실효 값을 잠근다.
 *
 * ajv (useDefaults:true · registry.ts:50) 가 args 를 mutate 해서 default 를 채운다는 사실에 의존한다.
 * 원본 인자를 spread 로 복사 후 validate → limit === 10 (schemas.ts default) 이 되어야 한다.
 */
import { describe, it, expect } from 'vitest';
import { Ajv } from 'ajv';
import { listMatchesSchema } from './tools/schemas.js';

describe('registry defaults — list_matches', () => {
  it('빈 인자 → ajv useDefaults 로 limit=10 채워짐 (schemas.ts default)', () => {
    // registry 와 같은 옵션으로 컴파일 (assistant-tool.registry.ts:50)
    const ajv = new Ajv({ allErrors: true, useDefaults: true, coerceTypes: false });
    const validate = ajv.compile(listMatchesSchema);

    const base: Record<string, unknown> = {};
    const ok = validate(base);
    expect(ok).toBe(true);
    // useDefaults 가 base 에 limit 을 채웠어야 한다
    expect(base.limit).toBe(10);
  });

  it('명시된 limit=30 은 default 로 덮이지 않는다 ("상위 30명" 유지)', () => {
    const ajv = new Ajv({ allErrors: true, useDefaults: true, coerceTypes: false });
    const validate = ajv.compile(listMatchesSchema);

    const base: Record<string, unknown> = { limit: 30 };
    const ok = validate(base);
    expect(ok).toBe(true);
    expect(base.limit).toBe(30);
  });

  it('limit=201 은 max(200) 초과 → 400 (validate false)', () => {
    const ajv = new Ajv({ allErrors: true, useDefaults: true, coerceTypes: false });
    const validate = ajv.compile(listMatchesSchema);

    const ok = validate({ limit: 201 });
    expect(ok).toBe(false);
  });

  it('limit=0 은 min(1) 미만 → 400 (validate false)', () => {
    const ajv = new Ajv({ allErrors: true, useDefaults: true, coerceTypes: false });
    const validate = ajv.compile(listMatchesSchema);

    const ok = validate({ limit: 0 });
    expect(ok).toBe(false);
  });
});
