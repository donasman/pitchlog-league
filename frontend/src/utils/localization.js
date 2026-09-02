/**
 * 팀·선수·대회 현지화 이름 조회 유틸리티
 *
 * 폴백 체인:
 *   entityNames 테이블[locale]
 *   → entityNames 테이블['en']
 *   → entity.names?.[locale]
 *   → entity.names?.['en']
 *   → entity.originalName
 *   → entity.name (shortName 의 경우 entity.shortName)
 *
 * 사용 예시:
 *   const { i18n } = useTranslation()
 *   getLocalizedName(team, i18n.language)
 */

import { TEAM_NAMES, PLAYER_NAMES, COMPETITION_NAMES } from '@/i18n/entityNames'

/** entity.id, .teamId, .playerId, .competitionId 순서로 id 추출 */
function resolveId(entity) {
  return entity?.id ?? entity?.teamId ?? entity?.playerId ?? entity?.competitionId ?? null
}

/**
 * entity의 lookup 테이블 항목 (없으면 null)
 * @param {string|null} id
 */
function lookupEntry(id) {
  if (!id) return null
  return TEAM_NAMES[id] ?? PLAYER_NAMES[id] ?? COMPETITION_NAMES[id] ?? null
}

/**
 * 엔티티 표시 이름 (긴 이름)
 * @param {Object|null|undefined} entity
 * @param {'ko'|'en'} locale
 * @returns {string}
 */
export function getLocalizedName(entity, locale = 'ko') {
  if (!entity) return ''
  const id = resolveId(entity)
  const entry = lookupEntry(id)
  if (entry) return entry[locale] ?? entry.en ?? entity.name ?? ''
  return (
    entity.names?.[locale] ??
    entity.names?.en ??
    entity.originalName ??
    entity.name ??
    entity.teamName ??
    entity.playerName ??
    ''
  )
}

/**
 * 엔티티 짧은 이름
 * @param {Object|null|undefined} entity
 * @param {'ko'|'en'} locale
 * @returns {string}
 */
export function getLocalizedShortName(entity, locale = 'ko') {
  if (!entity) return ''
  const id = resolveId(entity)
  const entry = lookupEntry(id)
  if (entry) {
    const shortKey = locale === 'ko' ? 'shortKo' : 'shortEn'
    return entry[shortKey] ?? entry.shortEn ?? getLocalizedName(entity, locale)
  }
  return (
    entity.shortNames?.[locale] ??
    entity.shortNames?.en ??
    entity.shortName ??
    getLocalizedName(entity, locale)
  )
}

/**
 * 대회 현지화 이름 (competitionId 또는 slug 기반)
 * @param {{ id?:string, slug?:string, name?:string, shortName?:string }} comp
 * @param {'ko'|'en'} locale
 * @returns {string}
 */
export function getLocalizedCompetitionName(comp, locale = 'ko') {
  if (!comp) return ''
  const entry = comp.id ? COMPETITION_NAMES[comp.id] : null
  if (entry) return entry[locale] ?? entry.en ?? comp.name ?? ''
  return comp.names?.[locale] ?? comp.names?.en ?? comp.name ?? ''
}

export function getLocalizedCompetitionShortName(comp, locale = 'ko') {
  if (!comp) return ''
  const entry = comp.id ? COMPETITION_NAMES[comp.id] : null
  if (entry) {
    const key = locale === 'ko' ? 'shortKo' : 'shortEn'
    return entry[key] ?? entry.shortEn ?? comp.shortName ?? ''
  }
  return comp.shortNames?.[locale] ?? comp.shortNames?.en ?? comp.shortName ?? ''
}
