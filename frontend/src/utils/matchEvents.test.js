import { describe, it, expect } from 'vitest'
import { buildEventMapByRef } from './matchEvents.js'

describe('buildEventMapByRef', () => {
  // 같은 playerRef 에 여러 이벤트가 붙는 실제 경기(예: 골 + 경고) — 배열에 순서대로 담긴다
  it('collects multiple event types for the same playerRef', () => {
    const events = [
      { playerRef: '2-haaland', type: 'goal' },
      { playerRef: '2-haaland', type: 'yellow_card' },
      { playerRef: '4-raya',    type: 'yellow_card' },
    ]
    const map = buildEventMapByRef(events)
    expect(map['2-haaland']).toEqual(['goal', 'yellow_card'])
    expect(map['4-raya']).toEqual(['yellow_card'])
    expect(Object.keys(map)).toHaveLength(2)
  })

  // playerRef 가 null·undefined 인 이벤트는 마커에 붙일 곳이 없어 스킵한다
  it('skips events with a null or missing playerRef', () => {
    const events = [
      { playerRef: null,        type: 'goal' },
      { playerRef: undefined,   type: 'yellow_card' },
      { playerRef: '',          type: 'red_card' },
      { playerRef: '2-haaland', type: 'goal' },
    ]
    const map = buildEventMapByRef(events)
    expect(Object.keys(map)).toEqual(['2-haaland'])
    expect(map['2-haaland']).toEqual(['goal'])
  })

  // 빈 배열·기본값 → 빈 객체
  it('returns an empty object for an empty or missing events array', () => {
    expect(buildEventMapByRef([])).toEqual({})
    expect(buildEventMapByRef()).toEqual({})
  })
})
