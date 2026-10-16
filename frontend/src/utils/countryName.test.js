import { describe, it, expect } from 'vitest'
import { localizeCountry } from './countryName.js'

/**
 * check:i18n forbids Korean literals in JS source.
 * For ko mappings we call Intl.DisplayNames inside the test to compute the expected value.
 */
const koRegion = (iso2) => {
  try { return new Intl.DisplayNames(['ko'], { type: 'region' }).of(iso2) } catch { return null }
}

const t = (key) => (key.startsWith('country.') ? `__KEY__${key}` : key)

describe('localizeCountry ko mapping via Intl.DisplayNames', () => {
  it.each([
    ['Spain', 'ES'],
    ['Germany', 'DE'],
    ['France', 'FR'],
    ['Italy', 'IT'],
    ['Norway', 'NO'],
    ['Netherlands', 'NL'],
    ['Portugal', 'PT'],
    ['Turkey', 'TR'],
    ['Korea Republic', 'KR'],
    ['South-Korea', 'KR'],
  ])('%s maps to Intl.DisplayNames(ko, %s)', (raw, iso2) => {
    expect(localizeCountry(raw, 'ko')).toBe(koRegion(iso2))
  })

  it('KEY_ONLY (England/Scotland/Wales/NorthernIreland) delegates to t()', () => {
    expect(localizeCountry('England', 'ko', t)).toBe('__KEY__country.England')
    expect(localizeCountry('Scotland', 'ko', t)).toBe('__KEY__country.Scotland')
    expect(localizeCountry('Wales', 'ko', t)).toBe('__KEY__country.Wales')
    expect(localizeCountry('Northern-Ireland', 'ko', t)).toBe('__KEY__country.NorthernIreland')
  })

  it('en returns original with hyphens replaced by spaces', () => {
    expect(localizeCountry('England', 'en')).toBe('England')
    expect(localizeCountry('Northern-Ireland', 'en')).toBe('Northern Ireland')
    expect(localizeCountry('Czech-Republic', 'en')).toBe('Czech Republic')
  })

  it('empty input returns empty string', () => {
    expect(localizeCountry(null, 'ko')).toBe('')
    expect(localizeCountry('', 'ko')).toBe('')
  })

  it('unmapped values (World etc.) fall back to original', () => {
    expect(localizeCountry('World', 'ko', t)).toBe('World')
    expect(localizeCountry('Some Fake Country', 'ko')).toBe('Some Fake Country')
  })
})
