import { describe, it, expect } from 'vitest'
import { computeBarPct } from './statsBar.js'

// ─── computeBarPct ───────────────────────────────────────────────
// DATA_RULES §3: never fake a "perfect tie (50:50)" bar when the value is missing.
// 2026-09-10 measurement (track width 724px, /matches/1598824 xG · goals-prevented rows):
// the previous code drew 362/362 fill so both null rows looked like a tie. This test locks the regression.

describe('computeBarPct — when barHome is provided', () => {
  it('uses the raw barHome value in the middle range (no clamp)', () => {
    expect(computeBarPct({ barHome: 67 })).toBe(67)
    expect(computeBarPct({ barHome: 42 })).toBe(42)
  })

  it('clamps below 5 to 5 and above 95 to 95 (so the bar never disappears from the track)', () => {
    expect(computeBarPct({ barHome: 0 })).toBe(5)
    expect(computeBarPct({ barHome: 3 })).toBe(5)
    expect(computeBarPct({ barHome: 100 })).toBe(95)
    expect(computeBarPct({ barHome: 120 })).toBe(95)
  })

  it('keeps the clamp boundaries 5 and 95 unchanged', () => {
    expect(computeBarPct({ barHome: 5 })).toBe(5)
    expect(computeBarPct({ barHome: 95 })).toBe(95)
  })
})

describe('computeBarPct — computed from homeVal / awayVal when barHome is absent', () => {
  it('returns the home ratio (rounded) when both values exist and sum is positive', () => {
    expect(computeBarPct({ homeVal: 12, awayVal: 8 })).toBe(60)   // 12/20 = 60
    expect(computeBarPct({ homeVal: 5,  awayVal: 15 })).toBe(25)  // 5/20  = 25
    expect(computeBarPct({ homeVal: 7,  awayVal: 3 })).toBe(70)   // 7/10  = 70
    expect(computeBarPct({ homeVal: 1,  awayVal: 2 })).toBe(33)   // 1/3   ~= 33
  })
})

describe('computeBarPct — returns null so the bar track is not rendered', () => {
  // 2026-09-10 regression: xG · goals-prevented rows both null used to fall back to pct=50 (perfect tie fake).
  it('returns null when both are null (no bar · no fake tie)', () => {
    expect(computeBarPct({ homeVal: null, awayVal: null })).toBeNull()
    expect(computeBarPct({})).toBeNull()  // fields entirely missing also → null
  })

  it('returns null when only one side is null (no comparison baseline)', () => {
    expect(computeBarPct({ homeVal: 5,    awayVal: null })).toBeNull()
    expect(computeBarPct({ homeVal: null, awayVal: 5 })).toBeNull()
  })

  it('returns null when the sum is 0 (0:0 has no symmetry)', () => {
    expect(computeBarPct({ homeVal: 0, awayVal: 0 })).toBeNull()
  })

  it('returns null when the sum is negative (fields like goalsPrevented can be negative)', () => {
    expect(computeBarPct({ homeVal: -0.5, awayVal: -0.3 })).toBeNull()
  })

  // 0 is a value — one side value + other 0 uses the compute path (no barHome clamp)
  it('keeps 0 as a value — homeVal=8 · awayVal=0 → sum=8 → 100 (no clamp on compute path)', () => {
    expect(computeBarPct({ homeVal: 8, awayVal: 0 })).toBe(100)
    expect(computeBarPct({ homeVal: 0, awayVal: 8 })).toBe(0)
  })

  it('returns null for non-numeric / NaN / Infinity (defensive)', () => {
    expect(computeBarPct({ barHome: NaN })).toBeNull()
    expect(computeBarPct({ barHome: Infinity })).toBeNull()
    expect(computeBarPct({ homeVal: NaN, awayVal: 5 })).toBeNull()
  })
})
