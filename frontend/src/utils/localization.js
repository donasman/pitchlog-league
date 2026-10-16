/**
 * 팀·선수·대회 현지화 이름 조회 유틸리티 (i18n 1판 · feat/i18n-names-enums).
 *
 * 규칙 (프로젝트 결정):
 *   - locale === 'en' → entity.originalName(원문·영문) → entity.name → ''.
 *     원문 필드가 없으면(선수 이름 ko 없을 때) displayName(=entity.name) 으로 폴백 · 우회 금지.
 *   - locale === 'ko' → entity.name(=displayName · 백엔드가 한글로 채워 준 값) → originalName → ''.
 *
 * `entityNames` 프론트 테이블(entityNames.js)은 이 판에서 단독 lookup 을 하지 않는다 —
 * 백엔드가 이미 로컬라이즈해 주는 것이 정본이다 (팀 테이블은 shortKo 소비처가 남아 유지만).
 */

/**
 * 엔티티 표시 이름 (긴 이름).
 * @param {Object|null|undefined} entity  { name?, originalName?, teamName?, playerName? }
 * @param {'ko'|'en'} locale
 * @returns {string}
 */
export function getLocalizedName(entity, locale = 'ko') {
  if (!entity) return ''
  if (locale === 'en') {
    return entity.originalName ?? entity.name ?? entity.teamName ?? entity.playerName ?? ''
  }
  return entity.name ?? entity.originalName ?? entity.teamName ?? entity.playerName ?? ''
}

/**
 * 엔티티 짧은 이름.
 * @param {Object|null|undefined} entity  { shortName?, shortOriginalName?, name?, originalName? }
 * @param {'ko'|'en'} locale
 * @returns {string}
 */
export function getLocalizedShortName(entity, locale = 'ko') {
  if (!entity) return ''
  if (locale === 'en') {
    return entity.shortOriginalName ?? entity.originalName ?? entity.shortName ?? entity.name ?? ''
  }
  return entity.shortName ?? entity.name ?? entity.shortOriginalName ?? entity.originalName ?? ''
}

/**
 * 대회 현지화 이름.
 * @param {{ name?:string, originalName?:string, shortName?:string }} comp
 * @param {'ko'|'en'} locale
 */
export function getLocalizedCompetitionName(comp, locale = 'ko') {
  return getLocalizedName(comp, locale)
}

export function getLocalizedCompetitionShortName(comp, locale = 'ko') {
  return getLocalizedShortName(comp, locale)
}

/**
 * 두 문자열(로컬 이름·원문) 중 로케일에 맞는 것을 고른다.
 * normalize.js 가 이미 문자열로만 넘긴 필드(match.competitionName 등) 소비 지점용.
 * @param {string|null|undefined} localized  ko 표시 · 백엔드 displayName 파생
 * @param {string|null|undefined} original   원문(영문) · 백엔드 originalName 파생
 * @param {'ko'|'en'} locale
 */
export function pickLocalized(localized, original, locale = 'ko') {
  if (locale === 'en') return original ?? localized ?? ''
  return localized ?? original ?? ''
}
