import { describe, it, expect } from 'vitest'
import { FAVORITE_TEAMS_LIMIT } from './favorites.js'

describe('favorites — limit constant', () => {
  it('exports FAVORITE_TEAMS_LIMIT === 10', () => {
    expect(FAVORITE_TEAMS_LIMIT).toBe(10)
  })
})
