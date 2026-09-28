import { describe, it, expect } from 'vitest'
import { getLocalizedName, getLocalizedShortName, pickLocalized } from './localization.js'

/* English-only sentinels — check:i18n forbids Korean literals in JS. */
const NAME_KO = 'NAME_KO'
const NAME_EN = 'NAME_EN'
const SHORT_KO = 'SHORT_KO'
const SHORT_EN = 'SHORT_EN'

describe('getLocalizedName', () => {
  const team = { name: NAME_KO, originalName: NAME_EN }
  it('ko locale returns name(displayName)', () => {
    expect(getLocalizedName(team, 'ko')).toBe(NAME_KO)
  })
  it('en locale returns originalName', () => {
    expect(getLocalizedName(team, 'en')).toBe(NAME_EN)
  })
  it('en with no originalName falls back to name (no bypass)', () => {
    expect(getLocalizedName({ name: NAME_KO }, 'en')).toBe(NAME_KO)
  })
  it('ko with no localized name falls back to originalName', () => {
    expect(getLocalizedName({ originalName: NAME_EN }, 'ko')).toBe(NAME_EN)
  })
  it('null or empty entity returns empty string', () => {
    expect(getLocalizedName(null, 'ko')).toBe('')
    expect(getLocalizedName({}, 'en')).toBe('')
  })
})

describe('getLocalizedShortName', () => {
  const team = { shortName: SHORT_KO, shortOriginalName: SHORT_EN, name: NAME_KO, originalName: NAME_EN }
  it('ko locale returns shortName', () => { expect(getLocalizedShortName(team, 'ko')).toBe(SHORT_KO) })
  it('en locale returns shortOriginalName', () => { expect(getLocalizedShortName(team, 'en')).toBe(SHORT_EN) })
  it('ko with no shortName falls back to name', () => {
    expect(getLocalizedShortName({ name: NAME_KO }, 'ko')).toBe(NAME_KO)
  })
  /* 실 API 회귀 잠금 — /api/competitions·/api/teams 는 shortOriginalName 을 안 준다.
     shortDisplayName 은 ko (한글) · originalName 은 원문. en 에서 shortDisplayName 로 떨어지면 한글 노출. */
  it('en team without shortOriginalName falls back to originalName, not ko shortName', () => {
    const teamNoShortOrig = { shortName: SHORT_KO, name: NAME_KO, originalName: NAME_EN }
    expect(getLocalizedShortName(teamNoShortOrig, 'en')).toBe(NAME_EN)
  })
  it('en competition without shortOriginalName falls back to originalName, not ko shortName', () => {
    /* LaLiga 재현: shortDisplayName='라리가' (한글) · originalName='LaLiga' */
    const comp = { shortName: 'KO_SHORT', name: 'KO_LONG', originalName: 'LaLiga' }
    expect(getLocalizedShortName(comp, 'en')).toBe('LaLiga')
  })
})

describe('pickLocalized', () => {
  it('ko returns localized', () => { expect(pickLocalized(NAME_KO, NAME_EN, 'ko')).toBe(NAME_KO) })
  it('en returns original', () => { expect(pickLocalized(NAME_KO, NAME_EN, 'en')).toBe(NAME_EN) })
  it('en with null original falls back to localized', () => { expect(pickLocalized(NAME_KO, null, 'en')).toBe(NAME_KO) })
})
