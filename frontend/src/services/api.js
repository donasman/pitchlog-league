/**
 * API 서비스 계층
 * 현재는 Mock Data를 반환. 백엔드 연결 시 fetch 호출로 교체.
 *
 * 교체 예시:
 *   const BASE = import.meta.env.VITE_API_BASE_URL ?? ''
 *   const res  = await fetch(`${BASE}/api/...`)
 *   if (!res.ok) throw new Error(res.statusText)
 *   return res.json()
 *
 * 오류를 빈 배열로 숨기지 않고 throw.
 * 페이지는 catch 후 ErrorState를 표시한다.
 */

import { COMPETITION_OVERVIEW, LIVE_PULSE, NEXT_KICKOFF, DATA_AS_OF } from '@/mocks/overview'
import { COMPETITIONS, SEASONS, getCompetitionBySlug } from '@/mocks/competitions'
import { MATCHES, UCL_KNOCKOUT_TIES, getMatchById, getMatchesByCompetition, getMatchesByTeam } from '@/mocks/matches'
import { MATCH_TEAM_STATS } from '@/mocks/matchStats'
import { getLineup, getTopRated } from '@/mocks/lineups'
import { STANDINGS, getStandings } from '@/mocks/standings'
import { TEAMS, getTeamBySlug, getTeamsByCompetition } from '@/mocks/teams'
import {
  PLAYERS,
  getPlayerBySlug,
  getPlayerStats,
  calcTotalStats,
  TOP_SCORERS,
  TOP_ASSISTERS,
  TOP_SCORERS_ALL,
  getCompetitionScorers,
  getCompetitionAssisters,
} from '@/mocks/players'

// ─── 대회 ──────────────────────────────────────────────────────

/** 대회 목록 */
export async function fetchCompetitions() {
  return COMPETITIONS
}

/** 시즌 목록 */
export async function fetchSeasons() {
  return SEASONS
}

/** 대회 목록 (스테이지 정보 포함) */
export async function fetchCompetitionsOverview() {
  // 백엔드 연결 시 GET /api/competitions?includeStage=true 로 교체
  return COMPETITIONS.map(comp => ({
    ...comp,
    stage: STANDINGS[comp.slug]?.stage ?? null,
  }))
}

/** 대회 상세 */
export async function fetchCompetition(slug) {
  const comp = getCompetitionBySlug(slug)
  if (!comp) throw new Error(`Competition not found: ${slug}`)
  return comp
}

/**
 * 대회 허브 — 한 번의 호출로 화면에 필요한 데이터를 묶어 반환
 * @param {string} slug
 */
export async function fetchCompetitionHub(slug) {
  const comp = getCompetitionBySlug(slug)
  if (!comp) throw new Error(`Competition not found: ${slug}`)
  return {
    comp,
    matches:   getMatchesByCompetition(slug),
    standings: getStandings(slug),
    teams:     getTeamsByCompetition(slug),
    topScorers:   getCompetitionScorers(slug).length > 0 ? getCompetitionScorers(slug) : TOP_SCORERS,
    topAssisters: getCompetitionAssisters(slug).length > 0 ? getCompetitionAssisters(slug) : TOP_ASSISTERS,
  }
}

// ─── 경기 ──────────────────────────────────────────────────────

/** 전체 경기 목록 (옵션 필터) */
export async function fetchAllMatches({ competitionSlug, displayState } = {}) {
  let result = [...MATCHES]
  if (competitionSlug) result = result.filter(m => m.competitionSlug === competitionSlug)
  if (displayState)    result = result.filter(m => m.displayState === displayState)
  return result
}

/** 대회별 경기 */
export async function fetchMatchesByCompetition(slug) {
  return getMatchesByCompetition(slug)
}

/** 경기 상세 */
export async function fetchMatch(id) {
  const match = getMatchById(id)
  if (!match) throw new Error(`Match not found: ${id}`)
  return match
}

/**
 * 경기 상세 + 팀 통계 + 라인업 + 평점 상위 선수
 * 백엔드 연결 시 GET /api/matches/:id/detail 으로 대체
 */
export async function fetchMatchDetail(id) {
  const match = getMatchById(id)
  if (!match) throw new Error(`Match not found: ${id}`)
  return {
    match,
    stats:    MATCH_TEAM_STATS[id] ?? null,
    lineup:   getLineup(id),        // null = 라인업 미공개 (31경기)
    topRated: getTopRated(id, 3),
  }
}

// ─── 팀 ────────────────────────────────────────────────────────

/** 전체 팀 목록 */
export async function fetchTeams() {
  // 백엔드 연결 시 GET /api/teams 로 교체
  return TEAMS
}

/** 국내 리그별 팀 그룹 목록 */
export async function fetchTeamsByLeague() {
  // 백엔드 연결 시 GET /api/teams/by-league 로 교체
  const DOMESTIC_SLUGS = ['premier-league', 'la-liga', 'bundesliga', 'serie-a', 'ligue-1']
  return DOMESTIC_SLUGS.map(slug => ({
    comp: getCompetitionBySlug(slug),
    teams: TEAMS.filter(t => t.competitions.includes(slug)),
  })).filter(g => g.comp && g.teams.length > 0)
}

/** 팀 목록 (대회 필터) */
export async function fetchTeamsByCompetition(slug) {
  return getTeamsByCompetition(slug)
}

/** 팀 상세 */
export async function fetchTeam(slug) {
  const team = getTeamBySlug(slug)
  if (!team) throw new Error(`Team not found: ${slug}`)
  return team
}

/** 팀 경기 목록 */
export async function fetchTeamMatches(slug) {
  return getMatchesByTeam(slug)
}

/**
 * 팀 상세 페이지 묶음 데이터
 * @param {string} slug
 */
export async function fetchTeamDetail(slug) {
  const team = getTeamBySlug(slug)
  if (!team) throw new Error(`Team not found: ${slug}`)
  const matches      = getMatchesByTeam(slug)
  const eplRank      = STANDINGS['premier-league']?.entries.find(e => e.teamSlug === slug) ?? null
  const players      = PLAYERS.filter(p => p.teamSlug === slug)
  const competitions = team.competitions.map(s => getCompetitionBySlug(s)).filter(Boolean)
  return { team, matches, eplRank, players, competitions }
}

/**
 * 팀 전체 일정 페이지 묶음 데이터
 * @param {string} slug
 */
export async function fetchTeamFixtures(slug) {
  const team = getTeamBySlug(slug)
  if (!team) throw new Error(`Team not found: ${slug}`)
  const matches      = getMatchesByTeam(slug)
  const competitions = team.competitions.map(s => getCompetitionBySlug(s)).filter(Boolean)
  return { team, matches, competitions }
}

// ─── 순위 ──────────────────────────────────────────────────────

/** 순위 */
export async function fetchStandings(competitionSlug) {
  const s = getStandings(competitionSlug)
  if (!s) throw new Error(`Standings not found: ${competitionSlug}`)
  return s
}

// ─── 선수 ──────────────────────────────────────────────────────

/** 선수 상세 */
export async function fetchPlayer(slug) {
  const player = getPlayerBySlug(slug)
  if (!player) throw new Error(`Player not found: ${slug}`)
  return player
}

/** 선수 통계 */
export async function fetchPlayerStats(slug, competitionId) {
  return getPlayerStats(slug, competitionId)
}

/**
 * 선수 상세 페이지 묶음 데이터
 * @param {string} slug
 */
export async function fetchPlayerDetail(slug) {
  const player = getPlayerBySlug(slug)
  if (!player) throw new Error(`Player not found: ${slug}`)
  const allStats = getPlayerStats(slug)
  const team     = getTeamBySlug(player.teamSlug) ?? null
  return { player, allStats, team, calcTotalStats }
}

// ─── 통계 순위 ─────────────────────────────────────────────────

/** 득점 순위 (EPL) */
export async function fetchTopScorers() { return TOP_SCORERS }

/** 도움 순위 (EPL) */
export async function fetchTopAssisters() { return TOP_ASSISTERS }

/** 득점 순위 (전체 대회 합산) */
export async function fetchTopScorersAll() { return TOP_SCORERS_ALL }

// ─── 알림 ───────────────────────────────────────────────────────

import { NOTIFICATIONS, NOTIFICATION_SETTINGS } from '@/mocks/notifications'

/** 알림 목록 */
export async function fetchNotifications() {
  return NOTIFICATIONS
}

/** 알림 설정 (권한 상태 포함) */
export async function fetchNotificationSettings() {
  return NOTIFICATION_SETTINGS
}

/**
 * 통계 — 전체 대회 합산 + 대회별 분해
 * stats 페이지의 "전체 합산" 탭용
 */
export async function fetchAllStats() {
  return {
    topScorers: TOP_SCORERS_ALL,
    topAssisters: TOP_ASSISTERS,
  }
}

// ─── UCL ───────────────────────────────────────────────────────

/** UCL 녹아웃 대진 */
export async function fetchUCLKnockout() { return UCL_KNOCKOUT_TIES }

// ─── 홈 화면 묶음 ──────────────────────────────────────────────

/**
 * 홈 오버뷰 — 제품 앞장에 필요한 데이터를 한 번에 반환
 * 백엔드 연결 시 GET /api/overview 로 교체
 */
export async function fetchOverview() {
  const eplStandings = getStandings('premier-league')?.entries?.slice(0, 3) ?? []
  return {
    competitions: COMPETITION_OVERVIEW,
    livePulse:    LIVE_PULSE,
    nextKickoff:  NEXT_KICKOFF,
    dataAsOf:     DATA_AS_OF,
    topScorers:   TOP_SCORERS_ALL.slice(0, 3),
    eplTop3:      eplStandings,
  }
}

/**
 * 홈 초기 데이터 (필터링은 컴포넌트에서 수행)
 * 백엔드 연결 시 단일 엔드포인트 GET /api/home 으로 대체
 */
export async function fetchHomeData() {
  const COMP_SLUGS = ['premier-league','la-liga','bundesliga','serie-a','ligue-1','champions-league']
  const competitionScorers = {}
  for (const slug of COMP_SLUGS) {
    competitionScorers[slug] = getCompetitionScorers(slug)
  }
  return {
    competitions:       COMPETITIONS,
    allMatches:         MATCHES,
    standings:          STANDINGS,
    uclKnockout:        UCL_KNOCKOUT_TIES,
    competitionScorers,
  }
}

/**
 * 통계 페이지 — 대회별 득점·도움 순위
 * 백엔드 연결 시 GET /api/stats?competition= 으로 대체
 * @param {string} slug  대회 slug
 */
export async function fetchCompetitionStats(slug) {
  const comp = getCompetitionBySlug(slug)
  if (!comp) throw new Error(`Competition not found: ${slug}`)
  return {
    comp,
    topScorers:   getCompetitionScorers(slug),
    topAssisters: getCompetitionAssisters(slug),
  }
}

// ─── 동기 접근용 재수출 (HomePage의 reactive 필터링에 사용) ────
// 주의: 이 exports는 백엔드 연결 시 제거하고 fetchHomeData로 통합한다
export {
  COMPETITIONS,
  MATCHES,
  STANDINGS,
  PLAYERS,
  TEAMS,
  UCL_KNOCKOUT_TIES,
  TOP_SCORERS_ALL,
  calcTotalStats,
}
