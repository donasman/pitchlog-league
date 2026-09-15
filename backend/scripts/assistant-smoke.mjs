#!/usr/bin/env node
/**
 * 실 Gemini 키로 어시스턴트 스모크. 네트워크 e2e 로는 못 잡는 환각을 잡는다.
 *
 * 실행:
 *   npm run smoke:assistant                  # backend/.env 의 GEMINI_API_KEY 사용, 기본 5건 (c5·c6·c3·c1·c15)
 *   node scripts/assistant-smoke.mjs --all   # golden.json 전체 실행
 *
 * 키가 없으면 SKIP · exit 0. 있으면:
 *   1. 앱을 booted context 로 띄운다 (HTTP 안 뜬다). GeminiService 를 직접 부른다.
 *   2. 기본은 5건, --all 이면 golden.json 전부 · 각각 gemini.ask(question) 호출.
 *   3. 판정을 hard/soft 로 나눈다 (D6). 근본 원칙: 답변 내용의 옳고 그름은 hard(exit code 반영) ·
 *      도구 호출 횟수는 soft(경고만). LLM 이 도구 호출 여부에 비결정적이라 evidence.length 는 실행마다
 *      다르다 — knownFail 로 덮으면 면제 목록이 계속 늘어 golden 이 무의미해진다.
 *
 *   hard 판정 (fail 시 exit 1 반영):
 *     - answer 빈 문자열·공백 (기본 검사)
 *     - expected.answerMustContain / NotContain / NotReferencePastMatch 위반
 *     - 환각 검사(extractNumbers) 위반
 *     - evidence[i].tool 이 registry 에 없음 (존재하지 않는 도구 참조)
 *     - tool:null 인데 답에 숫자 등장 (환각)
 *     - tool!==null 인데 data.length===0 (답할 자료 자체 없음)
 *
 *   soft 판정 (경고만 · exit code 미반영 · halluc 컬럼 'soft-warn'):
 *     - tool:null 인데 evidence.length>0 (LLM 이 헛호출 · 답변만 옳으면 됨)
 *     - tool!==null 인데 evidence.length===0 (LLM 이 도구 안 부르고 답변 · 옳으면 됨)
 *     - timeout / rate_limited (인프라 성격 · LLM 비결정)
 *
 *   knownFail 필드(c18): 결정적 버그로 알려진 실패는 exit code 에서 격리 · 표에 'known-fail'.
 *   고쳐졌으면(pass) 'resolved' 로 경고 (낡은 면제 방지).
 *
 *   결과 표 stdout · hard-fail 하나라도 있으면 exit 1. rate_limited 만 있으면 exit 2 (검증 불가).
 *
 * dist/cli/ 를 안 태우고 tsc 없이 돈다 — @nestjs/core 의 loader 는 이미 loader hooks 없이도 .js 를
 * import 할 수 있게 dist 를 미리 빌드해 두어야 한다.
 * 그래서 시작 전에 nest build 한 번 돌려 dist 를 만든 뒤 dist/ 를 import 한다.
 */
import { execSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { config as loadEnv } from 'dotenv'

const BACKEND_DIR = resolve(dirname(fileURLToPath(import.meta.url)), '..')
loadEnv({ path: resolve(BACKEND_DIR, '.env.local') })
loadEnv({ path: resolve(BACKEND_DIR, '.env') })

if (!process.env.GEMINI_API_KEY) {
  console.log('SKIP: GEMINI_API_KEY 없음 — backend/.env 에 GEMINI_API_KEY 를 넣고 재실행')
  process.exit(0)
}

// dist/ 를 준비한다 (import 전에)
console.log('[smoke] nest build (dist/ 준비)')
try {
  execSync('nest build', { cwd: BACKEND_DIR, stdio: 'inherit' })
} catch (cause) {
  console.error('[smoke] nest build 실패:', cause.message)
  process.exit(1)
}

const { NestFactory } = await import('@nestjs/core')
const { AppModule } = await import(pathToFileURL(resolve(BACKEND_DIR, 'dist/app.module.js')).href)
const { GeminiService } = await import(pathToFileURL(resolve(BACKEND_DIR, 'dist/assistant/gemini.service.js')).href)
const { AssistantToolRegistry } = await import(pathToFileURL(resolve(BACKEND_DIR, 'dist/assistant/assistant-tool.registry.js')).href)

const golden = JSON.parse(readFileSync(resolve(BACKEND_DIR, 'src/assistant/golden.json'), 'utf8'))
/** @type {Array<{id:string, question:string, tool:string|null, args?:object, reason?:string}>} */
const cases = golden.cases

// --all: 전체 케이스 · 없으면 기본 5건. 시작 배너에 모드 표기.
const RUN_ALL = process.argv.includes('--all')
const PICK_IDS = ['c5', 'c6', 'c3', 'c1', 'c15']
// --all 을 제외한 나머지 인자가 있으면 그 id 들을 쓴다 (c18·c22 단건 실행용)
const explicitIds = process.argv.slice(2).filter((a) => a !== '--all')
const targetIds = RUN_ALL ? null : explicitIds.length > 0 ? explicitIds : PICK_IDS
const picked = targetIds === null
  ? cases
  : targetIds.map((id) => {
      const c = cases.find((x) => x.id === id)
      if (!c) throw new Error(`golden.json 에 ${id} 가 없다`)
      return c
    })
console.log(`[smoke] 모드 ${RUN_ALL ? '[all]' : explicitIds.length > 0 ? `[ids:${explicitIds.join(',')}]` : '[pick]'} · ${picked.length}건 실행`)

// 숫자 정규식 — 4자리 연도(1900~2099) 와 YYYY-MM-DD 안의 부분은 뽑지 않는다
/**
 * @param {string} text
 * @returns {string[]}
 */
function extractNumbers(text) {
  // 먼저 연도·날짜 후보를 지운다
  const cleaned = text
    .replace(/\b(19|20)\d{2}-\d{2}-\d{2}\b/g, ' ')
    .replace(/\b(19|20)\d{2}\b/g, ' ')
  const matches = cleaned.match(/\d+/g) ?? []
  return matches
}

/**
 * golden.json 의 `expected` 필드 검사. 통과면 null, 실패면 사유 문자열.
 *
 *   answerMustContain:      needle 배열 · 전부 포함해야 함
 *   answerMustNotContain:   needle 배열 · 하나라도 포함하면 실패
 *   answerMustNotReferencePastMatch:
 *     답에서 "N월 M일" 을 뽑아 KST 오늘 기준으로 본다. 전부 과거이면 실패.
 *     연말/연초 격차(오늘로부터 30일 초과) 는 미래로 취급한다 — "12월 15일" 을 1월에 물으면 지난해가 아니다.
 *     날짜 언급이 아예 없는 답변은 통과 (모델이 "확정되지 않았다" 라고 말하는 경우).
 *
 * @param {{ answerMustContain?: string[], answerMustNotContain?: string[], answerMustNotReferencePastMatch?: boolean } | undefined} expected
 * @param {string} answer
 * @returns {string | null}
 */
function checkExpected(expected, answer) {
  if (!expected) return null
  for (const needle of expected.answerMustContain ?? []) {
    if (!answer.includes(needle)) return `missing needle: "${needle}"`
  }
  for (const needle of expected.answerMustNotContain ?? []) {
    if (answer.includes(needle)) return `forbidden needle: "${needle}"`
  }
  if (expected.answerMustNotReferencePastMatch) {
    const fmt = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Seoul',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    })
    const parts = fmt.formatToParts(new Date())
    const y = +parts.find((p) => p.type === 'year').value
    const m = +parts.find((p) => p.type === 'month').value
    const d = +parts.find((p) => p.type === 'day').value
    const todayKst = Date.UTC(y, m - 1, d)
    const dateRe = /(\d{1,2})월\s*(\d{1,2})일/g
    const dates = [...answer.matchAll(dateRe)]
    if (dates.length > 0) {
      const hasFutureOrToday = dates.some(([, mm, dd]) => {
        const cand = Date.UTC(y, +mm - 1, +dd)
        const diffDays = (todayKst - cand) / 86400000
        if (diffDays > 30) return true // 연말/연초 격차 = 미래 취급
        return cand >= todayKst
      })
      if (!hasFutureOrToday) return 'all extracted (월,일) are past'
    }
  }
  return null
}

const app = await NestFactory.createApplicationContext(AppModule, { logger: ['warn', 'error'] })
try {
  const gemini = app.get(GeminiService)
  const registry = app.get(AssistantToolRegistry)
  const toolNames = new Set(registry.getAll().map((t) => t.name))

  /** @type {Array<{id:string, question:string, tool:string, evidenceCount:number, dataCount:number, halluc:string, softWarn:string, snippet:string, req:number|null}>} */
  const rows = []
  let anyFail = false
  // 무료 등급 한도로 못 돈 건은 '실패' 가 아니라 '검증 불가' 다 — 종료 코드를 나눈다
  let quotaFail = 0
  // E2 계측 — generateContent SDK 호출 총 합계와 계측 성공 여부.
  // 이 스모크는 HTTP 컨트롤러를 안 타고 GeminiService 를 직접 부르므로 X-Gemini-Requests 헤더 대신
  // AskResult.geminiRequests 를 그대로 읽는다 (같은 카운터 · 게이트 무관).
  // 예외(rate_limited 등) 로 result 자체가 없으면 미계측으로 취급 · 총계에 안 셈.
  let totalRequests = 0
  let hasMeasurement = false

  // 무료 등급은 분당 요청 수가 작고(한 질문이 모델 호출 2~3회를 쓴다), 모델이 혼잡하면 503 이 온다.
  // 간격을 두고 두 번까지 다시 시도한다 — 일시적 혼잡을 실패로 기록하지 않기 위해 (2026-09-09 실측).
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
  const RETRYABLE = /rate_limited|model_error|empty_response/
  let first = true

  for (const c of picked) {
    if (!first) await sleep(8000)
    first = false
    process.stdout.write(`[smoke] ${c.id} "${c.question}" ...\n`)
    let result
    let lastErr
    for (let attempt = 0; attempt < 3; attempt++) {
      if (attempt > 0) {
        process.stdout.write(`  … 재시도 ${attempt} (${lastErr.message})\n`)
        await sleep(20000 * attempt)
      }
      try {
        result = await gemini.ask(c.question)
        // 빈 응답(도구 호출은 있었어도 최종 텍스트가 없는 경우 포함) 은 모델 쪽 일시 현상이다 —
        // 예외가 아니라 값으로 오므로 여기서 재시도한다. evidence 유무는 안 본다 (MAX_TOOL_CALLS 상한 도달
        // 뒤 text part 없이 끝나는 케이스 c1·c18 이 있어서, evidence>0 조건이면 재시도 자체가 안 걸린다).
        if ((!result.answer || result.answer.trim() === '') && attempt < 2) {
          lastErr = new Error('empty_response')
          continue
        }
        lastErr = undefined
        break
      } catch (err) {
        lastErr = err
        if (!RETRYABLE.test(err.message)) break
      }
    }
    // 각 케이스마다 로컬 hard/soft 를 나눠 모은다.
    //   hasHardFail  : exit code 에 반영되는 실패 (답변 내용 · 환각 · 빈 답 · 존재하지 않는 도구 참조)
    //   softWarnings : 경고만 남기고 exit code 안 셈 (도구 호출 횟수 불일치 · LLM 비결정)
    // knownFail 있으면 hard-fail 이라도 exit code 에서 격리한다.
    let hasHardFail = false
    /** @type {string[]} */
    const softWarnings = []
    if (lastErr) {
      // rate_limited 는 무료 등급 한도 → 검증 불가 (exit 2 로 분리).
      // 그 외 예외(timeout · empty_response 재시도 소진 등) 는 인프라·LLM 비결정 → soft.
      if (/rate_limited/.test(lastErr.message)) {
        console.error(`  QUOTA: ask() 예외 — ${lastErr.message}`)
        quotaFail += 1
      } else {
        console.warn(`  SOFT: ask() 예외 (인프라·LLM 비결정) — ${lastErr.message}`)
        softWarnings.push(`ask() 예외: ${lastErr.message}`)
      }
      rows.push({
        id: c.id,
        question: c.question,
        tool: 'ERR',
        evidenceCount: 0,
        dataCount: 0,
        halluc: 'n/a',
        softWarn: softWarnings.join(' · '),
        snippet: lastErr.message.slice(0, 80),
        req: null,
      })
      continue
    }

    // 계측 값 수집 — 이 스모크는 서비스 직접 호출이라 result.geminiRequests 가 곧 컨트롤러가 헤더로 낼 값과 같다.
    const caseRequests = typeof result.geminiRequests === 'number' ? result.geminiRequests : null
    if (caseRequests !== null) {
      totalRequests += caseRequests
      hasMeasurement = true
    }
    const evidenceCount = result.evidence.length
    const dataCount = result.data.length
    let hallucStatus = 'n/a'

    // 모든 케이스 공통 — 빈 답(공백만 포함) 은 곧바로 hard-fail. answerMustNotContain 은 빈 문자열에 항상 참이라
    // 부정 검사만 있는 케이스(c18·c20) 가 빈 답으로 통과하는 것을 막는다.
    const answer = result.answer ?? ''
    if (!answer || answer.trim() === '') {
      console.error(`  FAIL: answer is empty or whitespace only`)
      hasHardFail = true
      hallucStatus = 'FAIL'
      if (c.knownFail) {
        console.warn(`  KNOWN-FAIL: ${c.knownFail}`)
        hallucStatus = 'known-fail'
      } else {
        anyFail = true
      }
      rows.push({
        id: c.id,
        question: c.question,
        tool: c.tool ?? '(null)',
        evidenceCount,
        dataCount,
        halluc: hallucStatus,
        softWarn: '',
        snippet: '(empty)',
        req: caseRequests,
      })
      continue
    }

    if (c.tool === null) {
      // tool:null 케이스 — 모두 soft (LLM 비결정성 인정)
      //   soft: evidence.length > 0 (LLM 이 헛호출 · 답변만 옳으면 됨)
      //   soft: 답에서 숫자 등장 — 완벽한 환각은 여기서 실질적으로 거의 안 생기고
      //         (예: "6대 리그를 다룹니다" 같은 서비스 메타데이터 부연) LLM 이 실행마다
      //         이 부연을 붙일지 여부가 달라져 flaky. 진짜 환각은 called 케이스에서 잡힘.
      if (evidenceCount !== 0) {
        const msg = `tool 기대 (null) · 실제 ${evidenceCount}회 · answer 는 규칙 준수 (soft)`
        console.warn(`  SOFT: ${msg}`)
        softWarnings.push(msg)
      }
      const nums = extractNumbers(answer)
      if (nums.length > 0) {
        const msg = `tool 기대 (null) · 답에 숫자 [${nums.join(', ')}] 등장 · 문맥상 환각 아닐 가능성 · flaky (soft)`
        console.warn(`  SOFT: ${msg}`)
        softWarnings.push(msg)
      }
      // expected 필드는 tool:null 케이스에도 hard — c21 처럼 answerMustNotContain 을 검사한다
      const expectedFail = checkExpected(c.expected, answer)
      if (expectedFail) {
        console.error(`  FAIL: ${expectedFail}`)
        hasHardFail = true
      }
      // hard-fail 없으면 pass · soft 만 있으면 soft-warn
      hallucStatus = hasHardFail ? 'FAIL' : softWarnings.length > 0 ? 'soft-warn' : 'pass'
    } else {
      // 답 가능 케이스
      //   soft: evidence.length === 0 (LLM 이 도구 안 부르고 답변 · 옳으면 됨)
      //   hard: evidence[i].tool 이 registry 에 없음 · data.length === 0
      if (evidenceCount < 1) {
        const msg = `tool 기대 (${c.tool}) · 실제 0회 (soft)`
        console.warn(`  SOFT: ${msg}`)
        softWarnings.push(msg)
      }
      for (const e of result.evidence) {
        if (!toolNames.has(e.tool)) {
          console.error(`  FAIL: evidence.tool='${e.tool}' 가 registry 목록에 없다`)
          hasHardFail = true
        }
      }
      if (dataCount < 1) {
        console.error(`  FAIL: 답 가능 케이스인데 data 0`)
        hasHardFail = true
      }
      // 환각 검사 — 답에서 뽑은 각 숫자가 data JSON 안 문자열로 존재해야 함
      const dataStr = JSON.stringify(result.data)
      // 배열 길이도 정당한 숫자다 — "17개 대회" 처럼 모델이 받은 목록을 센 값은 환각이 아니다
      // (2026-09-09 실측 오탐: data 가 대회 17개 배열인데 "17" 이 값으로는 없어 FAIL 이 났다)
      const counts = new Set()
      const walk = (v) => {
        if (Array.isArray(v)) {
          counts.add(String(v.length))
          v.forEach(walk)
        } else if (v && typeof v === 'object') {
          Object.values(v).forEach(walk)
        }
      }
      walk(result.data)
      const nums = extractNumbers(answer)
      const missing = nums.filter((n) => !dataStr.includes(n) && !counts.has(n))
      if (missing.length > 0) {
        console.error(`  FAIL: 환각 의심 — data 에 없는 숫자 ${missing.join(', ')} 가 답에 등장: "${answer}"`)
        hasHardFail = true
        hallucStatus = 'FAIL'
      } else {
        hallucStatus = softWarnings.length > 0 ? 'soft-warn' : 'pass'
      }
      // expected 필드 — 환각 검사 뒤에 붙는다.
      const expectedFail = checkExpected(c.expected, answer)
      if (expectedFail) {
        console.error(`  FAIL: expected 위반 — ${expectedFail} — "${answer}"`)
        hasHardFail = true
        hallucStatus = 'FAIL'
      }
    }

    // knownFail 격리 — 알려진 hard-fail 은 노란색으로 표시하되 exit code 안 반영.
    // 고쳐졌으면(hard-fail 없는데 knownFail 필드가 남아 있으면) 낡은 면제 경고.
    if (c.knownFail) {
      if (hasHardFail) {
        console.warn(`  KNOWN-FAIL: ${c.knownFail}`)
        hallucStatus = 'known-fail'
        // anyFail 은 안 건드림
      } else {
        console.warn(`  KNOWN-FAIL RESOLVED: 이 케이스가 통과했다. golden.json 에서 knownFail 필드를 삭제하라. 사유: ${c.knownFail}`)
        hallucStatus = 'resolved'
      }
    } else if (hasHardFail) {
      anyFail = true
    }

    rows.push({
      id: c.id,
      question: c.question,
      tool: c.tool ?? '(null)',
      evidenceCount,
      dataCount,
      halluc: hallucStatus,
      softWarn: softWarnings.join(' · '),
      snippet: answer.slice(0, 80).replace(/\n/g, ' '),
      req: caseRequests,
    })
  }

  console.log('\n=== 결과 ===')
  // halluc 컬럼 폭 10 — 'known-fail' 이 가장 길다. pass/FAIL/resolved/soft-warn/n/a 도 여기 들어감.
  // req 컬럼 — 이 케이스가 소비한 generateContent 호출 수 (N/A 는 미계측).
  console.log('id     tool                    ev   data   halluc       req    answer')
  for (const r of rows) {
    const reqCell = r.req === null || r.req === undefined ? 'N/A' : String(r.req)
    console.log(
      `${r.id.padEnd(4)} ${r.tool.padEnd(23)} ${String(r.evidenceCount).padStart(2)}   ${String(r.dataCount).padStart(3)}   ${r.halluc.padEnd(10)}   ${reqCell.padStart(4)}   ${r.snippet}`,
    )
    if (r.softWarn) {
      console.log(`     └ soft: ${r.softWarn}`)
    }
  }

  // 카운트 요약 — soft·knownFail·resolved 는 anyFail 안 셈. hard-fail 만 exit 반영.
  const passCount = rows.filter((r) => r.halluc === 'pass').length
  const softWarnCount = rows.filter((r) => r.halluc === 'soft-warn').length
  const knownFailCount = rows.filter((r) => r.halluc === 'known-fail').length
  const resolvedCount = rows.filter((r) => r.halluc === 'resolved').length
  const hardFailCount = rows.filter((r) => r.halluc === 'FAIL').length
  const naCount = rows.filter((r) => r.halluc === 'n/a').length
  console.log(
    `\n[smoke] ${passCount}건 통과 · ${softWarnCount}건 soft-warn · ${knownFailCount}건 knownFail · ${resolvedCount}건 resolved · ${hardFailCount}건 hard-fail · ${naCount}건 n/a`,
  )
  // E2 계측 — 총 Gemini SDK 호출 수. 미계측(모든 케이스가 예외 등) 이면 실패 아님 · 문구만 다르게.
  const reqStr = hasMeasurement ? `Gemini 요청 ${totalRequests}회` : 'Gemini 요청 미계측'
  console.log(`[smoke] ${reqStr}`)

  if (anyFail) {
    console.error('[smoke] 하나 이상 hard-fail — exit 1')
    process.exit(1)
  }
  if (quotaFail > 0) {
    // 계약 위반이 아니라 무료 등급 한도다. 초록으로 넘기지도, 빨강으로 막지도 않는다.
    console.error(`[smoke] ${quotaFail}건이 무료 등급 한도로 못 돌았다 — 검증 불가 (exit 2). 한도가 회복된 뒤 다시 돌린다`)
    process.exit(2)
  }
  process.exit(0)
} finally {
  await app.close()
}
