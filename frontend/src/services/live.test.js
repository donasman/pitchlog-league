/**
 * live.js — request coalescing and TTL cache unit tests.
 *
 * Stubs global fetch to observe how many actual network calls apiGet / _cachedGet
 * emit under different call patterns. Mock mode (mock.js) does not go through this
 * cache layer, so it is not exercised here — services/api.js chooses mock.js when
 * VITE_USE_MOCK is true and live.js is never invoked in that path.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { __resetCache, invalidateCompetitions } from './live'

/**
 * fetch mock whose response can be released on demand. The returned promise stays
 * pending until release() is called so we can observe request coalescing.
 */
function makeDeferredFetch(body) {
  let resolve
  const p = new Promise(r => { resolve = r })
  const impl = vi.fn(() => p.then(() => ({
    ok: true,
    status: 200,
    headers: new Headers({ 'content-type': 'application/json' }),
    json: async () => body,
  })))
  return { fetch: impl, release: () => resolve() }
}

/** fetch mock that resolves immediately — used for cache hit tests. */
function makeImmediateFetch(body) {
  return vi.fn(async () => ({
    ok: true,
    status: 200,
    headers: new Headers({ 'content-type': 'application/json' }),
    json: async () => body,
  }))
}

beforeEach(() => {
  __resetCache()
})

afterEach(() => {
  vi.unstubAllGlobals()
  vi.useRealTimers()
})

describe('live.js — request coalescing (inflight)', () => {
  it('T1: two concurrent calls to the same GET result in exactly one fetch', async () => {
    const { fetch: fetchMock, release } = makeDeferredFetch({
      items: [{ apiId: 39, ref: '39-premier-league', slug: 'premier-league',
                displayName: 'Premier League', shortDisplayName: 'EPL' }],
    })
    vi.stubGlobal('fetch', fetchMock)

    // fetchCompetitions goes through _cachedGet('/api/competitions'); while the
    // fetch is pending the second caller must share the same promise.
    const { fetchCompetitions } = await import('./live')
    const p1 = fetchCompetitions()
    const p2 = fetchCompetitions()
    release()
    const [a, b] = await Promise.all([p1, p2])

    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(a).toEqual(b)
    expect(a.length).toBe(1)
  })
})

describe('live.js — TTL cache', () => {
  it('T2: sequential duplicate GETs only emit one fetch (cache hit)', async () => {
    const fetchMock = makeImmediateFetch({
      items: [{ apiId: 39, ref: '39-premier-league', slug: 'premier-league',
                displayName: 'Premier League', shortDisplayName: 'EPL' }],
    })
    vi.stubGlobal('fetch', fetchMock)

    const { fetchCompetitions } = await import('./live')
    const a = await fetchCompetitions()
    const b = await fetchCompetitions()

    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(a).toEqual(b)
  })

  it('T3: 60s TTL — /api/matches is refetched after 60_001ms', async () => {
    vi.useFakeTimers({ now: 0 })
    const fetchMock = makeImmediateFetch({ items: [], asOf: null })
    vi.stubGlobal('fetch', fetchMock)

    // fetchMatchesByCompetition drives loadMatches (which calls _cachedGet('/api/matches')).
    // We only count fetches whose URL contains '/api/matches' to ignore the incidental
    // '/api/competitions' load performed by matchWindowFor.
    const { fetchMatchesByCompetition } = await import('./live')

    await fetchMatchesByCompetition('premier-league', 2024)
    const matchCalls = () => fetchMock.mock.calls
      .filter(c => String(c[0]).includes('/api/matches')).length
    expect(matchCalls()).toBe(1)

    // Still inside TTL — cache hit
    vi.advanceTimersByTime(30_000)
    await fetchMatchesByCompetition('premier-league', 2024)
    expect(matchCalls()).toBe(1)

    // Cross the 60s boundary — expected to refetch
    vi.advanceTimersByTime(30_001)
    await fetchMatchesByCompetition('premier-league', 2024)
    expect(matchCalls()).toBe(2)
  })

  it('T4: 300s TTL — /api/competitions is still cached at 60_001ms and refetches at 300_001ms', async () => {
    vi.useFakeTimers({ now: 0 })
    const fetchMock = makeImmediateFetch({
      items: [{ apiId: 39, ref: '39-premier-league', slug: 'premier-league',
                displayName: 'Premier League', shortDisplayName: 'EPL' }],
    })
    vi.stubGlobal('fetch', fetchMock)

    const { fetchCompetitions } = await import('./live')

    await fetchCompetitions()
    expect(fetchMock).toHaveBeenCalledTimes(1)

    // Would be expired for a 60s TTL, but competitions use the long TTL — still cached.
    vi.advanceTimersByTime(60_001)
    await fetchCompetitions()
    expect(fetchMock).toHaveBeenCalledTimes(1)

    // Cross the 300s boundary — cache expires and fetch runs again.
    vi.advanceTimersByTime(300_001 - 60_001)
    await fetchCompetitions()
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })

  it('T5b: fetchOverview keeps the rest of the home page alive when /api/stats/scorers fails (retro 4-6)', async () => {
    // 5xx makes apiGet throw · the 4th Promise.all branch catches it and returns a sentinel so the UI can render ErrorState.
    // The other three (comps · matches · standings) succeed → the home page cards must stay alive.
    const compsBody = { items: [{ apiId: 39, ref: '39-premier-league', slug: 'premier-league',
      displayName: 'Premier League', shortDisplayName: 'EPL', type: 'LEAGUE', format: 'ROUND_ROBIN',
      currentSeason: { year: 2026, label: '2026-27', isCurrent: true } }] }
    const fetchMock = vi.fn(async input => {
      const url = String(input)
      if (url.includes('/api/stats/scorers')) {
        return { ok: false, status: 500, statusText: 'Internal Server Error',
          headers: new Headers({ 'content-type': 'application/json' }),
          json: async () => ({ message: 'scorers exploded' }),
          text: async () => JSON.stringify({ message: 'scorers exploded' }) }
      }
      const body = url.includes('/api/matches') ? { items: [], asOf: null }
                 : url.includes('/api/standings') ? { items: [], asOf: null }
                 : compsBody
      return { ok: true, status: 200,
        headers: new Headers({ 'content-type': 'application/json' }), json: async () => body }
    })
    vi.stubGlobal('fetch', fetchMock)
    // console.error 는 catch 안에서 나온다 — 테스트가 조용해지도록 spy 로 삼킨다
    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    const { fetchOverview } = await import('./live')
    const out = await fetchOverview()

    // 실패 자리 — 세 상태로 갈라짐 (배열 · null 이 아니라 error)
    expect(out.topScorers).toBeNull()
    expect(out.topScorersError).toEqual(expect.stringContaining('500'))
    // 홈 전체는 살아 있음 — 다른 필드는 정상 계약대로
    expect(out.competitions).toBeInstanceOf(Array)
    expect(out.livePulse).toEqual([])       // matches:[] 니까 라이브 없음
    expect(out.nextKickoff).toBeNull()
    // console.error 는 반드시 남는다 (무음 catch 금지)
    expect(errSpy).toHaveBeenCalled()

    errSpy.mockRestore()
  })

  it('T5c: fetchOverview treats items=[] as a success (0 scorers) — must NOT collapse to null', async () => {
    // 0 scorers = ShortcutCard shell (empty rank list) · null = NotImplementedState (hard-coded "not built yet") — two distinct UIs
    const compsBody = { items: [{ apiId: 39, ref: '39-premier-league', slug: 'premier-league',
      displayName: 'Premier League', shortDisplayName: 'EPL', type: 'LEAGUE', format: 'ROUND_ROBIN',
      currentSeason: { year: 2026, label: '2026-27', isCurrent: true } }] }
    const fetchMock = vi.fn(async input => {
      const url = String(input)
      const body = url.includes('/api/matches') ? { items: [], asOf: null }
                 : url.includes('/api/standings') ? { items: [], asOf: null }
                 : url.includes('/api/stats/scorers') ? { competition: null, season: null, items: [], asOf: '2026-11-23T15:00:00.000Z' }
                 : compsBody
      return { ok: true, status: 200,
        headers: new Headers({ 'content-type': 'application/json' }), json: async () => body }
    })
    vi.stubGlobal('fetch', fetchMock)

    const { fetchOverview } = await import('./live')
    const out = await fetchOverview()

    expect(out.topScorers).toEqual([])      // 배열(빈) · null 아님
    expect(out.topScorersError).toBeNull()
  })

  it('T5: invalidateCompetitions clears /api/competitions and /api/teams but keeps /api/matches', async () => {
    const compsBody = {
      items: [{ apiId: 39, ref: '39-premier-league', slug: 'premier-league',
                displayName: 'Premier League', shortDisplayName: 'EPL' }],
    }
    const matchesBody = { items: [], asOf: null }
    const fetchMock = vi.fn(async input => {
      const url = String(input)
      const body = url.includes('/api/matches') ? matchesBody : compsBody
      return {
        ok: true,
        status: 200,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => body,
      }
    })
    vi.stubGlobal('fetch', fetchMock)

    const { fetchCompetitions, fetchMatchesByCompetition } = await import('./live')

    await fetchCompetitions()
    await fetchMatchesByCompetition('premier-league', 2024)
    const countPath = pat => fetchMock.mock.calls
      .filter(c => String(c[0]).includes(pat)).length
    expect(countPath('/api/competitions')).toBe(1)
    expect(countPath('/api/matches')).toBe(1)

    invalidateCompetitions()

    // Competitions must be refetched now.
    await fetchCompetitions()
    expect(countPath('/api/competitions')).toBe(2)

    // Matches cache is untouched by invalidateCompetitions.
    await fetchMatchesByCompetition('premier-league', 2024)
    expect(countPath('/api/matches')).toBe(1)
  })
})
