import { describe, it, expect } from 'vitest'
import {
  zoneOf,
  teamColor,
  normalizeMatch,
  normalizeStanding,
  deriveStage,
  competitionRefFromSlug,
} from './normalize.js'
import { MATCHES } from '../mocks/matches.js'

// ─── fixtures shaped like backend/src/match/match.dto.ts · standing/standing.dto.ts ───

function teamDto(apiId, name, code = null) {
  return {
    ref: `${apiId}-${name.toLowerCase().replace(/\s+/g, '-')}`,
    apiId,
    name,
    displayName: name,
    shortDisplayName: name,
    code,
    country: 'England',
    founded: 1880,
    logoUrl: 'https://media.example/teams/' + apiId + '.png',
  }
}

const COMPETITION_REF = {
  ref: '39-premier-league',
  apiId: 39,
  name: 'Premier League',
  displayName: 'Premier League',
  shortDisplayName: 'EPL',
  type: 'LEAGUE',
  format: 'ROUND_ROBIN',
}

function matchDto(overrides = {}) {
  return {
    id: 1234567,
    kickoffAt: '2026-11-23T14:00:00.000Z',
    statusShort: 'NS',
    statusLong: 'Not Started',
    elapsed: null,
    extraElapsed: null,
    statsState: 'NONE',
    confirmedAt: null,
    goals: { home: null, away: null },
    ht: { home: null, away: null },
    ft: { home: null, away: null },
    et: { home: null, away: null },
    pen: { home: null, away: null },
    winnerTeamRef: null,
    home: teamDto(50, 'Manchester City', 'MCI'),
    away: teamDto(42, 'Arsenal', 'ARS'),
    competition: COMPETITION_REF,
    season: { year: 2026, label: '2026-27' },
    round: { name: 'Regular Season - 13', ordinal: 13, matchCount: 10, isLateStage: false },
    venue: { name: 'Etihad Stadium', city: 'Manchester' },
    referee: null,
    leg: null,
    detailEligible: true,
    hasEvents: null,
    hasLineups: null,
    hasTeamStats: null,
    hasPlayerStats: null,
    asOf: '2026-11-23T12:00:00.000Z',
    ...overrides,
  }
}

function standingRowDto(overrides = {}) {
  return {
    team: teamDto(50, 'Manchester City', 'MCI'),
    groupName: 'Premier League',
    rank: 1,
    points: 29,
    played: 12,
    win: 9,
    draw: 2,
    lose: 1,
    goalsFor: 32,
    goalsAgainst: 14,
    goalDiff: 18,
    home: { played: 6, win: 5, draw: 1, lose: 0, gf: 18, ga: 6 },
    away: { played: 6, win: 4, draw: 1, lose: 1, gf: 14, ga: 8 },
    form: 'WWDWW',
    description: 'Promotion - Champions League (League phase)',
    status: 'same',
    asOf: '2026-11-23T12:00:00.000Z',
    ...overrides,
  }
}

// ─── zoneOf ────────────────────────────────────────────────────

describe('zoneOf', () => {
  it.each([
    ['Promotion - Champions League (League phase)',        'league', 1,  'champions_league'],
    ['Promotion - Champions League (Qualification)',       'league', 4,  'champions_league_playoff'],
    ['Promotion - Europa League (Group Stage)',            'league', 5,  'europa_league'],
    ['Promotion - Europa Conference League (Qualification)', 'league', 6, 'europa_conference'],
    ['Relegation - Championship',                          'league', 18, 'relegation'],
    ['Relegation Play-off',                                'league', 16, 'relegation_playoff'],
    ['Something unknown',                                  'league', 10, 'none'],
  ])('%s -> %s', (description, format, rank, expected) => {
    expect(zoneOf(description, format, rank)).toBe(expected)
  })

  it('returns none when the description is null on a league', () => {
    expect(zoneOf(null, 'league', 10)).toBe('none')
    expect(zoneOf(undefined, 'league', 10)).toBe('none')
  })

  it('falls back to the rank on the UCL league phase', () => {
    expect(zoneOf(null, 'groups_knockout', 8)).toBe('ucl_direct')
    expect(zoneOf(null, 'groups_knockout', 9)).toBe('ucl_playoff')
    expect(zoneOf(null, 'groups_knockout', 25)).toBe('ucl_eliminated')
  })
})

// ─── teamColor ─────────────────────────────────────────────────

describe('teamColor', () => {
  it('is deterministic for the same id', () => {
    expect(teamColor(33)).toBe(teamColor(33))
  })

  it('produces a lowercase six-digit hex color', () => {
    for (const id of [1, 33, 50, 42, 1888]) {
      expect(teamColor(id)).toMatch(/^#[0-9a-f]{6}$/)
    }
  })

  it('gives neighbouring ids different colors', () => {
    expect(teamColor(33)).not.toBe(teamColor(34))
    expect(teamColor(50)).not.toBe(teamColor(42))
  })
})

// ─── competitionRefFromSlug ────────────────────────────────────

describe('competitionRefFromSlug', () => {
  it('maps a screen slug to a backend ref', () => {
    expect(competitionRefFromSlug('premier-league')).toBe('39-premier-league')
    expect(competitionRefFromSlug('champions-league')).toBe('2-champions-league')
  })

  it('returns null for an unknown slug', () => {
    expect(competitionRefFromSlug('no-such-league')).toBeNull()
  })
})

// ─── normalizeMatch ────────────────────────────────────────────

/** Keys the mock carries that the backend cannot provide yet — detail data, not the match row */
const MOCK_ONLY_KEYS = new Set(['prediction', 'homeLineup', 'awayLineup', 'headToHead'])

describe('normalizeMatch', () => {
  it('covers every key of mock match m001 (except detail-only keys)', () => {
    const mock = MATCHES.find(m => m.id === 'm001')
    expect(mock).toBeDefined()
    const expected = Object.keys(mock).filter(k => !MOCK_ONLY_KEYS.has(k))
    const actual = new Set(Object.keys(normalizeMatch(matchDto())))
    for (const key of expected) {
      expect(actual.has(key), `missing key: ${key}`).toBe(true)
    }
  })

  it('keeps a null score as {home: null, away: null} on NS (not 0)', () => {
    const m = normalizeMatch(matchDto())
    expect(m.score).toEqual({ home: null, away: null })
    expect(m.displayState).toBe('scheduled')
    expect(m.statusCode).toBe('NS')
  })

  it('maps competition alias, season label, round name and venue', () => {
    const m = normalizeMatch(matchDto())
    expect(m.id).toBe('1234567')
    expect(m.competitionId).toBe('epl')
    expect(m.competitionSlug).toBe('premier-league')
    expect(m.competitionName).toBe('Premier League')
    expect(m.seasonId).toBe('2026-27')
    expect(m.round).toBe('Regular Season - 13')
    expect(m.venue).toBe('Etihad Stadium, Manchester')
    expect(m.date).toBe('2026-11-23T14:00:00.000Z')
  })

  it('derives recheck/confirmed from statsState on a finished match', () => {
    const base = { statusShort: 'FT', goals: { home: 2, away: 1 }, elapsed: 90 }
    expect(normalizeMatch(matchDto({ ...base, statsState: 'NONE' })).displayState).toBe('final')
    expect(normalizeMatch(matchDto({ ...base, statsState: 'RECHECK' })).displayState).toBe('recheck')
    expect(normalizeMatch(matchDto({ ...base, statsState: 'CONFIRMED' })).displayState).toBe('confirmed')
    expect(normalizeMatch(matchDto(base)).score).toEqual({ home: 2, away: 1 })
  })

  it('uses the team ref as routing slug and derives a badge color', () => {
    const m = normalizeMatch(matchDto())
    expect(m.homeTeam.slug).toBe(m.homeTeam.ref)
    expect(m.homeTeam.initials).toBe('MCI')
    expect(m.homeTeam.color).toMatch(/^#[0-9a-f]{6}$/)
  })

  it('renders a null venue as null (not an empty string)', () => {
    expect(normalizeMatch(matchDto({ venue: null })).venue).toBeNull()
  })
})

// ─── normalizeStanding ─────────────────────────────────────────

describe('normalizeStanding', () => {
  it('splits the form string into an array of W/D/L', () => {
    const row = normalizeStanding(standingRowDto({ form: 'WWDLW' }), { format: 'league' })
    expect(row.form).toEqual(['W', 'W', 'D', 'L', 'W'])
  })

  it('keeps only the last five results and drops unknown letters', () => {
    const row = normalizeStanding(standingRowDto({ form: 'LWWDLWX' }), { format: 'league' })
    expect(row.form).toEqual(['W', 'W', 'D', 'L', 'W'])
  })

  it('returns an empty form when the backend gives null', () => {
    expect(normalizeStanding(standingRowDto({ form: null }), { format: 'league' }).form).toEqual([])
  })

  it('maps the row to the mock entries shape', () => {
    const row = normalizeStanding(standingRowDto(), { format: 'league' })
    expect(row).toMatchObject({
      rank: 1, teamName: 'Manchester City', teamInitials: 'MCI',
      played: 12, won: 9, drawn: 2, lost: 1,
      goalsFor: 32, goalsAgainst: 14, goalDifference: 18, points: 29,
      zone: 'champions_league',
    })
    expect(row.teamSlug).toBe(row.teamId)
  })
})

// ─── deriveStage ───────────────────────────────────────────────

describe('deriveStage', () => {
  const NOW = new Date('2026-11-23T20:00:00Z')

  function finished(id, kickoffAt, round) {
    return normalizeMatch(matchDto({
      id, kickoffAt, statusShort: 'FT', goals: { home: 1, away: 0 },
      round: { name: `Regular Season - ${round}`, ordinal: round, matchCount: 2, isLateStage: false },
    }))
  }

  function scheduled(id, kickoffAt, round) {
    return normalizeMatch(matchDto({
      id, kickoffAt,
      round: { name: `Regular Season - ${round}`, ordinal: round, matchCount: 2, isLateStage: false },
    }))
  }

  it('reports the latest started round as completed when all its matches are settled', () => {
    const matches = [
      finished(1, '2026-11-21T15:00:00Z', 12),
      finished(2, '2026-11-22T15:00:00Z', 12),
      scheduled(3, '2026-11-28T15:00:00Z', 13),
    ]
    expect(deriveStage(matches, NOW)).toEqual({ label: 'Regular Season - 12', status: 'completed' })
  })

  it('reports the round as ongoing while a match of it is still to come', () => {
    const matches = [
      finished(1, '2026-11-22T15:00:00Z', 13),
      scheduled(2, '2026-11-24T15:00:00Z', 13),
    ]
    expect(deriveStage(matches, NOW)).toEqual({ label: 'Regular Season - 13', status: 'ongoing' })
  })

  it('returns null when nothing has started', () => {
    expect(deriveStage([scheduled(1, '2026-11-28T15:00:00Z', 14)], NOW)).toBeNull()
    expect(deriveStage([], NOW)).toBeNull()
  })
})
