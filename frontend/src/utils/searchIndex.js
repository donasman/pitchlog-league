/**
 * 클라이언트 검색 인덱스
 * 팀·선수·대회를 한국어·영어 모두 검색 가능하게 인덱싱.
 * 백엔드 연결 시 GET /api/search?q={query} 로 교체 가능.
 */

import { TEAMS }        from '@/mocks/teams'
import { PLAYERS }      from '@/mocks/players'
import { COMPETITIONS } from '@/mocks/competitions'
import { TEAM_NAMES, PLAYER_NAMES, COMPETITION_NAMES } from '@/i18n/entityNames'

function dedup(arr) { return [...new Set(arr.filter(Boolean))] }

function buildIndex() {
  const index = []

  for (const team of TEAMS) {
    const e = TEAM_NAMES[team.id]
    index.push({
      type: 'team', id: team.id, slug: team.slug,
      label: team.name, sublabel: team.city,
      initials: team.initials, color: team.color,
      names: dedup([team.name, team.shortName, e?.ko, e?.en, e?.shortKo, e?.shortEn]),
    })
  }

  for (const player of PLAYERS) {
    const e = PLAYER_NAMES[player.id]
    index.push({
      type: 'player', id: player.id, slug: player.slug,
      label: player.name, sublabel: player.teamName,
      names: dedup([player.name, player.shortName, e?.ko, e?.en, e?.shortKo, e?.shortEn]),
    })
  }

  for (const comp of COMPETITIONS) {
    const e = COMPETITION_NAMES[comp.id]
    index.push({
      type: 'competition', id: comp.id, slug: comp.slug,
      label: comp.name, sublabel: comp.country, shortName: comp.shortName,
      names: dedup([comp.name, comp.shortName, comp.initials, e?.ko, e?.en, e?.shortKo, e?.shortEn]),
    })
  }

  return index
}

const INDEX = buildIndex()

/**
 * 팀·선수·대회를 한/영 모두 대소문자 무관 부분 일치로 검색.
 * @param {string} query
 * @param {number} [maxPerType=5]
 */
export function searchAll(query, maxPerType = 5) {
  const q = (query ?? '').toLowerCase().trim()
  if (!q) return { teams: [], players: [], competitions: [] }

  const matched = INDEX.filter(item =>
    item.names.some(name => name.toLowerCase().includes(q))
  )

  return {
    teams:        matched.filter(r => r.type === 'team').slice(0, maxPerType),
    players:      matched.filter(r => r.type === 'player').slice(0, maxPerType),
    competitions: matched.filter(r => r.type === 'competition').slice(0, maxPerType),
  }
}
