/**
 * ties.test.js — buildTies · bracketRounds · defaultTab · isSuperCup 회귀 잠금
 * (feat/tournament-bracket · A 계열)
 *
 * 픽스처는 normalized 모양 그대로 (score · displayState · round 문자열 · roundOrdinal ·
 *   homeTeam.slug · winnerTeamRef · penHome/penAway · etHome/etAway). DTO 모양 아님.
 * describe/it 영어 라벨.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { buildTies, bracketRounds, defaultTab, isSuperCup } from './ties.js'

// ─── fixtures — normalized shape 그대로 ─────────────────────
const TEAM_A = { slug: '10-team-a', name: 'Team A' }
const TEAM_B = { slug: '20-team-b', name: 'Team B' }
const TEAM_C = { slug: '30-team-c', name: 'Team C' }
const TEAM_D = { slug: '40-team-d', name: 'Team D' }

/**
 * @param {object} overrides
 * @returns {object} NormalizedMatch (필드는 normalize.js:379~421 그대로)
 */
function makeMatch(overrides) {
  return {
    id: 'm-x',
    round: 'Round of 16',
    roundOrdinal: 16,
    date: '2027-02-20T20:00:00Z',
    homeTeam: TEAM_A,
    awayTeam: TEAM_B,
    score: { home: null, away: null },
    displayState: 'scheduled',
    winnerTeamRef: null,
    penHome: null,
    penAway: null,
    etHome: null,
    etAway: null,
    ...overrides,
  }
}

// ═══════════════════════════════════════════════════════════
describe('buildTies (feat/tournament-bracket)', () => {
  let warnSpy
  beforeEach(() => { warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {}) })
  afterEach(() => { warnSpy.mockRestore() })

  it('T-M1: UCL R16 two legs · winner by aggregate (2-1 · 1-1)', () => {
    const legs = [
      makeMatch({
        id: 'leg1', date: '2027-02-20T20:00:00Z',
        homeTeam: TEAM_A, awayTeam: TEAM_B,
        score: { home: 2, away: 1 }, displayState: 'confirmed',
        winnerTeamRef: TEAM_A.slug,
      }),
      makeMatch({
        id: 'leg2', date: '2027-03-13T20:00:00Z',
        homeTeam: TEAM_B, awayTeam: TEAM_A,
        score: { home: 1, away: 1 }, displayState: 'confirmed',
        winnerTeamRef: TEAM_A.slug,
      }),
    ]
    const [tie] = buildTies(legs)
    expect(tie.legs).toHaveLength(2)
    expect(tie.aggregate).toEqual({ home: 3, away: 2 })
    expect(tie.penalties).toBeNull()
    expect(tie.winnerTeamRef).toBe(TEAM_A.slug)
    expect(tie.status).toBe('settled')
    expect(tie.decidedBy).toBe('aggregate')
  })

  it('T-M2: two legs · aggregate tied · decided in extra time (etHome/etAway non-null)', () => {
    // aggregate 동률 (2-2) · leg2 ET 로 원정팀(A) 승리
    // aggregate.home = leg1.score.home + leg2.score.away = 1 + 1 = 2
    // aggregate.away = leg1.score.away + leg2.score.home = 1 + 1 = 2
    const legs = [
      makeMatch({
        id: 'leg1', date: '2027-02-20T20:00:00Z',
        homeTeam: TEAM_A, awayTeam: TEAM_B,
        score: { home: 1, away: 1 }, displayState: 'confirmed',
      }),
      makeMatch({
        id: 'leg2', date: '2027-03-13T20:00:00Z',
        homeTeam: TEAM_B, awayTeam: TEAM_A,
        score: { home: 1, away: 1 }, displayState: 'confirmed',
        winnerTeamRef: TEAM_A.slug,
        etHome: 0, etAway: 1,
      }),
    ]
    const [tie] = buildTies(legs)
    expect(tie.aggregate).toEqual({ home: 2, away: 2 })
    expect(tie.decidedBy).toBe('et')
    expect(tie.winnerTeamRef).toBe(TEAM_A.slug)
    expect(tie.penalties).toBeNull()
  })

  it('T-M3: two legs · decided by penalties (pen fields non-null on leg2)', () => {
    const legs = [
      makeMatch({
        id: 'leg1', date: '2027-02-20T20:00:00Z',
        homeTeam: TEAM_A, awayTeam: TEAM_B,
        score: { home: 0, away: 0 }, displayState: 'confirmed',
      }),
      makeMatch({
        id: 'leg2', date: '2027-03-13T20:00:00Z',
        homeTeam: TEAM_B, awayTeam: TEAM_A,
        score: { home: 1, away: 1 }, displayState: 'confirmed',
        winnerTeamRef: TEAM_B.slug,
        etHome: 0, etAway: 0,
        penHome: 5, penAway: 4,
      }),
    ]
    const [tie] = buildTies(legs)
    expect(tie.decidedBy).toBe('pens')
    expect(tie.penalties).toEqual({ home: 5, away: 4 })
    expect(tie.winnerTeamRef).toBe(TEAM_B.slug)
  })

  it('T-M4: Copa del Rey semifinal (two legs · 2 ties) + final (single · 1 tie)', () => {
    // SF: A-B 반전 쌍 · C-D 반전 쌍
    // F: A-C 단판
    const matches = [
      makeMatch({ id: 'sf-ab-1', round: 'Semi-finals', roundOrdinal: 4,
        date: '2027-04-01T20:00:00Z',
        homeTeam: TEAM_A, awayTeam: TEAM_B,
        score: { home: 1, away: 0 }, displayState: 'confirmed',
        winnerTeamRef: TEAM_A.slug,
      }),
      makeMatch({ id: 'sf-ab-2', round: 'Semi-finals', roundOrdinal: 4,
        date: '2027-04-25T20:00:00Z',
        homeTeam: TEAM_B, awayTeam: TEAM_A,
        score: { home: 1, away: 2 }, displayState: 'confirmed',
        winnerTeamRef: TEAM_A.slug,
      }),
      makeMatch({ id: 'sf-cd-1', round: 'Semi-finals', roundOrdinal: 4,
        date: '2027-04-02T20:00:00Z',
        homeTeam: TEAM_C, awayTeam: TEAM_D,
        score: { home: 0, away: 1 }, displayState: 'confirmed',
        winnerTeamRef: TEAM_C.slug,
      }),
      makeMatch({ id: 'sf-cd-2', round: 'Semi-finals', roundOrdinal: 4,
        date: '2027-04-26T20:00:00Z',
        homeTeam: TEAM_D, awayTeam: TEAM_C,
        score: { home: 0, away: 2 }, displayState: 'confirmed',
        winnerTeamRef: TEAM_C.slug,
      }),
      makeMatch({ id: 'final', round: 'Final', roundOrdinal: 8,
        date: '2027-05-15T20:00:00Z',
        homeTeam: TEAM_A, awayTeam: TEAM_C,
        score: { home: 2, away: 1 }, displayState: 'confirmed',
        winnerTeamRef: TEAM_A.slug,
      }),
    ]
    const ties = buildTies(matches)
    const rounds = bracketRounds(ties, 'cup')
    const sf = rounds.find(r => r.roundName === 'Semi-finals')
    const f = rounds.find(r => r.roundName === 'Final')
    expect(sf).toBeTruthy()
    expect(f).toBeTruthy()
    expect(sf.ties).toHaveLength(2)
    expect(f.ties).toHaveLength(1)
    expect(f.ties[0].legs).toHaveLength(1)
    expect(f.ties[0].decidedBy).toBe('single')
  })

  it('T-M5: empty matches (before draw) → empty ties · empty rounds', () => {
    expect(buildTies([])).toEqual([])
    expect(bracketRounds([], 'cup')).toEqual([])
  })

  it('T-M6: super cup single match → 1 tie · aggregate null · single leg', () => {
    const matches = [
      makeMatch({ id: 'sc', round: 'Final', roundOrdinal: 8,
        date: '2027-08-10T20:00:00Z',
        homeTeam: TEAM_A, awayTeam: TEAM_B,
        score: { home: 2, away: 1 }, displayState: 'confirmed',
        winnerTeamRef: TEAM_A.slug,
      }),
    ]
    const ties = buildTies(matches)
    expect(ties).toHaveLength(1)
    expect(ties[0].aggregate).toBeNull()
    expect(ties[0].legs).toHaveLength(1)
    expect(ties[0].decidedBy).toBe('single')
  })

  it('T-M7: two legs · leg1 finished · leg2 scheduled → status=in_progress · decidedBy=pending', () => {
    const legs = [
      makeMatch({
        id: 'leg1', date: '2027-02-20T20:00:00Z',
        homeTeam: TEAM_A, awayTeam: TEAM_B,
        score: { home: 2, away: 1 }, displayState: 'confirmed',
        winnerTeamRef: TEAM_A.slug,
      }),
      makeMatch({
        id: 'leg2', date: '2027-03-13T20:00:00Z',
        homeTeam: TEAM_B, awayTeam: TEAM_A,
        // 미시작 · winner 없음
        score: { home: null, away: null }, displayState: 'scheduled',
        winnerTeamRef: null,
      }),
    ]
    const [tie] = buildTies(legs)
    expect(tie.status).toBe('in_progress')
    expect(tie.decidedBy).toBe('pending')
    expect(tie.winnerTeamRef).toBeNull()
    expect(tie.aggregate).toBeNull() // 하나라도 null 이면 aggregate=null
  })

  it('T-M8: same round · same team pair with 3 matches → console.warn · fall back to 3 single legs', () => {
    const matches = [
      makeMatch({ id: 'x1', date: '2027-02-20T20:00:00Z',
        homeTeam: TEAM_A, awayTeam: TEAM_B,
        score: { home: 1, away: 0 }, displayState: 'confirmed',
      }),
      makeMatch({ id: 'x2', date: '2027-03-13T20:00:00Z',
        homeTeam: TEAM_B, awayTeam: TEAM_A,
        score: { home: 1, away: 0 }, displayState: 'confirmed',
      }),
      makeMatch({ id: 'x3', date: '2027-03-20T20:00:00Z',
        homeTeam: TEAM_A, awayTeam: TEAM_B,
        score: { home: 2, away: 1 }, displayState: 'confirmed',
      }),
    ]
    const ties = buildTies(matches)
    expect(ties).toHaveLength(3)
    expect(warnSpy).toHaveBeenCalledTimes(1)
    for (const t of ties) {
      expect(t.legs).toHaveLength(1)
      expect(t.aggregate).toBeNull()
    }
  })

  it('T-M9: UCL R32 (8 ties) + R16 with 8 byes → 16 ties · byeSlots.length===8', () => {
    // 팀 32명 만들기: T01~T32
    const teams = Array.from({ length: 32 }, (_, i) => ({
      slug: `${100 + i}-team-${String(i + 1).padStart(2, '0')}`,
      name: `Team ${i + 1}`,
    }))
    // R32 8 tie: (T09,T24) (T10,T23) (T11,T22) (T12,T21) (T13,T20) (T14,T19) (T15,T18) (T16,T17)
    // → R32 참가팀 = T09~T24 (16명)
    // R16 참가팀 = T01~T08 (직행 · 8명) + R32 승자 8명. 여기서는 승자를 T09,T10,T11,T12,T13,T14,T15,T16 이라고 가정.
    // R16 8 tie: (T01,T09) (T02,T10) (T03,T11) (T04,T12) (T05,T13) (T06,T14) (T07,T15) (T08,T16)
    // → R16 참가팀 = T01~T16 · 그 중 R32 에 없는 8명 = T01~T08 (bye)
    const matches = []
    // R32 16 matches (8 반전 쌍) — legs 2 씩 · A vs B, B vs A
    const r32Pairs = [[8, 23], [9, 22], [10, 21], [11, 20], [12, 19], [13, 18], [14, 17], [15, 16]]
    for (const [i, [a, b]] of r32Pairs.entries()) {
      matches.push(makeMatch({
        id: `r32-${i}-1`, round: 'Round of 32', roundOrdinal: 32,
        date: `2027-02-1${i}T20:00:00Z`,
        homeTeam: teams[a], awayTeam: teams[b],
        score: { home: 2, away: 0 }, displayState: 'confirmed',
        winnerTeamRef: teams[a].slug,
      }))
      matches.push(makeMatch({
        id: `r32-${i}-2`, round: 'Round of 32', roundOrdinal: 32,
        date: `2027-02-2${i}T20:00:00Z`,
        homeTeam: teams[b], awayTeam: teams[a],
        score: { home: 1, away: 1 }, displayState: 'confirmed',
        winnerTeamRef: teams[a].slug,
      }))
    }
    // R16 16 matches (8 반전 쌍)
    const r16Pairs = [[0, 8], [1, 9], [2, 10], [3, 11], [4, 12], [5, 13], [6, 14], [7, 15]]
    for (const [i, [a, b]] of r16Pairs.entries()) {
      matches.push(makeMatch({
        id: `r16-${i}-1`, round: 'Round of 16', roundOrdinal: 16,
        date: `2027-03-1${i}T20:00:00Z`,
        homeTeam: teams[a], awayTeam: teams[b],
        score: { home: 3, away: 1 }, displayState: 'confirmed',
        winnerTeamRef: teams[a].slug,
      }))
      matches.push(makeMatch({
        id: `r16-${i}-2`, round: 'Round of 16', roundOrdinal: 16,
        date: `2027-03-2${i}T20:00:00Z`,
        homeTeam: teams[b], awayTeam: teams[a],
        score: { home: 1, away: 2 }, displayState: 'confirmed',
        winnerTeamRef: teams[a].slug,
      }))
    }

    const ties = buildTies(matches)
    expect(ties).toHaveLength(16) // R32 8 + R16 8
    const rounds = bracketRounds(ties, 'groups_knockout')
    const r32 = rounds.find(r => r.roundName === 'Round of 32')
    const r16 = rounds.find(r => r.roundName === 'Round of 16')
    expect(r32.isBracket).toBe(false)
    expect(r32.isEarly).toBe(true)
    expect(r16.isBracket).toBe(true)
    expect(r16.byeSlots).not.toBeNull()
    expect(r16.byeSlots).toHaveLength(8)
    // bye 팀은 R32 참가에 없어야 함
    const r32Slugs = new Set()
    for (const t of r32.ties) {
      r32Slugs.add(t.home.slug); r32Slugs.add(t.away.slug)
    }
    for (const b of r16.byeSlots) {
      expect(r32Slugs.has(b.slug)).toBe(false)
    }
  })
})

// ═══════════════════════════════════════════════════════════
describe('bracketRounds (correction #1: 4 columns fixed)', () => {
  const makeTie = (roundName, ord, home, away) => ({
    tieId: `${roundName}::${[home.slug, away.slug].sort().join('::')}`,
    roundName, roundOrdinal: ord,
    home, away, legs: [], aggregate: null, penalties: null,
    winnerTeamRef: null, status: 'settled', decidedBy: 'single',
  })

  it('T-N1: cup + Round of 16 → isBracket=true · byeSlots=null', () => {
    const ties = [makeTie('Round of 16', 16, TEAM_A, TEAM_B)]
    const [r] = bracketRounds(ties, 'cup')
    expect(r.isBracket).toBe(true)
    expect(r.byeSlots).toBeNull()
  })

  it('T-N2: cup + Round of 32 → isBracket=false · isEarly=true', () => {
    const ties = [makeTie('Round of 32', 32, TEAM_A, TEAM_B)]
    const [r] = bracketRounds(ties, 'cup')
    expect(r.isBracket).toBe(false)
    expect(r.isEarly).toBe(true)
  })

  it('T-N3: UCL + R16 & R32 → R16 isBracket=true · byeSlots computed · R32 isEarly=true', () => {
    const ties = [
      makeTie('Round of 32', 32, TEAM_A, TEAM_B),
      makeTie('Round of 16', 16, TEAM_C, TEAM_A), // A 는 R32 참가 · C 는 bye
    ]
    const rounds = bracketRounds(ties, 'groups_knockout')
    const r16 = rounds.find(r => r.roundName === 'Round of 16')
    const r32 = rounds.find(r => r.roundName === 'Round of 32')
    expect(r16.isBracket).toBe(true)
    expect(r16.byeSlots).toEqual([TEAM_C])
    expect(r32.isBracket).toBe(false)
    expect(r32.isEarly).toBe(true)
  })

  it('T-N4: UCL + Play-offs → isBracket=false · isQualifier=true', () => {
    const ties = [makeTie('Play-offs', 24, TEAM_A, TEAM_B)]
    const [r] = bracketRounds(ties, 'groups_knockout')
    expect(r.isBracket).toBe(false)
    expect(r.isQualifier).toBe(true)
  })

  it('T-N5: exactly 4 bracket rounds (R16 · QF · SF · F) all present → 4 with isBracket=true', () => {
    const ties = [
      makeTie('Round of 16', 16, TEAM_A, TEAM_B),
      makeTie('Quarter-finals', 8, TEAM_A, TEAM_C),
      makeTie('Semi-finals', 4, TEAM_A, TEAM_D),
      makeTie('Final', 2, TEAM_A, TEAM_B),
    ]
    const rounds = bracketRounds(ties, 'cup')
    const bracketOnly = rounds.filter(r => r.isBracket)
    expect(bracketOnly).toHaveLength(4)
  })
})

// ═══════════════════════════════════════════════════════════
describe('defaultTab (D6)', () => {
  const r16Tie = {
    tieId: 'Round of 16::a::b',
    roundName: 'Round of 16', roundOrdinal: 16,
    home: TEAM_A, away: TEAM_B, legs: [], aggregate: null, penalties: null,
    winnerTeamRef: null, status: 'pending', decidedBy: 'pending',
  }

  it('T-O1: cup + no ties → schedule', () => {
    expect(defaultTab({ format: 'cup', ties: [] })).toBe('schedule')
  })

  it('T-O2: cup + R16 tie present → bracket', () => {
    expect(defaultTab({ format: 'cup', ties: [r16Tie] })).toBe('bracket')
  })

  it('T-O3: groups_knockout + no ties → standings', () => {
    expect(defaultTab({ format: 'groups_knockout', ties: [] })).toBe('standings')
  })

  it('T-O4: groups_knockout + R16 tie present → bracket', () => {
    expect(defaultTab({ format: 'groups_knockout', ties: [r16Tie] })).toBe('bracket')
  })

  it('T-O5: league → schedule', () => {
    expect(defaultTab({ format: 'league', ties: [] })).toBe('schedule')
  })
})

// ═══════════════════════════════════════════════════════════
describe('isSuperCup (correction #3)', () => {
  it('T-P1: Community Shield ({format:cup, displayOrder:210}) → true', () => {
    expect(isSuperCup({ format: 'cup', displayOrder: 210 })).toBe(true)
  })

  it('T-P2: FA Cup ({format:cup, displayOrder:110}) → false', () => {
    expect(isSuperCup({ format: 'cup', displayOrder: 110 })).toBe(false)
  })

  it('T-P3: displayOrder exactly 200 · format=cup → true (>= threshold)', () => {
    expect(isSuperCup({ format: 'cup', displayOrder: 200 })).toBe(true)
  })

  it('T-P4: format=groups_knockout · displayOrder 210 → false (format guard)', () => {
    expect(isSuperCup({ format: 'groups_knockout', displayOrder: 210 })).toBe(false)
  })
})
