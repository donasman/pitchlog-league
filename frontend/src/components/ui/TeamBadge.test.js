/**
 * TeamBadge — pure helpers regression lock.
 *
 * vitest.config.js runs with `environment: 'node'` (no jsdom, no component rendering).
 * The 3-state machine ('loading' -> 'loaded' | 'failed') and the visual mapping
 * (initials shown? background color?) are extracted as pure functions so behavioral
 * scenarios (pre-load / onLoad / onError / 6s timeout · transparent bg / initials only)
 * can be locked here.
 */

import { describe, it, expect } from 'vitest'
import { nextBadgeState, badgeVisual } from './TeamBadge.jsx'

describe('TeamBadge nextBadgeState (image state machine)', () => {
  it('T-B1: loading + load -> loaded (onLoad shows img)', () => {
    expect(nextBadgeState('loading', 'load')).toBe('loaded')
  })

  it('T-B2: loading + error -> failed (onError falls back to initials)', () => {
    expect(nextBadgeState('loading', 'error')).toBe('failed')
  })

  it('T-B3: loading + timeout -> failed (6s safety net)', () => {
    expect(nextBadgeState('loading', 'timeout')).toBe('failed')
  })

  it('T-B4: loaded + timeout -> loaded (already loaded, timeout ignored)', () => {
    expect(nextBadgeState('loaded', 'timeout')).toBe('loaded')
  })

  it('T-B5: failed + load -> failed (fail latches; late onLoad does not revive)', () => {
    expect(nextBadgeState('failed', 'load')).toBe('failed')
  })
})

describe('TeamBadge badgeVisual (background + initials by state)', () => {
  const TEAM = '#e30613'

  it('T-V1: loading + logo -> initials hidden, background transparent', () => {
    expect(badgeVisual('loading', true, TEAM)).toEqual({
      showInitials: false,
      background: 'transparent',
    })
  })

  it('T-V2: loaded + logo -> initials hidden, background transparent', () => {
    expect(badgeVisual('loaded', true, TEAM)).toEqual({
      showInitials: false,
      background: 'transparent',
    })
  })

  it('T-V3: failed + logo -> initials shown, background = team color', () => {
    expect(badgeVisual('failed', true, TEAM)).toEqual({
      showInitials: true,
      background: TEAM,
    })
  })

  it('T-V4: no logo (any state) -> initials shown, background = team color', () => {
    expect(badgeVisual('loading', false, TEAM)).toEqual({
      showInitials: true,
      background: TEAM,
    })
    expect(badgeVisual('loaded', false, TEAM)).toEqual({
      showInitials: true,
      background: TEAM,
    })
  })
})
