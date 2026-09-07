import { describe, it, expect } from 'vitest'
import { kstDateKey, calcAge } from './dateFormat.js'

describe('kstDateKey', () => {
  it('rolls over to the next day at 15:00 UTC (00:00 KST)', () => {
    expect(kstDateKey('2026-11-22T15:00:00Z')).toBe('2026-11-23')
  })

  it('stays on the same day one second before 15:00 UTC', () => {
    expect(kstDateKey('2026-11-22T14:59:59Z')).toBe('2026-11-22')
  })

  it('accepts a Date instance', () => {
    expect(kstDateKey(new Date('2026-11-22T15:00:00Z'))).toBe('2026-11-23')
  })
})

describe('calcAge', () => {
  it('returns null when the date of birth is missing (not 0)', () => {
    expect(calcAge(null)).toBeNull()
    expect(calcAge(undefined)).toBeNull()
  })

  it('computes the age against an explicit reference date', () => {
    expect(calcAge('2000-07-21', '2026-09-01')).toBe(26)
  })

  it('does not count a birthday that has not happened yet this year', () => {
    expect(calcAge('2000-09-02', '2026-09-01')).toBe(25)
  })
})
