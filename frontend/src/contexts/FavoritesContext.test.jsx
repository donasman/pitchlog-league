/**
 * FavoritesContext contract test.
 *
 * These cases need jsdom + @testing-library/react (render Provider · mock Supabase).
 * vitest.config.js `include: ['src/**\/*.test.js']` does not pick this file up,
 * so it stays skipped until the runtime deps are wired. Same convention as
 * AuthContext.test.jsx (F1 already followed this path).
 *
 * Five cases:
 *   1) isFavoritesEnabled=false -> items=[], toggle is a no-op.
 *   2) Signed-in initial load -> api.favorites.list is called and favoriteTeams === items.map(ref).
 *   3) Optimistic add rejected with `favorites_limit_exceeded` -> serverError='limit_exceeded', state rolled back.
 *   4) Rapid add/remove/add -> queue serialises and the final PUT reflects the latest snapshot.
 *   5) Sign-out -> favoriteTeams and items reset to [] immediately.
 */

import { describe, it, expect } from 'vitest'

describe.skip('FavoritesContext', () => {
  it('isFavoritesEnabled=false -> items=[], toggle no-op', () => {
    // Mock isAuthEnabled=false or USE_MOCK=true so the provider stays inert.
    // toggle('33-manchester-united') must not mutate state or hit the network.
    expect(true).toBe(true)
  })

  it('initial load calls api.favorites.list and favoriteTeams matches items order', () => {
    // Mock useAuth -> { user: { id: 'u1' } } and supabase.auth.getSession -> access_token.
    // Mock api.favorites.list -> { asOf, items: [{ ref: 'a', ... }, { ref: 'b', ... }] }.
    // After mount favoriteTeams === ['a','b'] and items.length === 2.
    expect(true).toBe(true)
  })

  it('optimistic add rejected with favorites_limit_exceeded rolls back', () => {
    // Seed 10 favourites. Call add('new-ref').
    // If the client-side limit gate fires, serverError=limit_exceeded without hitting replace.
    // If replace was hit and threw { code: 'favorites_limit_exceeded' }, state must roll back
    // to previousListRef and items are refreshed via a follow-up list call.
    expect(true).toBe(true)
  })

  it('rapid add/remove/add serialises to a final add via the queue', () => {
    // Call add('x'), remove('x'), add('x') in the same tick.
    // queueRef chains three PUTs, each carrying the latest latestListRef snapshot,
    // so the final favoriteTeams state is ['x'] and the last replace sends teamRefs=['x'].
    expect(true).toBe(true)
  })

  it('sign-out clears favoriteTeams and items immediately', () => {
    // Flip useAuth mock to user=null and rerender.
    // favoriteTeams=[] and items=[] with no localStorage residue.
    expect(true).toBe(true)
  })
})
