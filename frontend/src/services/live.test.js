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
    // feat/stats-frontend-redesign: 랭킹 API 가 competition 필수라 홈은 리그별 3개(EPL·라리가·분데스) 를 병렬로 부른다.
    // 세 개가 다 실패해도 comps·matches·standings 는 살아 있어야 하고, leagueScorers 각 원소는 entries=null·error=문자열로 갈린다.
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

    // 실패 자리 — 리그별 3장 각각 entries=null · error=문자열 (셋 갈래 중 "실패")
    expect(out.leagueScorers).toHaveLength(3)
    expect(out.leagueScorers.map(l => l.competitionSlug)).toEqual(['premier-league', 'la-liga', 'bundesliga'])
    for (const league of out.leagueScorers) {
      expect(league.entries).toBeNull()
      expect(league.error).toEqual(expect.stringContaining('500'))
    }
    // 홈 전체는 살아 있음 — 다른 필드는 정상 계약대로
    expect(out.competitions).toBeInstanceOf(Array)
    expect(out.livePulse).toEqual([])       // matches:[] 니까 라이브 없음
    expect(out.nextKickoff).toBeNull()
    // console.error 는 반드시 남는다 (무음 catch 금지) · 세 리그 각각 한 번씩
    expect(errSpy).toHaveBeenCalled()

    errSpy.mockRestore()
  })

  it('T5c: fetchOverview treats items=[] as a success (0 scorers) — must NOT collapse to null', async () => {
    // 0 scorers = 카드 껍데기(빈 리스트) · null = 실패 (T5b) — 두 UI 갈래 구분
    const compsBody = { items: [{ apiId: 39, ref: '39-premier-league', slug: 'premier-league',
      displayName: 'Premier League', shortDisplayName: 'EPL', type: 'LEAGUE', format: 'ROUND_ROBIN',
      currentSeason: { year: 2026, label: '2026-27', isCurrent: true } }] }
    const fetchMock = vi.fn(async input => {
      const url = String(input)
      const body = url.includes('/api/matches') ? { items: [], asOf: null }
                 : url.includes('/api/standings') ? { items: [], asOf: null }
                 : url.includes('/api/stats/scorers')
                     ? { competition: { displayName: 'Premier League' }, season: null, items: [], asOf: '2026-11-23T15:00:00.000Z' }
                 : compsBody
      return { ok: true, status: 200,
        headers: new Headers({ 'content-type': 'application/json' }), json: async () => body }
    })
    vi.stubGlobal('fetch', fetchMock)

    const { fetchOverview } = await import('./live')
    const out = await fetchOverview()

    // 리그별 3장 각각 entries=[] · error=null (셋 갈래 중 "빈 성공")
    expect(out.leagueScorers).toHaveLength(3)
    for (const league of out.leagueScorers) {
      expect(league.entries).toEqual([])
      expect(league.error).toBeNull()
    }
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

describe('live.js — competition list two scopes (fix/stats-frontend-followup)', () => {
  // 백엔드 `/api/competitions` 는 19개 (isTracked=true 전체 · 컵·슈퍼컵·UEL·UECL 포함) 를 준다.
  // 프론트는 화면별로 두 스코프를 나눈다:
  //   fetchCompetitions        → 5대리그+UCL 6개 (대회 탭·순위표·시즌 선택기용)
  //   fetchCompetitionsForStats → 19개 전부 (통계 페이지 드롭다운 · isTracked 전체)
  // 이 두 스코프가 섞이면 순위표에 컵이 뜨거나 통계에서 컵/UEL 진입 경로가 사라진다.
  const NINETEEN_ITEMS = [
    { apiId: 39, ref: '39-premier-league', slug: 'premier-league',   displayName: 'Premier League',   shortDisplayName: 'EPL',  displayOrder: 10 },
    { apiId: 140, ref: '140-la-liga',       slug: 'la-liga',          displayName: 'La Liga',          shortDisplayName: 'LL',   displayOrder: 20 },
    { apiId: 78,  ref: '78-bundesliga',     slug: 'bundesliga',       displayName: 'Bundesliga',       shortDisplayName: 'BL',   displayOrder: 30 },
    { apiId: 135, ref: '135-serie-a',       slug: 'serie-a',          displayName: 'Serie A',          shortDisplayName: 'SA',   displayOrder: 40 },
    { apiId: 61,  ref: '61-ligue-1',        slug: 'ligue-1',          displayName: 'Ligue 1',          shortDisplayName: 'L1',   displayOrder: 50 },
    { apiId: 2,   ref: '2-champions-league', slug: 'champions-league', displayName: 'UCL',             shortDisplayName: 'UCL',  displayOrder: 60 },
    // 컵 6
    { apiId: 45,  ref: '45-fa-cup',         slug: 'fa-cup',           displayName: 'FA Cup',           shortDisplayName: 'FA',   displayOrder: 110 },
    { apiId: 48,  ref: '48-efl-cup',        slug: 'efl-cup',          displayName: 'EFL Cup',          shortDisplayName: 'EFL',  displayOrder: 120 },
    { apiId: 143, ref: '143-copa-del-rey',  slug: 'copa-del-rey',     displayName: 'Copa del Rey',     shortDisplayName: 'CDR',  displayOrder: 130 },
    { apiId: 81,  ref: '81-dfb-pokal',      slug: 'dfb-pokal',        displayName: 'DFB-Pokal',        shortDisplayName: 'DFB',  displayOrder: 140 },
    { apiId: 137, ref: '137-coppa-italia',  slug: 'coppa-italia',     displayName: 'Coppa Italia',     shortDisplayName: 'CI',   displayOrder: 150 },
    { apiId: 66,  ref: '66-coupe-de-france', slug: 'coupe-de-france', displayName: 'Coupe de France',  shortDisplayName: 'CDF',  displayOrder: 160 },
    // 슈퍼컵 5
    { apiId: 528, ref: '528-community-shield', slug: 'community-shield', displayName: 'Community Shield', shortDisplayName: 'CS', displayOrder: 210 },
    { apiId: 556, ref: '556-supercopa',       slug: 'supercopa',        displayName: 'Supercopa',         shortDisplayName: 'SC', displayOrder: 220 },
    { apiId: 529, ref: '529-supercup',        slug: 'supercup',         displayName: 'DFL-Supercup',      shortDisplayName: 'DS', displayOrder: 230 },
    { apiId: 547, ref: '547-supercoppa',      slug: 'supercoppa',       displayName: 'Supercoppa',        shortDisplayName: 'SI', displayOrder: 240 },
    { apiId: 526, ref: '526-trophee',         slug: 'trophee',          displayName: 'Trophée des Champions', shortDisplayName: 'TC', displayOrder: 250 },
    // UEL · UECL
    { apiId: 3,   ref: '3-europa-league',    slug: 'europa-league',    displayName: 'UEFA Europa League',      shortDisplayName: 'UEL',  displayOrder: 70 },
    { apiId: 848, ref: '848-europa-conference', slug: 'europa-conference', displayName: 'UEFA Conference League', shortDisplayName: 'UECL', displayOrder: 80 },
  ]

  it('T6a: fetchCompetitions returns 6 (top-5 leagues + UCL only) when API returns 19', async () => {
    const fetchMock = makeImmediateFetch({ items: NINETEEN_ITEMS })
    vi.stubGlobal('fetch', fetchMock)

    const { fetchCompetitions } = await import('./live')
    const list = await fetchCompetitions()

    expect(list).toHaveLength(6)
    expect(list.map(c => c.apiId).sort((a, b) => a - b)).toEqual([2, 39, 61, 78, 135, 140])
  })

  it('T6b: fetchCompetitionsForStats returns 19 (all isTracked) when API returns 19', async () => {
    const fetchMock = makeImmediateFetch({ items: NINETEEN_ITEMS })
    vi.stubGlobal('fetch', fetchMock)

    const { fetchCompetitionsForStats } = await import('./live')
    const list = await fetchCompetitionsForStats()

    expect(list).toHaveLength(19)
    // 컵·슈퍼컵·UEL·UECL 이 들어 있어야 한다 (진입 경로 잠금)
    const apiIds = new Set(list.map(c => c.apiId))
    for (const cupId of [45, 48, 143, 81, 137, 66]) expect(apiIds.has(cupId)).toBe(true)
    for (const superId of [528, 556, 529, 547, 526]) expect(apiIds.has(superId)).toBe(true)
    expect(apiIds.has(3)).toBe(true)   // UEL
    expect(apiIds.has(848)).toBe(true) // UECL
  })

  it('T6c: the two scopes never mix — same response yields different counts per function', async () => {
    // 같은 fetch mock 을 두 함수가 공유해도 스코프가 섞이면 안 됨.
    const fetchMock = makeImmediateFetch({ items: NINETEEN_ITEMS })
    vi.stubGlobal('fetch', fetchMock)

    const { fetchCompetitions, fetchCompetitionsForStats } = await import('./live')
    const six = await fetchCompetitions()
    const nineteen = await fetchCompetitionsForStats()

    expect(six).toHaveLength(6)
    expect(nineteen).toHaveLength(19)
    // /api/competitions 는 캐시라 한 번만 감 — 두 함수가 필터만 다르게 씌운다
    const countPath = pat => fetchMock.mock.calls
      .filter(c => String(c[0]).includes(pat)).length
    expect(countPath('/api/competitions')).toBe(1)
  })

  // T6d·T6e — toCompetitionRef 폴백이 좁은 스코프(6개) 에 갇혀 있으면
  // 컵·슈퍼컵·UEL·UECL slug 로 진입한 화면이 `errors.competitionNotFound` 로 죽는다.
  // 2026-09-18 프리뷰 실측: /stats 드롭다운의 FA Cup 등 13대회가 여기서 막혔다.
  // 폴백을 fetchCompetitionsForStats(19) 로 바꿔 컵/UEL 통과, 미지 slug 는 여전히 던짐.
  it('T6d: fetchCompetitionStats(fa-cup) resolves and calls /api/stats/scorers?competition=45-fa-cup', async () => {
    // 세 종류 응답을 URL 로 갈라준다 — 목록·대회 상세·랭킹
    const fetchMock = vi.fn(async (url) => {
      const u = String(url)
      let body
      if (u.includes('/api/competitions/45-fa-cup')) {
        body = {
          apiId: 45, ref: '45-fa-cup', slug: 'fa-cup',
          displayName: 'FA Cup', shortDisplayName: 'FA', displayOrder: 110,
          seasons: [],
        }
      } else if (u.includes('/api/competitions')) {
        body = { items: NINETEEN_ITEMS }
      } else if (u.includes('/api/stats/')) {
        body = { items: [], coverage: null, asOf: null }
      } else {
        body = {}
      }
      return {
        ok: true, status: 200,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => body,
      }
    })
    vi.stubGlobal('fetch', fetchMock)

    const { fetchCompetitionStats } = await import('./live')
    // 던지지 않는다 — 이 브랜치가 픽스의 핵심 (수정 전에는 여기서 competitionNotFound 로 throw)
    await expect(fetchCompetitionStats('fa-cup')).resolves.toBeTruthy()

    const scorerCalled = fetchMock.mock.calls.some(c => {
      const u = String(c[0])
      return u.includes('/api/stats/scorers') && u.includes('competition=45-fa-cup')
    })
    expect(scorerCalled).toBe(true)
  })

  it('T6e: fetchCompetitionStats(no-such-slug) still throws — unknown slug is not silently accepted', async () => {
    const fetchMock = vi.fn(async (url) => {
      const u = String(url)
      // 알 수 없는 slug 라도 목록·랭킹 요청은 URL 이 어떻게 되든 응답을 준다. 실패는 toCompetitionRef 안에서만.
      const body = u.includes('/api/competitions') && !u.includes('/api/competitions/')
        ? { items: NINETEEN_ITEMS }
        : { items: [], coverage: null, asOf: null }
      return {
        ok: true, status: 200,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => body,
      }
    })
    vi.stubGlobal('fetch', fetchMock)

    const { fetchCompetitionStats } = await import('./live')
    // slug 가 목록에도 없으면 여전히 던진다 — 폴백 확장이 미지 slug 를 통과시키지 않는다
    await expect(fetchCompetitionStats('no-such-slug')).rejects.toThrow(/no-such-slug/)
  })
})
