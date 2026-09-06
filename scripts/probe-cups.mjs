#!/usr/bin/env node
/**
 * 컵 대회 재조사 — 커버리지 플래그가 아니라 실제 경기 데이터로 확인한다
 *
 * 왜: 1차 조사(시즌 2026)에서 FA Cup 이 거의 전부 미제공으로 나왔고,
 *     코파 델 레이·쿠프 드 프랑스는 목록에 아예 없었다.
 *     시즌이 막 등록만 되고 데이터가 안 채워진 상태일 가능성이 크므로
 *     **완료된 시즌**으로 다시 확인한다.
 *
 * 무엇을:
 *   1. 국가별 컵 전량 조회 (시즌 파라미터 없이) — 대회별 전 시즌 커버리지
 *   2. 주요 컵을 골라 완료 시즌의 **초반 라운드**와 **후반 라운드** 경기를 각각 실호출
 *      → FA컵 1라운드(하부리그)와 준결승의 데이터 유무가 다를 수 있다
 *
 * 실행:
 *   API_FOOTBALL_KEY=키 node scripts/probe-cups.mjs
 *   SEASON=2025 node ...   (기본 2025 — 마지막 완료 시즌)
 *
 * 산출물: docs/CUPS_INVENTORY.md · docs/api-cups.json
 * 호출 수: 약 60콜
 */

import { writeFileSync, mkdirSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const KEY = process.env.API_FOOTBALL_KEY
if (!KEY) { console.error('API_FOOTBALL_KEY 환경변수가 없습니다.'); process.exit(1) }

const BASE   = 'https://v3.football.api-sports.io'
const SEASON = Number(process.env.SEASON ?? 2025)   // 마지막 완료 시즌
const ROOT   = resolve(dirname(fileURLToPath(import.meta.url)), '..')

const COUNTRIES = ['England', 'Spain', 'Germany', 'Italy', 'France']

/** 심층 확인할 주요 컵 — 이름으로 찾는다 (ID가 문서에 없다) */
const TARGETS = [
  { key: 'FA Cup',            country: 'England', re: /^FA Cup$/i },
  { key: 'League Cup',        country: 'England', re: /^(League Cup|Carabao)/i },
  { key: 'Copa del Rey',      country: 'Spain',   re: /copa del rey/i },
  { key: 'DFB Pokal',         country: 'Germany', re: /^DFB[ -]?Pokal$/i },
  { key: 'Coppa Italia',      country: 'Italy',   re: /^Coppa Italia$/i },
  { key: 'Coupe de France',   country: 'France',  re: /coupe de france/i },
]

const C = { g:'\x1b[32m', r:'\x1b[31m', y:'\x1b[33m', d:'\x1b[2m', b:'\x1b[1m', x:'\x1b[0m' }
let calls = 0

async function get(path) {
  calls++
  const res  = await fetch(`${BASE}${path}`, { headers: { 'x-apisports-key': KEY } })
  const json = await res.json().catch(() => ({}))
  if (!res.ok) return { fail: `HTTP ${res.status}`, json }
  const e = json.errors
  const hasErr = Array.isArray(e) ? e.length > 0 : e && Object.keys(e).length > 0
  if (hasErr) return { fail: JSON.stringify(e), json }
  return { json }
}

const flags = c => ({
  events:        c?.fixtures?.events,
  lineups:       c?.fixtures?.lineups,
  stats_fixture: c?.fixtures?.statistics_fixtures,
  stats_player:  c?.fixtures?.statistics_players,
  standings: c?.standings, players: c?.players,
  top_scorers: c?.top_scorers, injuries: c?.injuries,
})

/** 1. 국가별 컵 전량 — 시즌 파라미터 없이 부르면 전 시즌이 온다 */
async function listCups() {
  const all = []
  for (const country of COUNTRIES) {
    console.log(`\n${C.b}── ${country} ${'─'.repeat(50 - country.length)}${C.x}`)
    const { fail, json } = await get(`/leagues?country=${encodeURIComponent(country)}&type=cup`)
    if (fail) { console.log(`${C.r}[ERR ]${C.x} ${fail.slice(0, 60)}`); continue }
    for (const item of json.response ?? []) {
      const seasons = item.seasons ?? []
      const years   = seasons.map(s => s.year).sort((a, b) => a - b)
      const target  = seasons.find(s => s.year === SEASON)
      const row = {
        country, id: item.league.id, name: item.league.name,
        seasonCount: years.length, from: years[0], to: years.at(-1),
        hasTargetSeason: !!target,
        coverageAtTarget: target ? flags(target.coverage) : null,
        coverageLatest:   flags(seasons.at(-1)?.coverage),
      }
      all.push(row)
      const cov = row.coverageAtTarget ?? row.coverageLatest
      const on  = Object.entries(cov ?? {}).filter(([, v]) => v).map(([k]) => k)
      console.log(`  ${String(row.id).padStart(5)}  ${row.name.padEnd(32)} ${years.length}시즌 ${row.from}~${row.to}` +
                  `  ${target ? C.g : C.y}[${SEASON}${target ? '' : ' 없음'}]${C.x} ${C.d}${on.join(' ') || '제공 항목 없음'}${C.x}`)
    }
  }
  return all
}

/** 2. 주요 컵 심층 확인 — 초반 라운드와 후반 라운드를 각각 실호출 */
async function deepCheck(cups) {
  const out = []
  for (const t of TARGETS) {
    const cup = cups.find(c => c.country === t.country && t.re.test(c.name))
    if (!cup) {
      console.log(`\n${C.r}[없음]${C.x} ${t.key} — ${t.country} 컵 목록에서 못 찾음`)
      out.push({ ...t, found: false }); continue
    }

    console.log(`\n${C.b}── ${t.key} (id ${cup.id}) · 시즌 ${SEASON} ${'─'.repeat(20)}${C.x}`)
    const { fail, json } = await get(`/fixtures?league=${cup.id}&season=${SEASON}`)
    if (fail) { console.log(`${C.r}[ERR ]${C.x} ${fail.slice(0, 60)}`); out.push({ ...t, id: cup.id, found: true, error: fail }); continue }

    const done = (json.response ?? []).filter(f => f.fixture?.status?.short === 'FT')
      .sort((a, b) => new Date(a.fixture.date) - new Date(b.fixture.date))
    console.log(`  경기 ${json.results}건 · 종료 ${done.length}건`)
    if (!done.length) { out.push({ ...t, id: cup.id, found: true, fixtures: json.results, samples: [] }); continue }

    const picks = [
      ['초반 라운드', done[0]],
      ['후반 라운드', done.at(-1)],
    ]
    const samples = []
    for (const [label, f] of picks) {
      const fid = f.fixture.id
      const row = { label, fixtureId: fid, round: f.league?.round, date: f.fixture?.date?.slice(0, 10),
                    match: `${f.teams?.home?.name} ${f.goals?.home}-${f.goals?.away} ${f.teams?.away?.name}` }
      for (const [key, path] of [
        ['events',        `/fixtures/events?fixture=${fid}`],
        ['lineups',       `/fixtures/lineups?fixture=${fid}`],
        ['stats_fixture', `/fixtures/statistics?fixture=${fid}`],
        ['stats_player',  `/fixtures/players?fixture=${fid}`],
      ]) {
        const r = await get(path)
        row[key] = r.fail ? `ERR` : (r.json.results ?? 0)
      }
      const bad = ['events','lineups','stats_fixture','stats_player'].filter(k => !row[k] || row[k] === 'ERR')
      console.log(`  ${bad.length ? C.y : C.g}${label}${C.x} ${row.round} · ${row.match}`)
      console.log(`${C.d}    이벤트 ${row.events} · 라인업 ${row.lineups} · 팀통계 ${row.stats_fixture} · 선수통계 ${row.stats_player}${C.x}`)
      samples.push(row)
    }
    out.push({ ...t, id: cup.id, found: true, fixtures: json.results, finished: done.length, samples })
  }
  return out
}

async function main() {
  console.log(`${C.b}컵 대회 재조사${C.x} ${C.d}기준 시즌 ${SEASON}${C.x}`)
  const cups  = await listCups()
  const deep  = await deepCheck(cups)

  mkdirSync(`${ROOT}/docs`, { recursive: true })
  writeFileSync(`${ROOT}/docs/api-cups.json`,
    JSON.stringify({ meta: { probedAt: new Date().toISOString(), season: SEASON, calls }, cups, deep }, null, 2), 'utf8')

  const L = []
  L.push('# 컵 대회 재조사 — 실제 경기 데이터 기준', '')
  L.push(`> 생성: ${new Date().toISOString().slice(0, 10)} · \`scripts/probe-cups.mjs\` · 기준 시즌 ${SEASON} · ${calls}콜`)
  L.push('> 1차 조사(시즌 2026)에서 FA Cup 이 껍데기로, 코파 델 레이·쿠프 드 프랑스가 없음으로 나온 것을')
  L.push('> **완료된 시즌**으로 다시 확인한 결과다. 커버리지 플래그와 실제 응답을 둘 다 적는다.', '')

  L.push('## 주요 컵 — 실제 경기 데이터', '')
  L.push('| 대회 | ID | 시즌 경기 | 표본 | 라운드 | 이벤트 | 라인업 | 팀통계 | 선수통계 |')
  L.push('|---|---|---|---|---|---|---|---|---|')
  for (const d of deep) {
    if (!d.found) { L.push(`| ${d.key} | — | ❌ 목록에 없음 | | | | | | |`); continue }
    if (!d.samples?.length) { L.push(`| ${d.key} | \`${d.id}\` | ${d.fixtures ?? 0} | ⚠ 종료 경기 없음 | | | | | |`); continue }
    for (const s of d.samples) {
      L.push(`| ${d.key} | \`${d.id}\` | ${d.fixtures} | ${s.label} | ${s.round} | ${s.events} | ${s.lineups} | ${s.stats_fixture} | ${s.stats_player} |`)
    }
  }
  L.push('')
  L.push('> 라인업·팀통계·선수통계는 **2**가 정상이다 (양 팀). 0이면 그 라운드는 데이터가 없다.', '')

  L.push('## 국가별 컵 전량', '')
  for (const country of COUNTRIES) {
    const rows = cups.filter(c => c.country === country)
    if (!rows.length) continue
    L.push(`### ${country} — ${rows.length}개`, '')
    L.push(`| ID | 대회 | 시즌 수 | 범위 | ${SEASON} 시즌 | 제공 항목 |`)
    L.push('|---|---|---|---|---|---|')
    for (const r of rows.sort((a, b) => b.seasonCount - a.seasonCount)) {
      const cov = r.coverageAtTarget ?? r.coverageLatest ?? {}
      const on  = Object.entries(cov).filter(([, v]) => v).map(([k]) => k)
      L.push(`| \`${r.id}\` | ${r.name} | ${r.seasonCount} | ${r.from}~${r.to} | ${r.hasTargetSeason ? '✅' : '❌'} | ${on.join(', ') || '없음'} |`)
    }
    L.push('')
  }

  writeFileSync(`${ROOT}/docs/CUPS_INVENTORY.md`, L.join('\n'), 'utf8')
  console.log(`\n${C.b}완료 — ${calls}콜${C.x}`)
  console.log('  docs/CUPS_INVENTORY.md')
  console.log('  docs/api-cups.json')
}

main().catch(e => { console.error(e); process.exit(1) })
