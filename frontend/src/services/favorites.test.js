import { describe, it, expect, beforeEach } from 'vitest'
import {
  FAVORITE_TEAMS_KEY,
  FAVORITE_TEAMS_LIMIT,
  getFavoriteTeams,
  isFavoriteTeam,
  addFavoriteTeam,
  removeFavoriteTeam,
  toggleFavoriteTeam,
} from './favorites.js'

// vitest node env — polyfill localStorage with an in-memory shim
if (typeof globalThis.localStorage === 'undefined') {
  const store = new Map()
  globalThis.localStorage = {
    getItem: k => (store.has(k) ? store.get(k) : null),
    setItem: (k, v) => { store.set(k, String(v)) },
    removeItem: k => { store.delete(k) },
    clear: () => { store.clear() },
    get length() { return store.size },
    key: i => Array.from(store.keys())[i] ?? null,
  }
}

beforeEach(() => {
  localStorage.clear()
})

describe('favorites — storage layer', () => {
  // T1
  it('returns an empty array when nothing is stored', () => {
    expect(getFavoriteTeams()).toEqual([])
  })

  // T2 — corrupt JSON is wiped so it does not throw again next call
  it('returns [] and deletes the key when the JSON is corrupt', () => {
    localStorage.setItem(FAVORITE_TEAMS_KEY, '{not json')
    expect(getFavoriteTeams()).toEqual([])
    expect(localStorage.getItem(FAVORITE_TEAMS_KEY)).toBeNull()
  })

  // T3
  it('returns [] when the stored value is not an array', () => {
    localStorage.setItem(FAVORITE_TEAMS_KEY, JSON.stringify({ slug: 'x' }))
    expect(getFavoriteTeams()).toEqual([])
  })

  // T4
  it('returns [] when an array element is not a string', () => {
    localStorage.setItem(FAVORITE_TEAMS_KEY, JSON.stringify(['a', 1, null]))
    expect(getFavoriteTeams()).toEqual([])
  })

  // T5
  it('keeps insertion order across three adds', () => {
    addFavoriteTeam('a')
    addFavoriteTeam('b')
    addFavoriteTeam('c')
    expect(getFavoriteTeams()).toEqual(['a', 'b', 'c'])
  })

  // T6 — duplicate add is a no-op success, list order unchanged
  it('does not reorder the list on a duplicate add', () => {
    addFavoriteTeam('a')
    addFavoriteTeam('b')
    const before = getFavoriteTeams()
    const result = addFavoriteTeam('a')
    expect(result.ok).toBe(true)
    expect(result.list).toEqual(before)
    expect(getFavoriteTeams()).toEqual(before)
  })

  // T7
  it('rejects add with limit_reached when 5 favorites are already stored', () => {
    for (const slug of ['a', 'b', 'c', 'd', 'e']) addFavoriteTeam(slug)
    expect(getFavoriteTeams()).toHaveLength(FAVORITE_TEAMS_LIMIT)
    const result = addFavoriteTeam('f')
    expect(result.ok).toBe(false)
    expect(result.reason).toBe('limit_reached')
    expect(result.list).toEqual(['a', 'b', 'c', 'd', 'e'])
    expect(getFavoriteTeams()).toEqual(['a', 'b', 'c', 'd', 'e'])
  })

  // T8
  it('rejects an empty or null slug with invalid_slug', () => {
    const empty = addFavoriteTeam('')
    expect(empty.ok).toBe(false)
    expect(empty.reason).toBe('invalid_slug')
    const nul = addFavoriteTeam(null)
    expect(nul.ok).toBe(false)
    expect(nul.reason).toBe('invalid_slug')
  })

  // T9
  it('removes an existing slug', () => {
    addFavoriteTeam('a')
    addFavoriteTeam('b')
    const result = removeFavoriteTeam('a')
    expect(result.ok).toBe(true)
    expect(result.list).toEqual(['b'])
    expect(getFavoriteTeams()).toEqual(['b'])
  })

  // T10
  it('removing a missing slug is a no-op success', () => {
    addFavoriteTeam('a')
    const result = removeFavoriteTeam('z')
    expect(result.ok).toBe(true)
    expect(result.list).toEqual(['a'])
  })

  // T11
  it('isFavoriteTeam returns true for stored, false otherwise', () => {
    addFavoriteTeam('a')
    expect(isFavoriteTeam('a')).toBe(true)
    expect(isFavoriteTeam('b')).toBe(false)
    expect(isFavoriteTeam('')).toBe(false)
  })

  // T12
  it('toggle adds a missing slug', () => {
    const result = toggleFavoriteTeam('a')
    expect(result.ok).toBe(true)
    expect(getFavoriteTeams()).toEqual(['a'])
  })

  // T13
  it('toggle removes an existing slug', () => {
    addFavoriteTeam('a')
    const result = toggleFavoriteTeam('a')
    expect(result.ok).toBe(true)
    expect(getFavoriteTeams()).toEqual([])
  })

  // T14
  it('toggle returns limit_reached for a new slug when the list is at 5', () => {
    for (const slug of ['a', 'b', 'c', 'd', 'e']) addFavoriteTeam(slug)
    const result = toggleFavoriteTeam('f')
    expect(result.ok).toBe(false)
    expect(result.reason).toBe('limit_reached')
    expect(getFavoriteTeams()).toEqual(['a', 'b', 'c', 'd', 'e'])
  })
})
