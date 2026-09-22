/**
 * TieCard.test.js — 부전승 캡션 팀 이름 배열 (byeCaptionNames) 회귀 잠금
 * (fix/bracket-bye-badge · 09-22)
 *
 * TeamSlot 안 배지가 열 폭 255px 에서 이름 span 을 0px 로 밀어 스코어와 겹치던 실측 결함을
 * 카드 상단 캡션 1회로 이관. 테스트는 순수함수 `byeCaptionNames` 만 검증 — 렌더 없음.
 */

import { describe, it, expect } from 'vitest'
import { byeCaptionNames } from './TieCard.jsx'

const TEAM_A = { slug: '10-team-a', name: 'Team A', shortNames: { ko: 'A팀', en: 'Team A' } }
const TEAM_B = { slug: '20-team-b', name: 'Team B', shortNames: { ko: 'B팀', en: 'Team B' } }

describe('byeCaptionNames (fix/bracket-bye-badge)', () => {
  it('T-R1: home bye only → [home]', () => {
    expect(byeCaptionNames({ home: TEAM_A, away: TEAM_B, homeBye: true, awayBye: false, locale: 'en' }))
      .toEqual(['Team A'])
  })

  it('T-R2: away bye only → [away]', () => {
    expect(byeCaptionNames({ home: TEAM_A, away: TEAM_B, homeBye: false, awayBye: true, locale: 'en' }))
      .toEqual(['Team B'])
  })

  it('T-R3: both bye → [home, away]', () => {
    expect(byeCaptionNames({ home: TEAM_A, away: TEAM_B, homeBye: true, awayBye: true, locale: 'en' }))
      .toEqual(['Team A', 'Team B'])
  })

  it('T-R4: neither bye → []', () => {
    expect(byeCaptionNames({ home: TEAM_A, away: TEAM_B, homeBye: false, awayBye: false, locale: 'en' }))
      .toEqual([])
  })
})
