/**
 * zoom — pure helper regression lock for the smooth 1280 -> 1600 zoom ramp.
 *
 * The old media-query jump (+25% at 1440) is replaced by a linear ramp from 1280 to 1600.
 * These tests lock the value at the boundaries and at representative widths so the ramp
 * cannot silently drift.
 */

import { describe, it, expect } from 'vitest'
import { computeZoom } from './zoom.js'

describe('computeZoom — linear ramp 1280..1600, constant outside', () => {
  it('T-Z1: 1279 -> 1 (below threshold, no scaling)', () => {
    expect(computeZoom(1279)).toBe(1)
  })

  it('T-Z2: 1280 -> 1 (lower bound)', () => {
    expect(computeZoom(1280)).toBe(1)
  })

  it('T-Z3: 1366 -> 1.07 (1 + 0.25 * 86/320 = 1.0672 -> 1.07)', () => {
    expect(computeZoom(1366)).toBe(1.07)
  })

  it('T-Z4: 1440 -> 1.13 (1 + 0.25 * 160/320 = 1.125 -> 1.13)', () => {
    expect(computeZoom(1440)).toBe(1.13)
  })

  it('T-Z5: 1536 -> 1.2 (1 + 0.25 * 256/320 = 1.2)', () => {
    expect(computeZoom(1536)).toBe(1.2)
  })

  it('T-Z6: 1600 -> 1.25 (upper bound)', () => {
    expect(computeZoom(1600)).toBe(1.25)
  })

  it('T-Z7: 1920 -> 1.25 (above upper bound stays at cap)', () => {
    expect(computeZoom(1920)).toBe(1.25)
  })

  it('T-Z8: 390 (mobile) -> 1 (below threshold never scales)', () => {
    expect(computeZoom(390)).toBe(1)
  })

  it('T-Z9: non-numeric (NaN / undefined) -> 1', () => {
    expect(computeZoom(NaN)).toBe(1)
    expect(computeZoom(undefined)).toBe(1)
  })
})
