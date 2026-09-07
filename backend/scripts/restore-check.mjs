#!/usr/bin/env node
/**
 * 복원 리허설 (NEXT_STEPS 4장 관문)
 *
 * 받아본 적 없는 백업은 백업이 아니다. 목차(`pg_restore --list`)를 읽는 것은
 * 형식 확인이지 복원이 아니다 — 실제로 빈 DB 에 넣어 보고 행 수를 맞춰 봐야 안다.
 *
 *   npm run backup:verify              가장 최근 덤프
 *   npm run backup:verify -- <경로>    특정 덤프
 *   npm run backup:verify -- --keep    끝나고 컨테이너를 남긴다 (직접 들여다볼 때)
 *
 * 일회용 postgres 컨테이너에 복원한다. 운영 DB 는 건드리지 않는다 — 덮어쓴다.
 * 컨테이너는 끝나면 지운다.
 *
 * 검증은 "복원됐다" 가 아니라 **"원본과 행 수가 같다"** 로 한다.
 * 복원은 성공했는데 테이블이 비어 있는 경우를 잡아야 한다.
 */
import { spawn, spawnSync } from 'node:child_process'
import { createReadStream } from 'node:fs'
import { readdir, stat } from 'node:fs/promises'
import { homedir } from 'node:os'
import { join, resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { pipeline } from 'node:stream/promises'
import { config as loadEnv } from 'dotenv'

const BACKEND_DIR = resolve(dirname(fileURLToPath(import.meta.url)), '..')
loadEnv({ path: join(BACKEND_DIR, '.env.local') })
loadEnv({ path: join(BACKEND_DIR, '.env') })

const PG_IMAGE = process.env.BACKUP_PG_IMAGE ?? 'postgres:17'
const SCHEMA = process.env.BACKUP_SCHEMA ?? 'public'
const CONTAINER_PASSWORD = 'verify-only-throwaway'
/** 기본 postgres DB 를 그대로 쓰지 않는다 — 복원 대상임을 이름으로 드러낸다 */
const TARGET_DB = 'pitchlog_verify'
const READY_TIMEOUT_MS = 60_000

/** 테이블마다 count(*) 를 한 번의 왕복으로 받는다 */
const COUNT_SQL = `
SELECT table_name || ' ' ||
       (xpath('/row/c/text()',
              query_to_xml(format('select count(*) as c from %I.%I', table_schema, table_name),
                           false, true, '')))[1]::text
FROM information_schema.tables
WHERE table_schema = '${SCHEMA}' AND table_type = 'BASE TABLE'
ORDER BY table_name
`.trim()

const args = process.argv.slice(2)
const keepContainer = args.includes('--keep')
const explicitDump = args.find((a) => !a.startsWith('--'))

class VerifyError extends Error {}
const fail = (m) => { throw new VerifyError(m) }

function backupDir() {
  return process.env.BACKUP_DIR ? resolve(process.env.BACKUP_DIR) : join(homedir(), 'PitchLogBackups')
}

function pgEnvFrom(url) {
  const u = new URL(url)
  const env = {
    PGHOST: u.hostname,
    PGPORT: u.port || '5432',
    PGUSER: decodeURIComponent(u.username),
    PGDATABASE: decodeURIComponent(u.pathname.replace(/^\//, '')) || 'postgres',
  }
  if (u.password) env.PGPASSWORD = decodeURIComponent(u.password)
  const sslmode = u.searchParams.get('sslmode')
  if (sslmode) env.PGSSLMODE = sslmode
  return env
}

/** stdin 을 파일에서 흘려보낼 수 있는 spawn 래퍼. stdout 을 문자열로 돌려준다 */
function run(command, cmdArgs, { env, stdinFile, quiet } = {}) {
  return new Promise((resolvePromise, rejectPromise) => {
    const child = spawn(command, cmdArgs, {
      env: env ?? process.env,
      stdio: [stdinFile ? 'pipe' : 'ignore', 'pipe', quiet ? 'pipe' : 'inherit'],
      shell: false,
    })
    let out = ''
    let err = ''
    child.stdout.on('data', (d) => { out += d })
    if (quiet) child.stderr.on('data', (d) => { err += d })
    child.on('error', rejectPromise)

    const fed = stdinFile
      ? pipeline(createReadStream(stdinFile), child.stdin)
      : Promise.resolve()
    fed.catch(rejectPromise)

    child.on('close', (code) => {
      if (code === 0) resolvePromise(out)
      else rejectPromise(new Error(`${command} 종료 코드 ${code}${err ? `\n${err.trim()}` : ''}`))
    })
  })
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

/** 컨테이너 안에서 psql 한 번 */
function psql(container, db, sql) {
  return run('docker', [
    'exec', '-e', 'PGPASSWORD=' + CONTAINER_PASSWORD, container,
    'psql', '-U', 'postgres', '-d', db, '-t', '-A', '-v', 'ON_ERROR_STOP=1', '-c', sql,
  ], { quiet: true })
}

/** "이름 개수" 줄들을 Map 으로 */
function parseCounts(text) {
  const m = new Map()
  for (const line of text.split('\n')) {
    const t = line.trim()
    if (!t) continue
    const i = t.lastIndexOf(' ')
    if (i === -1) continue
    m.set(t.slice(0, i), Number(t.slice(i + 1)))
  }
  return m
}

async function newestDump() {
  const dir = backupDir()
  let files
  try {
    files = await readdir(dir)
  } catch {
    // 폴더가 없으면 아직 한 번도 안 받은 것
    fail(`백업 폴더가 없다: ${dir}\n  먼저 npm run backup 을 돌린다.`)
  }
  const dumps = files.filter((f) => /^pitchlog-\d{8}-\d{4}\.dump$/.test(f)).sort()
  if (dumps.length === 0) fail(`${dir} 에 덤프가 없다. 먼저 npm run backup 을 돌린다.`)
  return join(dir, dumps[dumps.length - 1])
}

async function main() {
  if (spawnSync('docker', ['info'], { encoding: 'utf8' }).status !== 0) {
    fail('Docker 데몬이 응답하지 않는다. Docker Desktop 을 실행한다.')
  }

  const dumpPath = explicitDump ? resolve(explicitDump) : await newestDump()
  const { size } = await stat(dumpPath).catch(() => fail(`덤프를 찾을 수 없다: ${dumpPath}`))

  console.log('복원 리허설')
  console.log(`  덤프        ${dumpPath} (${(size / 1024).toFixed(1)} KB)`)
  console.log(`  이미지      ${PG_IMAGE}`)
  console.log(`  대상 스키마  ${SCHEMA}`)

  const name = `pitchlog-verify-${Date.now()}`
  let started = false

  try {
    console.log(`\n1. 일회용 컨테이너 기동 (${name})`)
    await run('docker', [
      'run', '-d', '--name', name,
      '-e', `POSTGRES_PASSWORD=${CONTAINER_PASSWORD}`,
      PG_IMAGE,
    ], { quiet: true })
    started = true

    const deadline = Date.now() + READY_TIMEOUT_MS
    for (;;) {
      const r = spawnSync('docker', ['exec', name, 'pg_isready', '-U', 'postgres'], { encoding: 'utf8' })
      if (r.status === 0) break
      if (Date.now() > deadline) fail(`컨테이너가 ${READY_TIMEOUT_MS / 1000}초 안에 준비되지 않았다`)
      await sleep(500)
    }
    console.log('   준비됨')

    console.log(`\n2. 빈 DB 준비 (${TARGET_DB})`)
    // --schema=public 으로 뜬 덤프는 CREATE SCHEMA public 을 들고 있다.
    // 새 DB 에는 public 이 이미 있어서 그대로 넣으면 "already exists" 로 멈춘다
    await psql(name, 'postgres', `CREATE DATABASE ${TARGET_DB}`)
    await psql(name, TARGET_DB, 'DROP SCHEMA IF EXISTS public CASCADE')
    console.log('   public 비움')

    console.log('\n3. 복원')
    // --exit-on-error: 조용히 넘어가는 오류가 있으면 리허설의 의미가 없다
    try {
      await run('docker', [
        'exec', '-i', '-e', 'PGPASSWORD=' + CONTAINER_PASSWORD, name,
        'pg_restore', '--no-owner', '--no-privileges', '--exit-on-error', '-U', 'postgres', '-d', TARGET_DB,
      ], { stdinFile: dumpPath })
    } catch (cause) {
      fail(`복원이 실패했다 (위 pg_restore 오류 참조).\n  ${cause.message.split('\n')[0]}`)
    }
    console.log('   오류 없이 끝남')

    console.log('\n4. 행 수 비교 (복원본 ↔ 운영 DB)')
    const restored = parseCounts(await psql(name, TARGET_DB, COUNT_SQL))

    const databaseUrl = process.env.DATABASE_URL
    if (!databaseUrl) fail('DATABASE_URL 이 없어 운영 DB 와 비교할 수 없다.')
    const live = parseCounts(await run('docker', [
      'run', '--rm',
      ...['PGHOST', 'PGPORT', 'PGUSER', 'PGPASSWORD', 'PGDATABASE', 'PGSSLMODE'].flatMap((k) => ['-e', k]),
      PG_IMAGE, 'psql', '-t', '-A', '-c', COUNT_SQL,
    ], { env: { ...process.env, ...pgEnvFrom(databaseUrl) }, quiet: true }))

    report(live, restored)
  } finally {
    if (started && !keepContainer) {
      spawnSync('docker', ['rm', '-f', name], { stdio: 'ignore' })
      console.log(`\n컨테이너 ${name} 삭제`)
    } else if (started) {
      console.log(`\n컨테이너 ${name} 유지 (--keep). 다 보고 나면: docker rm -f ${name}`)
    }
  }
}

function report(live, restored) {
  const names = [...new Set([...live.keys(), ...restored.keys()])].sort()
  const problems = []
  const rows = []

  for (const n of names) {
    const a = live.get(n)
    const b = restored.get(n)
    const ok = a !== undefined && b !== undefined && a === b
    if (!ok) problems.push(n)
    rows.push({ n, a: a ?? '없음', b: b ?? '없음', mark: ok ? ' ' : '✗' })
  }

  const w = Math.max(...rows.map((r) => r.n.length), 8)
  console.log(`\n   ${'테이블'.padEnd(w)}  ${'운영'.padStart(10)}  ${'복원'.padStart(10)}`)
  for (const r of rows) {
    console.log(` ${r.mark} ${r.n.padEnd(w)}  ${String(r.a).padStart(10)}  ${String(r.b).padStart(10)}`)
  }

  const totalLive = [...live.values()].reduce((s, v) => s + v, 0)
  console.log(`\n   테이블 ${names.length}개 · 행 ${totalLive.toLocaleString()}개`)

  if (problems.length > 0) {
    fail(
      `행 수가 다르거나 빠진 테이블 ${problems.length}개: ${problems.join(', ')}\n` +
      '  백업 중에 데이터가 바뀌었을 수도 있다 — 수집이 도는 중이었는지 확인하고 다시 돌려 본다.\n' +
      '  그게 아니면 이 백업으로는 복구할 수 없다.',
    )
  }
  console.log('\n✓ 복원본이 운영 DB 와 일치한다. 이 백업은 쓸 수 있다.')
}

try {
  await main()
} catch (cause) {
  const message = cause instanceof VerifyError ? cause.message : (cause?.stack ?? String(cause))
  console.error(`\n✗ ${message}\n`)
  process.exit(1)
}
