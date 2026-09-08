import { describe, it, expect } from 'vitest'
import { selectableSeasons, seasonYearFromParam, isPastSeason } from './seasons.js'

// backend `SeasonSummaryDto` as reshaped by normalizeSeason (services/normalize.js:167-177)
function season(year, { dataState = 'COMPLETE', current = false } = {}) {
  const label = `${year}-${String((year + 1) % 100).padStart(2, '0')}`
  return { id: label, label, year, current, status: 'FINISHED', dataState }
}

// 백필-1 이 끝난 상태: 2022~2026 다섯 시즌이 전부 COMPLETE, 2026 이 현재 시즌
const COMPLETE_5 = [
  season(2026, { current: true }),
  season(2025),
  season(2024),
  season(2023),
  season(2022),
]

describe('selectableSeasons', () => {
  it('keeps only COMPLETE seasons', () => {
    const list = [
      season(2026, { current: true }),
      season(2025, { dataState: 'PARTIAL' }),
      season(2024, { dataState: 'NONE' }),
      season(2023),
    ]
    expect(selectableSeasons(list).map(s => s.year)).toEqual([2026, 2023])
  })

  it('sorts by year descending', () => {
    const shuffled = [season(2023), season(2026, { current: true }), season(2024)]
    expect(selectableSeasons(shuffled).map(s => s.year)).toEqual([2026, 2024, 2023])
  })

  it('does not mutate the input array', () => {
    const list = [season(2023), season(2026, { current: true })]
    selectableSeasons(list)
    expect(list.map(s => s.year)).toEqual([2023, 2026])
  })

  it.each([
    ['undefined', undefined],
    ['null', null],
    ['a non-array value', { year: 2025 }],
    ['an empty array', []],
  ])('returns [] for %s', (_label, input) => {
    expect(selectableSeasons(input)).toEqual([])
  })

  it('hides a season with no dataState — an unknown state is not COMPLETE', () => {
    expect(selectableSeasons([{ id: '2025-26', label: '2025-26', year: 2025 }])).toEqual([])
  })
})

describe('seasonYearFromParam', () => {
  it.each([
    ['a year string', '2024', 2024],
    ['the current season year', '2026', 2026],
    ['a label left by an older URL', '2024-25', 2024],
    ['the current season label', '2026-27', 2026],
    ['a number', 2024, 2024],
  ])('resolves %s to a year', (_label, param, expected) => {
    expect(seasonYearFromParam(param, COMPLETE_5)).toBe(expected)
  })

  it.each([
    ['a year not in the list', '2019'],
    ['a label not in the list', '2019-20'],
    ['a non-numeric value', 'latest'],
    ['an empty string', ''],
    ['null', null],
    ['undefined', undefined],
  ])('returns null for %s', (_label, param) => {
    expect(seasonYearFromParam(param, COMPLETE_5)).toBeNull()
  })

  // 목록을 아직 못 받았으면 판단 근거가 없다 — 호출자가 URL 을 지우지 않도록 null 이다
  it('returns null while the season list is still missing', () => {
    expect(seasonYearFromParam('2024', [])).toBeNull()
    expect(seasonYearFromParam('2024', undefined)).toBeNull()
  })
})

describe('isPastSeason', () => {
  it('is false for the current season', () => {
    expect(isPastSeason(2026, COMPLETE_5)).toBe(false)
  })

  it.each([2025, 2024, 2023, 2022])('is true for %i', year => {
    expect(isPastSeason(year, COMPLETE_5)).toBe(true)
  })

  it('accepts the year as a string', () => {
    expect(isPastSeason('2024', COMPLETE_5)).toBe(true)
    expect(isPastSeason('2026', COMPLETE_5)).toBe(false)
  })

  // live.js 가 이 값으로 경기 조회 창을 걷어낸다 — 모르는 값을 과거로 단정하면 창이 잘못 사라진다
  it.each([
    ['a year not in the list', 2019, COMPLETE_5],
    ['an empty list', 2024, []],
    ['a missing list', 2024, undefined],
    ['a missing year', null, COMPLETE_5],
    ['a non-numeric year', 'latest', COMPLETE_5],
  ])('is false for %s', (_label, year, seasons) => {
    expect(isPastSeason(year, seasons)).toBe(false)
  })
})
