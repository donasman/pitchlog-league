#!/usr/bin/env node
/**
 * API-Football — 내 키로 실제 가져올 수 있는 데이터 전수 조사 (v2)
 *
 * v1 대비 고친 것:
 *   1. /status 가 results:0 이라 통째로 버려지던 문제 — 객체 응답도 1건으로 센다
 *   2. /fixtures?live= 파라미터 형식 오류 — 단일 id 불가, id-id-id 형태여야 한다
 *   3. 키 집계가 response[0]만 봐서 얕던 문제 — 최대 8건을 병합하고,
 *      {type, value} 배열은 type 값 자체를 목록으로 뽑는다 (통계 18종 이름 등)
 *   4. 6대회 커버리지 플래그 확인 추가 — v1은 EPL 하나만 봤다
 *   5. /odds/mapping · /odds/live/bets 추가 (공식 목록 대조 결과)
 *   6. 파라미터 변형 확인 추가 — 같은 엔드포인트라도 파라미터에 따라 다른 데이터가 온다
 *
 * 실행:
 *   API_FOOTBALL_KEY=키 node scripts/probe-api-inventory.mjs
 *
 * 산출물:
 *   docs/api-inventory.json   엔드포인트별 상태·건수·키 경로·enum·샘플 (기계용)
 *   docs/API_INVENTORY.md     사람이 읽는 목록
 *
 * 호출 수: 약 140콜 (일 한도 7,500) · RECENT=3 등으로 줄일 수 있다
 */

import { writeFileSync, mkdirSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const KEY = process.env.API_FOOTBALL_KEY
if (!KEY) { console.error('API_FOOTBALL_KEY 환경변수가 없습니다.'); process.exit(1) }

const BASE   = 'https://v3.football.api-sports.io'
const LEAGUE = Number(process.env.LEAGUE ?? 39)
const SEASON = Number(process.env.SEASON ?? 2026)
const TEAM   = Number(process.env.TEAM   ?? 33)
const ROOT   = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const RECENT = Number(process.env.RECENT ?? 5)   // 최근 N개 시즌

/** PitchLog 대상 6대회 */
const COMPETITIONS = [
  [39,  'Premier League'], [140, 'LaLiga'],   [78,  'Bundesliga'],
  [135, 'Serie A'],        [61,  'Ligue 1'],  [2,   'UCL'],
]
const LIVE_IDS = COMPETITIONS.map(([id]) => id).join('-')

/** 컵 대회는 ID가 공개 문서에 없다 — 국가별로 조회해 직접 찾는다 */
const CUP_COUNTRIES = ['England', 'Spain', 'Germany', 'Italy', 'France', 'World']

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

/** 키 경로 + 리프 타입. 배열은 요소를 SAMPLES개까지 병합해 훑는다 */
const SAMPLES = 8
function collectKeys(obj, prefix = '', out = new Map(), depth = 0) {
  if (depth > 8) return out
  if (Array.isArray(obj)) {
    for (const el of obj.slice(0, SAMPLES)) collectKeys(el, `${prefix}[]`, out, depth + 1)
    return out
  }
  if (obj === null || typeof obj !== 'object') return out
  for (const [k, v] of Object.entries(obj)) {
    const p = prefix ? `${prefix}.${k}` : k
    const t = v === null ? 'null' : Array.isArray(v) ? 'array' : typeof v
    const prev = out.get(p)
    // null 만 보이던 자리에 실제 타입이 나오면 갱신한다 (null 처리 규칙 판단용)
    out.set(p, prev && prev !== 'null' && t === 'null' ? prev : (prev === 'null' ? t : (prev ?? t)))
    collectKeys(v, p, out, depth + 1)
  }
  return out
}

/** {type, value} 형태 배열의 type 값들을 목록으로 (통계 지표 이름 등) */
function collectEnums(obj, prefix = '', out = new Map(), depth = 0) {
  if (depth > 8 || obj === null || typeof obj !== 'object') return out
  if (Array.isArray(obj)) {
    const named = obj.filter(e => e && typeof e === 'object' && typeof e.type === 'string')
    if (named.length) {
      const set = out.get(`${prefix}[].type`) ?? new Set()
      named.forEach(e => set.add(e.type))
      out.set(`${prefix}[].type`, set)
    }
    for (const el of obj.slice(0, SAMPLES)) collectEnums(el, `${prefix}[]`, out, depth + 1)
    return out
  }
  for (const [k, v] of Object.entries(obj)) collectEnums(v, prefix ? `${prefix}.${k}` : k, out, depth + 1)
  return out
}

/** null 로 오는 필드 — 정규화 계층에서 판단해야 할 자리 */
function collectNulls(obj, prefix = '', out = new Set(), depth = 0) {
  if (depth > 8 || obj === null || typeof obj !== 'object') return out
  if (Array.isArray(obj)) { for (const el of obj.slice(0, SAMPLES)) collectNulls(el, `${prefix}[]`, out, depth + 1); return out }
  for (const [k, v] of Object.entries(obj)) {
    const p = prefix ? `${prefix}.${k}` : k
    if (v === null) out.add(p)
    else collectNulls(v, p, out, depth + 1)
  }
  return out
}

const ctx = { fixtureId: null, playerId: null, coachId: null }

const GROUPS = [
  ['구독·메타', [
    ['/status',                                                          '구독 플랜·일 한도·만료일·잔여 콜'],
    ['/timezone',                                                        '지원 타임존'],
    ['/countries',                                                       '국가 목록'],
  ]],
  ['대회', [
    [`/leagues?id=${LEAGUE}&season=${SEASON}`,                           '대회 정보 + 커버리지 플래그'],
    ['/leagues/seasons',                                                 '제공 시즌 연도'],
    [`/standings?league=${LEAGUE}&season=${SEASON}`,                     '순위표 — 사이트 핵심'],
    [`/fixtures/rounds?league=${LEAGUE}&season=${SEASON}`,               '라운드 목록'],
  ]],
  ['팀', [
    [`/teams?league=${LEAGUE}&season=${SEASON}`,                         '팀 목록 + 로고 + 경기장'],
    [`/teams/statistics?league=${LEAGUE}&season=${SEASON}&team=${TEAM}`, '팀 시즌 통계 — 팀 상세'],
    [`/teams/seasons?team=${TEAM}`,                                      '해당 팀 제공 시즌'],
    ['/teams/countries',                                                 '팀 보유 국가'],
    ['/venues?country=England',                                          '경기장 상세'],
    [`/coachs?team=${TEAM}`,                                             '감독 + 경력', r => { ctx.coachId = r.response?.[0]?.id }],
    [`/transfers?team=${TEAM}`,                                          '이적 이력 — 임대 구분용'],
  ]],
  ['경기', [
    [`/fixtures?league=${LEAGUE}&season=${SEASON}&last=1`,               '경기 목록', r => { ctx.fixtureId = r.response?.[0]?.fixture?.id }],
    [`/fixtures?live=${LIVE_IDS}`,                                       `라이브 폴링 6대회 (진행 경기 없으면 0건 정상)`],
    [`/fixtures?date=${new Date().toISOString().slice(0,10)}`,           '날짜 기준 조회 — 홈 "오늘의 경기"'],
    [`/fixtures?team=${TEAM}&season=${SEASON}&last=5`,                   '팀 최근 경기 — 팀 상세 폼'],
    ['@fixture:/fixtures/statistics?fixture=',                           '팀 경기 통계 (xG 포함)'],
    ['@fixture:/fixtures/events?fixture=',                               '득점·카드·교체 — 타임라인'],
    ['@fixture:/fixtures/lineups?fixture=',                              '라인업·포메이션·벤치'],
    ['@fixture:/fixtures/players?fixture=',                              '선수별 경기 통계'],
    ['@fixture:/predictions?fixture=',                                   '승부 예측·확률'],
    ['@fixture:/injuries?fixture=',                                      '경기별 결장자'],
    [`/fixtures/headtohead?h2h=${TEAM}-40&last=5`,                       '맞대결 기록'],
  ]],
  ['선수', [
    [`/players?league=${LEAGUE}&season=${SEASON}&page=1`,                '선수 시즌 통계 (페이지네이션)', r => { ctx.playerId = r.response?.[0]?.player?.id }],
    [`/players/squads?team=${TEAM}`,                                     '스쿼드 스냅샷 — diff 대상'],
    ['/players/seasons',                                                 '선수 통계 제공 시즌'],
    ['@player:/players/profiles?player=',                                '선수 프로필'],
    ['@player:/players/teams?player=',                                   '선수 소속팀 이력'],
    ['@player:/trophies?player=',                                        '선수 수상 이력'],
    ['@player:/sidelined?player=',                                       '선수 결장 이력'],
    ['@player:/transfers?player=',                                       '선수 이적 이력'],
    [`/injuries?league=${LEAGUE}&season=${SEASON}`,                      '부상자 명단'],
    ['@coach:/trophies?coach=',                                          '감독 수상 이력'],
    ['@coach:/sidelined?coach=',                                         '감독 결장 이력'],
  ]],
  ['선수 이력 · 과거 데이터 깊이', [
    ['@player:/players/seasons?player=',                                 '이 선수의 통계 보유 시즌 전량'],
    ['@player:/players/teams?player=',                                   '전 소속팀 목록 + 팀별 시즌'],
    [`/players?league=${LEAGUE}&season=2020&page=1`,                     '6년 전 선수 통계 — 실제로 오는가'],
    [`/players?league=${LEAGUE}&season=2015&page=1`,                     '11년 전 선수 통계'],
    [`/standings?league=${LEAGUE}&season=2010`,                          '16년 전 순위표'],
    [`/fixtures?league=${LEAGUE}&season=2010&last=1`,                    '16년 전 경기'],
    [`/transfers?team=${TEAM}&season=2015`,                              '과거 이적 이력'],
  ]],
  ['랭킹', [
    [`/players/topscorers?league=${LEAGUE}&season=${SEASON}`,            '득점 — 대회당 1콜'],
    [`/players/topassists?league=${LEAGUE}&season=${SEASON}`,            '도움'],
    [`/players/topyellowcards?league=${LEAGUE}&season=${SEASON}`,        '경고'],
    [`/players/topredcards?league=${LEAGUE}&season=${SEASON}`,           '퇴장'],
  ]],
  ['배당 (사용 계획 없음 — 플랜 포함 여부만)', [
    ['/odds/bookmakers',                                                 '북메이커'],
    ['/odds/bets',                                                       '베팅 종류'],
    [`/odds?league=${LEAGUE}&season=${SEASON}&page=1`,                   '사전 배당'],
    [`/odds/mapping`,                                                    '배당 제공 경기 매핑'],
    ['/odds/live',                                                       '실시간 배당'],
    ['/odds/live/bets',                                                  '실시간 베팅 종류'],
  ]],
]

const results = []

async function probe(rawPath, why, after) {
  let path = rawPath
  for (const [tag, id] of [['@fixture:', ctx.fixtureId], ['@player:', ctx.playerId], ['@coach:', ctx.coachId]]) {
    if (path.startsWith(tag)) {
      if (!id) { console.log(`${C.y}[SKIP]${C.x} ${rawPath} — id 미확보`); return }
      path = path.slice(tag.length) + id
    }
  }

  const endpoint = path.split('?')[0]
  const label    = path.length > 46 ? path.slice(0, 45) + '…' : path
  const { fail, json } = await get(path)

  if (fail) {
    console.log(`${C.r}[ERR ]${C.x} ${label.padEnd(46)} ${fail.slice(0, 60)}`)
    results.push({ endpoint, path, why, ok: false, error: fail, count: 0, keys: [], enums: {}, nulls: [] })
    return
  }

  const resp    = json.response
  const isArr   = Array.isArray(resp)
  // ★ v1 버그: results:0 이어도 response 가 객체면 데이터가 있다 (/status)
  const count   = isArr ? resp.length : (resp && typeof resp === 'object' ? 1 : 0)
  const keys    = [...collectKeys(resp, '', new Map())].map(([k, t]) => `${k}:${t}`).sort()
  const enums   = Object.fromEntries([...collectEnums(resp, '', new Map())].map(([k, s]) => [k, [...s].sort()]))
  const nulls   = [...collectNulls(resp, '', new Set())].sort()
  const sample  = isArr ? resp[0] ?? null : resp ?? null

  const tag = count === 0 ? `${C.y}[0건 ]${C.x}` : `${C.g}[OK  ]${C.x}`
  console.log(`${tag} ${label.padEnd(46)} ${String(json.results ?? count).padStart(5)}건 · 키 ${String(keys.length).padStart(3)}`)
  results.push({
    endpoint, path, why, ok: true,
    count, apiResults: json.results ?? null, paging: json.paging ?? null,
    keys, enums, nulls, sample,
  })
  if (after) after(json)
}

/** 6대회 커버리지 — v1이 안 본 것 */
async function coverage() {
  console.log(`\n${C.b}── 6대회 커버리지 (시즌 ${SEASON}) ${'─'.repeat(24)}${C.x}`)
  const rows = []
  for (const [id, name] of COMPETITIONS) {
    const { fail, json } = await get(`/leagues?id=${id}&season=${SEASON}`)
    if (fail) { console.log(`${C.r}[ERR ]${C.x} ${name} — ${fail.slice(0,50)}`); rows.push({ id, name, ok: false, error: fail }); continue }
    const s = json.response?.[0]?.seasons?.[0]
    if (!s) { console.log(`${C.y}[없음]${C.x} ${name} — 시즌 ${SEASON} 미제공`); rows.push({ id, name, ok: false, error: `season ${SEASON} 없음` }); continue }
    const c = s.coverage ?? {}
    const flat = {
      fixtures_events:  c.fixtures?.events,
      fixtures_lineups: c.fixtures?.lineups,
      stats_fixtures:   c.fixtures?.statistics_fixtures,
      stats_players:    c.fixtures?.statistics_players,
      standings: c.standings, players: c.players, top_scorers: c.top_scorers,
      top_assists: c.top_assists, top_cards: c.top_cards,
      injuries: c.injuries, predictions: c.predictions, odds: c.odds,
    }
    const off = Object.entries(flat).filter(([, v]) => v === false).map(([k]) => k)
    console.log(`${off.length ? C.y + '[일부]' : C.g + '[전체]'}${C.x} ${name.padEnd(16)} ${s.start}~${s.end}${off.length ? ' · 미제공: ' + off.join(', ') : ''}`)
    rows.push({ id, name, ok: true, start: s.start, end: s.end, current: s.current, coverage: flat, missing: off })
  }
  return rows
}

/** 국가별 컵 대회 탐색 — FA컵·카라바오컵·코파델레이 등. ID가 문서에 없어서 조회로 찾는다 */
async function cups() {
  console.log(`\n${C.b}── 컵 대회 탐색 (시즌 ${SEASON}) ${'─'.repeat(26)}${C.x}`)
  const found = []
  for (const country of CUP_COUNTRIES) {
    const { fail, json } = await get(`/leagues?country=${encodeURIComponent(country)}&season=${SEASON}&type=cup`)
    if (fail) { console.log(`${C.r}[ERR ]${C.x} ${country} — ${fail.slice(0, 50)}`); continue }
    const list = json.response ?? []
    if (!list.length) { console.log(`${C.y}[없음]${C.x} ${country} — 시즌 ${SEASON} 컵 대회 0건`); continue }
    console.log(`${C.b}${country}${C.x} — ${list.length}개`)
    for (const item of list) {
      const s0 = item.seasons?.[0]
      const c  = s0?.coverage ?? {}
      const flat = {
        fixtures_events:  c.fixtures?.events,
        fixtures_lineups: c.fixtures?.lineups,
        stats_fixtures:   c.fixtures?.statistics_fixtures,
        stats_players:    c.fixtures?.statistics_players,
        standings: c.standings, players: c.players, top_scorers: c.top_scorers,
        top_assists: c.top_assists, top_cards: c.top_cards,
        injuries: c.injuries, predictions: c.predictions, odds: c.odds,
      }
      const off = Object.entries(flat).filter(([, v]) => v === false).map(([k]) => k)
      console.log(`  ${String(item.league.id).padStart(4)}  ${item.league.name.padEnd(34)} ${s0?.start ?? '?'}~${s0?.end ?? '?'}${off.length ? ` ${C.y}미제공: ${off.join(', ')}${C.x}` : ` ${C.g}전체 제공${C.x}`}`)
      found.push({ country, id: item.league.id, name: item.league.name, logo: item.league.logo,
                   start: s0?.start, end: s0?.end, current: s0?.current, coverage: flat, missing: off })
    }
  }
  return found
}

/** 내 키가 주는 대회 전부 — 리그·컵 구분 없이 시즌 기준 전량 조회 */
async function catalog() {
  console.log(`\n${C.b}── 전체 대회 카탈로그 (시즌 ${SEASON}) ${'─'.repeat(20)}${C.x}`)
  const { fail, json } = await get(`/leagues?season=${SEASON}`)
  if (fail) { console.log(`${C.r}[ERR ]${C.x} ${fail.slice(0, 60)}`); return [] }
  const rows = (json.response ?? []).map(item => {
    const s0 = item.seasons?.[0]
    const c  = s0?.coverage ?? {}
    const flat = {
      fixtures_events:  c.fixtures?.events,
      fixtures_lineups: c.fixtures?.lineups,
      stats_fixtures:   c.fixtures?.statistics_fixtures,
      stats_players:    c.fixtures?.statistics_players,
      standings: c.standings, players: c.players, top_scorers: c.top_scorers,
      top_assists: c.top_assists, top_cards: c.top_cards,
      injuries: c.injuries, predictions: c.predictions, odds: c.odds,
    }
    const on = Object.values(flat).filter(Boolean).length
    return {
      id: item.league.id, name: item.league.name, type: item.league.type,
      country: item.country?.name, code: item.country?.code,
      start: s0?.start, end: s0?.end, current: s0?.current,
      coverage: flat, coverageScore: on,
      missing: Object.entries(flat).filter(([, v]) => v === false).map(([k]) => k),
    }
  })

  const byCountry = new Map()
  for (const r of rows) byCountry.set(r.country, (byCountry.get(r.country) ?? 0) + 1)
  const full = rows.filter(r => r.coverageScore === 12)
  console.log(`전체 ${rows.length}개 대회 · ${byCountry.size}개 국가`)
  console.log(`  리그 ${rows.filter(r => r.type === 'League').length} · 컵 ${rows.filter(r => r.type === 'Cup').length}`)
  console.log(`  ${C.g}12개 항목 전부 제공: ${full.length}개${C.x}`)
  const top = [...byCountry.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8)
  console.log(`  ${C.d}상위 국가: ${top.map(([k, v]) => `${k} ${v}`).join(' · ')}${C.x}`)
  return rows
}

/** 대회별 과거 시즌 깊이 — 시즌 파라미터 없이 부르면 전 시즌 커버리지가 온다 */
async function seasonDepth() {
  console.log(`\n${C.b}── 과거 시즌 깊이 ${'─'.repeat(34)}${C.x}`)
  const rows = []
  for (const [id, name] of COMPETITIONS) {
    const { fail, json } = await get(`/leagues?id=${id}`)
    if (fail) { console.log(`${C.r}[ERR ]${C.x} ${name} — ${fail.slice(0, 50)}`); continue }
    const seasons = json.response?.[0]?.seasons ?? []
    if (!seasons.length) { console.log(`${C.y}[없음]${C.x} ${name}`); continue }

    /** 각 커버리지 항목이 처음 켜지는 시즌 */
    const firstOn = (pick) => {
      const hit = seasons.filter(s => pick(s.coverage)).map(s => s.year).sort((a, b) => a - b)[0]
      return hit ?? null
    }
    const row = {
      id, name,
      seasonCount: seasons.length,
      from: Math.min(...seasons.map(s => s.year)),
      to:   Math.max(...seasons.map(s => s.year)),
      firstStandings:    firstOn(c => c?.standings),
      firstEvents:       firstOn(c => c?.fixtures?.events),
      firstLineups:      firstOn(c => c?.fixtures?.lineups),
      firstStatsFixture: firstOn(c => c?.fixtures?.statistics_fixtures),
      firstStatsPlayer:  firstOn(c => c?.fixtures?.statistics_players),
      firstPlayers:      firstOn(c => c?.players),
      firstInjuries:     firstOn(c => c?.injuries),
      years: seasons.map(s => s.year),
    }
    console.log(`${C.g}[OK  ]${C.x} ${name.padEnd(16)} ${row.seasonCount}시즌 (${row.from}~${row.to})`)
    console.log(`${C.d}       순위 ${row.firstStandings ?? '-'} · 이벤트 ${row.firstEvents ?? '-'} · 라인업 ${row.firstLineups ?? '-'} · 팀통계 ${row.firstStatsFixture ?? '-'} · 선수통계 ${row.firstStatsPlayer ?? '-'} 부터${C.x}`)
    rows.push(row)
  }
  return rows
}

/** 최근 N개 시즌 실측 — 커버리지 플래그가 아니라 실제 응답 건수로 확인한다 */
async function recentSeasons() {
  const years = Array.from({ length: RECENT }, (_, i) => SEASON - (RECENT - 1) + i)
  console.log(`\n${C.b}── 최근 ${RECENT}개 시즌 실측 (${years[0]}~${years.at(-1)}) ${'─'.repeat(16)}${C.x}`)

  const grid = []
  for (const year of years) {
    const row = { year, competitions: {}, primary: {} }

    // 6대회 경기 존재 여부
    for (const [id, name] of COMPETITIONS) {
      const { fail, json } = await get(`/fixtures?league=${id}&season=${year}&last=1`)
      const f = json?.response?.[0]
      row.competitions[name] = fail ? { ok: false, error: fail.slice(0, 40) }
        : { ok: (json.results ?? 0) > 0, lastDate: f?.fixture?.date?.slice(0, 10) ?? null }
    }

    // 주 대회는 항목별로 실제 건수까지
    const P = row.primary
    const one = async (key, path, pick = j => j.results ?? (Array.isArray(j.response) ? j.response.length : 0)) => {
      const { fail, json } = await get(path)
      P[key] = fail ? { ok: false, error: fail.slice(0, 40) } : { ok: true, count: pick(json), json }
      return json
    }

    await one('fixtures',   `/fixtures?league=${LEAGUE}&season=${year}`)
    await one('standings',  `/standings?league=${LEAGUE}&season=${year}`,
              j => j.response?.[0]?.league?.standings?.flat()?.length ?? 0)
    await one('players',    `/players?league=${LEAGUE}&season=${year}&page=1`,
              j => j.paging?.total ? `${j.results}건 / ${j.paging.total}p` : (j.results ?? 0))
    await one('topscorers', `/players/topscorers?league=${LEAGUE}&season=${year}`)

    // 그 시즌 경기 하나를 잡아 경기 단위 데이터 4종 확인
    const fid = P.fixtures?.json?.response?.find(f => f.fixture?.status?.short === 'FT')?.fixture?.id
             ?? P.fixtures?.json?.response?.[0]?.fixture?.id
    if (fid) {
      row.sampleFixture = fid
      await one('fx_statistics', `/fixtures/statistics?fixture=${fid}`)
      await one('fx_players',    `/fixtures/players?fixture=${fid}`)
      await one('fx_lineups',    `/fixtures/lineups?fixture=${fid}`)
      await one('fx_events',     `/fixtures/events?fixture=${fid}`)
    }

    // 원본 json 은 무겁다 — 로그·산출물에서 떼어낸다
    for (const v of Object.values(P)) delete v.json

    const compOk = Object.values(row.competitions).filter(c => c.ok).length
    const fmt = k => P[k] ? (P[k].ok ? String(P[k].count) : 'ERR') : '—'
    console.log(`${C.g}[${year}]${C.x} 대회 ${compOk}/${COMPETITIONS.length} · 경기 ${fmt('fixtures')} · 순위 ${fmt('standings')} · 선수 ${fmt('players')} · 득점 ${fmt('topscorers')}`)
    console.log(`${C.d}        경기#${row.sampleFixture ?? '-'} → 팀통계 ${fmt('fx_statistics')} · 선수통계 ${fmt('fx_players')} · 라인업 ${fmt('fx_lineups')} · 이벤트 ${fmt('fx_events')}${C.x}`)
    grid.push(row)
  }
  return grid
}

async function main() {
  console.log(`${C.b}API-Football 데이터 전수 조사 v2${C.x}  ${C.d}리그 ${LEAGUE} · 시즌 ${SEASON} · 팀 ${TEAM}${C.x}`)

  const cov  = await coverage()
  const cupList = await cups()
  const cat     = await catalog()
  const depth   = await seasonDepth()
  const recent  = await recentSeasons()

  const groupIndex = []
  for (const [group, items] of GROUPS) {
    console.log(`\n${C.b}── ${group} ${'─'.repeat(Math.max(0, 46 - group.length))}${C.x}`)
    const from = results.length
    for (const [path, why, after] of items) await probe(path, why, after)
    groupIndex.push([group, from, results.length])
  }

  mkdirSync(`${ROOT}/docs`, { recursive: true })
  const meta = { probedAt: new Date().toISOString(), league: LEAGUE, season: SEASON, team: TEAM, calls, scriptVersion: 2 }
  writeFileSync(`${ROOT}/docs/api-inventory.json`, JSON.stringify({ meta, coverage: cov, cups: cupList, catalog: cat, seasonDepth: depth, recentSeasons: recent, results }, null, 2), 'utf8')

  const L = []
  L.push('# API-Football — 내 키로 가져올 수 있는 데이터', '')
  L.push(`> 생성: ${meta.probedAt.slice(0, 10)} · \`scripts/probe-api-inventory.mjs\` v2`)
  L.push(`> 기준: 리그 ${LEAGUE} · 시즌 ${SEASON} · 팀 ${TEAM} · 총 ${calls}콜`, '')
  L.push('**근거 범위 —** 각 행의 상태·건수·필드는 실제 응답에서 확인한 값이다.')
  L.push('다만 *어떤 엔드포인트를 두드릴지*는 공식 v3 문서 목록과 대조해 정한 것이며,')
  L.push('문서에 없는 비공개 엔드포인트가 있다면 여기에 나타나지 않는다.', '')
  L.push('전체 키 경로·샘플은 `docs/api-inventory.json`.', '')

  L.push('## 6대회 커버리지', '')
  L.push('| 대회 | 시즌 | 미제공 항목 |')
  L.push('|---|---|---|')
  for (const c of cov) {
    L.push(c.ok
      ? `| ${c.name} (${c.id}) | ${c.start} ~ ${c.end} | ${c.missing.length ? c.missing.join(', ') : '없음 — 전체 제공'} |`
      : `| ${c.name} (${c.id}) | ❌ | ${c.error} |`)
  }
  L.push('')

  L.push('## 컵 대회 — 조회로 찾은 ID와 커버리지', '')
  L.push('> ID가 공개 문서에 없어 `/leagues?country=X&type=cup`으로 직접 조회한 결과다.', '')
  if (cupList.length) {
    L.push('| 국가 | ID | 대회 | 시즌 | 미제공 항목 |')
    L.push('|---|---|---|---|---|')
    for (const c of cupList) {
      L.push(`| ${c.country} | \`${c.id}\` | ${c.name} | ${c.start ?? '?'} ~ ${c.end ?? '?'} | ${c.missing.length ? c.missing.join(', ') : '없음 — 전체 제공'} |`)
    }
  } else {
    L.push('조회된 컵 대회가 없다.')
  }
  L.push('')

  L.push(`## 최근 ${RECENT}개 시즌 실측`, '')
  L.push('> 커버리지 플래그가 아니라 **실제 응답 건수**다. 플래그가 켜져 있어도 데이터가 없을 수 있다.', '')
  if (recent.length) {
    L.push('### 대회별 경기 존재 여부', '')
    L.push(`| 시즌 | ${COMPETITIONS.map(([, n]) => n).join(' | ')} |`)
    L.push(`|---|${COMPETITIONS.map(() => '---').join('|')}|`)
    for (const r of recent) {
      const cells = COMPETITIONS.map(([, n]) => {
        const c = r.competitions[n]
        return !c ? '—' : c.ok === false && c.error ? `❌` : c.ok ? `✅ ${c.lastDate ?? ''}` : '⚠ 0건'
      })
      L.push(`| **${r.year}** | ${cells.join(' | ')} |`)
    }
    L.push('')

    const COLS = [['fixtures','경기'],['standings','순위 행'],['players','선수'],['topscorers','득점랭킹'],
                  ['fx_statistics','팀 경기통계'],['fx_players','선수 경기통계'],['fx_lineups','라인업'],['fx_events','이벤트']]
    L.push(`### 주 대회(리그 ${LEAGUE}) 항목별 실측 건수`, '')
    L.push(`| 시즌 | ${COLS.map(([, l]) => l).join(' | ')} | 표본 경기 |`)
    L.push(`|---|${COLS.map(() => '---').join('|')}|---|`)
    for (const r of recent) {
      const cells = COLS.map(([k]) => { const v = r.primary[k]; return !v ? '—' : v.ok ? String(v.count) : `❌ ${v.error}` })
      L.push(`| **${r.year}** | ${cells.join(' | ')} | ${r.sampleFixture ?? '—'} |`)
    }
    L.push('')
  }

  L.push('## 과거 시즌 깊이 — 6대회', '')
  L.push('> 각 항목이 **처음 제공되는 시즌**이다. 그 이전 시즌은 경기는 있어도 해당 데이터가 없다.', '')
  if (depth.length) {
    L.push('| 대회 | 시즌 수 | 범위 | 순위 | 이벤트 | 라인업 | 팀통계 | 선수통계 | 부상 |')
    L.push('|---|---|---|---|---|---|---|---|---|')
    for (const d of depth) {
      L.push(`| ${d.name} | ${d.seasonCount} | ${d.from}~${d.to} | ${d.firstStandings ?? '—'} | ${d.firstEvents ?? '—'} | ${d.firstLineups ?? '—'} | ${d.firstStatsFixture ?? '—'} | ${d.firstStatsPlayer ?? '—'} | ${d.firstInjuries ?? '—'} |`)
    }
    L.push('')
    for (const d of depth) L.push(`- **${d.name}** 제공 시즌: ${d.years.sort((a,b)=>a-b).join(', ')}`)
    L.push('')
  }

  L.push('## 전체 대회 카탈로그', '')
  if (cat.length) {
    const byCountry = new Map()
    for (const r of cat) byCountry.set(r.country, (byCountry.get(r.country) ?? 0) + 1)
    L.push(`시즌 ${SEASON} 기준 **${cat.length}개 대회 · ${byCountry.size}개 국가**`)
    L.push(`(리그 ${cat.filter(r => r.type === 'League').length} · 컵 ${cat.filter(r => r.type === 'Cup').length})`, '')
    L.push(`12개 커버리지 항목을 전부 제공하는 대회: **${cat.filter(r => r.coverageScore === 12).length}개**`, '')
    L.push('국가별 대회 수 상위 20:', '')
    L.push('| 국가 | 대회 수 |'); L.push('|---|---|')
    for (const [k, v] of [...byCountry.entries()].sort((a, b) => b[1] - a[1]).slice(0, 20)) L.push(`| ${k} | ${v} |`)
    L.push('', '전체 목록(ID·커버리지 포함)은 `docs/api-inventory.json`의 `catalog` 키에 있다.', '')
  }

  const okN = results.filter(r => r.ok && r.count > 0).length
  const zeroN = results.filter(r => r.ok && r.count === 0).length
  const errN = results.filter(r => !r.ok).length
  L.push(`## 엔드포인트 요약 — 데이터 확인 ${okN} · 0건 ${zeroN} · 실패 ${errN}`, '')

  for (const [group, from, to] of groupIndex) {
    L.push(`## ${group}`, '')
    L.push('| 요청 | 상태 | 건수 | 키 | 쓸 곳 |')
    L.push('|---|---|---|---|---|')
    for (const r of results.slice(from, to)) {
      const st = !r.ok ? `❌ ${r.error.slice(0, 70)}` : r.count === 0 ? '⚠ 0건' : '✅'
      L.push(`| \`${r.path}\` | ${st} | ${r.apiResults ?? r.count} | ${r.keys.length} | ${r.why} |`)
    }
    L.push('')
  }

  L.push('## 엔드포인트별 최상위 필드', '')
  for (const r of results) {
    if (!r.ok || r.count === 0) continue
    const top = r.keys.map(k => k.split(':')[0]).filter(k => !k.includes('.') && !k.includes('['))
    if (top.length) L.push(`### \`${r.endpoint}\``, '', '```', top.join(' · '), '```', '')
  }

  const withEnums = results.filter(r => r.ok && Object.keys(r.enums).length)
  if (withEnums.length) {
    L.push('## 지표·유형 목록 (배열 안의 `type` 값)', '')
    for (const r of withEnums) {
      L.push(`### \`${r.endpoint}\``, '')
      for (const [k, vs] of Object.entries(r.enums)) L.push(`- \`${k}\` (${vs.length}종) — ${vs.join(' · ')}`)
      L.push('')
    }
  }

  const withNulls = results.filter(r => r.ok && r.nulls.length)
  if (withNulls.length) {
    L.push('## null 로 온 필드 — 정규화 계층에서 판단할 자리', '')
    L.push('> 0을 뜻하는 null과 "값 없음"을 뜻하는 null이 섞여 있다. `DATA_RULES.md` 3장 규칙 참조.', '')
    for (const r of withNulls) L.push(`- \`${r.endpoint}\` — ${r.nulls.join(', ')}`)
    L.push('')
  }

  writeFileSync(`${ROOT}/docs/API_INVENTORY.md`, L.join('\n'), 'utf8')

  // ── 전체 필드 문서 (읽을 수 있는 형태로 키 경로 전량) ──────
  const F = []
  F.push('# API-Football — 엔드포인트별 전체 필드', '')
  F.push(`> 생성: ${meta.probedAt.slice(0, 10)} · \`scripts/probe-api-inventory.mjs\` v2`)
  F.push('> 응답에서 실제로 관측된 키 경로 전량. `[]`는 배열, `:뒤`는 값 타입.')
  F.push('> 배열은 요소 8개까지 병합해 훑었으므로, 드물게 나타나는 필드는 빠질 수 있다.', '')
  for (const r of results) {
    if (!r.ok || r.count === 0) continue
    F.push(`## \`${r.path}\``, '', `${r.why} · ${r.apiResults ?? r.count}건 · 키 ${r.keys.length}개`, '')
    F.push('```')
    for (const k of r.keys) F.push(k)
    F.push('```', '')
    const en = Object.entries(r.enums)
    if (en.length) {
      F.push('**유형 값:**', '')
      for (const [k, vs] of en) F.push(`- \`${k}\` (${vs.length}종) — ${vs.join(' · ')}`)
      F.push('')
    }
    if (r.nulls.length) F.push(`**null 로 온 필드:** ${r.nulls.map(n => `\`${n}\``).join(', ')}`, '')
  }
  writeFileSync(`${ROOT}/docs/API_FIELDS_FULL.md`, F.join('\n'), 'utf8')
  console.log(`\n${C.b}완료 — ${calls}콜${C.x}`)
  console.log('  docs/API_INVENTORY.md    (읽는 목록)')
  console.log('  docs/API_FIELDS_FULL.md  (엔드포인트별 전체 필드)')
  console.log('  docs/api-inventory.json  (기계용 — 카탈로그·샘플 포함)')
}

main().catch(e => { console.error(e); process.exit(1) })
