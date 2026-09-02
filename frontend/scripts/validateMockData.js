#!/usr/bin/env node
/**
 * Mock Data 검증 스크립트
 * 실행: npm run validate:data
 *
 * 검증 항목:
 *  1. 중복 ID / slug
 *  2. 잘못된 팀·선수·대회 참조
 *  3. 순위 승점·득실차 계산
 *  4. 순위 정렬 (승점·득실차 기준)
 *  5. 득점·도움 순위 정렬
 *  6. 경기 상태↔스코어 조합
 *  7. UCL 합산 점수 일관성
 *  8. 대회별 최소 데이터 수량
 */

import { fileURLToPath, pathToFileURL } from 'url'
import path from 'path'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

async function loadMocks() {
  const base = path.join(__dirname, '../src/mocks')
  const toURL = f => pathToFileURL(path.join(base, f)).href
  const [teams, matches, standings, players, competitions] = await Promise.all([
    import(toURL('teams.js')),
    import(toURL('matches.js')),
    import(toURL('standings.js')),
    import(toURL('players.js')),
    import(toURL('competitions.js')),
  ])
  return { teams, matches, standings, players, competitions }
}

// ANSI 색상
const RED   = '\x1b[31m'
const GREEN = '\x1b[32m'
const YELLOW= '\x1b[33m'
const RESET = '\x1b[0m'

let errors   = 0
let warnings = 0

function fail(msg)  { console.error(`${RED}[ERR]${RESET} ${msg}`);   errors++ }
function warn(msg)  { console.warn(`${YELLOW}[WRN]${RESET} ${msg}`); warnings++ }
function pass(msg)  { console.log(`${GREEN}[OK ]${RESET} ${msg}`) }

// ── 중복 체크 헬퍼 ──────────────────────────────────────────────
function checkDuplicates(items, field, label) {
  const seen = new Map()
  items.forEach((item, i) => {
    const val = item[field]
    if (seen.has(val)) {
      fail(`${label}: 중복 ${field} "${val}" (인덱스 ${seen.get(val)} & ${i})`)
    } else {
      seen.set(val, i)
    }
  })
}

// ── 메인 ─────────────────────────────────────────────────────────
async function main() {
  console.log('\n=== Mock Data 검증 시작 ===\n')

  const { teams, matches, standings, players, competitions } = await loadMocks()

  const TEAMS         = teams.TEAMS
  const MATCHES       = matches.MATCHES
  const UCL_TIES      = matches.UCL_KNOCKOUT_TIES
  const STANDINGS     = standings.STANDINGS
  const PLAYERS       = players.PLAYERS
  const PLAYER_STATS  = players.PLAYER_STATS
  const TOP_SCORERS_ALL = players.TOP_SCORERS_ALL
  const COMPETITION_SCORERS  = players.COMPETITION_SCORERS
  const COMPETITION_ASSISTERS = players.COMPETITION_ASSISTERS
  const COMPETITIONS  = competitions.COMPETITIONS

  const teamSlugs = new Set(TEAMS.map(t => t.slug))
  const teamIds   = new Set(TEAMS.map(t => t.id))
  const compSlugs = new Set(COMPETITIONS.map(c => c.slug))
  const playerSlugs = new Set(PLAYERS.map(p => p.slug))
  const playerIds   = new Set(PLAYERS.map(p => p.id))
  const matchIds    = new Set(MATCHES.map(m => m.id))

  // ── 1. 중복 ID / slug ────────────────────────────────────────
  console.log('1. 중복 ID / slug 검사')
  checkDuplicates(TEAMS,       'id',   'TEAMS')
  checkDuplicates(TEAMS,       'slug', 'TEAMS')
  checkDuplicates(MATCHES,     'id',   'MATCHES')
  checkDuplicates(PLAYERS,     'id',   'PLAYERS')
  checkDuplicates(PLAYERS,     'slug', 'PLAYERS')
  checkDuplicates(COMPETITIONS,'id',   'COMPETITIONS')
  checkDuplicates(COMPETITIONS,'slug', 'COMPETITIONS')
  pass('중복 검사 완료')

  // ── 2. 경기 팀·대회 참조 ─────────────────────────────────────
  console.log('\n2. 경기 팀·대회 참조 검사')
  let refErrors = 0
  MATCHES.forEach(m => {
    if (!compSlugs.has(m.competitionSlug)) {
      fail(`[${m.id}] 대회 slug 없음: ${m.competitionSlug}`)
      refErrors++
    }
    if (!teamSlugs.has(m.homeTeam?.slug)) {
      fail(`[${m.id}] 홈팀 slug 없음: ${m.homeTeam?.slug}`)
      refErrors++
    }
    if (!teamSlugs.has(m.awayTeam?.slug)) {
      fail(`[${m.id}] 원정팀 slug 없음: ${m.awayTeam?.slug}`)
      refErrors++
    }
    if (m.homeTeam?.slug === m.awayTeam?.slug) {
      fail(`[${m.id}] 홈팀과 원정팀이 같음: ${m.homeTeam?.slug}`)
      refErrors++
    }
  })
  if (refErrors === 0) pass('경기 팀·대회 참조 이상 없음')

  // ── 3. 순위 승점·득실차 계산 ─────────────────────────────────
  console.log('\n3. 순위 승점·득실차 검사')
  let standErr = 0
  Object.entries(STANDINGS).forEach(([slug, s]) => {
    s.entries.forEach(e => {
      const expectedPts = e.won * 3 + e.drawn
      if (e.points !== expectedPts) {
        fail(`[${slug}] ${e.teamName} 승점 불일치: 계산=${expectedPts}, 실제=${e.points} (승${e.won} 무${e.drawn})`)
        standErr++
      }
      const expectedGD = e.goalsFor - e.goalsAgainst
      if (e.goalDifference !== expectedGD) {
        fail(`[${slug}] ${e.teamName} 득실차 불일치: 계산=${expectedGD}, 실제=${e.goalDifference}`)
        standErr++
      }
      // 경기수 = 승+무+패
      const expectedPlayed = e.won + e.drawn + e.lost
      if (e.played !== expectedPlayed) {
        fail(`[${slug}] ${e.teamName} 경기수 불일치: 계산=${expectedPlayed}, 실제=${e.played}`)
        standErr++
      }
    })
  })
  if (standErr === 0) pass('모든 순위 승점·득실차 계산 정확')

  // ── 4. 순위 정렬 ─────────────────────────────────────────────
  console.log('\n4. 순위 정렬 검사 (승점→득실차 기준)')
  let sortErr = 0
  Object.entries(STANDINGS).forEach(([slug, s]) => {
    for (let i = 0; i < s.entries.length - 1; i++) {
      const a = s.entries[i]
      const b = s.entries[i + 1]
      const aScore = a.points * 1000 + a.goalDifference
      const bScore = b.points * 1000 + b.goalDifference
      if (aScore < bScore) {
        warn(`[${slug}] 정렬 불일치: rank${a.rank}(${a.teamName}, ${a.points}pts GD${a.goalDifference}) < rank${b.rank}(${b.teamName}, ${b.points}pts GD${b.goalDifference})`)
        sortErr++
      }
    }
  })
  if (sortErr === 0) pass('모든 리그 순위 정렬 정상')

  // ── 5. 득점·도움 순위 정렬 ───────────────────────────────────
  console.log('\n5. 득점·도움 순위 정렬 검사')
  let rankErr = 0

  // TOP_SCORERS_ALL
  for (let i = 0; i < TOP_SCORERS_ALL.length - 1; i++) {
    if (TOP_SCORERS_ALL[i].value < TOP_SCORERS_ALL[i + 1].value) {
      fail(`TOP_SCORERS_ALL 정렬 오류: rank${TOP_SCORERS_ALL[i].rank}(${TOP_SCORERS_ALL[i].value}) < rank${TOP_SCORERS_ALL[i+1].rank}(${TOP_SCORERS_ALL[i+1].value})`)
      rankErr++
    }
  }

  Object.entries(COMPETITION_SCORERS).forEach(([slug, list]) => {
    for (let i = 0; i < list.length - 1; i++) {
      if (list[i].value < list[i + 1].value) {
        fail(`COMPETITION_SCORERS[${slug}] 정렬 오류: rank${list[i].rank}(${list[i].value}) < rank${list[i+1].rank}(${list[i+1].value})`)
        rankErr++
      }
    }
  })
  Object.entries(COMPETITION_ASSISTERS).forEach(([slug, list]) => {
    for (let i = 0; i < list.length - 1; i++) {
      if (list[i].value < list[i + 1].value) {
        fail(`COMPETITION_ASSISTERS[${slug}] 정렬 오류: rank${list[i].rank}(${list[i].value}) < rank${list[i+1].rank}(${list[i+1].value})`)
        rankErr++
      }
    }
  })
  if (rankErr === 0) pass('득점·도움 순위 정렬 정상')

  // ── 6. 경기 상태↔스코어 조합 ─────────────────────────────────
  console.log('\n6. 경기 상태↔스코어 조합 검사')
  let stateErr = 0
  MATCHES.forEach(m => {
    const live = ['live','halftime'].includes(m.displayState)
    const finished = ['confirmed','recheck'].includes(m.displayState)
    const scheduled = m.displayState === 'scheduled'

    if (live && (m.minute == null)) {
      fail(`[${m.id}] LIVE 경기에 minute 없음`)
      stateErr++
    }
    if (live && (m.score?.home == null || m.score?.away == null)) {
      fail(`[${m.id}] LIVE 경기에 스코어 없음`)
      stateErr++
    }
    if (scheduled && m.score?.home !== null && m.score?.home !== undefined) {
      fail(`[${m.id}] 예정 경기에 스코어 있음 (home=${m.score?.home})`)
      stateErr++
    }
    if (finished && (m.score?.home == null || m.score?.away == null)) {
      fail(`[${m.id}] 종료 경기(${m.displayState})에 스코어 없음`)
      stateErr++
    }
  })
  if (stateErr === 0) pass('경기 상태·스코어 조합 정상')

  // ── 7. UCL 합산 점수 ─────────────────────────────────────────
  console.log('\n7. UCL 합산 점수 검사')
  let uclErr = 0
  UCL_TIES.forEach(tie => {
    if (tie.leg1Score && tie.leg2Score && tie.aggregateScore) {
      // Leg1: tie.homeTeam is home → leg1.home = homeTeam goals
      // Leg2: tie.awayTeam is home → leg2.home = awayTeam goals, leg2.away = homeTeam goals
      const calcHome = tie.leg1Score.home + tie.leg2Score.away
      const calcAway = tie.leg1Score.away + tie.leg2Score.home
      if (tie.aggregateScore.home !== calcHome || tie.aggregateScore.away !== calcAway) {
        fail(`[${tie.id}] UCL 합산 점수 불일치: 계산=${calcHome}-${calcAway}, 실제=${tie.aggregateScore.home}-${tie.aggregateScore.away}`)
        uclErr++
      }
    }
    if (tie.status === 'completed' && !tie.winner) {
      fail(`[${tie.id}] UCL completed 타이에 winner 없음`)
      uclErr++
    }
  })
  if (uclErr === 0) pass('UCL 합산 점수 정상')

  // ── 8. 대회별 최소 데이터 수량 ────────────────────────────────
  console.log('\n8. 대회별 최소 데이터 수량 검사')

  const DOMESTIC = ['premier-league','la-liga','bundesliga','serie-a','ligue-1']
  const MIN_DOMESTIC = {
    standing: 8, total: 6, live: 1, scheduled: 2, confirmed: 2, recheck: 1, scorers: 5, assisters: 5,
  }

  DOMESTIC.forEach(slug => {
    const st = STANDINGS[slug]
    if (!st) { fail(`[${slug}] 순위 데이터 없음`); return }
    const rowCount = st.entries.length
    if (rowCount < MIN_DOMESTIC.standing) {
      fail(`[${slug}] 순위 행 부족: ${rowCount} < ${MIN_DOMESTIC.standing}`)
    }

    const ms = MATCHES.filter(m => m.competitionSlug === slug)
    if (ms.length < MIN_DOMESTIC.total) fail(`[${slug}] 경기 수 부족: ${ms.length} < ${MIN_DOMESTIC.total}`)

    const byState = s => ms.filter(m => m.displayState === s).length
    if (byState('live') + byState('halftime') < MIN_DOMESTIC.live) fail(`[${slug}] LIVE 경기 부족`)
    if (byState('scheduled') < MIN_DOMESTIC.scheduled) fail(`[${slug}] 예정 경기 부족: ${byState('scheduled')} < ${MIN_DOMESTIC.scheduled}`)
    if (byState('confirmed') < MIN_DOMESTIC.confirmed) fail(`[${slug}] 확정 경기 부족: ${byState('confirmed')} < ${MIN_DOMESTIC.confirmed}`)
    if (byState('recheck') < MIN_DOMESTIC.recheck) fail(`[${slug}] 재검증 경기 부족: ${byState('recheck')} < ${MIN_DOMESTIC.recheck}`)

    const sc = (COMPETITION_SCORERS[slug] ?? []).length
    const as = (COMPETITION_ASSISTERS[slug] ?? []).length
    if (sc < MIN_DOMESTIC.scorers) fail(`[${slug}] 득점 순위 선수 부족: ${sc} < ${MIN_DOMESTIC.scorers}`)
    if (as < MIN_DOMESTIC.assisters) fail(`[${slug}] 도움 순위 선수 부족: ${as} < ${MIN_DOMESTIC.assisters}`)
  })

  // UCL 최소
  const uclMs = MATCHES.filter(m => m.competitionSlug === 'champions-league')
  const uclSt = STANDINGS['champions-league']
  if (!uclSt) fail('[champions-league] UCL 순위 데이터 없음')
  else if (uclSt.entries.length < 8) fail(`[champions-league] 순위 행 부족: ${uclSt.entries.length} < 8`)
  if (uclMs.length < 6) fail(`[champions-league] 경기 수 부족: ${uclMs.length} < 6`)
  const uclR16 = UCL_TIES.filter(t => t.stage === 'round_of_16').length
  if (uclR16 < 4) fail(`UCL 16강 대진 부족: ${uclR16} < 4`)

  pass('대회별 최소 데이터 수량 검사 완료')

  // ── TOP_SCORERS_ALL breakdown 합계 ────────────────────────────
  console.log('\n9. TOP_SCORERS_ALL breakdown 합계 검사')
  let breakdownErr = 0
  TOP_SCORERS_ALL.forEach(entry => {
    if (!entry.breakdown) return
    const sum = entry.breakdown.reduce((s, b) => s + b.goals, 0)
    if (sum !== entry.value) {
      fail(`TOP_SCORERS_ALL[${entry.playerSlug}] breakdown 합계 불일치: ${sum} ≠ ${entry.value}`)
      breakdownErr++
    }
  })
  if (breakdownErr === 0) pass('breakdown 합계 정상')

  // ── 결과 ─────────────────────────────────────────────────────
  console.log('\n=== 검증 결과 ===')
  if (errors === 0 && warnings === 0) {
    console.log(`${GREEN}✓ 모든 항목 통과 (오류 0, 경고 0)${RESET}`)
    process.exit(0)
  } else {
    if (warnings > 0) console.warn(`${YELLOW}⚠ 경고 ${warnings}건${RESET}`)
    if (errors > 0) {
      console.error(`${RED}✗ 오류 ${errors}건 발견 — 수정 필요${RESET}`)
      process.exit(1)
    } else {
      process.exit(0)
    }
  }
}

main().catch(e => {
  console.error(RED + '검증 스크립트 오류:' + RESET, e)
  process.exit(1)
})
