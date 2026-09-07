/**
 * 공개 식별자 — `<apiId>-<slug>` (2026-09-07 결정).
 *
 *   /teams/33-manchester-united   → 33 이 기준, 뒤는 읽기용
 *   /teams/33                     → 같은 것
 *
 * 왜 하이브리드인가: 프론트 라우트와 BACKEND_FEATURES 계약은 `:slug` 인데 스키마에 slug 컬럼이 없고,
 * 팀 1,888개엔 같은 이름(Arsenal 잉글랜드·아르헨티나)이 있어 이름만으로는 유일하지 않다.
 * 숫자는 API-Football id — 외부에서도 통하는 안정적인 값이라 내부 PK 대신 쓴다.
 * 이름이 바뀌어도 링크가 살고, slug 유일성 관리가 필요 없다.
 */
import { BadRequestException } from '@nestjs/common';

/** 이름 → URL 조각. 악센트 제거, 소문자, 영숫자 외는 '-' */
export function slugify(name: string): string {
  const s = name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return s || 'x';
}

export function toRef(apiId: number, name: string): string {
  return `${apiId}-${slugify(name)}`;
}

const REF = /^(\d{1,9})(?:-[a-z0-9-]*)?$/;

/** `33-manchester-united` · `33` → 33. 형식이 아니면 400 */
export function parseRef(ref: string, what = 'ref'): number {
  const m = REF.exec(ref);
  if (!m) throw new BadRequestException(`${what} 형식이 아니다: ${ref} — "<id>" 또는 "<id>-<slug>"`);
  return Number(m[1]);
}
