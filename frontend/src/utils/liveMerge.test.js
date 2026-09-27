/**
 * liveMerge.js 순수 유틸 잠금.
 * - normalizeMatch (services/normalize.js:379) 는 dataVersion 을 안 채운다 → 대부분 케이스 '항상 덮음'.
 * - 라이브 폴링이 5h 창 밖으로 밀린 fixture 를 응답에서 뺄 수 있어도, 훅이 관리하는 liveMap 은
 *   마지막 스냅샷을 유지한다. 이 파일은 liveMap 이 갖고 있으면 그 값이 그대로 반영된다는 것만 잠근다.
 */

import { describe, it, expect } from 'vitest'
import { mergeLive, toLiveMap } from './liveMerge'

describe('mergeLive', () => {
  it('returns list unchanged when liveMap is empty', () => {
    const list = [
      { id: '1', score: { home: 0, away: 0 }, minute: null, displayState: 'scheduled' },
      { id: '2', score: { home: 1, away: 1 }, minute: 12,   displayState: 'live' },
    ]
    const empty = new Map()
    const result = mergeLive(list, empty)
    expect(result).toBe(list) // 참조 그대로 (얕은 복사도 안 함)
  })

  it('preserves untouched fields (round · venue · events · homeTeam)', () => {
    const list = [{
      id: '1',
      round: 'RS-5',
      venue: 'Etihad',
      events: [{ minute: 12 }],
      homeTeam: { name: 'H' },
      awayTeam: { name: 'A' },
      score: { home: 0, away: 0 },
      minute: null,
      displayState: 'scheduled',
    }]
    const map = new Map([['1', {
      id: '1',
      score: { home: 1, away: 0 },
      minute: 34,
      statusCode: '2H',
      displayState: 'live',
      asOf: 'z',
      dataVersion: 2,
    }]])
    const [m] = mergeLive(list, map)
    // 원본 필드 그대로
    expect(m.round).toBe('RS-5')
    expect(m.venue).toBe('Etihad')
    expect(m.events).toEqual([{ minute: 12 }])
    expect(m.homeTeam).toEqual({ name: 'H' })
    expect(m.awayTeam).toEqual({ name: 'A' })
    // 라이브 필드만 덮임
    expect(m.score).toEqual({ home: 1, away: 0 })
    expect(m.minute).toBe(34)
    expect(m.displayState).toBe('live')
    expect(m.statusCode).toBe('2H')
    expect(m.asOf).toBe('z')
    expect(m.dataVersion).toBe(2)
  })

  it('skips override when live.dataVersion <= list.dataVersion', () => {
    const list = [{
      id: '1',
      score: { home: 3, away: 3 },
      minute: 90,
      displayState: 'final',
      dataVersion: 5,
    }]
    const map = new Map([['1', {
      id: '1',
      score: { home: 0, away: 0 },
      minute: 1,
      statusCode: 'NS',
      displayState: 'scheduled',
      asOf: 'z',
      dataVersion: 5,
    }]])
    const [m] = mergeLive(list, map)
    expect(m.score).toEqual({ home: 3, away: 3 })
    expect(m.displayState).toBe('final')
    expect(m.dataVersion).toBe(5)
  })

  it('always overrides when list.dataVersion is null', () => {
    const list = [{
      id: '1',
      score: { home: 0, away: 0 },
      minute: null,
      displayState: 'scheduled',
      dataVersion: null,
    }]
    const map = new Map([['1', {
      id: '1',
      score: { home: 1, away: 0 },
      minute: 5,
      statusCode: '1H',
      displayState: 'live',
      asOf: 'z',
      dataVersion: 1,
    }]])
    const [m] = mergeLive(list, map)
    expect(m.score).toEqual({ home: 1, away: 0 })
    expect(m.displayState).toBe('live')
    expect(m.dataVersion).toBe(1)
  })

  it('leaves items without a matching liveMap id untouched', () => {
    const list = [
      { id: '1', score: { home: 0, away: 0 }, displayState: 'scheduled' },
      { id: '2', score: { home: 2, away: 2 }, displayState: 'live', minute: 40 },
    ]
    const map = new Map([['1', {
      id: '1',
      score: { home: 1, away: 0 },
      minute: 8,
      statusCode: '1H',
      displayState: 'live',
      asOf: 'z',
      dataVersion: 3,
    }]])
    const [a, b] = mergeLive(list, map)
    expect(a.score).toEqual({ home: 1, away: 0 }) // 덮임
    expect(b.score).toEqual({ home: 2, away: 2 }) // 원본 그대로
    expect(b.minute).toBe(40)
  })

  it('preserves previously-known final state when the match disappears from the current live response', () => {
    // 훅이 관리하는 누적 map 시나리오: 새 폴링 응답에는 '1' 이 없지만 liveMap 은
    // 이전 라운드에서 관측한 최종값(final 2-1) 을 그대로 갖고 있다.
    // mergeLive 는 그 액을 그대로 덮어야 한다 (아직 화면에 남아 있는 것이 '진짜').
    const list = [
      { id: '1', displayState: 'live', score: { home: 1, away: 0 }, minute: 78 },
    ]
    const liveMap = new Map([['1', {
      id: '1',
      score: { home: 2, away: 1 },
      minute: null,
      statusCode: 'FT',
      displayState: 'final',
      asOf: '2026-09-27T20:00:00Z',
      dataVersion: 9,
    }]])
    const [m] = mergeLive(list, liveMap)
    expect(m.displayState).toBe('final')
    expect(m.score).toEqual({ home: 2, away: 1 })
    expect(m.dataVersion).toBe(9)
  })
})

describe('toLiveMap', () => {
  it('builds a map keyed by id from a NormalizedLive array', () => {
    const arr = [
      { id: '1', displayState: 'live', score: { home: 1, away: 0 } },
      { id: '2', displayState: 'halftime', score: { home: 0, away: 0 } },
    ]
    const map = toLiveMap(arr)
    expect(map.size).toBe(2)
    expect(map.get('1').displayState).toBe('live')
    expect(map.get('2').displayState).toBe('halftime')
  })

  it('handles null · non-array input', () => {
    expect(toLiveMap(null).size).toBe(0)
    expect(toLiveMap(undefined).size).toBe(0)
    expect(toLiveMap('not-an-array').size).toBe(0)
    expect(toLiveMap([]).size).toBe(0)
  })
})
