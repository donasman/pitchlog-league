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
  const [teams, matches, standings, players, competitions, matchStats, teamStats, lineups, overview, notifications, assistant] = await Promise.all([
    import(toURL('teams.js')),
    import(toURL('matches.js')),
    import(toURL('standings.js')),
    import(toURL('players.js')),
    import(toURL('competitions.js')),
    import(toURL('matchStats.js')),
    import(toURL('teamStats.js')),
    import(toURL('lineups.js')),
    import(toURL('overview.js')),
    import(toURL('notifications.js')),
    import(toURL('assistant.js')),
  ])
  return { teams, matches, standings, players, competitions, matchStats, teamStats, lineups, overview, notifications, assistant }
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

  const { teams, matches, standings, players, competitions, matchStats, teamStats, lineups, overview, notifications, assistant } = await loadMocks()

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
  const MATCH_TEAM_STATS   = matchStats.MATCH_TEAM_STATS
  const TEAM_SEASON_STATS  = teamStats.TEAM_SEASON_STATS
  const LINEUPS            = lineups.LINEUPS
  const MATCH_PLAYER_STATS = lineups.MATCH_PLAYER_STATS

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

  // ── 10. 경기 팀 통계 정합성 ─────────────────────────────────
  console.log('\n10. 경기 팀 통계 정합성 검사')
  {
    let bad = 0
    for (const [id, st] of Object.entries(MATCH_TEAM_STATS)) {
      const m = MATCHES.find(x => x.id === id)
      if (!m) { fail(`통계는 있는데 경기가 없음: ${id}`); bad++; continue }
      if (st.home.ballPossession + st.away.ballPossession !== 100) {
        fail(`${id} 점유율 합이 100이 아님 (${st.home.ballPossession}+${st.away.ballPossession})`); bad++
      }
      for (const side of ['home', 'away']) {
        const s2 = st[side], goals = m.score?.[side] ?? 0
        if (s2.shotsOnGoal + s2.shotsOffGoal + s2.blockedShots !== s2.totalShots) {
          fail(`${id} ${side} 총 슈팅 불일치`); bad++
        }
        if (s2.shotsInsidebox + s2.shotsOutsidebox !== s2.totalShots) {
          fail(`${id} ${side} 박스 안팎 합 불일치`); bad++
        }
        if (s2.shotsOnGoal < goals) {
          fail(`${id} ${side} 유효 슈팅(${s2.shotsOnGoal}) < 득점(${goals})`); bad++
        }
        if (Math.round(s2.passesAccurate / s2.totalPasses * 100) !== s2.passesPercent) {
          fail(`${id} ${side} 패스 성공률 불일치`); bad++
        }
        if (s2.passesAccurate > s2.totalPasses) { fail(`${id} ${side} 성공 패스 > 총 패스`); bad++ }
        if (s2.expectedGoals <= 0 || s2.expectedGoals > 6) {
          fail(`${id} ${side} xG 범위 이상 (${s2.expectedGoals})`); bad++
        }
      }
      const gkH = Math.max(0, st.away.shotsOnGoal - (m.score?.away ?? 0))
      const gkA = Math.max(0, st.home.shotsOnGoal - (m.score?.home ?? 0))
      if (st.home.goalkeeperSaves !== gkH || st.away.goalkeeperSaves !== gkA) {
        fail(`${id} GK 선방 수가 상대 유효 슈팅과 안 맞음`); bad++
      }
    }
    if (bad === 0) pass(`경기 통계 ${Object.keys(MATCH_TEAM_STATS).length}건 정합성 정상`)
  }

  // ── 11. 팀 시즌 통계 ↔ 순위표 일치 ──────────────────────────
  console.log('\n11. 팀 시즌 통계 ↔ 순위표 일치 검사')
  {
    let bad = 0
    for (const [key, ts] of Object.entries(TEAM_SEASON_STATS)) {
      const table = STANDINGS[ts.competitionSlug]
      const e = table?.entries.find(x => x.teamId === ts.teamId)
      if (!e) { fail(`순위표에 없는 팀의 통계: ${key}`); bad++; continue }
      const f = ts.fixtures
      if (f.played.home + f.played.away !== e.played) { fail(`${key} 경기 수 불일치`); bad++ }
      if (f.wins.total !== e.won || f.draws.total !== e.drawn || f.loses.total !== e.lost) {
        fail(`${key} 승무패 합계가 순위표와 다름`); bad++
      }
      if (f.wins.home + f.wins.away !== e.won) { fail(`${key} 홈+원정 승 != 총 승`); bad++ }
      if (ts.goals.for.total !== e.goalsFor || ts.goals.against.total !== e.goalsAgainst) {
        fail(`${key} 득실점이 순위표와 다름`); bad++
      }
      if (ts.goals.for.home + ts.goals.for.away !== e.goalsFor) { fail(`${key} 홈+원정 득점 != 총 득점`); bad++ }
      const lineupSum = ts.lineups.reduce((a, l) => a + l.played, 0)
      if (lineupSum !== e.played) { fail(`${key} 포메이션 출전 합(${lineupSum}) != 경기 수(${e.played})`); bad++ }
      if (ts.form !== e.form.join('')) { fail(`${key} 폼 문자열이 순위표와 다름`); bad++ }
    }
    if (bad === 0) pass(`팀 시즌 통계 ${Object.keys(TEAM_SEASON_STATS).length}건 순위표와 일치`)
  }

  // ── 12. 라인업 · 선수 경기 통계 정합성 ──────────────────────
  console.log('\n12. 라인업 · 선수 경기 통계 검사')
  {
    let bad = 0
    for (const [id, lu] of Object.entries(LINEUPS)) {
      const m = MATCHES.find(x => x.id === id)
      if (!m) { fail(`라인업은 있는데 경기가 없음: ${id}`); bad++; continue }
      for (const side of ['home', 'away']) {
        const l = lu[side]
        if (!l) { fail(`${id} ${side} 라인업 없음`); bad++; continue }
        if (l.startingXI.length !== 11) { fail(`${id} ${side} 선발이 11명이 아님 (${l.startingXI.length})`); bad++ }
        const nums = l.startingXI.concat(l.substitutes).map(p => p.number)
        if (new Set(nums).size !== nums.length) { fail(`${id} ${side} 등번호 중복`); bad++ }
        const caps = l.startingXI.filter(p => p.isCaptain)
        if (caps.length !== 1) { fail(`${id} ${side} 주장이 ${caps.length}명`); bad++ }
        const gks = l.startingXI.filter(p => p.position === 'GK')
        if (gks.length !== 1) { fail(`${id} ${side} 선발 GK가 ${gks.length}명`); bad++ }
      }
      // 선수 통계 ↔ 경기 이벤트 대조
      const ps = MATCH_PLAYER_STATS[id] ?? []
      if (ps.length !== 22) { fail(`${id} 선수 통계가 22명이 아님 (${ps.length})`); bad++ }
      for (const side of ['home', 'away']) {
        const evGoals = (m.events ?? []).filter(e => e.type === 'goal' && e.team === side).length
        const statGoals = ps.filter(p => p.side === side)
                            .reduce((a, p) => a + p.statistics.goals.total, 0)
        if (evGoals !== statGoals) {
          fail(`${id} ${side} 이벤트 골(${evGoals}) != 선수 통계 합(${statGoals})`); bad++
        }
        // GK 선방 = 팀 통계와 일치
        const gk = ps.find(p => p.side === side && p.position === 'GK')
        const ts = MATCH_TEAM_STATS[id]
        if (gk && ts && gk.statistics.goals.saves !== ts[side].goalkeeperSaves) {
          fail(`${id} ${side} GK 선방이 팀 통계와 다름`); bad++
        }
      }
      for (const p of ps) {
        const st = p.statistics
        if (st.shots.on > st.shots.total) { fail(`${id} ${p.name} 유효 슈팅 > 총 슈팅`); bad++ }
        if (st.goals.total > st.shots.on) { fail(`${id} ${p.name} 골 > 유효 슈팅`); bad++ }
        if (st.duels.won > st.duels.total) { fail(`${id} ${p.name} 듀얼 승 > 총 듀얼`); bad++ }
        if (st.dribbles.success > st.dribbles.attempts) { fail(`${id} ${p.name} 드리블 성공 > 시도`); bad++ }
        if (st.games.rating !== null && (st.games.rating < 1 || st.games.rating > 10)) {
          fail(`${id} ${p.name} 평점 범위 이상 (${st.games.rating})`); bad++
        }
        if (p.position === 'GK' && st.goals.saves === null) { fail(`${id} ${p.name} GK인데 선방이 null`); bad++ }
      }
    }
    const noLineup = MATCHES.length - Object.keys(LINEUPS).length
    if (bad === 0) pass(`라인업 ${Object.keys(LINEUPS).length}경기 정합성 정상 (라인업 없는 경기 ${noLineup}건 — 정상)`)
  }

  // ── 13. 새 화면 데이터 (홈 · 알림 · AI) ─────────────────────
  console.log('\n13. 홈 · 알림 · AI 데이터 검사')
  {
    let bad = 0
    const OV = overview.COMPETITION_OVERVIEW
    const PULSE = overview.LIVE_PULSE

    if (OV.length !== COMPETITIONS.length) { fail(`대회 현황 ${OV.length}건 != 대회 ${COMPETITIONS.length}개`); bad++ }
    for (const c of OV) {
      if (!compSlugs.has(c.slug)) { fail(`대회 현황에 없는 대회: ${c.slug}`); bad++ }
      const realLive = MATCHES.filter(m => m.competitionSlug === c.slug &&
                                      ['live','halftime'].includes(m.displayState)).length
      if (c.liveCount !== realLive) { fail(`${c.slug} liveCount(${c.liveCount}) != 실제(${realLive})`); bad++ }
      const table = STANDINGS[c.slug]
      if (table && c.leader && c.leader.points !== table.entries[0].points) {
        fail(`${c.slug} 선두 승점이 순위표와 다름`); bad++
      }
    }
    const realPulse = MATCHES.filter(m => ['live','halftime'].includes(m.displayState)).length
    if (PULSE.length !== realPulse) { fail(`라이브 펄스 ${PULSE.length}건 != 진행 중 경기 ${realPulse}건`); bad++ }
    for (const p of PULSE) {
      const m = MATCHES.find(x => x.id === p.matchId)
      if (!m) { fail(`펄스에 없는 경기: ${p.matchId}`); bad++; continue }
      if (p.home.score !== m.score.home || p.away.score !== m.score.away) {
        fail(`${p.matchId} 펄스 스코어가 경기와 다름`); bad++
      }
    }

    const NOTI = notifications.NOTIFICATIONS
    const types = new Set(NOTI.map(n => n.type))
    for (const t of ['kickoff','goal','fulltime','confirmed']) {
      if (!types.has(t)) { fail(`알림 종류 누락: ${t} — 4종 모두 화면이 필요하다`); bad++ }
    }
    for (const n of NOTI) {
      if (n.matchId && !matchIds.has(n.matchId)) { fail(`알림 ${n.id} 가 없는 경기 참조: ${n.matchId}`); bad++ }
      if (n.competitionSlug && !compSlugs.has(n.competitionSlug)) { fail(`알림 ${n.id} 가 없는 대회 참조`); bad++ }
    }
    if (notifications.getUnreadCount() === 0) { warn('안 읽은 알림이 0건 — 배지 있는 상태를 확인할 수 없다') }

    const AS = assistant.ASSISTANT_SAMPLES
    const st = new Set(AS.map(a => a.dataStatus))
    for (const need of ['confirmed','recheck','unanswerable']) {
      if (!st.has(need)) { fail(`AI 샘플에 ${need} 상태가 없다 — 화면 확인 불가`); bad++ }
    }
    for (const a of AS) {
      // 원칙: 숫자를 말하면 근거가 있어야 한다
      if (a.cards.length > 0 && !a.evidence) { fail(`AI 샘플 ${a.id} 데이터 카드가 있는데 근거가 없다`); bad++ }
      if (a.dataStatus === 'recheck' && !a.note) { fail(`AI 샘플 ${a.id} 재검증 상태인데 주의문이 없다`); bad++ }
      if (a.dataStatus === 'unanswerable' && a.cards.length > 0) {
        fail(`AI 샘플 ${a.id} 답할 수 없다면서 데이터 카드를 준다`); bad++
      }
    }
    if (assistant.SUGGESTED_QUESTIONS.length < 3) { warn('빈 상태 예시 질문이 3개 미만') }

    if (bad === 0) pass(`대회 현황 ${OV.length} · 알림 ${NOTI.length} · AI 샘플 ${AS.length} 정상`)
  }

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
