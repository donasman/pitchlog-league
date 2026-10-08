/**
 * favoritesState - pure decision logic lock for FavoritesContext.
 *
 * Locks: toggle is refused until the first load is ready (before the limit check),
 * backend error code mapping (own keys only), generation guard, and refs extraction.
 */

import { describe, it, expect } from 'vitest'
import {
  CODE_TO_ERROR,
  toActionErrorCode,
  decideToggle,
  isCurrentGeneration,
  refsOf,
} from './favoritesState.js'

const TEN = ['r0', 'r1', 'r2', 'r3', 'r4', 'r5', 'r6', 'r7', 'r8', 'r9']
const LIMIT = 10

describe('decideToggle', () => {
  it('T1: loading -> not_ready', () => {
    expect(decideToggle({ list: ['a'], ref: 'a', limit: LIMIT, loadState: 'loading' }))
      .toEqual({ ok: false, reason: 'not_ready' })
  })

  it('T2: idle -> not_ready', () => {
    expect(decideToggle({ list: ['a'], ref: 'a', limit: LIMIT, loadState: 'idle' }))
      .toEqual({ ok: false, reason: 'not_ready' })
  })

  it('T3: error -> not_ready', () => {
    expect(decideToggle({ list: ['a'], ref: 'a', limit: LIMIT, loadState: 'error' }))
      .toEqual({ ok: false, reason: 'not_ready' })
  })

  it('T4: ready, add missing ref -> appended', () => {
    expect(decideToggle({ list: ['a', 'b'], ref: 'c', limit: LIMIT, loadState: 'ready' }))
      .toEqual({ ok: true, next: ['a', 'b', 'c'] })
  })

  it('T5: ready, remove existing ref -> filtered', () => {
    expect(decideToggle({ list: ['a', 'b', 'c'], ref: 'b', limit: LIMIT, loadState: 'ready' }))
      .toEqual({ ok: true, next: ['a', 'c'] })
  })

  it('T6: ready, full list, add new ref -> limit_reached', () => {
    expect(decideToggle({ list: TEN, ref: 'x', limit: LIMIT, loadState: 'ready' }))
      .toEqual({ ok: false, reason: 'limit_reached' })
  })

  it('T7: ready, full list, remove existing ref -> ok with 9 items', () => {
    const d = decideToggle({ list: TEN, ref: 'r3', limit: LIMIT, loadState: 'ready' })
    expect(d.ok).toBe(true)
    expect(d.next).toHaveLength(9)
    expect(d.next).not.toContain('r3')
  })

  it('T8: error, full list, add new ref -> not_ready (checked before limit)', () => {
    expect(decideToggle({ list: TEN, ref: 'x', limit: LIMIT, loadState: 'error' }))
      .toEqual({ ok: false, reason: 'not_ready' })
  })

  it('T9: frozen input is not mutated', () => {
    const list = Object.freeze(['a'])
    let d
    expect(() => {
      d = decideToggle({ list, ref: 'b', limit: LIMIT, loadState: 'ready' })
    }).not.toThrow()
    expect(d).toEqual({ ok: true, next: ['a', 'b'] })
    expect(list).toEqual(['a'])
  })
})

describe('toActionErrorCode / CODE_TO_ERROR', () => {
  it('E1: favorites_limit_exceeded -> limit_exceeded', () => {
    expect(toActionErrorCode({ code: 'favorites_limit_exceeded' })).toBe('limit_exceeded')
  })

  it('E2: favorites_duplicate -> duplicate', () => {
    expect(toActionErrorCode({ code: 'favorites_duplicate' })).toBe('duplicate')
  })

  it('E3: favorites_unknown_team -> unknown_team', () => {
    expect(toActionErrorCode({ code: 'favorites_unknown_team' })).toBe('unknown_team')
  })

  it('E4: unknown code -> network', () => {
    expect(toActionErrorCode({ code: 'something_else' })).toBe('network')
  })

  it('E5: plain Error without code -> network', () => {
    expect(toActionErrorCode(new Error('boom'))).toBe('network')
  })

  it('E6: null and undefined -> network', () => {
    expect(toActionErrorCode(null)).toBe('network')
    expect(toActionErrorCode(undefined)).toBe('network')
  })

  it('E7: prototype keys are not mapped -> network', () => {
    expect(toActionErrorCode({ code: 'constructor' })).toBe('network')
    expect(toActionErrorCode({ code: 'toString' })).toBe('network')
  })

  it('E8: CODE_TO_ERROR has exactly three keys and is frozen', () => {
    expect(CODE_TO_ERROR).toEqual({
      favorites_limit_exceeded: 'limit_exceeded',
      favorites_duplicate: 'duplicate',
      favorites_unknown_team: 'unknown_team',
    })
    expect(Object.isFrozen(CODE_TO_ERROR)).toBe(true)
  })
})

describe('isCurrentGeneration', () => {
  it('G1: same generation -> true', () => {
    expect(isCurrentGeneration(3, 3)).toBe(true)
  })

  it('G2: older generation -> false', () => {
    expect(isCurrentGeneration(2, 3)).toBe(false)
  })
})

describe('refsOf', () => {
  it('R1: items -> refs in order', () => {
    expect(refsOf([{ ref: 'a' }, { ref: 'b' }])).toEqual(['a', 'b'])
  })

  it('R2: undefined and null -> empty array', () => {
    expect(refsOf(undefined)).toEqual([])
    expect(refsOf(null)).toEqual([])
  })
})
