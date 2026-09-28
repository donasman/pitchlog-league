import { describe, it, expect } from 'vitest'
import { parsePositionLabel, formatPositionLabel } from './positionLabel.js'

const t = (key) => key

describe('parsePositionLabel', () => {
  it('maps GK/DEF/MID/FWD/ATT code to common.position.*', () => {
    expect(parsePositionLabel('GK')).toMatchObject({ key: 'common.position.gk', matched: true, isCode: true })
    expect(parsePositionLabel('DEF')).toMatchObject({ key: 'common.position.def', matched: true, isCode: true })
    expect(parsePositionLabel('MID')).toMatchObject({ key: 'common.position.mid', matched: true, isCode: true })
    expect(parsePositionLabel('FWD')).toMatchObject({ key: 'common.position.fwd', matched: true, isCode: true })
    expect(parsePositionLabel('ATT')).toMatchObject({ key: 'common.position.fwd', matched: true, isCode: true })
  })

  it('maps long names (Attacker/Goalkeeper/Forward etc.)', () => {
    expect(parsePositionLabel('Goalkeeper')).toMatchObject({ key: 'common.position.goalkeeper', matched: true })
    expect(parsePositionLabel('Defender')).toMatchObject({ key: 'common.position.defender', matched: true })
    expect(parsePositionLabel('Midfielder')).toMatchObject({ key: 'common.position.midfielder', matched: true })
    expect(parsePositionLabel('Attacker')).toMatchObject({ key: 'common.position.attacker', matched: true })
    expect(parsePositionLabel('Forward')).toMatchObject({ key: 'common.position.attacker', matched: true })
    expect(parsePositionLabel('Striker')).toMatchObject({ key: 'common.position.attacker', matched: true })
  })

  it('unknown values fall back to original', () => {
    expect(parsePositionLabel('Sweeper')).toMatchObject({ matched: false, original: 'Sweeper' })
  })

  it('null and empty are safe', () => {
    expect(parsePositionLabel(null)).toEqual({ key: '', matched: false, original: '', isCode: false })
  })
})

describe('formatPositionLabel', () => {
  it('returns t(key) when matched', () => {
    expect(formatPositionLabel('GK', t)).toBe('common.position.gk')
    expect(formatPositionLabel('Attacker', t)).toBe('common.position.attacker')
  })
  it('returns original when unmatched', () => {
    expect(formatPositionLabel('Sweeper', t)).toBe('Sweeper')
    expect(formatPositionLabel('', t)).toBe('')
  })
})
