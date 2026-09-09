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
import { apiGet, apiPost, NotImplementedError } from './http'
import {
  VISIBLE_COMPETITION_API_IDS,
  competitionRefFromSlug,
  deriveStage,
  groupCountOf,
  normalizeCompetition,
  normalizeMatch,
  normalizePlayerDetail,
  normalizeSeason,
  normalizeStanding,
  normalizeStandings,
  normalizeStatsRow,
  normalizeTeam,
} from './normalize'
import { now, todayKstKey } from './clock'
import { isPastSeason } from '../utils/seasons'
import { kstDateKey } from '../utils/dateFormat'
import { isLive } from '../utils/matchStatus'

// ─── 요청 합치기 + TTL 캐시 ───────────────────────────────────
//
// 화면 한 장에서 같은 GET 이 여러 번 나가는 경우가 있다(오버뷰가 대회 목록·순위·경기를
// 병렬로 부르고, 그 안에서 다시 대회 목록을 참조한다). fetch 를 그대로 두면 같은 URL
// 요청이 겹쳐서 나간다. 여기서 두 겹으로 막는다:
//   1) inflight  — 진행 중인 promise 를 URL 로 공유해 동시 요청을 한 번으로 합친다
//   2) cache     — 응답을 TTL 동안 보관해 반복 조회를 아예 없앤다
//
// 캐시 계층은 live.js 안에서만 쓴다. mock.js 는 이 계층을 안 타므로 Mock 모드에서는
// 자연히 우회된다(services/api.js 스위치가 mock 을 고른다). live 는 모드 판정을
// 하지 않는다 — 실 API 를 부를 때 캐시를 걸 뿐이다.

/** 진행 중인 GET 프라미스 (같은 key 는 하나만 보낸다) */
const inflight = new Map()

/** 응답 캐시 {value, expiresAt} */
const cache = new Map()

/** 대회·팀 메타는 자주 변하지 않아 300s. 그 외는 60s */
const TTL_LONG_MS  = 300_000
const TTL_SHORT_MS = 60_000

/** path → TTL. 대회·팀 메타만 길게 잡는다 */
function _ttlFor(path) {
  if (path.startsWith('/api/competitions') || path.startsWith('/api/teams')) return TTL_LONG_MS
  return TTL_SHORT_MS
}

/** null·undefined·빈 문자열을 뺀 뒤 정렬한 쿼리스트링. http.js 의 toQuery 와 같은 규칙 */
function _cacheKey(path, params) {
  const entries = Object.entries(params ?? {})
    .filter(([, v]) => v !== undefined && v !== null && v !== '')
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => [k, String(v)])
  if (entries.length === 0) return path
  return path + '?' + new URLSearchParams(entries).toString()
}

/** 유효 캐시가 있으면 값, 없으면 null. 만료된 항목은 여기서 지운다 */
function _cacheGet(key) {
  const hit = cache.get(key)
  if (!hit) return null
  if (hit.expiresAt <= Date.now()) {
    cache.delete(key)
    return null
  }
  return hit.value
}

/** 새 응답을 저장한다. TTL 은 _ttlFor 로 정한다 */
function _cacheSet(key, value, ttlMs) {
  cache.set(key, { value, expiresAt: Date.now() + ttlMs })
}

/**
 * apiGet 을 감싼다. 순서:
 *   1) inflight 에 같은 key 가 있으면 그 promise 를 그대로 돌려준다
 *   2) 캐시가 유효하면 그 값을 Promise.resolve 로 감싸 준다
 *   3) 없으면 apiGet 을 부르고 성공 시 캐시에 넣는다. 실패는 캐시하지 않는다
 * inflight 는 성공·실패와 관계없이 마지막에 제거한다.
 */
function _cachedGet(path, params) {
  const key = _cacheKey(path, params)
  const running = inflight.get(key)
  if (running) return running

  const cached = _cacheGet(key)
  if (cached !== null) return Promise.resolve(cached)

  const ttl = _ttlFor(path)
  const p = apiGet(path, params)
    .then(value => {
      _cacheSet(key, value, ttl)
      return value
    })
    .finally(() => {
      inflight.delete(key)
    })
  inflight.set(key, p)
  return p
}

/**
 * 테스트 전용 — 캐시·inflight 를 통째로 비운다.
 * 프로덕션 코드는 부르지 않는다(대회 목록 무효화는 invalidateCompetitions 를 쓴다).
 */
export function __resetCache() {
  cache.clear()
  inflight.clear()
}

// ─── 대회 목록 캐시 ────────────────────────────────────────────

function loadCompetitions() {
  return _cachedGet('/api/competitions').then(res =>
    res.items
      .filter(c => VISIBLE_COMPETITION_API_IDS.includes(c.apiId))
      .map(normalizeCompetition),
  )
}

/**
 * 대회 목록이 바뀌었을 때(언어 전환 등) 캐시를 버린다.
 * `/api/competitions` · `/api/teams` prefix 를 함께 지운다 —
 * 대회 표기 언어가 바뀌면 팀 목록 표기도 같이 갱신되어야 한다.
 * inflight 은 손대지 않는다 — 진행 중 promise 는 이번 사용자 요청의 결과라 유지한다.
 */
export function invalidateCompetitions() {
  for (const key of Array.from(cache.keys())) {
    if (key.startsWith('/api/competitions') || key.startsWith('/api/teams')) {
      cache.delete(key)
    }
  }
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
  const dto = await _cachedGet(`/api/competitions/${encodeURIComponent(ref)}`)
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
  const res = await _cachedGet('/api/teams', { competition: ref, season })
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
  const dto = await _cachedGet(`/api/teams/${encodeURIComponent(slugOrRef)}`)
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

/**
 * 시즌을 고려한 경기 조회 창.
 *
 * 공통 창은 "오늘(KST) 기준 −14~+21일" 이다. 과거 시즌에 그 창을 걸면 백엔드가
 * `season AND kickoff in window` 로 걸러 경기가 항상 0건이 된다.
 * 과거 시즌이면 창을 통째로 뺀다 — 그 시즌 경기는 그 시즌 안에만 있으므로
 * `?season=` 만으로 이미 범위가 한정되고, 시즌 시작·종료일을 from/to 로 거는 것과 결과가 같다.
 * (시작·종료일을 쓰려면 대회 상세를 한 번 더 받아야 하는데 결과가 같아 그렇게 하지 않았다.)
 *
 * 현재 시즌 여부는 `loadCompetitions()` 캐시의 `currentSeasonYear` 로 가린다 — 추가 요청이 없다.
 *
 * @param {number|string|null|undefined} season  연도. 없으면 기존 동작(공통 창) 그대로다
 * @param {string} [ref]  대회 ref. 없으면(전체 경기·홈) 화면 대회 중 어느 현재 시즌도 아닐 때만 과거로 본다
 * @returns {Promise<{from?: string, to?: string}>}
 */
async function matchWindowFor(season, ref) {
  return (await isPastSeasonYear(season, ref)) ? {} : matchWindow()
}

/**
 * 고른 시즌이 과거 시즌인가. `loadCompetitions()` 캐시의 `currentSeasonYear` 로 가리므로 추가 요청이 없다.
 * 시즌을 안 골랐거나 현재 시즌 연도를 모르면 false — 근거 없이 "과거" 로 단정하면
 * 호출자가 조회 창을 걷어내거나 요청을 막아 버린다.
 */
async function isPastSeasonYear(season, ref) {
  if (season === undefined || season === null || season === '') return false
  const comps = await loadCompetitions()
  const scoped = ref ? comps.find(c => c.ref === ref) : null
  const currentYears = (scoped ? [scoped] : comps)
    .map(c => c.currentSeasonYear)
    .filter(y => y !== null && y !== undefined)
  if (currentYears.length === 0) return false
  return !currentYears.includes(Number(season))
}

/** `/api/matches` 한 번 — 정규화된 경기 배열과 목록 asOf 를 같이 준다 */
async function loadMatches(params = {}) {
  const res = await _cachedGet('/api/matches', params)
  return { items: (res.items ?? []).map(normalizeMatch), asOf: res.asOf ?? null }
}

/**
 * 전체 경기. Mock 과 같은 옵션 필터를 받는다.
 *
 * 현재 시즌: 지금까지처럼 공통 창으로 6대회를 한 번에 받아 대회·상태는 여기서 거른다.
 * 과거 시즌: 창이 없어 6대회 × 한 시즌이면 ≈1,900경기가 통째로 온다. 그래서
 *   · 대회를 안 골랐으면 요청을 보내지 않고 `unavailableReason` 을 실어 돌려준다
 *     (순위표의 KNOCKOUT·EMPTY 와 같은 관용구 — 빈 배열로 위장하지 않는다).
 *   · 대회를 골랐으면 `competition` 을 서버 파라미터로 내려 한 대회(≈380경기)만 받는다.
 *
 * @param {{ competitionSlug?: string, displayState?: string, season?: number }} [params]
 * @returns {Promise<{ items: Array<object>, unavailableReason: string|null }>}
 */
export async function fetchAllMatches({ competitionSlug, displayState, season } = {}) {
  const past = await isPastSeasonYear(season)
  if (past && !competitionSlug) return { items: [], unavailableReason: 'COMPETITION_REQUIRED' }

  const competition = past ? await toCompetitionRef(competitionSlug) : undefined
  // 과거 시즌·단일 대회는 ≈380경기 — 백엔드 기본 limit 로는 페이지가 잘려 나온다. 명시적으로 올린다
  const { items } = await loadMatches({ competition, season, limit: 500, ...(past ? {} : matchWindow()) })
  let result = items
  if (competitionSlug) result = result.filter(m => m.competitionSlug === competitionSlug)
  if (displayState)    result = result.filter(m => m.displayState === displayState)
  return { items: result, unavailableReason: null }
}

/**
 * 대회별 경기 (공통 창 — 과거 시즌이면 창 없음)
 * @param {string} slugOrRef
 * @param {number} [season]  연도. 없으면 백엔드가 현재 시즌으로 폴백한다
 */
export async function fetchMatchesByCompetition(slugOrRef, season) {
  const ref = await toCompetitionRef(slugOrRef)
  const { items } = await loadMatches({ competition: ref, season, ...(await matchWindowFor(season, ref)) })
  return items
}

/**
 * 경기 상세. 라인업·통계·이벤트·H2H 는 아직 백엔드에 없다 — 빈 값으로 위장하지 않고
 * `unavailable` 에 i18n 키를 실어 화면이 "아직 없음" 으로 그리게 한다.
 * @param {string|number} id  API-Football fixture id
 */
export async function fetchMatchDetail(id) {
  const dto = await _cachedGet(`/api/matches/${encodeURIComponent(id)}`)
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
async function loadStandingsTable(ref, slugOrRef, season) {
  const res = await _cachedGet('/api/standings', { competition: ref, season })
  const table = res.items?.[0]
  if (!table) throw new Error(i18n.t('errors.competitionNotFound', { ref: slugOrRef }))
  return table
}

/**
 * 순위표. 컵(KNOCKOUT)·시작 전(EMPTY) 은 entries 가 비고 unavailableReason 이 실린다 — 실패가 아니다.
 * 스테이지(현재 라운드) 는 같은 대회 경기(공통 창)로 계산한다 — 순위표 자체엔 창이 필요 없지만
 * 그 경기 조회에는 필요하고, 과거 시즌이면 창이 0건을 만들므로 `matchWindowFor` 로 걷어낸다.
 * @param {string} slugOrRef
 * @param {number} [season]  연도. 없으면 백엔드가 isCurrent → 최신 순으로 폴백한다
 */
export async function fetchStandings(slugOrRef, season) {
  const ref = await toCompetitionRef(slugOrRef)
  const range = await matchWindowFor(season, ref)
  const [table, { items: matches }] = await Promise.all([
    loadStandingsTable(ref, slugOrRef, season),
    // 과거 시즌엔 창이 걷혀 시즌 전체(≈380경기)가 온다. 안전판으로 limit 명시
    loadMatches({ competition: ref, season, limit: 500, ...range }),
  ])
  return normalizeStandings(table, matches)
}

// ─── 대회 허브 ─────────────────────────────────────────────────

/**
 * 대회 허브 — 경기(공통 창)·순위·참가팀. 득점·도움 순위는 아직 백엔드에 없어 null 이다
 * (빈 배열이 아니다 — 화면이 "아직 없음" 과 "0명" 을 구분한다).
 * @param {string} slugOrRef
 * @param {number} [season]  연도. 없으면 백엔드가 현재 시즌으로 폴백한다
 */
export async function fetchCompetitionHub(slugOrRef, season) {
  const comp = await fetchCompetition(slugOrRef)
  // 대회 상세가 시즌 목록을 같이 주므로 isCurrent 로 직접 가린다 — 과거 시즌엔 공통 창이 0건을 만든다
  const range = isPastSeason(season, comp.seasons) ? {} : matchWindow()
  const [{ items: matches }, table, teamsRes] = await Promise.all([
    // 과거 시즌엔 창이 걷혀 대회 시즌 전체(≈380경기)가 온다. 안전판으로 limit 명시
    loadMatches({ competition: comp.ref, season, limit: 500, ...range }),
    loadStandingsTable(comp.ref, slugOrRef, season),
    _cachedGet('/api/teams', { competition: comp.ref, season }),
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
    _cachedGet(`/api/teams/${encodeURIComponent(ref)}`),
    // 팀 일정은 시즌 전체(과거·오늘·미래 전부) — 6대회 × 시즌이면 60경기가 넘을 수 있어 명시
    loadMatches({ team: ref, limit: 500 }),
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
    // 공통 창(−14~+21일) 안이라도 6대회 합치면 수백 건이 나올 수 있어 안전판으로 limit 명시
    loadMatches({ ...matchWindow(), limit: 500 }),
    _cachedGet('/api/standings'),
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
      // groupCount 를 같이 넘긴다 — 안 넘기면 기본값 1 이라 조별리그 시즌의 조 4위(description null)가
      // rank 폴백에 걸려 'ucl_direct'(16강 직행)로 칠해진다. 지금은 zone 을 화면에 안 쓰지만 대칭을 지킨다
      ? (tb.rows ?? []).map(row =>
          normalizeStanding(row, { format: comp.format, groupCount: groupCountOf(tb.rows) }))
      : []
  }
  const upcoming = m => m.displayState === 'scheduled' && m.date && new Date(m.date).getTime() >= nowMs

  /**
   * 대회 "선두" — 순위표가 한 장일 때만 성립한다.
   * 조별리그 시즌(UCL 2022·2023 은 8조 × 4팀)은 조마다 rank 1 이 있고 백엔드가
   * `groupName asc, rank asc` 로 주므로, 그냥 첫 rank 1 을 쓰면 A조 1위가 대회 선두로 찍힌다.
   * groupName 이 둘 이상이면 선두를 비운다 — 틀린 팀을 보여주는 것보다 안 보여주는 게 맞다.
   * 판정은 원본 DTO 행에서 한다 — 정규화 결과를 거치지 않고 백엔드가 준 groupName 을 그대로 센다.
   */
  const singleTableLeader = (table, rows) => {
    const groups = new Set((table?.rows ?? []).map(r => r.groupName ?? null))
    if (groups.size > 1) return null
    return rows.find(r => r.rank === 1) ?? null
  }

  const competitions = comps.map(comp => {
    const matches = allMatches.filter(m => m.competitionSlug === comp.slug)
    const rows    = rowsFor(comp)
    const first   = singleTableLeader(tableFor(comp), rows)
    const next    = matches.filter(upcoming).sort(byKickoff)[0] ?? null
    return {
      ...comp,
      liveCount:     matches.filter(m => isLive(m.displayState)).length,
      upcomingCount: matches.filter(m => m.displayState === 'scheduled' && kstDateKey(m.date) === today).length,
      stage:         deriveStage(matches, nowDate),
      leader: first
        ? { teamId: first.teamId, teamSlug: first.teamSlug, teamName: first.teamName,
            teamInitials: first.teamInitials, teamColor: first.teamColor,
            teamLogoUrl: first.teamLogoUrl, teamApiId: first.teamApiId,
            points: first.points }
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

// ─── 어시스턴트 ────────────────────────────────────────────────

/**
 * AI 어시스턴트 — `POST /api/assistant` 로 질문을 보낸다.
 * 4xx/5xx 는 apiPost 규약대로 그대로 throw 한다 (컨텍스트가 error 상태로 그린다).
 * @param {string} question
 * @returns {Promise<{answer:string, evidence:Array<{tool:string,args:object,asOf:string|null}>, data:Array<object>, truncated:boolean, model:string}>}
 */
export async function askAssistant(question) {
  return apiPost('/api/assistant', { question })
}

// ─── 아직 백엔드에 없는 것 ─────────────────────────────────────
// L1 스쿼드(9단계) · 이벤트·라인업·통계(10단계) 이후에 생긴다.

export const fetchTeamDetail      = () => notImplemented('errors.feature.team_detail')
export const fetchPlayer           = () => notImplemented('errors.feature.players')
export const fetchPlayerStats      = () => notImplemented('errors.feature.players')

/**
 * 선수 상세 — `/api/players/:ref`. 화면이 넘기는 slug 는 백엔드 ref(`<apiId>-<slug>`) 와 같은 값이다
 * (normalizePlayerDetail 이 player.slug 에 dto.ref 를 그대로 넣는다).
 * @param {string} slug
 */
export async function fetchPlayerDetail(slug) {
  const dto = await _cachedGet(`/api/players/${encodeURIComponent(slug)}`)
  return normalizePlayerDetail(dto)
}

export const fetchTopScorers       = () => notImplemented('errors.feature.stats')
export const fetchTopAssisters     = () => notImplemented('errors.feature.stats')
export const fetchTopScorersAll    = () => notImplemented('errors.feature.stats')

/**
 * 전체 합산 통계 — 대회 파라미터 없이 부르면 백엔드가 대회별 breakdown 을 붙여 준다
 * (모드 B). StatsPage 의 `AllStatsPanel` 이 이 breakdown 을 소비한다.
 */
export async function fetchAllStats() {
  const [scorers, assisters] = await Promise.all([
    _cachedGet('/api/stats/scorers'),
    _cachedGet('/api/stats/assisters'),
  ])
  return {
    topScorers:   (scorers.items   ?? []).map(normalizeStatsRow),
    topAssisters: (assisters.items ?? []).map(normalizeStatsRow),
  }
}

/**
 * 대회별 통계 — 대회 참조를 파라미터로 실어 부른다(모드 A). breakdown 은 오지 않는다.
 * @param {string} slug  화면 slug (`premier-league` · `champions-league` 등)
 */
export async function fetchCompetitionStats(slug) {
  const ref = await toCompetitionRef(slug)
  const [comp, scorers, assisters] = await Promise.all([
    fetchCompetition(slug),
    _cachedGet('/api/stats/scorers',   { competition: ref }),
    _cachedGet('/api/stats/assisters', { competition: ref }),
  ])
  return {
    comp,
    topScorers:   (scorers.items   ?? []).map(normalizeStatsRow),
    topAssisters: (assisters.items ?? []).map(normalizeStatsRow),
  }
}

export const fetchUCLKnockout      = () => notImplemented('errors.feature.knockout')
export const fetchHomeData         = () => notImplemented('errors.feature.home')
export const fetchNotifications    = () => notImplemented('errors.feature.notifications')
export const fetchNotificationSettings = () => notImplemented('errors.feature.notifications')
