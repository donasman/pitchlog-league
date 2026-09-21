/**
 * schedule.js — splitSchedule 회귀 잠금 (feat/schedule-split).
 *
 * 픽스처는 normalized 모양 (date · displayState · round 문자열 · roundOrdinal). 판 지시서 원문:
 * "픽스처는 normalized 모양. 케이스: 세 갈래 분류 · 정렬 방향 둘 · 빈 배열 · 진행 중 없음."
 */

import { describe, it, expect } from 'vitest'
import {
  splitSchedule,
  pickDefaultRound,
  roundList,
  roundStatus,
  filterByRound,
} from './schedule'

// A representative round-2 fixture — a live match, three scheduled, three finished.
const MATCHES = [
  { id: 'live-a',     date: '2026-09-21T15:00:00Z', displayState: 'live',      round: 'Regular Season - 5', roundOrdinal: 5 },
  { id: 'up-far',     date: '2026-10-05T15:00:00Z', displayState: 'scheduled', round: 'Regular Season - 7', roundOrdinal: 7 },
  { id: 'up-near',    date: '2026-09-28T15:00:00Z', displayState: 'scheduled', round: 'Regular Season - 6', roundOrdinal: 6 },
  { id: 'up-mid',     date: '2026-10-01T15:00:00Z', displayState: 'scheduled', round: 'Regular Season - 6', roundOrdinal: 6 },
  { id: 'res-old',    date: '2026-08-15T15:00:00Z', displayState: 'final',     round: 'Regular Season - 1', roundOrdinal: 1 },
  { id: 'res-recent', date: '2026-09-14T15:00:00Z', displayState: 'confirmed', round: 'Regular Season - 4', roundOrdinal: 4 },
  { id: 'res-mid',    date: '2026-08-30T15:00:00Z', displayState: 'recheck',   round: 'Regular Season - 3', roundOrdinal: 3 },
]

describe('splitSchedule (feat/schedule-split · reused by next round-nav pane)', () => {
  it('splits by displayState — live·upcoming·results based on isLive/isFinished only', () => {
    const { live, upcoming, results } = splitSchedule(MATCHES)
    expect(live.map(m => m.id)).toEqual(['live-a'])                                  // isLive
    expect(upcoming.map(m => m.id).sort()).toEqual(['up-far', 'up-mid', 'up-near'])   // scheduled
    expect(results.map(m => m.id).sort()).toEqual(['res-mid', 'res-old', 'res-recent']) // final·confirmed·recheck
  })

  it('upcoming ascending by date · results descending (newest first) · live ascending', () => {
    const { live, upcoming, results } = splitSchedule(MATCHES)
    expect(upcoming.map(m => m.id)).toEqual(['up-near', 'up-mid', 'up-far'])       // 09-28 → 10-01 → 10-05
    expect(results.map(m => m.id)).toEqual(['res-recent', 'res-mid', 'res-old'])   // 09-14 → 08-30 → 08-15
    expect(live[0].id).toBe('live-a')                                              // single live match
  })

  it('empty input → empty sections (no crash on null/undefined either)', () => {
    expect(splitSchedule([])).toEqual({ live: [], upcoming: [], results: [] })
    expect(splitSchedule(null)).toEqual({ live: [], upcoming: [], results: [] })
    expect(splitSchedule(undefined)).toEqual({ live: [], upcoming: [], results: [] })
  })

  it('no live matches → live is empty · upcoming/results still classify correctly', () => {
    const without = MATCHES.filter(m => m.displayState !== 'live')
    const { live, upcoming, results } = splitSchedule(without)
    expect(live).toEqual([])
    expect(upcoming.map(m => m.id)).toEqual(['up-near', 'up-mid', 'up-far'])
    expect(results.map(m => m.id)).toEqual(['res-recent', 'res-mid', 'res-old'])
  })

  it('does not mutate input array (immutability contract)', () => {
    const input = MATCHES.slice()
    const snapshot = input.map(m => m.id)
    splitSchedule(input)
    expect(input.map(m => m.id)).toEqual(snapshot)
  })
})

// ── pickDefaultRound (D2 ㄴ 갈래 · feat/round-navigation) ─────────────────────
// 백엔드 무건드 · 시즌 전체 로드 후 프론트가 라운드 자름. 규칙: live → upcoming → results.
// 픽스처는 normalized 모양 (date · displayState · round 문자열 · roundOrdinal).

describe('pickDefaultRound (feat/round-navigation D2 fallback chain)', () => {
  const now = new Date('2026-09-21T12:00:00Z')

  it('T-F1: live match exists → its round (source=live) even if there are upcoming/results', () => {
    const matches = [
      { date: '2026-09-01T15:00:00Z', displayState: 'final',     round: 'Regular Season - 3', roundOrdinal: 3 },
      { date: '2026-09-21T14:00:00Z', displayState: 'live',      round: 'Regular Season - 5', roundOrdinal: 5 },
      { date: '2026-09-28T15:00:00Z', displayState: 'scheduled', round: 'Regular Season - 6', roundOrdinal: 6 },
    ]
    const r = pickDefaultRound(matches, now)
    expect(r).toEqual({ roundOrdinal: 5, roundKey: '5', source: 'live' })
  })

  it('T-F2: no live · upcoming exists → earliest kickoff round (source=upcoming)', () => {
    const matches = [
      { date: '2026-09-01T15:00:00Z', displayState: 'final',     round: 'Regular Season - 3', roundOrdinal: 3 },
      { date: '2026-10-05T15:00:00Z', displayState: 'scheduled', round: 'Regular Season - 7', roundOrdinal: 7 },
      { date: '2026-09-28T15:00:00Z', displayState: 'scheduled', round: 'Regular Season - 6', roundOrdinal: 6 },
    ]
    const r = pickDefaultRound(matches, now)
    expect(r).toEqual({ roundOrdinal: 6, roundKey: '6', source: 'upcoming' })
  })

  it('T-F3: all settled → largest roundOrdinal (source=results · end of season)', () => {
    const matches = [
      { date: '2026-05-01T15:00:00Z', displayState: 'final', round: 'Regular Season - 36', roundOrdinal: 36 },
      { date: '2026-05-15T15:00:00Z', displayState: 'final', round: 'Regular Season - 38', roundOrdinal: 38 },
      { date: '2026-05-08T15:00:00Z', displayState: 'final', round: 'Regular Season - 37', roundOrdinal: 37 },
    ]
    const r = pickDefaultRound(matches, now)
    expect(r).toEqual({ roundOrdinal: 38, roundKey: '38', source: 'results' })
  })

  it('T-F4: empty input → { null, "", results }', () => {
    expect(pickDefaultRound([], now)).toEqual({ roundOrdinal: null, roundKey: '', source: 'results' })
    expect(pickDefaultRound(null, now)).toEqual({ roundOrdinal: null, roundKey: '', source: 'results' })
  })

  it('T-F5: single round · all scheduled → that round (source=upcoming)', () => {
    const matches = [
      { date: '2026-08-15T15:00:00Z', displayState: 'scheduled', round: 'Final', roundOrdinal: null },
    ]
    const r = pickDefaultRound(matches, now)
    expect(r).toEqual({ roundOrdinal: null, roundKey: 'Final', source: 'upcoming' })
  })

  it('T-F6: prior round finished +12h · next round scheduled → next round (upcoming)', () => {
    // 사용자 정정 1 (2026-09-21): "직전 라운드 완료 +12h" 케이스 명시.
    // 12시간 전 마지막 경기 종료 · 다음 라운드는 며칠 뒤. pickDefaultRound 는 upcoming 폴백을 타야.
    const matches = [
      { date: '2026-09-21T00:00:00Z', displayState: 'final',     round: 'Regular Season - 5', roundOrdinal: 5 }, // -12h
      { date: '2026-09-28T15:00:00Z', displayState: 'scheduled', round: 'Regular Season - 6', roundOrdinal: 6 },
    ]
    const r = pickDefaultRound(matches, now)
    expect(r).toEqual({ roundOrdinal: 6, roundKey: '6', source: 'upcoming' })
  })

  it('T-F7: prior round finished +72h · next round scheduled → next round (upcoming)', () => {
    // 사용자 정정 1 (2026-09-21): "+72h" 케이스 명시. 규칙 동일.
    const matches = [
      { date: '2026-09-18T12:00:00Z', displayState: 'final',     round: 'Regular Season - 5', roundOrdinal: 5 }, // -72h
      { date: '2026-09-28T15:00:00Z', displayState: 'scheduled', round: 'Regular Season - 6', roundOrdinal: 6 },
    ]
    const r = pickDefaultRound(matches, now)
    expect(r).toEqual({ roundOrdinal: 6, roundKey: '6', source: 'upcoming' })
  })
})

// ── roundList — season-wide round summary ────────────────────────────────────
describe('roundList (feat/round-navigation)', () => {
  it('T-G1: 3 EPL rounds → sorted by ordinal ascending', () => {
    const matches = [
      { round: 'Regular Season - 3', roundOrdinal: 3, displayState: 'final' },
      { round: 'Regular Season - 1', roundOrdinal: 1, displayState: 'final' },
      { round: 'Regular Season - 2', roundOrdinal: 2, displayState: 'final' },
    ]
    expect(roundList(matches).map(r => r.ordinal)).toEqual([1, 2, 3])
  })

  it('T-G2: FA Cup rounds with roundOrdinal=null → insertion-order fallback', () => {
    const matches = [
      { round: 'Round of 64', roundOrdinal: null, displayState: 'final' },
      { round: 'Round of 32', roundOrdinal: null, displayState: 'final' },
      { round: 'Round of 16', roundOrdinal: null, displayState: 'scheduled' },
    ]
    expect(roundList(matches).map(r => r.name)).toEqual(['Round of 64', 'Round of 32', 'Round of 16'])
  })

  it('T-G3: mixed qualifying + league-phase + KO → all sorted asc, counts aggregated', () => {
    const matches = [
      { round: '3rd Qualifying Round', roundOrdinal: 1, displayState: 'final' },
      { round: 'League Stage - 1',     roundOrdinal: 4, displayState: 'final' },
      { round: 'League Stage - 1',     roundOrdinal: 4, displayState: 'final' },
      { round: 'Round of 16',          roundOrdinal: 12, displayState: 'scheduled' },
    ]
    const list = roundList(matches)
    expect(list.map(r => r.ordinal)).toEqual([1, 4, 12])
    expect(list[1].matchCount).toBe(2)
    expect(list[1].settled).toBe(2)
    expect(list[2].hasUpcoming).toBe(true)
  })
})

// ── roundStatus — three-state derivation ─────────────────────────────────────
describe('roundStatus (feat/round-navigation)', () => {
  it('T-H1: matchCount 10 · settled 10 → completed', () => {
    expect(roundStatus({ hasLive: false, settled: 10, matchCount: 10 })).toBe('completed')
  })

  it('T-H2: hasLive true → current (regardless of settled count)', () => {
    expect(roundStatus({ hasLive: true, settled: 5, matchCount: 10 })).toBe('current')
    expect(roundStatus({ hasLive: true, settled: 0, matchCount: 10 })).toBe('current')
  })

  it('T-H3: partial or empty · no live → upcoming', () => {
    expect(roundStatus({ hasLive: false, settled: 5, matchCount: 10 })).toBe('upcoming')
    expect(roundStatus({ hasLive: false, settled: 0, matchCount: 10 })).toBe('upcoming')
    expect(roundStatus({ hasLive: false, settled: 0, matchCount:  0 })).toBe('upcoming')
  })
})

// ── filterByRound — narrow to a single round ─────────────────────────────────
describe('filterByRound (feat/round-navigation)', () => {
  const MIX = [
    { round: 'Regular Season - 5', roundOrdinal: 5,    id: 'a' },
    { round: 'Regular Season - 6', roundOrdinal: 6,    id: 'b' },
    { round: 'Round of 16',        roundOrdinal: null, id: 'c' },
  ]

  it('T-I1: numeric roundKey narrows to matching roundOrdinal · falsy key returns full list · cup name key matches by round string', () => {
    expect(filterByRound(MIX, '5').map(m => m.id)).toEqual(['a'])
    expect(filterByRound(MIX, '').map(m => m.id)).toEqual(['a', 'b', 'c'])
    expect(filterByRound(MIX, null).map(m => m.id)).toEqual(['a', 'b', 'c'])
    expect(filterByRound(MIX, 'Round of 16').map(m => m.id)).toEqual(['c'])
  })
})
