import { describe, it, expect } from 'vitest'
import { pickUpcoming, pickRecent } from './matchSort.js'

// ─── pickRecent — 회귀 방지: 라운드 번호가 아니라 kickoffAt 내림차순으로 정렬한 뒤 앞 n 개
//
// 2026-09-10 실측 (바르셀로나 종료 4경기, 백엔드가 라운드 번호 순서로 보냈다):
//   R2 8/23  Elche 0-5 Barcelona
//   R1 8/27  Barcelona 2-0 Athletic  (연기 경기)
//   R3 8/31  Barcelona 5-2 Rayo
//   R4 9/6   Valencia 0-5 Barcelona  ← 지금 slice(0,3) 은 이걸 자른다
// "최근 결과 3건" 은 가장 최신 3건(R4·R3·R1)이어야 한다.
//
// 3건짜리 픽스처로는 자르기가 안 일어나 회귀를 못 잡는다 — 4건 이상으로 검사.

describe('pickRecent', () => {
  const four = [
    { id: 'r2', date: '2026-08-23T18:00:00Z', displayState: 'final' },
    { id: 'r1', date: '2026-08-27T18:00:00Z', displayState: 'final' },  // 연기된 R1
    { id: 'r3', date: '2026-08-31T18:00:00Z', displayState: 'final' },
    { id: 'r4', date: '2026-09-06T18:00:00Z', displayState: 'final' },
  ]

  it('returns the FIVE most recent finished matches in newest-first order (not round order)', () => {
    // 라운드 순 slice 는 r2·r1·r3 을 낸다 (버그). 최신순은 r4·r3·r1.
    const out = pickRecent(four, 3)
    expect(out.map(m => m.id)).toEqual(['r4', 'r3', 'r1'])
  })

  it('handles fewer matches than n gracefully', () => {
    const out = pickRecent(four.slice(0, 2), 3)
    expect(out).toHaveLength(2)
    expect(out.map(m => m.id)).toEqual(['r1', 'r2'])  // 두 개도 최신순
  })

  it('accepts confirmed·recheck·final as finished states', () => {
    const mixed = [
      { id: 'a', date: '2026-08-23T18:00:00Z', displayState: 'confirmed' },
      { id: 'b', date: '2026-08-27T18:00:00Z', displayState: 'recheck' },
      { id: 'c', date: '2026-08-31T18:00:00Z', displayState: 'final' },
      { id: 'd', date: '2026-08-15T18:00:00Z', displayState: 'scheduled' },  // 제외
    ]
    const out = pickRecent(mixed, 5)
    expect(out.map(m => m.id)).toEqual(['c', 'b', 'a'])
  })

  it('is a no-op on null / empty input', () => {
    expect(pickRecent(null, 3)).toEqual([])
    expect(pickRecent([], 3)).toEqual([])
  })
})

describe('pickUpcoming', () => {
  it('returns the next matches in soonest-first order (ascending kickoff)', () => {
    const list = [
      { id: 'far',    date: '2026-09-25T18:00:00Z', displayState: 'scheduled' },
      { id: 'near',   date: '2026-09-13T18:00:00Z', displayState: 'scheduled' },
      { id: 'middle', date: '2026-09-20T18:00:00Z', displayState: 'scheduled' },
      { id: 'past',   date: '2026-08-31T18:00:00Z', displayState: 'final' },  // 제외
    ]
    const out = pickUpcoming(list, 2)
    expect(out.map(m => m.id)).toEqual(['near', 'middle'])
  })
})
