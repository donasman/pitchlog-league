/**
 * 실 API 구현 — `GET /api/...`
 *
 * 지금 백엔드에 있는 것은 조회 API 4개뿐이다(NEXT_STEPS 6장):
 *   /api/competitions · /api/competitions/:ref · /api/teams · /api/teams/:ref
 * 나머지는 NotImplementedError 를 던진다. 빈 배열로 위장하면 "데이터가 없는 것"과
 * "아직 안 만든 것"을 화면에서 구분할 수 없다.
 */

import i18n from '@/i18n'
import { apiGet, NotImplementedError } from './http'
import {
  VISIBLE_COMPETITION_API_IDS,
  normalizeCompetition,
  normalizeTeam,
  normalizeSeason,
} from './normalize'

/** 헤더·검색·페이지가 모두 대회 목록을 부른다. 한 번만 받아서 나눠 쓴다 */
let competitionsPromise = null

function loadCompetitions() {
  competitionsPromise ??= apiGet('/api/competitions').then(res =>
    res.items
      .filter(c => VISIBLE_COMPETITION_API_IDS.includes(c.apiId))
      .map(normalizeCompetition),
  )
  return competitionsPromise
}

/** 대회 목록이 바뀌었을 때(언어 전환 등) 캐시를 버린다 */
export function invalidateCompetitions() {
  competitionsPromise = null
}

/** @param {string} featureKey  i18n 키 (errors.feature.*) */
function notImplemented(featureKey) {
  return Promise.reject(new NotImplementedError(featureKey))
}

// ─── 대회 ──────────────────────────────────────────────────────

export async function fetchCompetitions() {
  return loadCompetitions()
}

export async function fetchCompetitionsOverview() {
  // 라운드·스테이지 표기는 L2(일정 적재) 이후에 생긴다. 그전에는 stage 가 없다
  const comps = await loadCompetitions()
  return comps.map(c => ({ ...c, stage: null }))
}

/** @param {string} slugOrRef  화면 라우팅은 기존 slug 를 쓴다 — 목록에서 ref 를 찾는다 */
export async function fetchCompetition(slugOrRef) {
  const ref = await toCompetitionRef(slugOrRef)
  const dto = await apiGet(`/api/competitions/${encodeURIComponent(ref)}`)
  return { ...normalizeCompetition(dto), seasons: (dto.seasons ?? []).map(normalizeSeason) }
}

/** 시즌 목록 — 대회를 지정하지 않으면 현재 선택된 대회가 없다는 뜻이라 EPL 기준 */
export async function fetchSeasons(slugOrRef = 'premier-league') {
  const comp = await fetchCompetition(slugOrRef)
  return comp.seasons
}

/** 화면이 넘기는 slug(`premier-league`)를 백엔드 ref(`39-premier-league`)로 바꾼다 */
async function toCompetitionRef(slugOrRef) {
  if (/^\d+(-|$)/.test(String(slugOrRef))) return slugOrRef  // 이미 ref 거나 숫자 id
  const comps = await loadCompetitions()
  const hit = comps.find(c => c.slug === slugOrRef)
  if (!hit) throw new Error(i18n.t('errors.competitionNotFound', { ref: slugOrRef }))
  return hit.ref
}

// ─── 팀 ────────────────────────────────────────────────────────

/**
 * 대회시즌 참가팀. 백엔드는 competition 을 필수로 받는다 —
 * 컵 하부 라운드까지 팀이 1,888개라 전체 목록에 해당하는 화면이 없다.
 * @param {{ competition: string, season?: number }} params
 */
export async function fetchTeams({ competition, season } = {}) {
  if (!competition) throw new Error(i18n.t('errors.competitionRequired'))
  const ref = await toCompetitionRef(competition)
  const res = await apiGet('/api/teams', { competition: ref, season })
  return res.items.map(normalizeTeam)
}

export async function fetchTeamsByCompetition(slugOrRef, season) {
  return fetchTeams({ competition: slugOrRef, season })
}

/** 국내 리그 5개를 묶어서 — /teams 화면용. 대회당 한 번씩 부른다 */
export async function fetchTeamsByLeague() {
  const comps = await loadCompetitions()
  const domestic = comps.filter(c => c.format === 'league')

  const groups = await Promise.all(
    domestic.map(async comp => ({ comp, teams: await fetchTeams({ competition: comp.ref }) })),
  )
  return groups.filter(g => g.teams.length > 0)
}

export async function fetchTeam(slugOrRef) {
  const dto = await apiGet(`/api/teams/${encodeURIComponent(slugOrRef)}`)
  return normalizeTeam(dto)
}

// ─── 아직 백엔드에 없는 것 ─────────────────────────────────────
// L2 일정 적재(8단계) · L1 스쿼드(9단계) 이후에 생긴다.

export const fetchCompetitionHub   = () => notImplemented('errors.feature.competition_hub')
export const fetchAllMatches       = () => notImplemented('errors.feature.matches')
export const fetchMatchesByCompetition = () => notImplemented('errors.feature.matches')
export const fetchMatch            = () => notImplemented('errors.feature.matches')
export const fetchMatchDetail      = () => notImplemented('errors.feature.matches')
export const fetchTeamMatches      = () => notImplemented('errors.feature.matches')
export const fetchTeamDetail       = () => notImplemented('errors.feature.team_detail')
export const fetchTeamFixtures     = () => notImplemented('errors.feature.matches')
export const fetchStandings        = () => notImplemented('errors.feature.standings')
export const fetchPlayer           = () => notImplemented('errors.feature.players')
export const fetchPlayerStats      = () => notImplemented('errors.feature.players')
export const fetchPlayerDetail     = () => notImplemented('errors.feature.players')
export const fetchTopScorers       = () => notImplemented('errors.feature.stats')
export const fetchTopAssisters     = () => notImplemented('errors.feature.stats')
export const fetchTopScorersAll    = () => notImplemented('errors.feature.stats')
export const fetchAllStats         = () => notImplemented('errors.feature.stats')
export const fetchCompetitionStats = () => notImplemented('errors.feature.stats')
export const fetchUCLKnockout      = () => notImplemented('errors.feature.knockout')
export const fetchOverview         = () => notImplemented('errors.feature.home')
export const fetchHomeData         = () => notImplemented('errors.feature.home')
export const fetchNotifications    = () => notImplemented('errors.feature.notifications')
export const fetchNotificationSettings = () => notImplemented('errors.feature.notifications')
