/**
 * HScroller — pure helpers regression lock.
 *
 * vitest.config.js runs with `environment: 'node'` (no jsdom, no component rendering).
 * The row-first column count, auto-play condition, and wrap-to-start scroll target are
 * extracted as pure functions so the behavioral scenarios described in the request —
 * row-first order · wrap-to-start on end · hover pause · reduced-motion disable · pause button —
 * can be locked here without a DOM.
 *
 * "pause button" is covered via shouldAutoTick(pausedByUser=true) — the button itself is a
 * thin wrapper that flips that flag, so this single condition covers the logic path.
 */

import { describe, it, expect } from 'vitest'
import {
  computeCols,
  shouldAutoTick,
  computeAutoScrollTarget,
} from './HScroller.jsx'

describe('HScroller computeCols — row-first column count', () => {
  it('T-C1: rows=2, n=5 -> cols=3 (top row 3, bottom row 2)', () => {
    expect(computeCols(5, 2)).toBe(3)
  })

  it('T-C2: rows=2, n=6 -> cols=3 (exactly half and half)', () => {
    expect(computeCols(6, 2)).toBe(3)
  })

  it('T-C3: rows=2, n=1 -> cols=1 (one row filled)', () => {
    expect(computeCols(1, 2)).toBe(1)
  })

  it('T-C4: rows=2, n=0 -> cols=1 (empty list still yields at least 1 col)', () => {
    expect(computeCols(0, 2)).toBe(1)
  })

  it('T-C5: rows=3, n=7 -> cols=3 (3x3 grid with two empty slots)', () => {
    expect(computeCols(7, 3)).toBe(3)
  })

  it('T-C6: rows=1, n=20 -> cols=20 (single row, cols = n)', () => {
    expect(computeCols(20, 1)).toBe(20)
  })

  it('T-C7: rows=0 guard -> treated as 1 row, cols = n', () => {
    expect(computeCols(6, 0)).toBe(6)
  })
})

describe('HScroller shouldAutoTick — auto-play run condition', () => {
  const BASE = {
    autoPlay: true, overflow: true, reducedMotion: false,
    pausedByUser: false, pausedByInteraction: false,
    visible: true, documentVisible: true,
  }

  it('T-A1: all conditions met -> true', () => {
    expect(shouldAutoTick(BASE)).toBe(true)
  })

  it('T-A2: autoPlay=false -> false (default)', () => {
    expect(shouldAutoTick({ ...BASE, autoPlay: false })).toBe(false)
  })

  it('T-A3: overflow=false (nothing to scroll) -> false', () => {
    expect(shouldAutoTick({ ...BASE, overflow: false })).toBe(false)
  })

  it('T-A4: reduced-motion -> false (accessibility wins)', () => {
    expect(shouldAutoTick({ ...BASE, reducedMotion: true })).toBe(false)
  })

  it('T-A5: pausedByUser=true (pause button) -> false', () => {
    expect(shouldAutoTick({ ...BASE, pausedByUser: true })).toBe(false)
  })

  it('T-A6: pausedByInteraction=true (hover / focus / touch) -> false', () => {
    expect(shouldAutoTick({ ...BASE, pausedByInteraction: true })).toBe(false)
  })

  it('T-A7: visible=false (IO under 50%) -> false', () => {
    expect(shouldAutoTick({ ...BASE, visible: false })).toBe(false)
  })

  it('T-A8: documentVisible=false (tab went to background) -> false', () => {
    expect(shouldAutoTick({ ...BASE, documentVisible: false })).toBe(false)
  })
})

describe('HScroller computeAutoScrollTarget — step forward · wrap to start on end', () => {
  it('T-S1: at start -> one step right (clientWidth * 90%)', () => {
    const r = computeAutoScrollTarget({ scrollLeft: 0, clientWidth: 800, scrollWidth: 2400 })
    expect(r).toEqual({ type: 'step', delta: 720 })
  })

  it('T-S2: middle position -> still a step', () => {
    const r = computeAutoScrollTarget({ scrollLeft: 800, clientWidth: 800, scrollWidth: 2400 })
    expect(r).toEqual({ type: 'step', delta: 720 })
  })

  it('T-S3: at end (exact) -> wrap to start (delta = -scrollLeft)', () => {
    const r = computeAutoScrollTarget({ scrollLeft: 1600, clientWidth: 800, scrollWidth: 2400 })
    expect(r).toEqual({ type: 'wrap', delta: -1600 })
  })

  it('T-S4: at end (float rounding) -> wrap to start', () => {
    const r = computeAutoScrollTarget({ scrollLeft: 1599.6, clientWidth: 800, scrollWidth: 2400 })
    expect(r).toEqual({ type: 'wrap', delta: -1599.6 })
  })

  it('T-S5: non-overflowing track (scrollWidth == clientWidth) -> wrap (delta 0)', () => {
    const r = computeAutoScrollTarget({ scrollLeft: 0, clientWidth: 800, scrollWidth: 800 })
    expect(r).toEqual({ type: 'wrap', delta: 0 })
  })
})
