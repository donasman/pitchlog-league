/**
 * 클라이언트 검색 인덱스 — 팀·대회(+Mock 모드에서는 선수)를 한/영 모두 검색
 *
 * 데이터는 서비스 계층에서만 받는다. Mock 을 직접 import 하면 헤더 검색만 Mock,
 * 페이지는 실 데이터인 상태가 되어 화면만 봐서는 구분할 수 없다.
 *
 * 선수는 아직 조회 API 가 없다(9단계 L1 스쿼드). 실 API 모드에서는 인덱스에
 * 넣지 않는다 — 빈 결과가 "없음"이 아니라 "아직 없음"이라는 뜻이다.
 * 백엔드 연결이 끝나면 GET /api/search?q= 로 대체한다.
 */

import { fetchCompetitions, fetchTeamsByLeague, USE_MOCK } from '@/services/api'
import { TEAM_NAMES, PLAYER_NAMES, COMPETITION_NAMES } from '@/i18n/entityNames'

function dedup(arr) { return [...new Set(arr.filter(Boolean))] }

/**
 * Mock 모드에서만 선수를 넣는다.
 * 번들에서 빠지지는 않는다 — `services/mock.js` 가 같은 모듈을 정적으로 import 하고,
 * `api.js` 가 mock·live 를 둘 다 정적으로 들고 있어서 Mock 전체가 항상 번들에 남는다.
 * 실 API 모드에서 Mock 을 들어내려면 `api.js` 의 구현 선택을 동적 import 로 바꿔야 한다.
 * 지금은 검색 결과에서 선수를 빼는 것이 목적이라 여기까지만 한다.
 */
async function playerEntries() {
  if (!USE_MOCK) return []
  const { PLAYERS } = await import('@/mocks/players')
  return PLAYERS.map(player => {
    const e = PLAYER_NAMES[player.id]
    return {
      type: 'player', id: player.id, slug: player.slug,
      label: player.name, sublabel: player.teamName,
      names: dedup([player.name, player.shortName, e?.ko, e?.en, e?.shortKo, e?.shortEn]),
    }
  })
}

async function buildIndex() {
  const [competitions, groups, players] = await Promise.all([
    fetchCompetitions(),
    fetchTeamsByLeague(),
    playerEntries(),
  ])

  const teams = groups.flatMap(({ teams }) => teams).map(team => {
    const e = TEAM_NAMES[team.id]
    return {
      type: 'team', id: team.id, slug: team.slug,
      label: team.name, sublabel: team.city ?? team.country ?? null,
      initials: team.initials, color: team.color, logoUrl: team.logoUrl ?? null,
      names: dedup([team.name, team.shortName, e?.ko, e?.en, e?.shortKo, e?.shortEn]),
    }
  })

  const comps = competitions.map(comp => {
    const e = COMPETITION_NAMES[comp.id]
    return {
      type: 'competition', id: comp.id, slug: comp.slug,
      label: comp.name, sublabel: comp.country, shortName: comp.shortName,
      logoUrl: comp.logoUrl ?? null,
      names: dedup([comp.name, comp.shortName, comp.initials, e?.ko, e?.en, e?.shortKo, e?.shortEn]),
    }
  })

  // 같은 팀이 여러 리그에 중복으로 들어오지 않게 (컵 참가 등)
  const seen = new Set()
  const uniqueTeams = teams.filter(t => (seen.has(t.id) ? false : seen.add(t.id)))

  return [...uniqueTeams, ...players, ...comps]
}

/** 인덱스는 한 번만 만든다. 오류는 그대로 올려보내 화면이 알게 한다 */
let indexPromise = null

export function getSearchIndex() {
  indexPromise ??= buildIndex()
  return indexPromise
}

/** 대회·팀 목록이 바뀌면 버린다 */
export function invalidateSearchIndex() {
  indexPromise = null
}

/**
 * 팀·선수·대회를 한/영 모두 대소문자 무관 부분 일치로 검색.
 * @param {Array} index      getSearchIndex() 결과
 * @param {string} query
 * @param {number} [maxPerType=5]
 */
export function searchAll(index, query, maxPerType = 5) {
  const q = (query ?? '').toLowerCase().trim()
  if (!q || !index) return { teams: [], players: [], competitions: [] }

  const matched = index.filter(item =>
    item.names.some(name => name.toLowerCase().includes(q))
  )

  return {
    teams:        matched.filter(r => r.type === 'team').slice(0, maxPerType),
    players:      matched.filter(r => r.type === 'player').slice(0, maxPerType),
    competitions: matched.filter(r => r.type === 'competition').slice(0, maxPerType),
  }
}
