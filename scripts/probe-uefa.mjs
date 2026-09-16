#!/usr/bin/env node
/**
 * UEL(3) · UECL(848) 실측 프로브 — 09-16 산정 보고 B/B-3장 확정용
 *
 * 09-16 산정은 인벤토리에 fixture 카운트가 없어 UEFA 공식 형식(리그페이즈 36팀·UEL 8경기·UECL 6경기)에서
 * 유도한 추정이었다 (낙관 170 vs 보수 100 · 폭 70%). 실 API 로 확정한다.
 *
 * 실행:
 *   node scripts/probe-uefa.mjs
 *
 * 콜 예산 (엄수 · 14 + /status 1 = 15):
 *   /status                                    1콜  (잔여 200 미만이면 즉시 중단)
 *   /fixtures?league=3|848&season=2022~2026    10콜 (대회 2 × 시즌 5)
 *   예선 샘플 2경기 × (lineups + statistics)   4콜  (예선 상세 제공 여부)
 *
 * 산출:
 *   docs/api-uefa.json       — 원 응답 요약 + 통계
 *   docs/UEFA_INVENTORY.md   — CUPS_INVENTORY.md 형식
 *
 * 5대리그 팀 판정은 하지 않는다 — /teams 콜 추가하면 예산 초과. 라운드별 경기 수·팀 목록만
 * 실측 · 컷 후 경기 수(3안) 계산은 카탈로그 확장 판에서 별도 판정.
 */
import { writeFileSync, mkdirSync, readFileSync } from 'node:fs'
import { dirname, resolve, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')

/** backend/.env 에서 KEY 만 뽑는다 (dotenv 무의존 · 프로젝트 루트에 dotenv 없음) */
function readKey() {
  if (process.env.API_FOOTBALL_KEY) return process.env.API_FOOTBALL_KEY
  for (const rel of ['backend/.env.local', 'backend/.env']) {
    try {
      const text = readFileSync(join(ROOT, rel), 'utf8')
      const m = text.match(/^API_FOOTBALL_KEY=(.+)$/m)
      if (m && m[1].trim()) return m[1].trim()
    } catch { /* ignore */ }
  }
  return null
}

const KEY = readKey()
if (!KEY) { console.error('API_FOOTBALL_KEY 없음 — backend/.env 또는 env 로'); process.exit(1) }

const BASE = 'https://v3.football.api-sports.io'
const SEASONS = [2022, 2023, 2024, 2025, 2026]
const COMPS = [
  { id: 3,   name: 'UEFA Europa League',           short: 'UEL' },
  { id: 848, name: 'UEFA Europa Conference League', short: 'UECL' },
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

async function main() {
  // 0. /status — 잔여 확인
  const { fail, json: status } = await get('/status')
  if (fail) { console.error(`${C.r}/status 실패${C.x}: ${fail}`); process.exit(1) }
  const used = status.response?.requests?.current ?? 0
  const limit = status.response?.requests?.limit_day ?? 0
  const remaining = limit - used
  console.log(`${C.b}/status${C.x} ${used}/${limit} · 잔여 ${remaining}`)
  if (remaining < 200) {
    console.error(`${C.r}잔여 ${remaining} < 200 — 백필 워커 쿼터 보호 위해 중단${C.x}`)
    process.exit(2)
  }

  // 1. 대회 × 시즌 fixtures
  const perSeason = {}
  for (const comp of COMPS) {
    perSeason[comp.id] = {}
    for (const season of SEASONS) {
      console.log(`\n${C.b}── ${comp.short} ${season} ${'─'.repeat(40)}${C.x}`)
      const r = await get(`/fixtures?league=${comp.id}&season=${season}`)
      if (r.fail) {
        console.log(`${C.r}[ERR]${C.x} ${r.fail.slice(0, 80)}`)
        perSeason[comp.id][season] = { error: r.fail }
        continue
      }
      const fixtures = r.json.response ?? []
      // 라운드별 그룹
      const byRound = {}
      const teamIds = new Set()
      for (const f of fixtures) {
        const round = f.league?.round ?? '(unknown)'
        if (!byRound[round]) byRound[round] = { count: 0, teams: new Set(), sampleFixtureId: null, finished: 0 }
        byRound[round].count++
        if (f.teams?.home?.id) { byRound[round].teams.add(f.teams.home.id); teamIds.add(f.teams.home.id) }
        if (f.teams?.away?.id) { byRound[round].teams.add(f.teams.away.id); teamIds.add(f.teams.away.id) }
        if (f.fixture?.status?.short === 'FT') byRound[round].finished++
        if (!byRound[round].sampleFixtureId) byRound[round].sampleFixtureId = f.fixture?.id
      }
      const rounds = Object.entries(byRound).map(([name, v]) => ({
        name, count: v.count, finished: v.finished, teams: v.teams.size, sampleFixtureId: v.sampleFixtureId,
      }))
      perSeason[comp.id][season] = { total: fixtures.length, rounds, uniqueTeams: teamIds.size }
      console.log(`  ${fixtures.length}경기 · ${rounds.length} 라운드 · 고유팀 ${teamIds.size}`)
      for (const rnd of rounds) {
        const isQual = /Qualif|Preliminary/i.test(rnd.name)
        console.log(`    ${isQual ? C.y+'예선':'  본선'}${C.x} ${rnd.name.padEnd(40)} ${String(rnd.count).padStart(3)}경기 · ${String(rnd.teams).padStart(3)}팀 · 종료 ${rnd.finished}`)
      }
    }
  }

  // 2. 예선 샘플 — 대회당 1건 (2026 시즌 예선 라운드 첫 경기)
  const samples = []
  for (const comp of COMPS) {
    const s2026 = perSeason[comp.id]?.[2026]
    if (!s2026?.rounds) continue
    const qualRound = s2026.rounds.find(r => /Qualif|Preliminary/i.test(r.name) && r.sampleFixtureId)
    if (!qualRound) {
      console.log(`\n${C.y}[skip] ${comp.short} 2026 예선 없음${C.x}`)
      continue
    }
    const fid = qualRound.sampleFixtureId
    console.log(`\n${C.b}샘플 상세: ${comp.short} 2026 ${qualRound.name} fixture=${fid}${C.x}`)
    const row = { comp: comp.short, season: 2026, round: qualRound.name, fixtureId: fid }
    for (const [key, path] of [
      ['lineups',       `/fixtures/lineups?fixture=${fid}`],
      ['stats_fixture', `/fixtures/statistics?fixture=${fid}`],
    ]) {
      const r = await get(path)
      row[key] = r.fail ? 'ERR' : (r.json.results ?? 0)
      console.log(`  ${key} · ${row[key]}`)
    }
    samples.push(row)
  }

  // 3. 산출
  mkdirSync(`${ROOT}/docs`, { recursive: true })
  const meta = { probedAt: new Date().toISOString(), calls, statusBefore: { used, limit, remaining } }
  writeFileSync(`${ROOT}/docs/api-uefa.json`,
    JSON.stringify({ meta, perSeason, samples }, null, 2), 'utf8')

  // Markdown
  const L = []
  L.push('# UEFA Europa · Conference League — 실측 프로브', '')
  L.push(`> 생성: ${meta.probedAt.slice(0, 10)} · \`scripts/probe-uefa.mjs\` · ${calls}콜 (예산 15 · /status 1 + fixtures 10 + 샘플 4)`)
  L.push(`> /status 잔여 ${remaining} (${used}/${limit})`)
  L.push('> 09-16 산정 보고 B/B-3장의 UEFA 공식 형식 추정(낙관 170 vs 보수 100)을 실측으로 확정한다.', '')

  for (const comp of COMPS) {
    L.push(`## ${comp.name} (id \`${comp.id}\`)`, '')
    L.push('| 시즌 | 총 경기 | 라운드 수 | 고유 팀 | 형식 판정 |')
    L.push('|---|---:|---:|---:|---|')
    for (const s of SEASONS) {
      const data = perSeason[comp.id]?.[s]
      if (!data || data.error) { L.push(`| ${s} | — | — | — | ${data?.error ?? '데이터 없음'} |`); continue }
      // 형식 판정: League phase 라운드가 있으면 신 형식(2024/25~) · Group 이면 구 조별리그
      const hasLeaguePhase = data.rounds.some(r => /League (Phase|Stage)/i.test(r.name))
      const hasGroup = data.rounds.some(r => /Group/i.test(r.name))
      const format = hasLeaguePhase ? '리그페이즈' : hasGroup ? '조별리그' : '기타'
      L.push(`| ${s} | ${data.total} | ${data.rounds.length} | ${data.uniqueTeams} | ${format} |`)
    }
    L.push('')
    L.push('### 시즌별 라운드 분해', '')
    for (const s of SEASONS) {
      const data = perSeason[comp.id]?.[s]
      if (!data || data.error) continue
      L.push(`**${s}시즌**  경기 ${data.total} · 라운드 ${data.rounds.length} · 팀 ${data.uniqueTeams}`, '')
      L.push('| 유형 | 라운드 | 경기 | 팀 | 종료 |')
      L.push('|---|---|---:|---:|---:|')
      for (const rnd of data.rounds) {
        const isQual = /Qualif|Preliminary/i.test(rnd.name)
        L.push(`| ${isQual ? '예선' : '본선'} | ${rnd.name} | ${rnd.count} | ${rnd.teams} | ${rnd.finished} |`)
      }
      L.push('')
    }
  }

  if (samples.length) {
    L.push('## 예선 상세 제공 여부 (샘플)', '')
    L.push('> 컵 초반 라운드 0 패턴과 같은지 판정 (라인업·팀통계는 정상 2 · 0 이면 데이터 없음)', '')
    L.push('| 대회 | 시즌 | 라운드 | fixture | lineups | stats_fixture |')
    L.push('|---|---:|---|---:|---:|---:|')
    for (const s of samples) {
      L.push(`| ${s.comp} | ${s.season} | ${s.round} | ${s.fixtureId} | ${s.lineups} | ${s.stats_fixture} |`)
    }
    L.push('')
  }

  L.push('## 09-16 산정 보고 정정 사항', '')
  L.push('아래 표는 실측 후 다음 세션에 채운다. 이 프로브의 원 응답은 `docs/api-uefa.json` 참조.', '')

  writeFileSync(`${ROOT}/docs/UEFA_INVENTORY.md`, L.join('\n'), 'utf8')
  console.log(`\n${C.b}완료 — ${calls}콜${C.x}`)
  console.log('  docs/UEFA_INVENTORY.md')
  console.log('  docs/api-uefa.json')
}

main().catch(e => { console.error(e); process.exit(1) })
