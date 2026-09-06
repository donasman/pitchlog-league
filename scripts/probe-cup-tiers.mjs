#!/usr/bin/env node
/**
 * 컵 컷오프 기준 검증
 *
 * 확정하려는 규칙:
 *   상세 수집 = (1부 팀 참가) OR (16강 이상)
 *
 * 16강 판정은 **라운드 이름이 아니라 참가 팀 수**로 한다.
 * 이름이 대회마다 다르기 때문이다 —
 *   FA Cup "5th Round" · League Cup "4th Round" · Copa del Rey "1/8-finals" · DFB Pokal "Round of 16"
 * 그 라운드에 등장하는 서로 다른 팀이 16팀 이하면 16강 이후다.
 * 경기 목록에서 계산되므로 추가 콜이 없고, 2차전 방식도 그대로 처리된다.
 *
 * 확인할 것:
 *   1. 규칙 적용 시 실제 수집량
 *   2. **1부 vs 하부** 경기에 데이터가 오는가  ← 규칙의 전제
 *   3. **16강 이상인데 양쪽 다 하부** 경기에 데이터가 오는가  ← 새로 포함되는 구간
 *
 * 실행: API_FOOTBALL_KEY=키 node scripts/probe-cup-tiers.mjs
 * 산출: docs/CUP_TIER_CHECK.md · docs/api-cup-tiers.json
 * 호출 수: 약 60콜
 */

import { writeFileSync, mkdirSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const KEY = process.env.API_FOOTBALL_KEY
if (!KEY) { console.error('API_FOOTBALL_KEY 환경변수가 없습니다.'); process.exit(1) }

const BASE     = 'https://v3.football.api-sports.io'
const SEASON   = Number(process.env.SEASON ?? 2025)
const LATE_MAX = Number(process.env.LATE_MAX ?? 16)   // 이 팀 수 이하면 "16강 이상"
const ROOT     = resolve(dirname(fileURLToPath(import.meta.url)), '..')

const PAIRS = [
  { cup: 45,  cupName: 'FA Cup',          league: 39,  leagueName: 'Premier League' },
  { cup: 48,  cupName: 'League Cup',      league: 39,  leagueName: 'Premier League' },
  { cup: 143, cupName: 'Copa del Rey',    league: 140, leagueName: 'LaLiga' },
  { cup: 81,  cupName: 'DFB Pokal',       league: 78,  leagueName: 'Bundesliga' },
  { cup: 137, cupName: 'Coppa Italia',    league: 135, leagueName: 'Serie A' },
  { cup: 66,  cupName: 'Coupe de France', league: 61,  leagueName: 'Ligue 1' },
]

const C = { g:'\x1b[32m', r:'\x1b[31m', y:'\x1b[33m', d:'\x1b[2m', b:'\x1b[1m', x:'\x1b[0m' }
let calls = 0

async function get(path) {
  calls++
  const res = await fetch(`${BASE}${path}`, { headers: { 'x-apisports-key': KEY } })
  const json = await res.json().catch(() => ({}))
  if (!res.ok) return { fail: `HTTP ${res.status}`, json }
  const e = json.errors
  const hasErr = Array.isArray(e) ? e.length > 0 : e && Object.keys(e).length > 0
  if (hasErr) return { fail: JSON.stringify(e), json }
  return { json }
}

async function detail(fid) {
  const out = {}
  for (const [k, p] of [
    ['events',        `/fixtures/events?fixture=${fid}`],
    ['lineups',       `/fixtures/lineups?fixture=${fid}`],
    ['stats_fixture', `/fixtures/statistics?fixture=${fid}`],
    ['stats_player',  `/fixtures/players?fixture=${fid}`],
  ]) {
    const r = await get(p)
    out[k] = r.fail ? 'ERR' : (r.json.results ?? 0)
  }
  return out
}

async function main() {
  console.log(`${C.b}컵 컷오프 기준 검증${C.x} ${C.d}시즌 ${SEASON} · 16강 판정 기준 ${LATE_MAX}팀 이하${C.x}`)
  const results = []

  for (const p of PAIRS) {
    console.log(`\n${C.b}── ${p.cupName} ${'─'.repeat(46 - p.cupName.length)}${C.x}`)

    const t = await get(`/teams?league=${p.league}&season=${SEASON}`)
    if (t.fail) { console.log(`${C.r}[ERR ]${C.x} 1부 팀 목록 — ${t.fail.slice(0,50)}`); continue }
    const top = new Set((t.json.response ?? []).map(x => x.team.id))

    const f = await get(`/fixtures?league=${p.cup}&season=${SEASON}`)
    if (f.fail) { console.log(`${C.r}[ERR ]${C.x} 경기 목록 — ${f.fail.slice(0,50)}`); continue }
    const all = (f.json.response ?? []).sort((a, b) => new Date(a.fixture.date) - new Date(b.fixture.date))

    // 라운드별 참가 팀 수 — 16강 판정 근거
    const rounds = new Map()   // round -> { teams:Set, matches, firstDate }
    for (const x of all) {
      const k = x.league.round ?? '(무명)'
      if (!rounds.has(k)) rounds.set(k, { teams: new Set(), matches: 0, firstDate: x.fixture.date })
      const r = rounds.get(k)
      r.teams.add(x.teams.home.id); r.teams.add(x.teams.away.id); r.matches++
    }
    const roundInfo = [...rounds.entries()]
      .map(([name, r]) => ({ name, teams: r.teams.size, matches: r.matches, firstDate: r.firstDate, late: false }))
      .sort((a, b) => new Date(a.firstDate) - new Date(b.firstDate))

    // ★ 팀 수만 보면 예선이 16강으로 잡힌다 (League Cup Preliminary 4팀, Coppa Italia Preliminary 8팀).
    //   팀이 적은 게 토너먼트가 좁혀져서가 아니라 참가 팀이 원래 적어서다.
    //   마지막 라운드부터 역순으로 LATE_MAX 이하가 **연속되는 구간**만 16강 이상으로 본다.
    for (let i = roundInfo.length - 1; i >= 0; i--) {
      if (roundInfo[i].teams <= LATE_MAX) roundInfo[i].late = true
      else break
    }
    const lateRounds = new Set(roundInfo.filter(r => r.late).map(r => r.name))

    // 1부 팀이 처음 등장하는 라운드 — 경기 목록 수집 시작점
    const firstTopRound = roundInfo.find(r =>
      all.some(x => (x.league.round ?? '(무명)') === r.name &&
                    (top.has(x.teams.home.id) || top.has(x.teams.away.id))))?.name ?? null
    const listFrom = firstTopRound ? roundInfo.slice(roundInfo.findIndex(r => r.name === firstTopRound)) : roundInfo
    const listedMatches = listFrom.reduce((a, r) => a + r.matches, 0)
    const allMatches    = roundInfo.reduce((a, r) => a + r.matches, 0)
    console.log(`  ${C.b}목록 수집 시작: ${firstTopRound ?? '(1부 없음)'}${C.x} — ${listedMatches}/${allMatches}경기`)

    console.log(`  ${p.leagueName} 1부 ${top.size}팀 · 라운드 ${roundInfo.length}개`)
    for (const r of roundInfo)
      console.log(`    ${r.late ? C.g+'✔'+C.x : ' '} ${r.name.padEnd(30)} ${String(r.teams).padStart(4)}팀 ${String(r.matches).padStart(3)}경기`)

    const done = all.filter(x => x.fixture?.status?.short === 'FT')
    const tier = x => {
      const h = top.has(x.teams.home.id), a = top.has(x.teams.away.id)
      return h && a ? 'both' : (h || a) ? 'mixed' : 'none'
    }
    const isLate = x => lateRounds.has(x.league.round ?? '(무명)')
    const keepFn = x => tier(x) !== 'none' || isLate(x)

    const keep      = done.filter(keepFn)
    const byTierOnly= done.filter(x => tier(x) !== 'none')
    const addedByLate = keep.length - byTierOnly.length
    const bucket = { both: [], mixed: [], none: [] }
    for (const x of done) bucket[tier(x)].push(x)

    console.log(`  종료 ${done.length}건 → 1부끼리 ${bucket.both.length} · ${C.b}1부vs하부 ${bucket.mixed.length}${C.x} · 하부끼리 ${bucket.none.length}`)
    console.log(`  ${C.g}수집 ${keep.length}건 (${(keep.length/done.length*100).toFixed(0)}%)${C.x}` +
                ` — 1부 기준 ${byTierOnly.length} + 16강 규칙으로 추가 ${addedByLate}`)

    const lateLower = done.filter(x => isLate(x) && tier(x) === 'none')
    const samples = []
    for (const [label, x] of [
      ['1부 vs 하부 (가장 이른)',        bucket.mixed[0]],
      ['하부 vs 하부 · 16강 이상',       lateLower[0]],
      ['하부 vs 하부 · 16강 이전',       bucket.none.find(y => !isLate(y))],
      ['1부 vs 1부 (가장 이른)',         bucket.both[0]],
    ]) {
      if (!x) { console.log(`  ${C.d}${label} — 해당 경기 없음${C.x}`); continue }
      const d = await detail(x.fixture.id)
      const empty = ['events','lineups','stats_fixture','stats_player'].filter(k => !d[k] || d[k] === 'ERR')
      console.log(`  ${empty.length ? C.y : C.g}${label}${C.x} ${x.league.round} · ${x.teams.home.name} ${x.goals.home}-${x.goals.away} ${x.teams.away.name}`)
      console.log(`${C.d}    이벤트 ${d.events} · 라인업 ${d.lineups} · 팀통계 ${d.stats_fixture} · 선수통계 ${d.stats_player}${C.x}`)
      samples.push({ label, fixtureId: x.fixture.id, round: x.league.round, date: x.fixture.date.slice(0,10),
                     match: `${x.teams.home.name} ${x.goals.home}-${x.goals.away} ${x.teams.away.name}`, ...d })
    }

    results.push({ ...p, topTeamCount: top.size, rounds: roundInfo,
                   firstTopRound, listedMatches, allMatches,
                   total: done.length, both: bucket.both.length, mixed: bucket.mixed.length, none: bucket.none.length,
                   keep: keep.length, keepByTier: byTierOnly.length, addedByLate,
                   keepPct: +(keep.length/done.length*100).toFixed(1), samples })
  }

  mkdirSync(`${ROOT}/docs`, { recursive: true })
  writeFileSync(`${ROOT}/docs/api-cup-tiers.json`,
    JSON.stringify({ meta: { probedAt: new Date().toISOString(), season: SEASON, lateMax: LATE_MAX, calls }, results }, null, 2), 'utf8')

  const L = []
  L.push('# 컵 컷오프 기준 검증', '')
  L.push(`> 생성: ${new Date().toISOString().slice(0,10)} · \`scripts/probe-cup-tiers.mjs\` · 시즌 ${SEASON} · ${calls}콜`)
  L.push('> 검증 대상: **상세 수집 = (1부 팀 참가) OR (16강 이상)**')
  L.push(`> 16강 판정은 라운드 이름이 아니라 **참가 팀 ${LATE_MAX}팀 이하**로 한다. 이름은 대회마다 다르다.`, '')

  const sum = k => results.reduce((a, r) => a + (r[k] ?? 0), 0)

  L.push('## 수집량', '')
  L.push('| 대회 | 종료 | 1부끼리 | 1부vs하부 | 하부끼리 | 1부 기준 | +16강 규칙 | 수집 | 비율 |')
  L.push('|---|---|---|---|---|---|---|---|---|')
  for (const r of results)
    L.push(`| ${r.cupName} | ${r.total} | ${r.both} | ${r.mixed} | ${r.none} | ${r.keepByTier} | +${r.addedByLate} | **${r.keep}** | ${r.keepPct}% |`)
  L.push(`| **합계** | ${sum('total')} | ${sum('both')} | ${sum('mixed')} | ${sum('none')} | ${sum('keepByTier')} | +${sum('addedByLate')} | **${sum('keep')}** | |`)
  L.push('')

  L.push('## 경기 목록 수집 범위 — 1부 팀 최초 등장 라운드부터', '')
  L.push('| 대회 | 전체 경기 | 목록 수집 | 절감 | 시작 라운드 |')
  L.push('|---|---|---|---|---|')
  for (const r of results)
    L.push(`| ${r.cupName} | ${r.allMatches} | **${r.listedMatches}** | ${r.allMatches - r.listedMatches} | ${r.firstTopRound ?? '—'} |`)
  L.push(`| **합계** | ${sum('allMatches')} | **${sum('listedMatches')}** | ${sum('allMatches') - sum('listedMatches')} | |`)
  L.push('')

  L.push('## 분류별 실제 데이터 ★', '')
  L.push('> `1부 vs 하부`가 비면 규칙의 전제가 무너진다.')
  L.push('> `하부 vs 하부 · 16강 이상`이 비면 16강 규칙이 헛콜을 만든다.', '')
  L.push('| 대회 | 분류 | 라운드 | 경기 | 이벤트 | 라인업 | 팀통계 | 선수통계 |')
  L.push('|---|---|---|---|---|---|---|---|')
  for (const r of results) for (const s of r.samples)
    L.push(`| ${r.cupName} | ${s.label} | ${s.round} | ${s.match} | ${s.events} | ${s.lineups} | ${s.stats_fixture} | ${s.stats_player} |`)
  L.push('', '> 라인업·팀통계·선수통계는 **2**가 정상(양 팀). 0이면 데이터 없음.', '')

  L.push('## 라운드별 참가 팀 수 — 16강 경계가 어디인가', '')
  for (const r of results) {
    L.push(`### ${r.cupName} (\`${r.cup}\`)`, '')
    L.push('| 라운드 | 팀 | 경기 | 16강 이상 |'); L.push('|---|---|---|---|')
    for (const x of r.rounds)
      L.push(`| ${x.name} | ${x.teams} | ${x.matches} | ${x.late ? '✅' : ''} |`)
    L.push('')
  }

  writeFileSync(`${ROOT}/docs/CUP_TIER_CHECK.md`, L.join('\n'), 'utf8')
  console.log(`\n${C.b}완료 — ${calls}콜${C.x}`)
  console.log('  docs/CUP_TIER_CHECK.md')
  console.log('  docs/api-cup-tiers.json')
}

main().catch(e => { console.error(e); process.exit(1) })
