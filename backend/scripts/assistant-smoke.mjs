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
import { fileURLToPath } from 'node:url'
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
const { AppModule } = await import(resolve(BACKEND_DIR, 'dist/app.module.js').replace(/\\/g, '/'))
const { GeminiService } = await import(resolve(BACKEND_DIR, 'dist/assistant/gemini.service.js').replace(/\\/g, '/'))
const { AssistantToolRegistry } = await import(resolve(BACKEND_DIR, 'dist/assistant/assistant-tool.registry.js').replace(/\\/g, '/'))

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

  for (const c of picked) {
    process.stdout.write(`[smoke] ${c.id} "${c.question}" ...\n`)
    let result
    try {
      result = await gemini.ask(c.question)
    } catch (err) {
      console.error(`  FAIL: ask() 예외 — ${err.message}`)
      anyFail = true
      rows.push({ id: c.id, question: c.question, tool: 'ERR', evidenceCount: 0, dataCount: 0, halluc: 'n/a', snippet: err.message.slice(0, 80) })
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
      const nums = extractNumbers(result.answer)
      const missing = nums.filter((n) => !dataStr.includes(n))
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
  console.log('\n[smoke] 5건 모두 통과')
  process.exit(0)
} finally {
  await app.close()
}
