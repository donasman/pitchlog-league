/**
 * Mock 구현 — 화면 검증용. 실제 서비스 데이터가 아니다.
 *
 * 페이지는 이 파일을 직접 import 하지 않는다. `services/api.js` 가
 * VITE_USE_MOCK 에 따라 이 구현과 `services/live.js` 중 하나를 고른다.
 *
 * 오류를 빈 배열로 숨기지 않고 throw. 페이지는 catch 후 ErrorState 를 표시한다.
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
import { ASSISTANT_SAMPLES } from '@/mocks/assistant'
import { apiIdFromAlias, normalizePlayerDetail } from './normalize'

// ─── 대회 ──────────────────────────────────────────────────────

/** 대회 목록 */
export async function fetchCompetitions() {
  return COMPETITIONS
}

/**
 * 시즌 목록. 실 API 와 시그니처를 맞춘다 — 호출부(AppHeader)가 대회를 넘긴다.
 * Mock 은 대회별 시즌 데이터가 없어 어느 대회든 같은 목록을 준다.
 * @param {string} [_slugOrRef]
 */
export async function fetchSeasons(_slugOrRef) {
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
export async function fetchCompetitionHub(slug, _season) {
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

/**
 * 전체 경기 목록 (옵션 필터). Mock 은 시즌별 데이터가 없어 season 은 무시한다.
 * 반환 모양은 실 API 와 같아야 한다 — `unavailableReason` 은 Mock 에서 항상 null 이다.
 */
export async function fetchAllMatches({ competitionSlug, displayState, season: _season } = {}) {
  let result = [...MATCHES]
  if (competitionSlug) result = result.filter(m => m.competitionSlug === competitionSlug)
  if (displayState)    result = result.filter(m => m.displayState === displayState)
  return { items: result, unavailableReason: null }
}

/** 대회별 경기 */
export async function fetchMatchesByCompetition(slug, _season) {
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
 * availability 는 실 API 와 shape 을 맞춘다 — 라인업이 없으면 'not_provided' (킥오프 1h 전 공개 규약).
 * Mock 은 이벤트·통계·선수 통계 원본이 있으면 'ok' · 없으면 'not_provided'.
 */
export async function fetchMatchDetail(id) {
  const match = getMatchById(id)
  if (!match) throw new Error(`Match not found: ${id}`)
  const stats  = MATCH_TEAM_STATS[id] ?? null
  const lineup = getLineup(id)
  return {
    match,
    stats,
    lineup,                                // null = 라인업 미공개 (31경기)
    topRated: getTopRated(id, 3),
    availability: {
      lineups:     lineup ? 'ok' : 'not_provided',
      events:      (match.events && match.events.length > 0) ? 'ok' : 'not_provided',
      teamStats:   stats  ? 'ok' : 'not_provided',
      playerStats: getTopRated(id, 3).length > 0 ? 'ok' : 'not_provided',
    },
  }
}

// ─── 팀 ────────────────────────────────────────────────────────

/**
 * 팀 목록. 실 구현(live.js)은 competition 이 필수라 시그니처를 맞춰 둔다.
 * @param {{ competition?: string }} [params]
 */
export async function fetchTeams({ competition } = {}) {
  if (!competition) return TEAMS
  return getTeamsByCompetition(competition)
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
  const leagueRank   = STANDINGS['premier-league']?.entries.find(e => e.teamSlug === slug) ?? null
  const players      = PLAYERS.filter(p => p.teamSlug === slug)
  const competitions = team.competitions.map(s => getCompetitionBySlug(s)).filter(Boolean)
  return { team, matches, leagueRank, players, competitions }
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
export async function fetchStandings(competitionSlug, _season) {
  const s = getStandings(competitionSlug)
  if (!s) throw new Error(`Standings not found: ${competitionSlug}`)
  return s
}

// ─── 선수 ──────────────────────────────────────────────────────

/**
 * 선수 상세 페이지 묶음 데이터.
 *
 * Mock 도 실 API 와 같은 shape 을 만들어 `normalizePlayerDetail` 을 통과시킨다 —
 * 정규화 이전 형태를 페이지가 소비하면 두 분기의 계약이 갈리고, 컴포넌트가 필드 존재
 * 여부로 분기 판정을 하게 된다 (dataStatus 판단이 컴포넌트로 흩어졌던 c9d9b54 회귀 배경).
 * @param {string} slug
 */
export async function fetchPlayerDetail(slug) {
  const player = getPlayerBySlug(slug)
  if (!player) throw new Error(`Player not found: ${slug}`)
  const rawStats = getPlayerStats(slug)
  // Mock 원본은 `dataStatus`·오브젝트 없는 평면 shape 이다.
  // 백엔드 `PlayerSeasonStatDto` shape (competition·season·team 오브젝트)으로 조립한다.
  const seasonStats = rawStats.map(s => ({
    competition: {
      // alias.id('epl') → apiId(39) 역매핑. 미매핑이면 undefined 로 두어 normalize 가 ref 폴백.
      apiId:       apiIdFromAlias(s.competitionId) ?? undefined,
      ref:         s.competitionId,
      displayName: s.competitionName,
    },
    season: { year: 2026, label: '2026-27' },
    team: {
      apiId:            player.teamId,   // mock 은 문자열 slug — teamColor 가 0 으로 fallback (색 하나만 나옴)
      displayName:      player.teamName,
      shortDisplayName: player.teamName,
    },
    appearances:    s.appearances,
    starts:         s.starts,
    minutes:        s.minutesPlayed,     // mock 필드명은 minutesPlayed → 백엔드 필드명은 minutes
    goals:          s.goals,
    assists:        s.assists,
    yellowCards:    s.yellowCards,
    yellowredCards: null,                // mock 은 이 필드 없음
    redCards:       s.redCards,
    asOf:           new Date().toISOString(),
  }))
  // dto.totals 는 백엔드가 계산해 준 값의 자리다. Mock 은 원본 rawStats 로 같은 규약(assists 하나라도
  // null 이면 null)을 재현하려 했지만, mock PLAYER_STATS 는 assists 가 전부 정수라 갈림 없음.
  const totals = calcTotalStats(rawStats)
  const dto = {
    apiId:            player.id,
    ref:              `${player.id}-${slug}`,
    displayName:      player.name,
    shortDisplayName: player.shortName ?? player.name,
    originalName:     player.name,
    firstname:    null,
    lastname:     null,
    birthDate:    player.dateOfBirth,
    birthPlace:   null,
    birthCountry: null,
    nationality:  player.nationality,
    heightCm:     null,
    weightKg:     null,
    photoUrl:     null,
    primaryTeam: player.teamId ? {
      apiId:            player.teamId,
      ref:              `${player.teamId}-${player.teamSlug}`,
      displayName:      player.teamName,
      shortDisplayName: player.teamName,
      code:             undefined,
      logoUrl:          undefined,
    } : null,
    jerseyNumber: player.number,
    position:     player.position,
    seasonStats,
    totals: {
      appearances: totals.appearances,
      minutes:     seasonStats.reduce((a, s) => a + s.minutes, 0),
      goals:       totals.goals,
      assists:     totals.assists,
      yellowCards: totals.yellowCards,
      redCards:    totals.redCards,
    },
    asOf: new Date().toISOString(),
  }
  return normalizePlayerDetail(dto)
}

// ─── 통계 ─────────────────────────────────────────────────────

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
  // 실 API 대회 객체와 같이 currentSeason 을 붙인다 — 홈 푸터가 읽는다 (오버뷰 Mock 에는 없음)
  const competitions = COMPETITION_OVERVIEW.map(o => ({
    ...o,
    currentSeason: COMPETITIONS.find(c => c.slug === o.slug)?.currentSeason ?? null,
  }))
  return {
    competitions,
    livePulse:    LIVE_PULSE,
    nextKickoff:  NEXT_KICKOFF,
    dataAsOf:     DATA_AS_OF,
    topScorers:   TOP_SCORERS_ALL.slice(0, 3),
    eplTop3:      eplStandings,
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

// ─── 검색 ──────────────────────────────────────────────────────

/**
 * 검색 Mock — 클라이언트 인덱스(`utils/searchIndex.js`)를 그대로 재사용.
 *
 * 실 API 는 백엔드가 매칭하지만 Mock 모드는 백엔드가 없다 —
 * `getSearchIndex()` 로 팀·선수·대회 인덱스를 한 번 만든 뒤 `searchAll` 로 걸러 낸다.
 * 반환 shape 은 실 API 와 같은 { teams, players, competitions }.
 *
 * signal 은 Mock 에서 의미가 없지만 시그니처는 실 API 와 맞춘다 —
 * useSearch 가 abort 됐다고 판정하면 그 결과를 버리므로 결과가 유해하지 않다.
 *
 * @param {string} q
 * @param {{ signal?: AbortSignal, limit?: number, locale?: string }} [_opts]
 */
export async function fetchSearch(q, _opts = {}) {
  const { getSearchIndex, searchAll } = await import('@/utils/searchIndex')
  const limit = _opts.limit ?? 5
  const index = await getSearchIndex()
  // searchAll 은 기존 클라이언트 인덱스 아이템 shape(초기 label/sublabel/initials/color/logoUrl/shortName/names)을 그대로 준다 —
  // SearchPanel 이 같은 shape 를 소비하므로 여기서 다시 정규화하지 않는다
  return searchAll(index, q, limit)
}

// ─── 어시스턴트 ────────────────────────────────────────────────

/**
 * AI 어시스턴트 Mock — ASSISTANT_SAMPLES 를 실 API 응답 shape 으로 변환.
 * 실 shape: { answer, evidence: [{tool, args, asOf}], data: [], truncated, model }.
 * ASSISTANT_SAMPLES 는 evidence 가 단일 객체(tool/args/asOf/source)라 배열로 감싸고,
 * 카드 데이터는 data 배열로 옮긴다. 매칭 안 되는 질문은 tool 없이 "그 질문은 아직 데이터가 없다".
 * @param {string} question
 */
export async function askAssistant(question) {
  const sample = ASSISTANT_SAMPLES.find(s => s.question === question)
  if (!sample) {
    // 백엔드 응답 shape 을 흉내낸다. answer 는 도구 결과 문장 자리 —
    // 실 서비스에서는 LLM/도구 결과가 그대로 오므로 서비스 계층에서 번역하지 않는다.
    return {
      answer:    'No data available for that question yet.',
      evidence:  [],
      data:      [],
      truncated: false,
      model:     'mock',
    }
  }
  const evidence = sample.evidence
    ? [{ tool: sample.evidence.tool, args: sample.evidence.args, asOf: sample.evidence.asOf }]
    : []
  return {
    answer:    sample.answer,
    evidence,
    data:      sample.cards ?? [],
    truncated: false,
    model:     'mock',
  }
}
