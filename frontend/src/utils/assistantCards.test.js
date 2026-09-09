/**
 * assistantCards pure function unit tests.
 *
 * Backend response shape (backend/src/assistant/gemini.service.ts:238-241):
 *   data[i] = ToolResult.data (raw tool payload, not a wrapper)
 *   evidence[i].tool identifies the tool for data[i]
 * The context pairs them into a wrapper — here we assemble by hand for tests.
 */

import { describe, expect, it } from 'vitest'
import {
  cardKindForTool,
  competitionSlugFromWrapper,
  normalizeCardPayload,
  pickAsOf,
} from './assistantCards.js'

describe('pickAsOf', () => {
  it('T1: empty array returns null', () => {
    expect(pickAsOf([])).toBeNull()
    expect(pickAsOf(null)).toBeNull()
    expect(pickAsOf(undefined)).toBeNull()
  })

  it('T2: single entry returns its asOf', () => {
    expect(pickAsOf([{ asOf: '2026-09-08T00:00:00.000Z' }])).toBe('2026-09-08T00:00:00.000Z')
  })

  it('T3: multiple entries return lexicographic minimum (ISO = chronological)', () => {
    const input = [
      { asOf: '2026-09-08T00:00:00.000Z' },
      { asOf: '2026-09-07T00:00:00.000Z' },
      { asOf: '2026-09-09T00:00:00.000Z' },
    ]
    expect(pickAsOf(input)).toBe('2026-09-07T00:00:00.000Z')
  })
})

describe('cardKindForTool', () => {
  it('T4: 10 tools map to expected kinds', () => {
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

  it('T5: unknown tool falls back to json', () => {
    expect(cardKindForTool('unknown_tool')).toBe('json')
    expect(cardKindForTool('')).toBe('json')
    expect(cardKindForTool(undefined)).toBe('json')
  })
})

/**
 * Minimal StandingsTableDto fixture — EPL table with 2 rows.
 * normalizeStanding reads team.ref/team.apiId/team.displayName etc.
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

/** Minimal MatchDto fixture — only fields normalizeMatch reads */
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
  it('T6: standings — normalizes wrapper.data.items[0]', () => {
    const wrapperData = { items: [makeStandingsTable()] }
    const out = normalizeCardPayload('standings', wrapperData)
    expect(Array.isArray(out.entries)).toBe(true)
    expect(out.entries.length).toBe(2)
    expect(out.entries[0].rank).toBe(1)
    expect(out.entries[0].teamName).toBe('Manchester United')
    expect(out.entries[0].points).toBe(15)
    expect(out.unavailableReason).toBeNull()
  })

  it('T7: matches — normalizes each item in items[]', () => {
    const wrapperData = { items: [makeMatch('m1', 'Manchester United'), makeMatch('m2', 'Arsenal')] }
    const out = normalizeCardPayload('matches', wrapperData)
    expect(Array.isArray(out)).toBe(true)
    expect(out.length).toBe(2)
    expect(out[0].id).toBe('m1')
    expect(out[0].homeTeam.name).toBe('Manchester United')
    expect(out[0].competitionSlug).toBe('premier-league')
    expect(out[1].id).toBe('m2')
  })

  it('T8: json — returns wrapper.data as-is', () => {
    const raw = { foo: 'bar', nested: { n: 1 } }
    expect(normalizeCardPayload('json', raw)).toBe(raw)
  })
})

describe('competitionSlugFromWrapper', () => {
  it('standings wrapper — extracts slug from items[0].competition.ref', () => {
    const wrapper = { tool: 'get_standings', data: { items: [makeStandingsTable()] } }
    expect(competitionSlugFromWrapper(wrapper)).toBe('premier-league')
  })

  it('matches wrapper — extracts slug from items[0].competition.ref', () => {
    const wrapper = { tool: 'list_matches', data: { items: [makeMatch('m1', 'MU')] } }
    expect(competitionSlugFromWrapper(wrapper)).toBe('premier-league')
  })

  it('empty data returns null', () => {
    expect(competitionSlugFromWrapper({ tool: 'list_matches', data: { items: [] } })).toBeNull()
    expect(competitionSlugFromWrapper({ tool: 'get_standings', data: null })).toBeNull()
  })
})
