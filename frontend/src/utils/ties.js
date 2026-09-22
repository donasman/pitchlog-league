/**
 * ties.js — 녹아웃 대진(Tie) 유틸리티 (feat/tournament-bracket · A 계열)
 *
 * 왜 프론트에 두는가:
 *   백엔드 `KnockoutTie`·`BracketSlot` 은 스키마상 존재하지만(`backend/prisma/schema.prisma:511~567`)
 *   L2-b(UCL 녹아웃 · 2027-02) 이후 채워진다. 그 전까지 프론트가 `normalizeMatch` 결과에서
 *   같은 라운드·같은 팀 페어를 묶어 tie 를 만든다. `docs/SCHEMA_DESIGN.md` 12-N 절이 이 규약을
 *   백엔드 도래 시 참조 규격으로 쓴다.
 *
 * 네 순수함수:
 *   - `buildTies(matches)`         — normalized 경기 배열 → Tie[] (2레그·단판·연장·PK)
 *   - `bracketRounds(ties, format)` — Tie[] → BracketRound[] (16강→결승 4열 트리 · UCL R32 접힘 · byeSlots)
 *   - `defaultTab({format,ties,hasStandings,matches})` — 대회 페이지 기본 탭
 *   - `isSuperCup(comp)`           — 슈퍼컵 판정 (format=cup · displayOrder>=200)
 *
 * 스코어 규약 (정정 2):
 *   `NormalizedMatch.score = { home, away }` 는 `dto.goals` 매핑 (`normalize.js:392`).
 *   연장 포함 최종 골. `penHome/penAway` 는 별도. `aggregate` 는 2레그 goals 합, PK 는 별도.
 *
 * 트리 라운드 규약 (정정 1):
 *   대회 무관 4열 고정 — `Round of 16` · `Quarter-finals` · `Semi-finals` · `Final`.
 *   UCL `Round of 32` 는 트리 밖 · 접힌 리스트 (`isBracket=false · isEarly=true`).
 *   UCL R16 부전승 = 리그 스테이지 1~8위 직행팀 (R32 에 없는 R16 참가팀).
 */

import { isFinished } from './matchStatus.js'

/**
 * @typedef {'pending'|'in_progress'|'settled'} TieStatus
 * @typedef {'single'|'aggregate'|'et'|'pens'|'pending'} DecidedBy
 *
 * @typedef {object} Tie
 * @property {string} tieId
 * @property {string} roundName
 * @property {number|null} roundOrdinal
 * @property {object} home
 * @property {object} away
 * @property {Array<object>} legs
 * @property {{home:number, away:number}|null} aggregate
 * @property {{home:number, away:number}|null} penalties
 * @property {string|null} winnerTeamRef
 * @property {TieStatus} status
 * @property {DecidedBy} decidedBy
 *
 * @typedef {object} BracketRound
 * @property {string} roundName
 * @property {number|null} roundOrdinal
 * @property {Array<Tie>} ties
 * @property {boolean} isBracket
 * @property {boolean} isEarly
 * @property {boolean} isQualifier
 * @property {Array<object>|null} byeSlots
 */

/** 트리 4열 (모든 대회 공통 · 정정 1) */
const BRACKET_ROUND_NAMES = new Set([
  'Round of 16',
  'Quarter-finals',
  'Semi-finals',
  'Final',
])

/** 트리 밖 · 접힌 리스트 대상 (UCL R32 · 컵 초기 라운드) */
const EARLY_ROUND_NAMES = new Set([
  'Round of 32',
  'Round of 64',
  'Round of 128',
])

/** UCL 예선·Play-offs — D4 로 트리·리스트 어디에도 안 그림 */
const QUALIFIER_EXACT = new Set([
  'Play-offs',
  'Preliminary Round',
  'Preliminary',
])

/**
 * 팀 페어 그룹 키 — 홈·원정 반전 페어를 같은 tie 로 묶기 위해 slug 를 정렬한다.
 * @param {object} match
 */
function pairKey(match) {
  const a = match?.homeTeam?.slug ?? ''
  const b = match?.awayTeam?.slug ?? ''
  return [a, b].sort().join('::')
}

/**
 * legs 정렬 — date asc. date 가 없으면 뒤로 밀린다.
 */
function byDateAsc(a, b) {
  const ad = a?.date ?? ''
  const bd = b?.date ?? ''
  return String(ad).localeCompare(String(bd))
}

/**
 * 2레그 반전 검증. legs[0].home ↔ legs[1].away · legs[0].away ↔ legs[1].home.
 * @param {Array<object>} legs
 */
function isValidTwoLeg(legs) {
  if (legs.length !== 2) return false
  const [l0, l1] = legs
  const h0 = l0?.homeTeam?.slug
  const a0 = l0?.awayTeam?.slug
  const h1 = l1?.homeTeam?.slug
  const a1 = l1?.awayTeam?.slug
  if (!h0 || !a0 || !h1 || !a1) return false
  return h0 === a1 && a0 === h1
}

/**
 * legs 로부터 status 계산.
 *   - 모든 legs displayState scheduled → 'pending'
 *   - 일부만 종료(final/recheck/confirmed/cancelled) → 'in_progress'
 *   - 모든 legs isFinished 또는 cancelled → 'settled'
 * @param {Array<object>} legs
 * @returns {TieStatus}
 */
function deriveStatus(legs) {
  const total = legs.length
  if (total === 0) return 'pending'
  let settledCount = 0
  let scheduledCount = 0
  for (const leg of legs) {
    const s = leg?.displayState
    if (isFinished(s) || s === 'cancelled') settledCount += 1
    if (s === 'scheduled') scheduledCount += 1
  }
  if (scheduledCount === total) return 'pending'
  if (settledCount === total) return 'settled'
  return 'in_progress'
}

/**
 * 단판 tie 조립. legs.length === 1.
 * @param {object} leg
 * @param {string} roundName
 * @param {number|null} roundOrdinal
 * @returns {Tie}
 */
function buildSingleLegTie(leg, roundName, roundOrdinal) {
  const home = leg?.homeTeam ?? null
  const away = leg?.awayTeam ?? null
  const winnerTeamRef = leg?.winnerTeamRef ?? null
  const penHome = leg?.penHome ?? null
  const penAway = leg?.penAway ?? null
  const etHome = leg?.etHome ?? null
  const penalties = (penHome != null && penAway != null) ? { home: penHome, away: penAway } : null
  let decidedBy
  if (winnerTeamRef == null) {
    decidedBy = 'pending'
  } else if (penalties) {
    decidedBy = 'pens'
  } else if (etHome != null) {
    decidedBy = 'et'
  } else {
    decidedBy = 'single'
  }
  const homeSlug = home?.slug ?? ''
  const awaySlug = away?.slug ?? ''
  const sortedRefs = [homeSlug, awaySlug].sort().join('::')
  return {
    tieId: `${roundName}::${sortedRefs}`,
    roundName,
    roundOrdinal,
    home,
    away,
    legs: [leg],
    aggregate: null,
    penalties,
    winnerTeamRef,
    status: deriveStatus([leg]),
    decidedBy,
  }
}

/**
 * 2레그 tie 조립. legs.length === 2 · 반전 검증 통과.
 * @param {Array<object>} legs  date asc 정렬된 상태
 * @param {string} roundName
 * @param {number|null} roundOrdinal
 * @returns {Tie}
 */
function buildTwoLegTie(legs, roundName, roundOrdinal) {
  const [leg1, leg2] = legs
  const home = leg1?.homeTeam ?? null
  const away = leg1?.awayTeam ?? null
  // aggregate — leg1 홈 관점. leg2 는 반전이므로 leg2.score.away 가 leg1.home 팀 골.
  const s1 = leg1?.score ?? { home: null, away: null }
  const s2 = leg2?.score ?? { home: null, away: null }
  const anyNull = s1.home == null || s1.away == null || s2.home == null || s2.away == null
  const aggregate = anyNull
    ? null
    : { home: s1.home + s2.away, away: s1.away + s2.home }
  const winnerTeamRef = leg2?.winnerTeamRef ?? null
  const penHome = leg2?.penHome ?? null
  const penAway = leg2?.penAway ?? null
  const penalties = (penHome != null && penAway != null) ? { home: penHome, away: penAway } : null
  const etHome = leg2?.etHome ?? null
  const etAway = leg2?.etAway ?? null
  let decidedBy
  if (winnerTeamRef == null) {
    decidedBy = 'pending'
  } else if (penalties) {
    decidedBy = 'pens'
  } else if (aggregate && aggregate.home === aggregate.away && etHome != null && etAway != null) {
    decidedBy = 'et'
  } else {
    decidedBy = 'aggregate'
  }
  const homeSlug = home?.slug ?? ''
  const awaySlug = away?.slug ?? ''
  const sortedRefs = [homeSlug, awaySlug].sort().join('::')
  return {
    tieId: `${roundName}::${sortedRefs}`,
    roundName,
    roundOrdinal,
    home,
    away,
    legs,
    aggregate,
    penalties,
    winnerTeamRef,
    status: deriveStatus(legs),
    decidedBy,
  }
}

/**
 * normalized 경기 배열 → Tie 배열.
 *
 *   1) (roundName, sortedPairKey) 로 그룹화
 *   2) 사이즈 1 → 단판
 *   3) 사이즈 2 → 반전 검증 · 성공하면 2레그 · 실패면 각 경기 단판 폴백
 *   4) 사이즈 3+ → 오류 케이스 · console.warn · 각 경기 단판 폴백
 *   5) 정렬 (roundOrdinal asc · null 뒤 · tieId asc)
 *
 * @param {Array<object>} matches  NormalizedMatch[]
 * @returns {Array<Tie>}
 */
export function buildTies(matches) {
  if (!Array.isArray(matches) || matches.length === 0) return []
  /** @type {Map<string, {roundName:string, roundOrdinal:number|null, matches:Array<object>}>} */
  const groups = new Map()
  for (const m of matches) {
    const roundName = m?.round ?? ''
    if (!roundName) continue
    const key = `${roundName}::${pairKey(m)}`
    const existing = groups.get(key)
    if (existing) {
      existing.matches.push(m)
    } else {
      groups.set(key, {
        roundName,
        roundOrdinal: m?.roundOrdinal ?? null,
        matches: [m],
      })
    }
  }

  const ties = []
  for (const g of groups.values()) {
    const sorted = g.matches.slice().sort(byDateAsc)
    if (sorted.length === 1) {
      ties.push(buildSingleLegTie(sorted[0], g.roundName, g.roundOrdinal))
      continue
    }
    if (sorted.length === 2 && isValidTwoLeg(sorted)) {
      ties.push(buildTwoLegTie(sorted, g.roundName, g.roundOrdinal))
      continue
    }
    // 반전 실패나 3+ 인 경우 오류 · 각 경기 단판 폴백
    console.warn(
      `[buildTies] unexpected group size=${sorted.length} at "${g.roundName}" — falling back to single legs`,
    )
    for (const leg of sorted) {
      ties.push(buildSingleLegTie(leg, g.roundName, g.roundOrdinal))
    }
  }

  // 정렬: roundOrdinal asc · null 뒤 · tieId asc
  ties.sort((a, b) => {
    const ao = a.roundOrdinal
    const bo = b.roundOrdinal
    if (ao == null && bo == null) return String(a.tieId).localeCompare(String(b.tieId))
    if (ao == null) return 1
    if (bo == null) return -1
    if (ao !== bo) return ao - bo
    return String(a.tieId).localeCompare(String(b.tieId))
  })
  return ties
}

/**
 * roundName 을 라운드 분류값 셋 (isBracket · isEarly · isQualifier) 로 매핑.
 * @param {string} roundName
 */
function classifyRound(roundName) {
  if (BRACKET_ROUND_NAMES.has(roundName)) {
    return { isBracket: true, isEarly: false, isQualifier: false }
  }
  if (EARLY_ROUND_NAMES.has(roundName)) {
    return { isBracket: false, isEarly: true, isQualifier: false }
  }
  if (QUALIFIER_EXACT.has(roundName) || /Qualifying Round/i.test(roundName)) {
    return { isBracket: false, isEarly: false, isQualifier: true }
  }
  // 접두 'League Stage -' · 'Regular Season -' 등 — 트리·리스트 어디에도
  return { isBracket: false, isEarly: false, isQualifier: false }
}

/**
 * Tie 배열 → BracketRound 배열.
 *
 * byeSlots 는 UCL Round of 16 만 계산:
 *   R32 참가팀 slug 집합을 만들고, R16 tie 안 팀 중 그 집합에 없는 팀 = bye (리그 페이즈 1~8위 직행).
 *
 * @param {Array<Tie>} ties
 * @param {'cup'|'groups_knockout'|string} format
 * @returns {Array<BracketRound>}
 */
export function bracketRounds(ties, format) {
  if (!Array.isArray(ties) || ties.length === 0) return []
  /** @type {Map<string, {roundName:string, roundOrdinal:number|null, ties:Array<Tie>}>} */
  const byRound = new Map()
  for (const t of ties) {
    const existing = byRound.get(t.roundName)
    if (existing) {
      existing.ties.push(t)
    } else {
      byRound.set(t.roundName, {
        roundName: t.roundName,
        roundOrdinal: t.roundOrdinal ?? null,
        ties: [t],
      })
    }
  }

  // R32 참가 slug 집합 (UCL R16 부전승 계산용)
  const r32Slugs = new Set()
  if (format === 'groups_knockout') {
    const r32 = byRound.get('Round of 32')
    if (r32) {
      for (const t of r32.ties) {
        if (t.home?.slug) r32Slugs.add(t.home.slug)
        if (t.away?.slug) r32Slugs.add(t.away.slug)
      }
    }
  }

  const rounds = []
  for (const r of byRound.values()) {
    const cls = classifyRound(r.roundName)
    let byeSlots = null
    if (format === 'groups_knockout' && r.roundName === 'Round of 16') {
      // R16 참가팀 중 R32 에 없는 팀 = bye (중복 제거 · legs 정렬 순서 유지)
      const seen = new Set()
      byeSlots = []
      for (const t of r.ties) {
        for (const team of [t.home, t.away]) {
          const slug = team?.slug
          if (!slug || seen.has(slug)) continue
          if (!r32Slugs.has(slug)) {
            byeSlots.push(team)
            seen.add(slug)
          }
        }
      }
    }
    rounds.push({
      roundName: r.roundName,
      roundOrdinal: r.roundOrdinal,
      ties: r.ties,
      isBracket: cls.isBracket,
      isEarly: cls.isEarly,
      isQualifier: cls.isQualifier,
      byeSlots,
    })
  }

  // 정렬: roundOrdinal asc · null 뒤
  rounds.sort((a, b) => {
    const ao = a.roundOrdinal
    const bo = b.roundOrdinal
    if (ao == null && bo == null) return String(a.roundName).localeCompare(String(b.roundName))
    if (ao == null) return 1
    if (bo == null) return -1
    return ao - bo
  })
  return rounds
}

/**
 * 대회 페이지 기본 탭 결정 (D6).
 *
 *   - format='league' → 'schedule'
 *   - format='cup': bracketRounds 안 isBracket 라운드에 tie 가 하나라도 있으면 'bracket' · 아니면 'schedule'
 *   - format='groups_knockout': 같은 판정 · 아니면 'standings'
 *
 * @param {{format:string, ties:Array<Tie>, hasStandings?:boolean, matches?:Array<object>}} params
 * @returns {'bracket'|'standings'|'schedule'|'stats'}
 */
export function defaultTab({ format, ties }) {
  if (format === 'league') return 'schedule'
  const rounds = bracketRounds(ties ?? [], format)
  const hasBracket = rounds.some(r => r.isBracket && r.ties.length >= 1)
  if (format === 'cup') return hasBracket ? 'bracket' : 'schedule'
  if (format === 'groups_knockout') return hasBracket ? 'bracket' : 'standings'
  return 'schedule'
}

/**
 * 슈퍼컵 판정 (정정 3). format='cup' 이고 displayOrder>=200.
 * 렌더 판정(tie 1 → 결과 카드 · 2~3 → 리스트) 은 CompetitionPage(B) 담당.
 * @param {object|null|undefined} comp
 * @returns {boolean}
 */
export function isSuperCup(comp) {
  return comp?.format === 'cup' && (comp?.displayOrder ?? 0) >= 200
}
