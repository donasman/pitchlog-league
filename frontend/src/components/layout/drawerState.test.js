/**
 * drawerState — pure reducer regression lock.
 *
 * The mobile drawer used to skip its open transition because mount + final data-open="true"
 * landed in the same React commit — the browser never painted the "before" state.
 * The reducer inserts an 'opening' state that keeps data-open="false" for one frame so
 * a subsequent rAF-dispatched 'enter' triggers a real transition.
 * These tests lock the transition table and the derived flags.
 */

import { describe, it, expect } from 'vitest'
import {
  nextDrawerState,
  drawerMounted,
  drawerIntendedOpen,
  drawerDataOpen,
  drawerFocusTarget,
} from './drawerState.js'

describe('nextDrawerState — normal motion', () => {
  it('T-D1: closed + open -> opening (delayed enter so transition can play)', () => {
    expect(nextDrawerState('closed', 'open')).toBe('opening')
  })

  it('T-D2: opening + enter -> open', () => {
    expect(nextDrawerState('opening', 'enter')).toBe('open')
  })

  it('T-D3: open + close -> closing', () => {
    expect(nextDrawerState('open', 'close')).toBe('closing')
  })

  it('T-D4: closing + exit -> closed', () => {
    expect(nextDrawerState('closing', 'exit')).toBe('closed')
  })

  it('T-D5: opening + close -> closing (close during open animation)', () => {
    expect(nextDrawerState('opening', 'close')).toBe('closing')
  })

  it('T-D6: closing + open -> open (reopen during close animation, keep DOM node)', () => {
    // must be "open", not "opening" — element is already mounted so data-open flip alone triggers transition
    expect(nextDrawerState('closing', 'open')).toBe('open')
  })

  it('T-D7: enter is ignored outside opening', () => {
    expect(nextDrawerState('open', 'enter')).toBe('open')
    expect(nextDrawerState('closed', 'enter')).toBe('closed')
  })

  it('T-D8: exit is ignored outside closing', () => {
    expect(nextDrawerState('open', 'exit')).toBe('open')
    expect(nextDrawerState('opening', 'exit')).toBe('opening')
  })

  it('T-D9: repeated actions are idempotent', () => {
    expect(nextDrawerState('open', 'open')).toBe('open')
    expect(nextDrawerState('closed', 'close')).toBe('closed')
    expect(nextDrawerState('opening', 'open')).toBe('opening')
    expect(nextDrawerState('closing', 'close')).toBe('closing')
  })
})

describe('nextDrawerState — reduced motion (skip transient states)', () => {
  it('T-R1: closed + open -> open (skip opening)', () => {
    expect(nextDrawerState('closed', 'open', { reducedMotion: true })).toBe('open')
  })

  it('T-R2: open + close -> closed (skip closing)', () => {
    expect(nextDrawerState('open', 'close', { reducedMotion: true })).toBe('closed')
  })

  it('T-R3: opening + close still goes to closing (defensive; opening rarely reached in RM)', () => {
    expect(nextDrawerState('opening', 'close', { reducedMotion: true })).toBe('closed')
  })
})

describe('drawerMounted / drawerIntendedOpen / drawerDataOpen', () => {
  it('T-M1: only closed is unmounted', () => {
    expect(drawerMounted('closed')).toBe(false)
    expect(drawerMounted('opening')).toBe(true)
    expect(drawerMounted('open')).toBe(true)
    expect(drawerMounted('closing')).toBe(true)
  })

  it('T-M2: intendedOpen covers opening and open', () => {
    expect(drawerIntendedOpen('closed')).toBe(false)
    expect(drawerIntendedOpen('opening')).toBe(true)
    expect(drawerIntendedOpen('open')).toBe(true)
    expect(drawerIntendedOpen('closing')).toBe(false)
  })

  it('T-M3: data-open flips true only when state === open (opening stays false for one frame)', () => {
    // This is THE fix — opening must render data-open="false" so that
    // the next rAF flip to "true" triggers a real CSS transition.
    expect(drawerDataOpen('closed')).toBe('false')
    expect(drawerDataOpen('opening')).toBe('false')
    expect(drawerDataOpen('open')).toBe('true')
    expect(drawerDataOpen('closing')).toBe('false')
  })

  it('T-M4: focus target on open is drawer container, not first link', () => {
    // Safari draws a ring on programmatic focus of anchors — landing on the first
    // NavLink made an unrelated item (e.g. Home) look active while another route
    // was current. Focus must land on the drawer container (tabIndex=-1, outline:none).
    expect(drawerFocusTarget('open')).toBe('drawer')
    expect(drawerFocusTarget('opening')).toBeNull()
    expect(drawerFocusTarget('closing')).toBeNull()
    expect(drawerFocusTarget('closed')).toBeNull()
  })
})
