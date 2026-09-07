/**
 * 서비스 계층 진입점 — 페이지는 항상 이 파일만 import 한다.
 *
 * VITE_USE_MOCK 으로 구현을 통째로 고른다:
 *   true  (기본) → services/mock.js  — 화면 검증용 Mock
 *   false        → services/live.js  — 실 API (VITE_API_BASE_URL 필요)
 *
 * 한 화면 안에서 Mock 과 실 데이터를 섞지 않는다. 섞이면 어디까지 진짜인지
 * 화면만 봐서는 알 수 없다. 실 API 모드에서 아직 백엔드에 없는 데이터는
 * NotImplementedError 로 드러난다 — 빈 목록으로 위장하지 않는다.
 */

import * as mock from './mock'
import * as live from './live'
import { USE_MOCK } from './env'

/** 기존 import 경로 유지 (`searchIndex.js` 가 여기서 읽는다). 계산은 `env.js` — 순환 import 방지 */
export { USE_MOCK }

const impl = USE_MOCK ? mock : live

// 대회
export const fetchCompetitions         = (...a) => impl.fetchCompetitions(...a)
export const fetchCompetitionsOverview = (...a) => impl.fetchCompetitionsOverview(...a)
export const fetchCompetition          = (...a) => impl.fetchCompetition(...a)
export const fetchCompetitionHub       = (...a) => impl.fetchCompetitionHub(...a)
export const fetchSeasons              = (...a) => impl.fetchSeasons(...a)

// 경기
export const fetchAllMatches           = (...a) => impl.fetchAllMatches(...a)
export const fetchMatchesByCompetition = (...a) => impl.fetchMatchesByCompetition(...a)
export const fetchMatch                = (...a) => impl.fetchMatch(...a)
export const fetchMatchDetail          = (...a) => impl.fetchMatchDetail(...a)

// 팀
export const fetchTeams                = (...a) => impl.fetchTeams(...a)
export const fetchTeamsByLeague        = (...a) => impl.fetchTeamsByLeague(...a)
export const fetchTeamsByCompetition   = (...a) => impl.fetchTeamsByCompetition(...a)
export const fetchTeam                 = (...a) => impl.fetchTeam(...a)
export const fetchTeamMatches          = (...a) => impl.fetchTeamMatches(...a)
export const fetchTeamDetail           = (...a) => impl.fetchTeamDetail(...a)
export const fetchTeamFixtures         = (...a) => impl.fetchTeamFixtures(...a)

// 순위
export const fetchStandings            = (...a) => impl.fetchStandings(...a)

// 선수·통계
export const fetchPlayer               = (...a) => impl.fetchPlayer(...a)
export const fetchPlayerStats          = (...a) => impl.fetchPlayerStats(...a)
export const fetchPlayerDetail         = (...a) => impl.fetchPlayerDetail(...a)
export const fetchTopScorers           = (...a) => impl.fetchTopScorers(...a)
export const fetchTopAssisters         = (...a) => impl.fetchTopAssisters(...a)
export const fetchTopScorersAll        = (...a) => impl.fetchTopScorersAll(...a)
export const fetchAllStats             = (...a) => impl.fetchAllStats(...a)
export const fetchCompetitionStats     = (...a) => impl.fetchCompetitionStats(...a)

// 그 밖
export const fetchUCLKnockout          = (...a) => impl.fetchUCLKnockout(...a)
export const fetchOverview             = (...a) => impl.fetchOverview(...a)
export const fetchHomeData             = (...a) => impl.fetchHomeData(...a)
export const fetchNotifications        = (...a) => impl.fetchNotifications(...a)
export const fetchNotificationSettings = (...a) => impl.fetchNotificationSettings(...a)
