#!/usr/bin/env node
/**
 * i18n 회귀 방지 자동화 스크립트
 * 실행: npm run check:i18n
 *
 * 검사 항목:
 *  1. 한국어 문자 검출 (화이트리스트 제외)
 *  2. ko.json / en.json 키 집합 대칭
 *  3. 보간 변수 {{var}} 일치
 *  4. 빈 값 / 키=값 경고 (번역 누락 의심)
 *  5. t() 리터럴 키 → ko.json 존재 확인 (없으면 오류)
 *  6. ko.json 미참조 키 경고 (죽은 키)
 *  7. toKSTTime / toKSTDate / toKSTDateTime locale 인자 누락
 *  8. entityNames 커버리지 (mocks ↔ TEAM_NAMES / PLAYER_NAMES / COMPETITION_NAMES)
 */

import { readFileSync, readdirSync, statSync } from 'fs'
import { join, relative, resolve } from 'path'
import { fileURLToPath, pathToFileURL } from 'url'
import path from 'path'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(__dirname, '..')
const SRC  = join(ROOT, 'src')

// ── ANSI 색상 ──────────────────────────────────────────────────────────────
const RED    = '\x1b[31m'
const GREEN  = '\x1b[32m'
const YELLOW = '\x1b[33m'
const RESET  = '\x1b[0m'

let errors   = 0
let warnings = 0

function fail(msg)  { console.error(`${RED}[ERR]${RESET} ${msg}`);   errors++ }
function warn(msg)  { console.warn(`${YELLOW}[WRN]${RESET} ${msg}`); warnings++ }
function pass(msg)  { console.log(`${GREEN}[OK ]${RESET} ${msg}`) }

// ── 화이트리스트 (한국어 허용) ──────────────────────────────────────────────
// locales:         번역 리소스 파일 자체 (ko.json, en.json)
// mocks:           Mock 데이터 — 고유명사(경기장명 등) 포함 가능
// entityNames.js:  팀·선수·대회 한국어 이름 테이블
// LanguageToggle:  전환 대상 언어를 그 언어 이름으로 표기하는 의도된 동작
const KO_WHITELIST = [
  resolve(SRC, 'locales'),
  resolve(SRC, 'mocks'),
  resolve(SRC, 'i18n', 'entityNames.js'),
  resolve(SRC, 'components', 'layout', 'LanguageToggle.jsx'),
]

function isWhitelisted(absPath) {
  return KO_WHITELIST.some(w => absPath === w || absPath.startsWith(w + path.sep))
}

// ── 파일 수집 ─────────────────────────────────────────────────────────────
function collectFiles(dir, exts = ['.js', '.jsx']) {
  const files = []
  function walk(d) {
    for (const name of readdirSync(d)) {
      const full = join(d, name)
      if (statSync(full).isDirectory()) {
        walk(full)
      } else if (exts.some(e => name.endsWith(e))) {
        files.push(full)
      }
    }
  }
  walk(dir)
  return files
}

// ── 주석 제거 ─────────────────────────────────────────────────────────────
function stripComments(code) {
  code = code.replace(/\/\*[\s\S]*?\*\//g, ' ')  // 블록 주석 및 JSX {/* */}
  code = code.replace(/\/\/.*/g, ' ')             // 라인 주석
  return code
}

// ── JSON 플랫 키 추출 ─────────────────────────────────────────────────────
function flattenKeys(obj, prefix = '') {
  const flat = {}
  for (const [k, v] of Object.entries(obj)) {
    const fullKey = prefix ? `${prefix}.${k}` : k
    if (typeof v === 'string') {
      flat[fullKey] = v
    } else if (v && typeof v === 'object') {
      Object.assign(flat, flattenKeys(v, fullKey))
    }
  }
  return flat
}

// ── 보간 변수 추출 {{var}} ────────────────────────────────────────────────
function extractInterpolations(str) {
  return new Set(str.match(/\{\{[^}]+\}\}/g) ?? [])
}

// ── 메인 ──────────────────────────────────────────────────────────────────
async function main() {
  console.log('\n=== i18n 검사 시작 ===\n')

  const allSrcFiles = collectFiles(SRC)

  // ── 1. 한국어 문자 검출 ─────────────────────────────────────────────
  console.log('1. 한국어 문자 검출 (화이트리스트 제외)')
  let koErrors = 0
  for (const file of allSrcFiles) {
    if (isWhitelisted(file)) continue
    const code    = readFileSync(file, 'utf8')
    const stripped = stripComments(code)
    if (!/[가-힣]/.test(stripped)) continue
    const lines = stripped.split('\n')
    for (let i = 0; i < lines.length; i++) {
      if (/[가-힣]/.test(lines[i])) {
        fail(`${relative(ROOT, file)}:${i + 1} — 한국어 문자: ${lines[i].trim().slice(0, 80)}`)
        koErrors++
      }
    }
  }
  if (koErrors === 0) pass('한국어 문자 없음 (화이트리스트 제외)')

  // ── JSON 로드 ─────────────────────────────────────────────────────
  const koFlat = flattenKeys(JSON.parse(readFileSync(join(SRC, 'locales', 'ko.json'), 'utf8')))
  const enFlat = flattenKeys(JSON.parse(readFileSync(join(SRC, 'locales', 'en.json'), 'utf8')))
  const koKeys = new Set(Object.keys(koFlat))
  const enKeys = new Set(Object.keys(enFlat))

  // ── 2. 키 집합 대칭 ─────────────────────────────────────────────
  console.log('\n2. ko.json / en.json 키 집합 대칭')
  let symErrors = 0
  for (const k of koKeys) if (!enKeys.has(k)) { fail(`ko에만 있음: "${k}"`); symErrors++ }
  for (const k of enKeys) if (!koKeys.has(k)) { fail(`en에만 있음: "${k}"`); symErrors++ }
  if (symErrors === 0) pass('ko / en 키 집합 대칭 정상')

  // ── 3. 보간 변수 일치 ────────────────────────────────────────────
  console.log('\n3. 보간 변수 {{var}} 일치')
  let interpErrors = 0
  for (const k of koKeys) {
    if (!enKeys.has(k)) continue
    const koVars = extractInterpolations(koFlat[k])
    const enVars = extractInterpolations(enFlat[k])
    for (const v of koVars) if (!enVars.has(v)) { fail(`"${k}" ko에만 있는 보간: ${v}`); interpErrors++ }
    for (const v of enVars) if (!koVars.has(v)) { fail(`"${k}" en에만 있는 보간: ${v}`); interpErrors++ }
  }
  if (interpErrors === 0) pass('보간 변수 일치 정상')

  // ── 4. 빈 값 / 키=값 경고 ────────────────────────────────────────
  console.log('\n4. 빈 값 / 키=값 경고')
  let emptyCount = 0
  for (const [k, v] of Object.entries(koFlat)) {
    if (!v)    { warn(`ko.json 빈 값: "${k}"`);           emptyCount++ }
    else if (v === k) { warn(`ko.json 키=값: "${k}"`);   emptyCount++ }
  }
  for (const [k, v] of Object.entries(enFlat)) {
    if (!v)    { warn(`en.json 빈 값: "${k}"`);           emptyCount++ }
    else if (v === k) { warn(`en.json 키=값: "${k}"`);   emptyCount++ }
  }
  if (emptyCount === 0) pass('빈 값 / 키=값 없음')

  // ── 소스 리터럴 수집 ──────────────────────────────────────────────
  // t('key') 패턴과 키 형식 문자열 리터럴('match.live' 등) 을 모두 수집.
  // 동적 맵(STATUS_LABEL_KEYS, ZONE_LABEL_KEY 등)의 값도 여기서 캡처됨.
  const usedKeys = new Set()
  const T_RE   = /\bt\s*\(\s*['"]([a-zA-Z][a-zA-Z0-9_]*(?:\.[a-zA-Z][a-zA-Z0-9_]*)+)['"]/g
  const LIT_RE = /['"]([a-z][a-z0-9]*(?:\.[a-z][a-z0-9_]*)+)['"]/g

  for (const file of allSrcFiles) {
    const code = stripComments(readFileSync(file, 'utf8'))
    let m
    while ((m = T_RE.exec(code))   !== null) usedKeys.add(m[1])
    while ((m = LIT_RE.exec(code)) !== null) {
      if (koKeys.has(m[1])) usedKeys.add(m[1])
    }
  }

  // ── 5. 존재하지 않는 키 호출 ─────────────────────────────────────
  console.log('\n5. 존재하지 않는 i18n 키 호출')
  let missingErrors = 0
  for (const file of allSrcFiles) {
    const code  = stripComments(readFileSync(file, 'utf8'))
    const lines = code.split('\n')
    const rel   = relative(ROOT, file)
    for (let i = 0; i < lines.length; i++) {
      let m
      const re = /\bt\s*\(\s*['"]([a-zA-Z][a-zA-Z0-9_]*(?:\.[a-zA-Z][a-zA-Z0-9_]*)+)['"]/g
      while ((m = re.exec(lines[i])) !== null) {
        if (!koKeys.has(m[1])) {
          fail(`${rel}:${i + 1} — ko.json에 없는 키: "${m[1]}"`)
          missingErrors++
        }
      }
    }
  }
  if (missingErrors === 0) pass('모든 t() 키 존재 확인')

  // ── 6. 미사용 키 경고 (죽은 키) ───────────────────────────────────
  console.log('\n6. 미사용 키 경고 (죽은 키)')
  let deadCount = 0
  for (const k of koKeys) {
    if (!usedKeys.has(k)) {
      warn(`ko.json 미사용: "${k}"`)
      deadCount++
    }
  }
  if (deadCount === 0) pass('미사용 키 없음')

  // ── 7. toKST* locale 인자 누락 ───────────────────────────────────
  console.log('\n7. toKST* locale 인자 누락')
  const TOKST = ['toKSTTime', 'toKSTDate', 'toKSTDateTime']
  let toKSTErrors = 0
  for (const file of allSrcFiles) {
    const stripped = stripComments(readFileSync(file, 'utf8'))
    const lines    = stripped.split('\n')
    const rel      = relative(ROOT, file)
    for (let i = 0; i < lines.length; i++) {
      for (const fn of TOKST) {
        // 함수 정의 줄은 건너뜀
        if (lines[i].includes(`function ${fn}`) || lines[i].includes(`export function ${fn}`)) continue
        const re = new RegExp(`\\b${fn}\\(([^()]+)\\)`, 'g')
        let m
        while ((m = re.exec(lines[i])) !== null) {
          if (!m[1].includes(',')) {
            fail(`${rel}:${i + 1} — ${fn}() locale 인자 없음: ${m[0].trim()}`)
            toKSTErrors++
          }
        }
      }
    }
  }
  if (toKSTErrors === 0) pass('toKST* locale 인자 정상')

  // ── 8. entityNames 커버리지 ───────────────────────────────────────
  console.log('\n8. entityNames 커버리지')
  const base  = join(SRC, 'mocks')
  const toURL = f => pathToFileURL(join(base, f)).href

  const [teamsM, playersM, compsM] = await Promise.all([
    import(toURL('teams.js')),
    import(toURL('players.js')),
    import(toURL('competitions.js')),
  ])
  const entityM = await import(pathToFileURL(join(SRC, 'i18n', 'entityNames.js')).href)

  const TEAM_NAMES        = entityM.TEAM_NAMES        ?? {}
  const PLAYER_NAMES      = entityM.PLAYER_NAMES      ?? {}
  const COMPETITION_NAMES = entityM.COMPETITION_NAMES ?? {}

  const mockTeamIds  = new Set(teamsM.TEAMS.map(t => t.id))
  const mockCompIds  = new Set(compsM.COMPETITIONS.map(c => c.id))
  const mockPlayerIds = new Set(playersM.PLAYERS.map(p => p.id))

  // COMPETITION_SCORERS / COMPETITION_ASSISTERS / TOP_* 의 playerId 도 수집
  const addPlayerIds = list => list?.forEach?.(e => e.playerId && mockPlayerIds.add(e.playerId))
  Object.values(playersM.COMPETITION_SCORERS   ?? {}).forEach(addPlayerIds)
  Object.values(playersM.COMPETITION_ASSISTERS ?? {}).forEach(addPlayerIds)
  addPlayerIds(playersM.TOP_SCORERS_ALL ?? [])
  addPlayerIds(playersM.TOP_SCORERS     ?? [])
  addPlayerIds(playersM.TOP_ASSISTERS   ?? [])

  const etIds = new Set(Object.keys(TEAM_NAMES))
  const epIds = new Set(Object.keys(PLAYER_NAMES))
  const ecIds = new Set(Object.keys(COMPETITION_NAMES))

  let covWarn = 0
  for (const id of mockTeamIds)  if (!etIds.has(id)) { warn(`TEAM_NAMES 누락: "${id}"`);        covWarn++ }
  for (const id of mockCompIds)  if (!ecIds.has(id)) { warn(`COMPETITION_NAMES 누락: "${id}"`); covWarn++ }
  for (const id of mockPlayerIds) if (!epIds.has(id)) { warn(`PLAYER_NAMES 누락: "${id}"`);    covWarn++ }
  for (const id of etIds) if (!mockTeamIds.has(id))  warn(`TEAM_NAMES 죽은 항목: "${id}"`)
  for (const id of ecIds) if (!mockCompIds.has(id))  warn(`COMPETITION_NAMES 죽은 항목: "${id}"`)
  for (const id of epIds) if (!mockPlayerIds.has(id)) warn(`PLAYER_NAMES 죽은 항목: "${id}"`)
  if (covWarn === 0) pass('entityNames 커버리지 정상')
  else pass(`entityNames 커버리지 — 일부 미등록 (위 경고 참조)`)

  // ── 결과 ─────────────────────────────────────────────────────────
  console.log('\n=== 검사 결과 ===')
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
  console.error(RED + '검사 스크립트 오류:' + RESET, e)
  process.exit(1)
})
