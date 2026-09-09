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

/**
 * 왜 실제 localStorage 를 그대로 쓰는가:
 *   vitest jsdom 이 아니라 node 환경이지만 vitest 는 `localStorage` 를 폴리필로 노출한다.
 *   가짜 객체를 새로 만들지 않고 실제 저장 API 를 태워 파손 · 부재 · 형태 어긋남을 그대로 재현한다.
 */

// node 환경이라 `localStorage` 가 없다 — 최소 shim 을 심는다(폴리필과 같은 형태)
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

describe('favorites — 저장 계층', () => {
  // T1
  it('저장값이 없으면 빈 배열을 돌려준다', () => {
    expect(getFavoriteTeams()).toEqual([])
  })

  // T2
  it('JSON 파싱에 실패하면 빈 배열을 돌려주고 키를 지운다', () => {
    localStorage.setItem(FAVORITE_TEAMS_KEY, '{not json')
    expect(getFavoriteTeams()).toEqual([])
    // 파손된 값은 다음 판에 같은 예외를 던지지 않게 지워져 있어야 한다
    expect(localStorage.getItem(FAVORITE_TEAMS_KEY)).toBeNull()
  })

  // T3
  it('저장된 값이 배열이 아니면 빈 배열을 돌려준다', () => {
    localStorage.setItem(FAVORITE_TEAMS_KEY, JSON.stringify({ slug: 'x' }))
    expect(getFavoriteTeams()).toEqual([])
  })

  // T4
  it('원소가 문자열이 아닌 배열이면 빈 배열을 돌려준다', () => {
    localStorage.setItem(FAVORITE_TEAMS_KEY, JSON.stringify(['a', 1, null]))
    expect(getFavoriteTeams()).toEqual([])
  })

  // T5
  it('add 세 번 하면 추가 순서를 유지한다', () => {
    addFavoriteTeam('a')
    addFavoriteTeam('b')
    addFavoriteTeam('c')
    expect(getFavoriteTeams()).toEqual(['a', 'b', 'c'])
  })

  // T6
  it('중복 add 는 성공하지만 목록을 재정렬하지 않는다', () => {
    addFavoriteTeam('a')
    addFavoriteTeam('b')
    const before = getFavoriteTeams()
    const result = addFavoriteTeam('a')
    expect(result.ok).toBe(true)
    expect(result.list).toEqual(before)
    expect(getFavoriteTeams()).toEqual(before)
  })

  // T7
  it('상한 5 를 넘어서면 add 가 limit_reached 로 실패한다', () => {
    for (const slug of ['a', 'b', 'c', 'd', 'e']) addFavoriteTeam(slug)
    expect(getFavoriteTeams()).toHaveLength(FAVORITE_TEAMS_LIMIT)
    const result = addFavoriteTeam('f')
    expect(result.ok).toBe(false)
    expect(result.reason).toBe('limit_reached')
    expect(result.list).toEqual(['a', 'b', 'c', 'd', 'e'])
    expect(getFavoriteTeams()).toEqual(['a', 'b', 'c', 'd', 'e'])
  })

  // T8
  it('빈 문자열이나 null slug 는 invalid_slug 로 실패한다', () => {
    const empty = addFavoriteTeam('')
    expect(empty.ok).toBe(false)
    expect(empty.reason).toBe('invalid_slug')
    const nul = addFavoriteTeam(null)
    expect(nul.ok).toBe(false)
    expect(nul.reason).toBe('invalid_slug')
  })

  // T9
  it('remove 는 있는 것을 지운다', () => {
    addFavoriteTeam('a')
    addFavoriteTeam('b')
    const result = removeFavoriteTeam('a')
    expect(result.ok).toBe(true)
    expect(result.list).toEqual(['b'])
    expect(getFavoriteTeams()).toEqual(['b'])
  })

  // T10
  it('remove 는 없는 것을 지워도 no-op 로 성공한다', () => {
    addFavoriteTeam('a')
    const result = removeFavoriteTeam('z')
    expect(result.ok).toBe(true)
    expect(result.list).toEqual(['a'])
  })

  // T11
  it('isFavoriteTeam 은 있으면 true 없으면 false', () => {
    addFavoriteTeam('a')
    expect(isFavoriteTeam('a')).toBe(true)
    expect(isFavoriteTeam('b')).toBe(false)
    expect(isFavoriteTeam('')).toBe(false)
  })

  // T12
  it('toggle 은 없는 것을 추가한다', () => {
    const result = toggleFavoriteTeam('a')
    expect(result.ok).toBe(true)
    expect(getFavoriteTeams()).toEqual(['a'])
  })

  // T13
  it('toggle 은 있는 것을 제거한다', () => {
    addFavoriteTeam('a')
    const result = toggleFavoriteTeam('a')
    expect(result.ok).toBe(true)
    expect(getFavoriteTeams()).toEqual([])
  })

  // T14
  it('toggle 은 상한 5 에서 새 slug 에 대해 limit_reached 를 돌려준다', () => {
    for (const slug of ['a', 'b', 'c', 'd', 'e']) addFavoriteTeam(slug)
    const result = toggleFavoriteTeam('f')
    expect(result.ok).toBe(false)
    expect(result.reason).toBe('limit_reached')
    expect(getFavoriteTeams()).toEqual(['a', 'b', 'c', 'd', 'e'])
  })
})
