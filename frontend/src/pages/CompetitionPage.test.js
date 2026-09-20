/**
 * CompetitionPage — pure function locks (node env · no DOM).
 *
 * The component itself needs jsdom + @testing-library/react (out of vitest's node env),
 * so this file only imports and locks the pure named export `shouldShowNoDataBanner`.
 * The banner decision was split into a function precisely so it could be tested here
 * (fix/cup-page-window · 2026-09-21 · DFB Pokal 48경기·CdF 201경기 실측 정정).
 */

import { describe, it, expect } from 'vitest'
import { shouldShowNoDataBanner } from './CompetitionPage'

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
