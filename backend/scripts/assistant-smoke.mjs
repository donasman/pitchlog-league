#!/usr/bin/env node
/**
 * 실 Gemini 키로 어시스턴트 5건 스모크. 네트워크 e2e 로는 못 잡는 환각을 잡는다.
 *
 * 실행:
 *   npm run smoke:assistant     # backend/.env 의 GEMINI_API_KEY 사용
 *
 * 키가 없으면 SKIP · exit 0. 있으면:
 *   1. 앱을 booted context 로 띄운다 (HTTP 안 뜬다). GeminiService 를 직접 부른다.
 *   2. golden.json 에서 5건 (c5·c6·c3·c1·c15) 을 골라 gemini.ask(question) 호출.
 *   3. 답 가능(c5/c6/c3): evidence.length>=1 · tool 이 registry 에 있음 · data.length>=1 ·
 *      answer 에서 뽑은 숫자가 JSON.stringify(data) 안 문자열로 존재 (환각 pass).
 *   4. tool:null(c1/c15): evidence.length===0 · answer 에서 뽑은 숫자(연도·YYYY-MM-DD 제외) 0개.
 *   5. 결과 표 stdout · 하나라도 fail → exit 1.
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

const PICK_IDS = ['c5', 'c6', 'c3', 'c1', 'c15']
const picked = PICK_IDS.map((id) => {
  const c = cases.find((x) => x.id === id)
  if (!c) throw new Error(`golden.json 에 ${id} 가 없다`)
  return c
})

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

const app = await NestFactory.createApplicationContext(AppModule, { logger: ['warn', 'error'] })
try {
  const gemini = app.get(GeminiService)
  const registry = app.get(AssistantToolRegistry)
  const toolNames = new Set(registry.getAll().map((t) => t.name))

  /** @type {Array<{id:string, question:string, tool:string, evidenceCount:number, dataCount:number, halluc:string, snippet:string}>} */
  const rows = []
  let anyFail = false
  // 무료 등급 한도로 못 돈 건은 '실패' 가 아니라 '검증 불가' 다 — 종료 코드를 나눈다
  let quotaFail = 0

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
        // 빈 응답(도구도 문장도 없음)은 모델 쪽 일시 현상이다 — 예외가 아니라 값으로 오므로 여기서 재시도한다
        if (!result.answer && result.evidence.length === 0 && attempt < 2) {
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
    if (lastErr) {
      console.error(`  FAIL: ask() 예외 — ${lastErr.message}`)
      if (/rate_limited/.test(lastErr.message)) quotaFail += 1
      else anyFail = true
      rows.push({ id: c.id, question: c.question, tool: 'ERR', evidenceCount: 0, dataCount: 0, halluc: 'n/a', snippet: lastErr.message.slice(0, 80) })
      continue
    }

    const evidenceCount = result.evidence.length
    const dataCount = result.data.length
    let hallucStatus = 'n/a'

    if (!result.answer || result.answer.length === 0) {
      console.error(`  FAIL: answer 가 비어 있다`)
      anyFail = true
    }

    if (c.tool === null) {
      // tool:null 은 evidence 0 · 답에서 숫자 0개 (연도·날짜 제외)
      if (evidenceCount !== 0) {
        console.error(`  FAIL: tool:null 인데 evidence.length=${evidenceCount}`)
        anyFail = true
      }
      const nums = extractNumbers(result.answer)
      if (nums.length > 0) {
        console.error(`  FAIL: tool:null 인데 답에 숫자 등장: ${nums.join(', ')} — "${result.answer}"`)
        anyFail = true
      }
      hallucStatus = nums.length === 0 && evidenceCount === 0 ? 'pass' : 'FAIL'
    } else {
      // 답 가능 — evidence 최소 1 · tool 존재 · data 최소 1
      if (evidenceCount < 1) {
        console.error(`  FAIL: 답 가능 케이스인데 evidence 0`)
        anyFail = true
      }
      for (const e of result.evidence) {
        if (!toolNames.has(e.tool)) {
          console.error(`  FAIL: evidence.tool='${e.tool}' 가 registry 목록에 없다`)
          anyFail = true
        }
      }
      if (dataCount < 1) {
        console.error(`  FAIL: 답 가능 케이스인데 data 0`)
        anyFail = true
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
      const nums = extractNumbers(result.answer)
      const missing = nums.filter((n) => !dataStr.includes(n) && !counts.has(n))
      if (missing.length > 0) {
        console.error(`  FAIL: 환각 의심 — data 에 없는 숫자 ${missing.join(', ')} 가 답에 등장: "${result.answer}"`)
        anyFail = true
        hallucStatus = 'FAIL'
      } else {
        hallucStatus = 'pass'
      }
    }

    rows.push({
      id: c.id,
      question: c.question,
      tool: c.tool ?? '(null)',
      evidenceCount,
      dataCount,
      halluc: hallucStatus,
      snippet: (result.answer ?? '').slice(0, 80).replace(/\n/g, ' '),
    })
  }

  console.log('\n=== 결과 ===')
  console.log('id     tool                    ev   data   halluc   answer')
  for (const r of rows) {
    console.log(
      `${r.id.padEnd(4)} ${r.tool.padEnd(23)} ${String(r.evidenceCount).padStart(2)}   ${String(r.dataCount).padStart(3)}   ${r.halluc.padEnd(6)}   ${r.snippet}`,
    )
  }

  if (anyFail) {
    console.error('\n[smoke] 하나 이상 실패 — exit 1')
    process.exit(1)
  }
  if (quotaFail > 0) {
    // 계약 위반이 아니라 무료 등급 한도다. 초록으로 넘기지도, 빨강으로 막지도 않는다.
    console.error(`\n[smoke] ${quotaFail}건이 무료 등급 한도로 못 돌았다 — 검증 불가 (exit 2). 한도가 회복된 뒤 다시 돌린다`)
    process.exit(2)
  }
  console.log('\n[smoke] 5건 모두 통과')
  process.exit(0)
} finally {
  await app.close()
}
