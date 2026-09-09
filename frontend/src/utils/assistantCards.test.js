/**
 * assistantCards 순수 함수 단위 테스트
 *
 * 백엔드 응답 shape (backend/src/assistant/gemini.service.ts:238-241) 을 기준으로 만든다:
 *   data[i] = ToolResult.data (도구 원 데이터. wrapper 가 아니다)
 *   evidence[i].tool 이 그 데이터의 도구 이름
 * 컨텍스트가 짝지어 만드는 wrapper 를 여기서는 손으로 조립한다.
 */

import { describe, expect, it } from 'vitest'
import {
  cardKindForTool,
  competitionSlugFromWrapper,
  normalizeCardPayload,
  pickAsOf,
} from './assistantCards.js'

describe('pickAsOf', () => {
  it('T1: 빈 배열이면 null', () => {
    expect(pickAsOf([])).toBeNull()
    expect(pickAsOf(null)).toBeNull()
    expect(pickAsOf(undefined)).toBeNull()
  })

  it('T2: 원소 하나면 그 asOf 그대로', () => {
    expect(pickAsOf([{ asOf: '2026-09-08T00:00:00.000Z' }])).toBe('2026-09-08T00:00:00.000Z')
  })

  it('T3: 여러 원소면 사전순 최소 (ISO 는 시간순과 같다)', () => {
    const input = [
      { asOf: '2026-09-08T00:00:00.000Z' },
      { asOf: '2026-09-07T00:00:00.000Z' },
      { asOf: '2026-09-09T00:00:00.000Z' },
    ]
    expect(pickAsOf(input)).toBe('2026-09-07T00:00:00.000Z')
  })
})

describe('cardKindForTool', () => {
  it('T4: 10 도구 각각 정확한 kind', () => {
    expect(cardKindForTool('list_competitions')).toBe('json')
    expect(cardKindForTool('get_competition')).toBe('json')
    expect(cardKindForTool('list_teams')).toBe('json')
    expect(cardKindForTool('get_team')).toBe('json')
    expect(cardKindForTool('list_matches')).toBe('matches')
    expect(cardKindForTool('get_match')).toBe('match')
    expect(cardKindForTool('get_standings')).toBe('standings')
    expect(cardKindForTool('get_top_scorers')).toBe('stats')
    expect(cardKindForTool('get_top_assisters')).toBe('stats')
    expect(cardKindForTool('get_player')).toBe('json')
  })

  it('T5: 알 수 없는 도구는 json 폴백', () => {
    expect(cardKindForTool('unknown_tool')).toBe('json')
    expect(cardKindForTool('')).toBe('json')
    expect(cardKindForTool(undefined)).toBe('json')
  })
})

/**
 * StandingsTableDto 최소 fixture — EPL 표 한 장의 2행.
 * normalizeStanding 은 team.ref/team.apiId/team.displayName 등을 읽는다.
 */
function makeStandingsTable() {
  return {
    competition: {
      ref: '39-premier-league',
      apiId: 39,
      displayName: 'Premier League',
      shortDisplayName: 'PL',
      format: 'ROUND_ROBIN',
    },
    season: { label: '2026-27', year: 2026, isCurrent: true, status: 'IN_PROGRESS', dataState: 'PARTIAL' },
    asOf: '2026-09-08T00:00:00.000Z',
    rows: [
      {
        rank: 1, groupName: null, played: 5, win: 5, draw: 0, lose: 0,
        goalsFor: 15, goalsAgainst: 3, goalDiff: 12, points: 15, form: 'WWWWW',
        description: null,
        team: { ref: '33-manchester-united', apiId: 33, displayName: 'Manchester United', shortDisplayName: 'Man Utd', code: 'MUN', logoUrl: 'x.png' },
      },
      {
        rank: 2, groupName: null, played: 5, win: 4, draw: 0, lose: 1,
        goalsFor: 12, goalsAgainst: 5, goalDiff: 7, points: 12, form: 'WWWWL',
        description: null,
        team: { ref: '40-liverpool', apiId: 40, displayName: 'Liverpool', shortDisplayName: 'LIV', code: 'LIV', logoUrl: 'y.png' },
      },
    ],
    unavailableReason: null,
  }
}

/** MatchDto 최소 fixture — normalizeMatch 가 읽는 필드만 채운다 */
function makeMatch(id, homeName) {
  return {
    id,
    competition: {
      ref: '39-premier-league',
      apiId: 39,
      displayName: 'Premier League',
      shortDisplayName: 'PL',
      format: 'ROUND_ROBIN',
    },
    season: { label: '2026-27' },
    round: { name: 'Round 5', ordinal: 5, matchCount: 10 },
    kickoffAt: '2026-09-10T14:00:00.000Z',
    venue: { name: 'Old Trafford', city: 'Manchester' },
    home: { ref: '33-manchester-united', apiId: 33, displayName: homeName, shortDisplayName: 'MU', code: 'MUN', logoUrl: null },
    away: { ref: '40-liverpool', apiId: 40, displayName: 'Liverpool', shortDisplayName: 'LIV', code: 'LIV', logoUrl: null },
    goals: { home: 2, away: 1 },
    statusShort: 'FT',
    statsState: 'NONE',
    elapsed: null,
    leg: null,
    winnerTeamRef: '33-manchester-united',
    detailEligible: true,
    hasEvents: false,
    hasLineups: false,
    hasTeamStats: false,
    hasPlayerStats: false,
    asOf: '2026-09-10T14:00:00.000Z',
  }
}

describe('normalizeCardPayload', () => {
  it('T6: standings — wrapper.data.items[0] 을 표 정규화', () => {
    const wrapperData = { items: [makeStandingsTable()] }
    const out = normalizeCardPayload('standings', wrapperData)
    expect(Array.isArray(out.entries)).toBe(true)
    expect(out.entries.length).toBe(2)
    expect(out.entries[0].rank).toBe(1)
    expect(out.entries[0].teamName).toBe('Manchester United')
    expect(out.entries[0].points).toBe(15)
    expect(out.unavailableReason).toBeNull()
  })

  it('T7: matches — items[] 각각 정규화', () => {
    const wrapperData = { items: [makeMatch('m1', 'Manchester United'), makeMatch('m2', 'Arsenal')] }
    const out = normalizeCardPayload('matches', wrapperData)
    expect(Array.isArray(out)).toBe(true)
    expect(out.length).toBe(2)
    expect(out[0].id).toBe('m1')
    expect(out[0].homeTeam.name).toBe('Manchester United')
    expect(out[0].competitionSlug).toBe('premier-league')
    expect(out[1].id).toBe('m2')
  })

  it('T8: json — wrapper.data 그대로', () => {
    const raw = { foo: 'bar', nested: { n: 1 } }
    expect(normalizeCardPayload('json', raw)).toBe(raw)
  })
})

describe('competitionSlugFromWrapper', () => {
  it('standings wrapper — items[0].competition.ref 에서 slug 추출', () => {
    const wrapper = { tool: 'get_standings', data: { items: [makeStandingsTable()] } }
    expect(competitionSlugFromWrapper(wrapper)).toBe('premier-league')
  })

  it('matches wrapper — items[0].competition.ref', () => {
    const wrapper = { tool: 'list_matches', data: { items: [makeMatch('m1', 'MU')] } }
    expect(competitionSlugFromWrapper(wrapper)).toBe('premier-league')
  })

  it('빈 데이터면 null', () => {
    expect(competitionSlugFromWrapper({ tool: 'list_matches', data: { items: [] } })).toBeNull()
    expect(competitionSlugFromWrapper({ tool: 'get_standings', data: null })).toBeNull()
  })
})
