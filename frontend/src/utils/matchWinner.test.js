/**
 * matchWinner.js — 경기 카드 승자 판정 회귀 잠금 (feat/round-navigation A 판).
 *
 * MatchCard 가 소비하는 순수함수. `winnerTeamRef` 는 normalize.js:406 이 통과시키고
 * `homeTeam.slug` · `awayTeam.slug` 은 normalizeTeam(dto.ref) 결과 (normalize.js:166).
 * 백엔드 `winnerTeamId → team.ref` 로 변환 (match.service.ts:329-330) 되므로 두 값이 동일 문자열이면 승자.
 */

import { describe, it, expect } from 'vitest'
import { isMatchWinner } from './matchWinner'

describe('isMatchWinner (feat/round-navigation)', () => {
  const HOME = { slug: '33-manchester-united' }
  const AWAY = { slug: '40-liverpool' }

  it('T-L1: home team is the winner → home:true · away:false', () => {
    const m = { winnerTeamRef: HOME.slug, homeTeam: HOME, awayTeam: AWAY }
    expect(isMatchWinner(m, 'home')).toBe(true)
    expect(isMatchWinner(m, 'away')).toBe(false)
  })

  it('T-L2: away team is the winner → home:false · away:true', () => {
    const m = { winnerTeamRef: AWAY.slug, homeTeam: HOME, awayTeam: AWAY }
    expect(isMatchWinner(m, 'home')).toBe(false)
    expect(isMatchWinner(m, 'away')).toBe(true)
  })

  it('T-L3: draw (winnerTeamRef null) → both false', () => {
    const m = { winnerTeamRef: null, homeTeam: HOME, awayTeam: AWAY }
    expect(isMatchWinner(m, 'home')).toBe(false)
    expect(isMatchWinner(m, 'away')).toBe(false)
  })

  it('T-L4: not finished yet (winnerTeamRef undefined) → both false', () => {
    const m = { homeTeam: HOME, awayTeam: AWAY }
    expect(isMatchWinner(m, 'home')).toBe(false)
    expect(isMatchWinner(m, 'away')).toBe(false)
  })

  it('T-L5: PK winner (winnerTeamRef set even when goals equal · match.pen non-null) → home:true', () => {
    // 승부차기 종료 · winnerTeamRef 는 이미 PK 승자를 담고 있음 (백엔드 계약).
    // isMatchWinner 는 penHome/penAway 를 안 봐도 정확 — winnerTeamRef 로 충분.
    const m = {
      winnerTeamRef: HOME.slug,
      homeTeam: HOME, awayTeam: AWAY,
      score: { home: 1, away: 1 },
      penHome: 5, penAway: 4,
    }
    expect(isMatchWinner(m, 'home')).toBe(true)
    expect(isMatchWinner(m, 'away')).toBe(false)
  })

  it('safety: null/undefined match or missing team slug → both false (never crashes)', () => {
    expect(isMatchWinner(null, 'home')).toBe(false)
    expect(isMatchWinner(undefined, 'home')).toBe(false)
    expect(isMatchWinner({ winnerTeamRef: 'X', homeTeam: {} }, 'home')).toBe(false)
  })
})
