/**
 * 응답 로케일 파서.
 *
 * 계약 (feat/localized-names-api · 2026-09-17):
 *   - 쿼리 `?locale=` 이 `ko` | `en` 이면 그 값, 없거나 다른 값이면 기본 `ko`.
 *   - 유효하지 않은 값에 400 을 내지 않는다 — 조용히 기본값으로 폴백.
 *
 * 헤더(Accept-Language)는 쓰지 않는다 — 조회 API 에 `Cache-Control: public, max-age=60`
 * 이 붙어 있어 CDN 이 언어를 섞어 캐시할 위험이 있고, 쿼리는 캐시 키에 자연히 포함된다.
 */

export type Locale = 'ko' | 'en';

export const DEFAULT_LOCALE: Locale = 'ko';

export function parseLocale(v: string | undefined | null): Locale {
  if (v === 'ko' || v === 'en') return v;
  return DEFAULT_LOCALE;
}
