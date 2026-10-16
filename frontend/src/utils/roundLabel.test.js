import { describe, it, expect } from 'vitest'
import { parseRoundLabel, formatRoundLabel } from './roundLabel.js'

/* Live API distinct rounds (2026-09-28, /api/matches limit=500) — 16 forms.
 * Extra common cases included for regression. */
const DISTINCT_LIVE = [
  '1/128-finals',
  '3rd Qualifying Round',
  'Final',
  'Play-offs',
  'Playoff round',
  'Quarter-finals',
  'Regular Season - 1',
  'Regular Season - 2',
  'Regular Season - 3',
  'Regular Season - 4',
  'Regular Season - 6',
  'Round of 128',
  'Round of 16',
  'Round of 32',
  'Round of 64',
  'Semi-finals',
]

describe('parseRoundLabel matches all distinct live rounds', () => {
  it.each(DISTINCT_LIVE)('matches %s', (raw) => {
    const r = parseRoundLabel(raw)
    expect(r.matched).toBe(true)
    expect(r.key).not.toBe('')
    expect(r.original).toBe(raw)
  })

  it('Regular Season - N carries n param', () => {
    expect(parseRoundLabel('Regular Season - 12')).toEqual({
      key: 'round.regularSeason', params: { n: 12 }, original: 'Regular Season - 12', matched: true,
    })
  })

  it('League Stage - Matchday N', () => {
    const r = parseRoundLabel('League Stage - Matchday 4')
    expect(r.key).toBe('round.leaguePhaseMatchday')
    expect(r.params).toEqual({ n: 4 })
  })

  it('Round of N', () => {
    expect(parseRoundLabel('Round of 16').params).toEqual({ n: 16 })
    expect(parseRoundLabel('Round of 128').params).toEqual({ n: 128 })
  })

  it('1/N-finals', () => {
    expect(parseRoundLabel('1/8-finals').key).toBe('round.oneOverN')
    expect(parseRoundLabel('1/128-finals').params).toEqual({ n: 128 })
  })

  it('Quarter / Semi / Final', () => {
    expect(parseRoundLabel('Quarter-finals').key).toBe('round.quarterFinals')
    expect(parseRoundLabel('Semi-finals').key).toBe('round.semiFinals')
    expect(parseRoundLabel('Final').key).toBe('round.final')
  })

  it('Group X', () => {
    expect(parseRoundLabel('Group A').params).toEqual({ group: 'A' })
    expect(parseRoundLabel('Group H').key).toBe('round.groupX')
  })

  it('Preliminary and Playoffs family', () => {
    expect(parseRoundLabel('Preliminary Round').key).toBe('round.preliminaryRound')
    expect(parseRoundLabel('Play-offs').key).toBe('round.playoffs')
    expect(parseRoundLabel('Playoff round').key).toBe('round.playoffs')
    expect(parseRoundLabel('Relegation Play-off').key).toBe('round.relegationPlayoff')
    expect(parseRoundLabel('Promotion Play-off').key).toBe('round.promotionPlayoff')
  })

  it('Nth Qualifying Round and Qualifying Round N', () => {
    expect(parseRoundLabel('3rd Qualifying Round').params).toEqual({ n: 3 })
    expect(parseRoundLabel('1st Qualifying Round').params).toEqual({ n: 1 })
    expect(parseRoundLabel('Qualifying Round 4').params).toEqual({ n: 4 })
  })

  it('Group Stage / League Stage / Knockout Play-offs', () => {
    expect(parseRoundLabel('Group Stage').key).toBe('round.groupStage')
    expect(parseRoundLabel('League Stage').key).toBe('round.leaguePhase')
    expect(parseRoundLabel('Knockout Round Play-offs').key).toBe('round.knockoutPlayoffs')
  })

  it('Round N compact form', () => {
    expect(parseRoundLabel('Round 3').params).toEqual({ n: 3 })
    expect(parseRoundLabel('Round 3').key).toBe('round.ordinalRound')
  })

  it('Semifinal / Quarterfinal (one-word variants)', () => {
    expect(parseRoundLabel('Semifinal').key).toBe('round.semiFinals')
    expect(parseRoundLabel('Semifinals').key).toBe('round.semiFinals')
    expect(parseRoundLabel('Quarterfinal').key).toBe('round.quarterFinals')
  })

  it('unknown values leave matched=false and keep original', () => {
    const r = parseRoundLabel('Some Cup Semi Round X')
    expect(r.matched).toBe(false)
    expect(r.original).toBe('Some Cup Semi Round X')
    expect(r.key).toBe('')
  })

  it('null and empty are safe', () => {
    expect(parseRoundLabel(null)).toEqual({ key: '', params: undefined, original: '', matched: false })
    expect(parseRoundLabel('')).toEqual({ key: '', params: undefined, original: '', matched: false })
  })
})

describe('formatRoundLabel integrates with t', () => {
  const t = (key, params) => params ? `${key}(${JSON.stringify(params)})` : key
  it('matched returns t(key, params)', () => {
    expect(formatRoundLabel('Regular Season - 5', t)).toBe('round.regularSeason({"n":5})')
    expect(formatRoundLabel('Final', t)).toBe('round.final')
  })
  it('unmatched returns original', () => {
    expect(formatRoundLabel('Some Weird Round', t)).toBe('Some Weird Round')
  })
})
