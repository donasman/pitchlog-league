/**
 * schedule.js — splitSchedule 회귀 잠금 (feat/schedule-split).
 *
 * 픽스처는 normalized 모양 (date · displayState · round 문자열 · roundOrdinal). 판 지시서 원문:
 * "픽스처는 normalized 모양. 케이스: 세 갈래 분류 · 정렬 방향 둘 · 빈 배열 · 진행 중 없음."
 */

import { describe, it, expect } from 'vitest'
import { splitSchedule } from './schedule'

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
