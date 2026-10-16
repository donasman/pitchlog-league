/**
 * CompetitionPage — pure function locks (node env · no DOM).
 *
 * The component itself needs jsdom + @testing-library/react (out of vitest's node env),
 * so this file only imports and locks the pure named export `shouldShowNoDataBanner`.
 * The banner decision was split into a function precisely so it could be tested here
 * (fix/cup-page-window · 2026-09-21 · DFB Pokal 48경기·CdF 201경기 실측 정정).
 */

import { describe, it, expect } from 'vitest'
import {
  shouldShowNoDataBanner,
  groupCupMatchesByRound,
  seasonLabelFor,
  pickSeasonsForDropdown,
} from './CompetitionPage'

describe('shouldShowNoDataBanner', () => {
  it('T-B1: cup + matches 0 → true (dataState ignored — cups have NONE all seasons)', () => {
    expect(shouldShowNoDataBanner({ isCup: true, matchesLength: 0, dataState: 'NONE'     })).toBe(true)
    expect(shouldShowNoDataBanner({ isCup: true, matchesLength: 0, dataState: 'COMPLETE' })).toBe(true)
    expect(shouldShowNoDataBanner({ isCup: true, matchesLength: 0, dataState: null       })).toBe(true)
  })

  it('T-B2: cup + matches > 0 → false (real fixtures loaded — even when dataState is NONE)', () => {
    expect(shouldShowNoDataBanner({ isCup: true, matchesLength:  48, dataState: 'NONE'     })).toBe(false)
    expect(shouldShowNoDataBanner({ isCup: true, matchesLength: 201, dataState: 'NONE'     })).toBe(false)
    expect(shouldShowNoDataBanner({ isCup: true, matchesLength:   1, dataState: 'COMPLETE' })).toBe(false)
  })

  it('T-B3: non-cup + dataState NONE → true (leagues·UCL·UEL·UECL keep the original rule)', () => {
    expect(shouldShowNoDataBanner({ isCup: false, matchesLength:   0, dataState: 'NONE'     })).toBe(true)
    expect(shouldShowNoDataBanner({ isCup: false, matchesLength: 100, dataState: 'NONE'     })).toBe(true)
    expect(shouldShowNoDataBanner({ isCup: false, matchesLength: 100, dataState: 'COMPLETE' })).toBe(false)
    expect(shouldShowNoDataBanner({ isCup: false, matchesLength:   0, dataState: 'PARTIAL'  })).toBe(false)
  })
})

describe('groupCupMatchesByRound (fix/frontend-leftovers · normalize.js:386 gives round as string)', () => {
  // normalize.js:386 is `round: dto.round?.name ?? null` — matches carry round as a STRING (or null).
  // The pre-fix inline logic used `m.round?.name` which was always undefined → all keys collapsed to '' → flat.
  // These fixtures use the real normalized shape so a regression to `m.round?.name` fails the assertions below.
  it('T-C1: DFB Pokal 48-match shape — two rounds, in ordinal order, keyed by round string', () => {
    const matches = [
      { round: 'Round of 32', roundOrdinal: 2, date: '2026-12-02T20:00Z', id: 'r32-a' },
      { round: 'Round of 64', roundOrdinal: 1, date: '2026-08-15T18:00Z', id: 'r64-a' },
      { round: 'Round of 64', roundOrdinal: 1, date: '2026-08-16T18:00Z', id: 'r64-b' },
      { round: 'Round of 32', roundOrdinal: 2, date: '2026-12-03T20:00Z', id: 'r32-b' },
    ]
    const result = groupCupMatchesByRound(matches)
    expect(result).toHaveLength(2)
    expect(result[0][0]).toBe('Round of 64')            // roundOrdinal 1 comes first
    expect(result[1][0]).toBe('Round of 32')            // roundOrdinal 2 comes second
    expect(result[0][1].map(m => m.id)).toEqual(['r64-a', 'r64-b'])   // date asc within group
    expect(result[1][1].map(m => m.id)).toEqual(['r32-a', 'r32-b'])
  })

  it('T-C2: 8 distinct rounds (CdF 2025 shape) → 8 groups in ordinal order', () => {
    // CdF 2025 season = 201 matches across 8 rounds (1/128-finals → Final).
    const rounds = ['Final','Semi-finals','Quarter-finals','1/8-finals','1/16-finals','1/32-finals','1/64-finals','1/128-finals']
    const matches = rounds.map((round, i) => ({
      round,
      roundOrdinal: rounds.length - i,   // reverse so ordinal asc is 1/128 → Final
      date: `2026-0${i + 1}-01T18:00Z`,
      id: round,
    }))
    const result = groupCupMatchesByRound(matches)
    expect(result).toHaveLength(8)
    expect(result.map(([k]) => k)).toEqual([
      '1/128-finals','1/64-finals','1/32-finals','1/16-finals','1/8-finals','Quarter-finals','Semi-finals','Final',
    ])
  })

  it('T-C3: 0 matches → 0 groups (Supercoppa empty season)', () => {
    expect(groupCupMatchesByRound([])).toEqual([])
    expect(groupCupMatchesByRound(null)).toEqual([])
    expect(groupCupMatchesByRound(undefined)).toEqual([])
  })
})

describe('seasonLabelFor (fix/frontend-leftovers · pre-fix always drew currentSeason for cups)', () => {
  const seasons = [
    { year: 2026, label: '2026-27', current: true,  dataState: 'NONE' },
    { year: 2025, label: '2025-26', current: false, dataState: 'NONE' },
    { year: 2024, label: '2024-25', current: false, dataState: 'NONE' },
  ]

  it('T-D1: selected past season wins over standings.seasonId (FA Cup ?season=2025 case)', () => {
    // Real symptom (09-21): FA Cup ?season=2025 loaded 63 matches but subtitle showed '2026-27'
    // because pre-fix logic was `standings?.seasonId ?? comp.currentSeason` and cups have no standings.
    // Post-fix: selected seasonYear resolves to '2025-26' via seasons.find.
    const result = seasonLabelFor({
      seasons, seasonYear: 2025,
      standings: null,
      comp: { currentSeason: '2026-27' },
    })
    expect(result).toBe('2025-26')
  })

  it('T-D2: no seasonYear → standings.seasonId wins over comp.currentSeason (leagues)', () => {
    // For leagues, standings.seasonId is authoritative (matches the season being viewed).
    const result = seasonLabelFor({
      seasons, seasonYear: undefined,
      standings: { seasonId: '2025-26' },
      comp: { currentSeason: '2026-27' },
    })
    expect(result).toBe('2025-26')
  })

  it('T-D3: no seasonYear + no standings → comp.currentSeason fallback (cup on current season)', () => {
    const result = seasonLabelFor({
      seasons, seasonYear: undefined,
      standings: null,
      comp: { currentSeason: '2026-27' },
    })
    expect(result).toBe('2026-27')
  })
})

describe('pickSeasonsForDropdown (fix/frontend-leftovers · UEL/UECL had no dropdown)', () => {
  it('T-E1: seasonsMemo empty → falls back to comp.seasons (UEL·UECL·cup path)', () => {
    // Pre-fix returned seasonsMemo (or `isCup ? comp.seasons : seasonsMemo` — UEL/UECL is groups_knockout,
    // not cup, so it hit the seasonsMemo branch with COMPLETE-filtered [] and got no dropdown.
    // Post-fix: fall back to comp.seasons whenever the filtered memo is empty.
    const compSeasons = [
      { year: 2026, label: '2026-27', current: true },
      { year: 2025, label: '2025-26', current: false },
    ]
    expect(pickSeasonsForDropdown([], compSeasons)).toEqual(compSeasons)
    expect(pickSeasonsForDropdown(null, compSeasons)).toEqual(compSeasons)

    // Leagues·UCL keep seasonsMemo when it's non-empty (COMPLETE seasons exist).
    const filtered = [{ year: 2025, label: '2025-26', dataState: 'COMPLETE' }]
    expect(pickSeasonsForDropdown(filtered, compSeasons)).toBe(filtered)
  })
})
