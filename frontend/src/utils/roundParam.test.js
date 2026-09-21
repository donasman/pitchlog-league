/**
 * roundParam.js — URL `?round=` 판정 회귀 잠금 (feat/round-navigation A 판).
 *
 * `roundParamAction(urlKey, matches, nowDate)` 은 훅 부수효과와 분리된 순수함수.
 * shouldSync 는 이 판에서 항상 false — 시즌 변경 시 상위 CompetitionPage 가 명시적 setRoundKey(null) 로 URL 을 정리한다.
 * 사용자 정정 3 (2026-09-21): "?round= 은 roundOrdinal 우선 · 이름 폴백. 시즌 변경(urlKey 부재 → 기본값 · shouldSync) 케이스" 명시.
 */

import { describe, it, expect } from 'vitest'
import { roundParamAction } from './roundParam'

const NOW = new Date('2026-09-21T12:00:00Z')

const LEAGUE_MATCHES = [
  { date: '2026-09-01T15:00Z', displayState: 'final',     round: 'Regular Season - 3', roundOrdinal: 3 },
  { date: '2026-09-14T15:00Z', displayState: 'final',     round: 'Regular Season - 4', roundOrdinal: 4 },
  { date: '2026-09-21T14:00Z', displayState: 'live',      round: 'Regular Season - 5', roundOrdinal: 5 },
  { date: '2026-09-28T15:00Z', displayState: 'scheduled', round: 'Regular Season - 6', roundOrdinal: 6 },
]

describe('roundParamAction (feat/round-navigation)', () => {
  it('T-J1: empty urlKey → pickDefaultRound (live round 5) · shouldSync=false', () => {
    const r = roundParamAction('', LEAGUE_MATCHES, NOW)
    expect(r).toEqual({ roundKey: '5', shouldSync: false })
  })

  it('T-J2: valid urlKey exists in matches → pass-through · shouldSync=false', () => {
    const r = roundParamAction('4', LEAGUE_MATCHES, NOW)
    expect(r).toEqual({ roundKey: '4', shouldSync: false })
  })

  it('T-J3: urlKey not in this season → falls back to pickDefaultRound (no auto-sync — parent clears explicitly)', () => {
    // 다른 시즌에서 온 URL — 이번 시즌 라운드에 없음. shouldSync=false 는 유지 (parent 가 명시적 정리)
    const r = roundParamAction('99', LEAGUE_MATCHES, NOW)
    expect(r).toEqual({ roundKey: '5', shouldSync: false })
  })

  it('T-J4: season changed · new season matches empty (before first fetch) → { roundKey:"", shouldSync:false }', () => {
    // 사용자 정정 3 명시: 시즌 변경 시나리오. matches 가 아직 비면 urlKey 부재 취급 · 기본값 계산 결과도 빈 값.
    expect(roundParamAction('', [], NOW)).toEqual({ roundKey: '', shouldSync: false })
    expect(roundParamAction('5', [], NOW)).toEqual({ roundKey: '', shouldSync: false })
  })

  it('T-J5: cup key by name (roundOrdinal=null · fallback to round string) → pass-through', () => {
    const cupMatches = [
      { date: '2026-11-01T15:00Z', displayState: 'scheduled', round: 'Round of 64', roundOrdinal: null },
      { date: '2026-12-05T15:00Z', displayState: 'scheduled', round: 'Round of 32', roundOrdinal: null },
    ]
    expect(roundParamAction('Round of 32', cupMatches, NOW)).toEqual({ roundKey: 'Round of 32', shouldSync: false })
  })
})
