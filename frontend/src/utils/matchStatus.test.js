import { describe, it, expect } from 'vitest'
import { getDisplayState } from './matchStatus.js'
import { MATCHES } from '../mocks/matches.js'

const STATS_STATES = ['NONE', 'RECHECK', 'CONFIRMED']

/** Every cell of the truth table documented on getDisplayState */
const TABLE = [
  // code, NONE, RECHECK, CONFIRMED
  ['NS',   'scheduled', 'scheduled', 'scheduled'],
  ['TBD',  'scheduled', 'scheduled', 'scheduled'],
  ['???',  'scheduled', 'scheduled', 'scheduled'],
  ['1H',   'live',      'live',      'live'],
  ['2H',   'live',      'live',      'live'],
  ['ET',   'live',      'live',      'live'],
  ['BT',   'live',      'live',      'live'],
  ['P',    'live',      'live',      'live'],
  ['LIVE', 'live',      'live',      'live'],
  ['HT',   'halftime',  'halftime',  'halftime'],
  ['FT',   'final',     'recheck',   'confirmed'],
  ['AET',  'final',     'recheck',   'confirmed'],
  ['PEN',  'final',     'recheck',   'confirmed'],
  ['AWD',  'final',     'recheck',   'confirmed'],
  ['WO',   'final',     'recheck',   'confirmed'],
  ['PST',  'postponed', 'postponed', 'postponed'],
  ['CANC', 'cancelled', 'cancelled', 'cancelled'],
  ['ABD',  'cancelled', 'cancelled', 'cancelled'],
  ['SUSP', 'cancelled', 'cancelled', 'cancelled'],
  ['INT',  'cancelled', 'cancelled', 'cancelled'],
]

const CELLS = TABLE.flatMap(([code, ...expected]) =>
  STATS_STATES.map((statsState, i) => [code, statsState, expected[i]]),
)

describe('getDisplayState truth table', () => {
  it.each(CELLS)('%s + %s -> %s', (code, statsState, expected) => {
    expect(getDisplayState(code, statsState)).toBe(expected)
  })

  it('treats a missing statsState as NONE', () => {
    expect(getDisplayState('FT')).toBe('final')
    expect(getDisplayState('FT', undefined)).toBe('final')
  })

  it('ignores an unknown statsState on a finished match', () => {
    expect(getDisplayState('FT', 'WHATEVER')).toBe('final')
  })
})

/** Mock rows carry displayState directly; recover the statsState that would produce it */
function statsStateFor(displayState) {
  if (displayState === 'recheck')   return 'RECHECK'
  if (displayState === 'confirmed') return 'CONFIRMED'
  return 'NONE'
}

describe('getDisplayState against every mock match', () => {
  it('has mock matches to check', () => {
    expect(MATCHES.length).toBeGreaterThan(0)
  })

  it.each(MATCHES.map(m => [m.id, m.statusCode, m.displayState]))(
    '%s: %s -> %s',
    (id, statusCode, displayState) => {
      expect(getDisplayState(statusCode, statsStateFor(displayState))).toBe(displayState)
    },
  )
})
