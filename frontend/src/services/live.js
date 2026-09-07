/**
 * 실 API 구현 — `GET /api/...`
 *
 * 지금 백엔드에 있는 것은 조회 API 6개다(NEXT_STEPS 6장):
 *   /api/competitions · /api/competitions/:ref · /api/teams · /api/teams/:ref
 *   /api/matches · /api/matches/:ref · /api/standings
 * 나머지는 NotImplementedError 를 던진다. 빈 배열로 위장하면 "데이터가 없는 것"과
 * "아직 안 만든 것"을 화면에서 구분할 수 없다.
 *
 * 경기 목록은 공통 창(오늘 KST 기준 −14일 ~ +21일)으로 받는다 — 시즌 전체(380경기×6)를
 * 매 화면마다 받을 이유가 없다. 팀 일정만 시즌 전체를 받는다(과거·오늘·미래를 한 흐름으로 그린다).
 */

import i18n from '@/i18n'
import { apiGet, NotImplementedError } from './http'
import {
  VISIBLE_COMPETITION_API_IDS,
  competitionRefFromSlug,
  deriveStage,
  normalizeCompetition,
  normalizeMatch,
  normalizeSeason,
  normalizeStanding,
  normalizeStandings,
  normalizeTeam,
} from './normalize'
import { now, todayKstKey } from './clock'
import { kstDateKey } from '../utils/dateFormat'
import { isLive } from '../utils/matchStatus'

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
  const known = competitionRefFromSlug(slugOrRef)
  if (known) return known
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

// ─── 경기 ──────────────────────────────────────────────────────

const DAY_MS = 86_400_000

/** 경기 목록 공통 창 — 오늘(KST) 기준 −14일 ~ +21일. 백엔드 from/to 는 KST 날짜(포함) */
function matchWindow() {
  const t = now().getTime()
  return {
    from: kstDateKey(new Date(t - 14 * DAY_MS)),
    to:   kstDateKey(new Date(t + 21 * DAY_MS)),
  }
}

/** `/api/matches` 한 번 — 정규화된 경기 배열과 목록 asOf 를 같이 준다 */
async function loadMatches(params = {}) {
  const res = await apiGet('/api/matches', params)
  return { items: (res.items ?? []).map(normalizeMatch), asOf: res.asOf ?? null }
}

/**
 * 전체 경기 (공통 창). Mock 과 같은 옵션 필터를 받는다.
 * @param {{ competitionSlug?: string, displayState?: string }} [params]
 */
export async function fetchAllMatches({ competitionSlug, displayState } = {}) {
  const { items } = await loadMatches(matchWindow())
  let result = items
  if (competitionSlug) result = result.filter(m => m.competitionSlug === competitionSlug)
  if (displayState)    result = result.filter(m => m.displayState === displayState)
  return result
}

/** 대회별 경기 (공통 창) */
export async function fetchMatchesByCompetition(slugOrRef) {
  const ref = await toCompetitionRef(slugOrRef)
  const { items } = await loadMatches({ competition: ref, ...matchWindow() })
  return items
}

/**
 * 경기 상세. 라인업·통계·이벤트·H2H 는 아직 백엔드에 없다 — 빈 값으로 위장하지 않고
 * `unavailable` 에 i18n 키를 실어 화면이 "아직 없음" 으로 그리게 한다.
 * @param {string|number} id  API-Football fixture id
 */
export async function fetchMatchDetail(id) {
  const dto = await apiGet(`/api/matches/${encodeURIComponent(id)}`)
  return {
    match:    normalizeMatch(dto),
    stats:    null,
    lineup:   null,
    topRated: [],
    unavailable: {
      lineup:   'errors.feature.lineups',
      stats:    'errors.feature.match_stats',
      h2h:      'errors.feature.h2h',
      timeline: 'errors.feature.events',
    },
  }
}

export async function fetchMatch(id) {
  return (await fetchMatchDetail(id)).match
}

// ─── 순위 ──────────────────────────────────────────────────────

/** `/api/standings?competition=` 은 표 1장을 items 에 담아 준다. 없으면 실패다 */
async function loadStandingsTable(ref, slugOrRef) {
  const res = await apiGet('/api/standings', { competition: ref })
  const table = res.items?.[0]
  if (!table) throw new Error(i18n.t('errors.competitionNotFound', { ref: slugOrRef }))
  return table
}

/**
 * 순위표. 컵(KNOCKOUT)·시작 전(EMPTY) 은 entries 가 비고 unavailableReason 이 실린다 — 실패가 아니다.
 * 스테이지(현재 라운드) 는 같은 대회 경기(공통 창)로 계산한다.
 */
export async function fetchStandings(slugOrRef) {
  const ref = await toCompetitionRef(slugOrRef)
  const [table, { items: matches }] = await Promise.all([
    loadStandingsTable(ref, slugOrRef),
    loadMatches({ competition: ref, ...matchWindow() }),
  ])
  return normalizeStandings(table, matches)
}

// ─── 대회 허브 ─────────────────────────────────────────────────

/**
 * 대회 허브 — 경기(공통 창)·순위·참가팀. 득점·도움 순위는 아직 백엔드에 없어 null 이다
 * (빈 배열이 아니다 — 화면이 "아직 없음" 과 "0명" 을 구분한다).
 */
export async function fetchCompetitionHub(slugOrRef) {
  const comp = await fetchCompetition(slugOrRef)
  const [{ items: matches }, table, teamsRes] = await Promise.all([
    loadMatches({ competition: comp.ref, ...matchWindow() }),
    loadStandingsTable(comp.ref, slugOrRef),
    apiGet('/api/teams', { competition: comp.ref }),
  ])
  return {
    comp,
    matches,
    standings: table.unavailableReason ? null : normalizeStandings(table, matches),
    teams: (teamsRes.items ?? []).map(normalizeTeam),
    topScorers:   null,
    topAssisters: null,
  }
}

// ─── 팀 일정 ───────────────────────────────────────────────────

/**
 * 팀 전체 일정 — 시즌 전체 경기 + 팀이 참가하는 화면 대회.
 * @param {string} ref  팀 ref(`33-manchester-united`). normalizeTeam 이 slug 에 ref 를 넣어 라우팅한다
 */
export async function fetchTeamFixtures(ref) {
  const [teamDto, { items: matches }, comps] = await Promise.all([
    apiGet(`/api/teams/${encodeURIComponent(ref)}`),
    loadMatches({ team: ref }),
    loadCompetitions(),
  ])
  const team = normalizeTeam(teamDto)
  return {
    team,
    matches,
    competitions: comps.filter(c => team.competitions.includes(c.ref)),
  }
}

export async function fetchTeamMatches(ref) {
  return (await fetchTeamFixtures(ref)).matches
}

// ─── 홈 ────────────────────────────────────────────────────────

/** ISO 문자열 배열의 최댓값. 전부 없으면 null */
function maxIso(values) {
  const list = values.filter(Boolean)
  return list.length ? list.reduce((a, b) => (a > b ? a : b)) : null
}

/** 킥오프 오름차순 */
function byKickoff(a, b) {
  return String(a.date).localeCompare(String(b.date))
}

/**
 * 홈 오버뷰 — 대회 6개 × (경기 공통 창 + 순위표) 를 두 번의 호출로 받아 Mock `overview.js` 형태로 묶는다.
 * 득점 순위는 아직 백엔드에 없어 null.
 */
export async function fetchOverview() {
  const [comps, matchesRes, standingsRes] = await Promise.all([
    loadCompetitions(),
    loadMatches(matchWindow()),
    apiGet('/api/standings'),
  ])
  const allMatches = matchesRes.items
  const tables     = standingsRes.items ?? []
  const nowDate    = now()
  const nowMs      = nowDate.getTime()
  const today      = todayKstKey()

  const tableFor = comp => tables.find(tb => tb.competition?.apiId === comp.apiId) ?? null
  const rowsFor  = comp => {
    const tb = tableFor(comp)
    return tb && !tb.unavailableReason
      ? (tb.rows ?? []).map(row => normalizeStanding(row, { format: comp.format }))
      : []
  }
  const upcoming = m => m.displayState === 'scheduled' && m.date && new Date(m.date).getTime() >= nowMs

  const competitions = comps.map(comp => {
    const matches = allMatches.filter(m => m.competitionSlug === comp.slug)
    const rows    = rowsFor(comp)
    const first   = rows.find(r => r.rank === 1) ?? null
    const next    = matches.filter(upcoming).sort(byKickoff)[0] ?? null
    return {
      ...comp,
      liveCount:     matches.filter(m => isLive(m.displayState)).length,
      upcomingCount: matches.filter(m => m.displayState === 'scheduled' && kstDateKey(m.date) === today).length,
      stage:         deriveStage(matches, nowDate),
      leader: first
        ? { teamId: first.teamId, teamSlug: first.teamSlug, teamName: first.teamName,
            teamInitials: first.teamInitials, teamColor: first.teamColor, points: first.points }
        : null,
      nextKickoff: next?.date ?? null,
      updatedAt:   tableFor(comp)?.asOf ?? null,
    }
  })

  const livePulse = allMatches.filter(m => isLive(m.displayState)).sort(byKickoff).map(m => ({
    matchId:         m.id,
    competitionSlug: m.competitionSlug,
    home: { name: m.homeTeam.name, initials: m.homeTeam.initials, color: m.homeTeam.color, score: m.score.home },
    away: { name: m.awayTeam.name, initials: m.awayTeam.initials, color: m.awayTeam.color, score: m.score.away },
    minute:       m.minute,
    displayState: m.displayState,
  }))

  const nextMatch = allMatches.filter(upcoming).sort(byKickoff)[0] ?? null
  const nextKickoff = nextMatch
    ? { matchId: nextMatch.id, competitionSlug: nextMatch.competitionSlug,
        homeName: nextMatch.homeTeam.name, awayName: nextMatch.awayTeam.name, date: nextMatch.date }
    : null

  const epl = comps.find(c => c.slug === 'premier-league')
  const eplTop3 = epl ? rowsFor(epl).slice(0, 3) : []

  return {
    competitions,
    livePulse,
    nextKickoff,
    dataAsOf:   maxIso([matchesRes.asOf, standingsRes.asOf, ...allMatches.map(m => m.asOf)]),
    eplTop3,
    topScorers: null,
  }
}

// ─── 아직 백엔드에 없는 것 ─────────────────────────────────────
// L1 스쿼드(9단계) · 이벤트·라인업·통계(10단계) 이후에 생긴다.

export const fetchTeamDetail      = () => notImplemented('errors.feature.team_detail')
export const fetchPlayer           = () => notImplemented('errors.feature.players')
export const fetchPlayerStats      = () => notImplemented('errors.feature.players')
export const fetchPlayerDetail     = () => notImplemented('errors.feature.players')
export const fetchTopScorers       = () => notImplemented('errors.feature.stats')
export const fetchTopAssisters     = () => notImplemented('errors.feature.stats')
export const fetchTopScorersAll    = () => notImplemented('errors.feature.stats')
export const fetchAllStats         = () => notImplemented('errors.feature.stats')
export const fetchCompetitionStats = () => notImplemented('errors.feature.stats')
export const fetchUCLKnockout      = () => notImplemented('errors.feature.knockout')
export const fetchHomeData         = () => notImplemented('errors.feature.home')
export const fetchNotifications    = () => notImplemented('errors.feature.notifications')
export const fetchNotificationSettings = () => notImplemented('errors.feature.notifications')
