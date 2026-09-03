#!/usr/bin/env node
/**
 * API-Football 제공 데이터 확인 스크립트
 *
 * 목적: 문서를 읽는 대신 실제 응답에서 "무슨 필드가 오는지"를 직접 확인한다.
 *       특히 xG·기대득점 계열이 실제로 오는지 전수 검색한다.
 *
 * 실행:
 *   API_FOOTBALL_KEY=발급받은키 node scripts/probe-api-football.mjs
 *
 * 호출 수: 약 7콜 (일 한도 7,500 대비 무시할 수준)
 *
 * 이 스크립트는 BACKEND_DESIGN_REVIEW.md B-1(26-27 시즌 데이터 실호출 확인)도 함께 수행한다.
 */

const KEY = process.env.API_FOOTBALL_KEY
if (!KEY) {
  console.error('API_FOOTBALL_KEY 환경변수가 없습니다.')
  console.error('예: API_FOOTBALL_KEY=xxxx node scripts/probe-api-football.mjs')
  process.exit(1)
}

const BASE   = 'https://v3.football.api-sports.io'
const LEAGUE = 39    // Premier League
const SEASON = 2026  // 2026-27 시즌

let calls = 0

const C = { g:'\x1b[32m', r:'\x1b[31m', y:'\x1b[33m', d:'\x1b[2m', b:'\x1b[1m', x:'\x1b[0m' }
const ok   = m => console.log(`${C.g}[OK ]${C.x} ${m}`)
const bad  = m => console.log(`${C.r}[ERR]${C.x} ${m}`)
const warn = m => console.log(`${C.y}[WRN]${C.x} ${m}`)
const head = m => console.log(`\n${C.b}── ${m} ${'─'.repeat(Math.max(0, 58 - m.length))}${C.x}`)

async function get(path) {
  calls++
  const res = await fetch(`${BASE}${path}`, { headers: { 'x-apisports-key': KEY } })
  if (!res.ok) throw new Error(`HTTP ${res.status} ${res.statusText} — ${path}`)
  const json = await res.json()
  if (json.errors && Object.keys(json.errors).length > 0) {
    throw new Error(`API errors: ${JSON.stringify(json.errors)} — ${path}`)
  }
  return json
}

/** 객체 트리를 훑어 모든 키 경로를 수집 */
function collectKeys(obj, prefix = '', out = new Set(), depth = 0) {
  if (depth > 6 || obj === null || typeof obj !== 'object') return out
  if (Array.isArray(obj)) {
    if (obj.length > 0) collectKeys(obj[0], `${prefix}[]`, out, depth + 1)
    return out
  }
  for (const [k, v] of Object.entries(obj)) {
    const path = prefix ? `${prefix}.${k}` : k
    out.add(path)
    collectKeys(v, path, out, depth + 1)
  }
  return out
}

/** xG·기대값 계열 키 탐지 */
const XG_PATTERN = /expected|xg\b|x_g|xa\b|npxg|shot.?quality|prob/i
function findXG(keys) {
  return [...keys].filter(k => XG_PATTERN.test(k))
}

async function main() {
  console.log(`${C.b}API-Football 제공 데이터 확인${C.x}`)
  console.log(`${C.d}리그 ${LEAGUE} · 시즌 ${SEASON} 기준${C.x}`)

  const allKeys = new Set()

  // ── 1. 구독 상태 ──────────────────────────────────────────
  head('1. 구독 상태')
  try {
    const s = await get('/status')
    const r = s.response
    ok(`플랜: ${r.subscription?.plan} · 만료: ${r.subscription?.end}`)
    ok(`오늘 사용: ${r.requests?.current} / ${r.requests?.limit_day}`)
  } catch (e) { bad(e.message) }

  // ── 2. 시즌 접근 (B-1) ────────────────────────────────────
  head(`2. ${SEASON}-${String(SEASON+1).slice(2)} 시즌 접근 가능한가`)
  let seasonOk = false
  try {
    const l = await get(`/leagues?id=${LEAGUE}&season=${SEASON}`)
    if (l.results === 0) {
      bad(`시즌 ${SEASON} 데이터가 없습니다. ← 로드맵에 영향`)
    } else {
      const lg = l.response[0]
      ok(`${lg.league.name} (${lg.country.name}) · 시즌 ${SEASON} 접근 확인`)
      const cov = lg.seasons?.find(s => s.year === SEASON)?.coverage
      if (cov) {
        console.log(`${C.d}   커버리지:${C.x}`)
        console.log(`${C.d}     라인업 ${cov.fixtures?.lineups} · 경기통계 ${cov.fixtures?.statistics_fixtures} · 선수통계 ${cov.fixtures?.statistics_players}${C.x}`)
        console.log(`${C.d}     순위 ${cov.standings} · 선수 ${cov.players} · 부상 ${cov.injuries} · 예측 ${cov.predictions}${C.x}`)
      }
      seasonOk = true
    }
  } catch (e) { bad(e.message) }

  if (!seasonOk) {
    warn('시즌 접근이 안 되므로 이후 확인을 중단합니다.')
    console.log(`\n총 ${calls}콜 사용`)
    return
  }

  // ── 3. 팀 + 로고 ──────────────────────────────────────────
  head('3. 팀 · 로고 · 경기장')
  try {
    const t = await get(`/teams?league=${LEAGUE}&season=${SEASON}`)
    ok(`팀 ${t.results}개`)
    const first = t.response[0]
    console.log(`${C.d}   예시: ${first.team.name}${C.x}`)
    console.log(`${C.d}   로고: ${first.team.logo}${C.x}`)
    console.log(`${C.d}   경기장: ${first.venue?.name} (${first.venue?.capacity}명)${C.x}`)
    collectKeys(first, 'teams', allKeys)
  } catch (e) { bad(e.message) }

  // ── 4. 최근 경기 1건 확보 ─────────────────────────────────
  head('4. 경기 데이터')
  let fixtureId = null
  try {
    const f = await get(`/fixtures?league=${LEAGUE}&season=${SEASON}&last=1`)
    if (f.results === 0) {
      warn('종료된 경기가 아직 없습니다. 통계 확인을 건너뜁니다.')
    } else {
      const fx = f.response[0]
      fixtureId = fx.fixture.id
      ok(`경기 #${fixtureId} — ${fx.teams.home.name} ${fx.goals.home}-${fx.goals.away} ${fx.teams.away.name}`)
      collectKeys(fx, 'fixtures', allKeys)
    }
  } catch (e) { bad(e.message) }

  // ── 5. 팀 단위 경기 통계 ★ ────────────────────────────────
  if (fixtureId) {
    head('5. 팀 경기 통계 — 어떤 항목이 오는가')
    try {
      const st = await get(`/fixtures/statistics?fixture=${fixtureId}`)
      if (st.results === 0) {
        warn('이 경기에 통계가 없습니다 (커버리지 확인 필요)')
      } else {
        const types = st.response[0].statistics.map(s => s.type)
        ok(`통계 항목 ${types.length}개`)
        types.forEach(t => {
          const v = st.response[0].statistics.find(s => s.type === t)?.value
          console.log(`${C.d}   · ${t}${C.x}${v !== null && v !== undefined ? ` = ${v}` : ` ${C.y}(null)${C.x}`}`)
        })
        types.forEach(t => allKeys.add(`fixtures/statistics.type:${t}`))
      }
    } catch (e) { bad(e.message) }

    // ── 6. 선수별 경기 통계 ★ ───────────────────────────────
    head('6. 선수별 경기 통계 — 어떤 필드가 오는가')
    try {
      const pl = await get(`/fixtures/players?fixture=${fixtureId}`)
      if (pl.results === 0) {
        warn('이 경기에 선수 통계가 없습니다')
      } else {
        const sample = pl.response[0].players[0].statistics[0]
        ok(`선수 ${pl.response[0].players.length}명 · 필드 그룹 ${Object.keys(sample).length}개`)
        for (const [group, fields] of Object.entries(sample)) {
          if (fields && typeof fields === 'object') {
            console.log(`${C.d}   ${group}: ${Object.keys(fields).join(', ')}${C.x}`)
          } else {
            console.log(`${C.d}   ${group}: ${fields}${C.x}`)
          }
        }
        collectKeys(sample, 'fixtures/players.statistics', allKeys)
      }
    } catch (e) { bad(e.message) }
  }

  // ── 7. 선수 시즌 통계 ─────────────────────────────────────
  head('7. 선수 시즌 통계')
  try {
    const p = await get(`/players?league=${LEAGUE}&season=${SEASON}&page=1`)
    if (p.results === 0) {
      warn('선수 시즌 통계가 아직 없습니다')
    } else {
      const sample = p.response[0].statistics[0]
      ok(`선수 ${p.paging?.total ?? '?'}페이지 분량`)
      for (const [group, fields] of Object.entries(sample)) {
        if (fields && typeof fields === 'object' && !Array.isArray(fields)) {
          console.log(`${C.d}   ${group}: ${Object.keys(fields).join(', ')}${C.x}`)
        }
      }
      collectKeys(sample, 'players.statistics', allKeys)
    }
  } catch (e) { bad(e.message) }

  // ── 8. xG 전수 검색 ★ ─────────────────────────────────────
  head('8. xG · 기대값 계열 전수 검색')
  const hits = findXG(allKeys)
  if (hits.length > 0) {
    ok(`발견 ${hits.length}건`)
    hits.forEach(h => console.log(`${C.g}   · ${h}${C.x}`))
  } else {
    warn('xG · expected goals 계열 필드를 찾지 못했습니다.')
    console.log(`${C.d}   → 필요하면 별도 제공자(Understat, Sportmonks 등)나 자체 계산이 필요합니다.${C.x}`)
    console.log(`${C.d}   → 단, /predictions 엔드포인트에 별도 확률 지표가 있을 수 있습니다.${C.x}`)
  }

  // ── 마무리 ────────────────────────────────────────────────
  console.log(`\n${C.b}수집한 키 경로 ${allKeys.size}개 · 총 ${calls}콜 사용${C.x}`)
  console.log(`${C.d}전체 키 목록을 파일로 남기려면: ... > docs/api-fields.txt${C.x}`)

  if (process.env.DUMP_KEYS) {
    console.log(`\n${C.b}── 전체 키 경로 ──${C.x}`)
    ;[...allKeys].sort().forEach(k => console.log(k))
  }
}

main().catch(e => { bad(e.message); process.exit(1) })
