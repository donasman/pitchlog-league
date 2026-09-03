#!/usr/bin/env node
/**
 * Mock 통계 생성기
 *
 * 손으로 쓰면 반드시 어긋난다. 기존 MATCHES·STANDINGS에서 파생시켜
 * 내부 정합성이 보장되는 통계를 만든다.
 *
 * 생성:
 *   src/mocks/matchStats.js   경기별 팀 통계 (API /fixtures/statistics 18항목)
 *   src/mocks/teamStats.js    팀 시즌 통계 (API /teams/statistics)
 *
 * 실행: node scripts/genMockStats.mjs
 *
 * 근거: docs/API_FIELDS.md — 실제 API가 주는 필드에 맞춘다.
 *   · redCards 는 0일 때 null 로 온다 (실제 동작 반영)
 *   · expected_goals · goals_prevented 포함
 */

import { readFileSync, writeFileSync } from 'fs'
import { pathToFileURL } from 'url'
import { resolve } from 'path'

const SRC = resolve('src/mocks')
const { MATCHES } = await import(pathToFileURL(`${SRC}/matches.js`))
const { STANDINGS } = await import(pathToFileURL(`${SRC}/standings.js`))

/** 결정적 난수 — 같은 씨앗이면 항상 같은 값 */
function rng(seed) {
  let h = 2166136261
  for (const c of String(seed)) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619) }
  return () => { h ^= h << 13; h ^= h >>> 17; h ^= h << 5; return ((h >>> 0) % 10000) / 10000 }
}
const pick = (r, lo, hi) => lo + Math.floor(r() * (hi - lo + 1))

// ── 경기별 팀 통계 ────────────────────────────────────────────
/**
 * 정합성 규칙
 *   totalShots = onGoal + offGoal + blocked
 *   insidebox + outsidebox = totalShots
 *   home.possession + away.possession = 100
 *   onGoal >= goals            (골은 유효슈팅의 부분집합)
 *   상대 GK 선방 = onGoal - goals
 *   passesPercent = round(accurate / total * 100)
 *   xG ~ 박스 안 슈팅에 가중 — 골과 일치시키지 않는다 (그게 xG의 요점)
 */
function teamStats(seed, goals, oppGoals, isHome, possession) {
  const r = rng(seed)
  const onGoal    = goals + pick(r, 1, 5)
  const offGoal   = pick(r, 2, 7)
  const blocked   = pick(r, 0, 4)
  const total     = onGoal + offGoal + blocked
  const inside    = Math.max(goals, Math.round(total * (0.45 + r() * 0.3)))
  const outside   = total - inside
  const totalPass = pick(r, 280, 620)
  const accPct    = pick(r, 68, 91)
  const accurate  = Math.round(totalPass * accPct / 100)
  const yellow    = pick(r, 0, 4)
  const red       = r() > 0.93 ? 1 : null        // ★ 0일 때 null — 실제 API 동작
  // xG: 박스 안 슈팅 0.11 + 박스 밖 0.03, ±20% 흔들림
  const xgRaw     = inside * 0.11 + outside * 0.03
  const xg        = Math.max(0.05, xgRaw * (0.8 + r() * 0.4))

  return {
    shotsOnGoal: onGoal, shotsOffGoal: offGoal, blockedShots: blocked, totalShots: total,
    shotsInsidebox: inside, shotsOutsidebox: outside,
    fouls: pick(r, 6, 18), cornerKicks: pick(r, 1, 11), offsides: pick(r, 0, 5),
    ballPossession: possession,
    yellowCards: yellow, redCards: red,
    goalkeeperSaves: null,                        // 아래에서 상대 유효슈팅으로 채운다
    totalPasses: totalPass, passesAccurate: accurate, passesPercent: accPct,
    expectedGoals: Math.round(xg * 100) / 100,
    goalsPrevented: 0,                            // 아래에서 채운다
  }
}

const MATCH_TEAM_STATS = {}
let statCount = 0

for (const m of MATCHES) {
  if (!['live', 'halftime', 'final', 'recheck', 'confirmed'].includes(m.displayState)) continue
  if (!m.score) continue
  const r = rng(m.id + 'poss')
  const homePoss = pick(r, 38, 62)
  const h = teamStats(m.id + 'H', m.score.home, m.score.away, true,  homePoss)
  const a = teamStats(m.id + 'A', m.score.away, m.score.home, false, 100 - homePoss)

  // 상대 유효슈팅 - 실점 = 선방
  h.goalkeeperSaves = Math.max(0, a.shotsOnGoal - m.score.away)
  a.goalkeeperSaves = Math.max(0, h.shotsOnGoal - m.score.home)
  // goals_prevented = 상대 xG - 실제 실점 (양수면 선방으로 막아낸 것)
  h.goalsPrevented = Math.round((a.expectedGoals - m.score.away) * 100) / 100
  a.goalsPrevented = Math.round((h.expectedGoals - m.score.home) * 100) / 100

  MATCH_TEAM_STATS[m.id] = { home: h, away: a }
  statCount++
}

// ── 팀 시즌 통계 ──────────────────────────────────────────────
/** STANDINGS 에서 파생 — 승점·득실이 순위표와 절대 어긋나지 않는다 */
const FORMATIONS = ['4-3-3', '4-2-3-1', '3-4-3', '4-4-2', '3-5-2', '5-3-2']
const TEAM_SEASON_STATS = {}

for (const [slug, table] of Object.entries(STANDINGS)) {
  for (const e of table.entries) {
    const r = rng(e.teamId + slug)
    const homeP = Math.ceil(e.played / 2), awayP = e.played - homeP
    // 홈 승률이 원정보다 높게 — 실제 축구의 홈 어드밴티지
    const homeW = Math.min(homeP, Math.round(e.won * (0.55 + r() * 0.12)))
    const awayW = e.won - homeW
    const homeD = Math.min(homeP - homeW, Math.round(e.drawn * 0.45))
    const awayD = e.drawn - homeD
    const gfHome = Math.round(e.goalsFor * (0.52 + r() * 0.1))
    const gaHome = Math.round(e.goalsAgainst * (0.42 + r() * 0.1))
    const cleanSheet = pick(r, 0, Math.max(0, Math.floor(e.played * 0.4)))
    const failedToScore = pick(r, 0, Math.max(0, Math.floor(e.played * 0.3)))
    const f1 = FORMATIONS[pick(r, 0, FORMATIONS.length - 1)]
    let f2 = FORMATIONS[pick(r, 0, FORMATIONS.length - 1)]
    if (f2 === f1) f2 = FORMATIONS[(FORMATIONS.indexOf(f1) + 1) % FORMATIONS.length]
    const f1n = pick(r, Math.ceil(e.played * 0.5), e.played)

    TEAM_SEASON_STATS[`${slug}:${e.teamId}`] = {
      competitionSlug: slug, teamId: e.teamId, teamSlug: e.teamSlug, teamName: e.teamName,
      form: e.form.join(''),
      fixtures: {
        played: { home: homeP, away: awayP, total: e.played },
        wins:   { home: homeW, away: Math.max(0, awayW), total: e.won },
        draws:  { home: homeD, away: Math.max(0, awayD), total: e.drawn },
        loses:  { home: Math.max(0, homeP - homeW - homeD), away: Math.max(0, awayP - Math.max(0, awayW) - Math.max(0, awayD)), total: e.lost },
      },
      goals: {
        for:     { home: gfHome, away: e.goalsFor - gfHome, total: e.goalsFor,
                   averageTotal: Math.round(e.goalsFor / e.played * 100) / 100 },
        against: { home: gaHome, away: e.goalsAgainst - gaHome, total: e.goalsAgainst,
                   averageTotal: Math.round(e.goalsAgainst / e.played * 100) / 100 },
      },
      biggest: {
        winHome:  `${pick(r, 2, 5)}-${pick(r, 0, 1)}`,
        loseAway: `${pick(r, 0, 1)}-${pick(r, 2, 4)}`,
        streakWins: pick(r, 1, 6), streakDraws: pick(r, 0, 3), streakLoses: pick(r, 0, 3),
      },
      cleanSheet:    { home: Math.ceil(cleanSheet / 2), away: Math.floor(cleanSheet / 2), total: cleanSheet },
      failedToScore: { home: Math.ceil(failedToScore / 2), away: Math.floor(failedToScore / 2), total: failedToScore },
      lineups: [
        { formation: f1, played: f1n },
        { formation: f2, played: e.played - f1n },
      ].filter(l => l.played > 0),
      cards: {
        yellow: { '0-15': pick(r,0,3), '16-30': pick(r,0,4), '31-45': pick(r,0,5),
                  '46-60': pick(r,0,4), '61-75': pick(r,0,5), '76-90': pick(r,0,6) },
        red:    { total: pick(r, 0, 2) },
      },
      updatedAt: table.updatedAt,
    }
  }
}

// ── 파일 쓰기 ─────────────────────────────────────────────────
const banner = (title, note) => `/**
 * ${title}
 * ⚠ 이 파일은 scripts/genMockStats.mjs 가 생성한다. 직접 수정하지 않는다.
 *   수정이 필요하면 생성기를 고치고 다시 실행한다.
 *
${note}
 */

`

writeFileSync(`${SRC}/matchStats.js`, banner(
  'Mock 경기별 팀 통계 — API /fixtures/statistics 18항목',
` * 정합성: totalShots = onGoal+offGoal+blocked · inside+outside = total
 *          home.possession + away.possession = 100
 *          상대 GK 선방 = onGoal - 실점 · passesPercent = accurate/total
 * ⚠ redCards 는 0일 때 null 이다 — 실제 API 동작을 그대로 반영했다.
 *   화면에서 표시할 때 null→0 정규화가 필요하다 (docs/API_FIELDS.md 5장)`
) + `export const MATCH_TEAM_STATS = ${JSON.stringify(MATCH_TEAM_STATS, null, 2)}

/** 경기 ID로 팀 통계 조회 */
export function getMatchStats(matchId) {
  return MATCH_TEAM_STATS[matchId] ?? null
}
`)

writeFileSync(`${SRC}/teamStats.js`, banner(
  'Mock 팀 시즌 통계 — API /teams/statistics',
` * STANDINGS 에서 파생하므로 승점·득실이 순위표와 절대 어긋나지 않는다.
 * 키 형식: "<competitionSlug>:<teamId>" — 한 팀이 여러 대회에 참가한다`
) + `export const TEAM_SEASON_STATS = ${JSON.stringify(TEAM_SEASON_STATS, null, 2)}

/** 대회 + 팀으로 시즌 통계 조회 */
export function getTeamStats(competitionSlug, teamId) {
  return TEAM_SEASON_STATS[\`\${competitionSlug}:\${teamId}\`] ?? null
}

/** 한 팀이 참가한 모든 대회의 시즌 통계 */
export function getTeamStatsAll(teamId) {
  return Object.values(TEAM_SEASON_STATS).filter(s => s.teamId === teamId)
}
`)

console.log(`matchStats.js  경기 ${statCount}건`)
console.log(`teamStats.js   팀·대회 조합 ${Object.keys(TEAM_SEASON_STATS).length}건`)
