#!/usr/bin/env node
/**
 * DB 백업 (NEXT_STEPS 4장) — pg_dump 를 그대로 부른다
 *
 * Supabase 무료는 백업도 PITR 도 없다. 백필이 8~12일짜리라 날아가면 다시 8~12일이다.
 *
 *   npm run backup            받는다 (기본 위치: 홈/PitchLogBackups)
 *   npm run backup -- --check 환경만 점검하고 끝낸다 (pg_dump 유무·버전)
 *
 * 앱을 띄우지 않는다 — 백업이 애플리케이션 부팅에 의존하면, 앱이 못 뜰 때 백업도 못 받는다.
 * 그래서 Nest 도 Prisma 도 거치지 않고 DATABASE_URL 과 pg_dump 만 쓴다.
 *
 * 형식은 custom(-Fc). 자체 압축이고 pg_restore 로 부분 복원이 되며,
 * --no-owner --no-privileges 라서 다른 서버(로컬·Docker)에도 그대로 복원된다.
 */
import { spawn, spawnSync } from 'node:child_process'
import { mkdir, readdir, stat, unlink, appendFile } from 'node:fs/promises'
import { homedir } from 'node:os'
import { join, resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { config as loadEnv } from 'dotenv'

const BACKEND_DIR = resolve(dirname(fileURLToPath(import.meta.url)), '..')

// backend/.env.local → backend/.env 순. 앱과 같은 파일을 읽는다
loadEnv({ path: join(BACKEND_DIR, '.env.local') })
loadEnv({ path: join(BACKEND_DIR, '.env') })

/** 보관 정책 — 최근 8개는 무조건, 그 앞은 달마다 1개씩 12개월 */
const KEEP_RECENT = 8
const KEEP_MONTHLY = 12

const args = process.argv.slice(2)
const checkOnly = args.includes('--check')

function fail(message) {
  console.error(`\n✗ ${message}\n`)
  process.exit(1)
}

/** pg_dump 가 있는지, 서버보다 낮지 않은지 — 낮으면 pg_dump 가 덤프를 거부한다 */
function pgDumpVersion() {
  const r = spawnSync('pg_dump', ['--version'], { encoding: 'utf8' })
  if (r.error || r.status !== 0) return null
  const m = /(\d+)(?:\.(\d+))?/.exec(r.stdout ?? '')
  return m ? { raw: r.stdout.trim(), major: Number(m[1]) } : null
}

/** 로그·파일명에 쓰는 지역시각 (YYYYMMDD-HHmm) */
function stamp(d = new Date()) {
  const p = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}`
}

function human(bytes) {
  const u = ['B', 'KB', 'MB', 'GB']
  let n = bytes
  let i = 0
  while (n >= 1024 && i < u.length - 1) { n /= 1024; i++ }
  return `${n.toFixed(1)} ${u[i]}`
}

/**
 * 연결 정보를 PG* 환경변수로 쪼갠다.
 * URL 을 인자로 넘기면 비밀번호가 프로세스 목록(ps·작업 관리자)에 노출된다.
 */
function pgEnvFrom(url) {
  const u = new URL(url)
  const env = {
    PGHOST: u.hostname,
    PGPORT: u.port || '5432',
    PGUSER: decodeURIComponent(u.username),
    PGDATABASE: decodeURIComponent(u.pathname.replace(/^\//, '')) || 'postgres',
  }
  if (u.password) env.PGPASSWORD = decodeURIComponent(u.password)
  // Supabase 는 sslmode=require 가 붙어 온다. 없으면 pg_dump 기본값에 맡긴다
  const sslmode = u.searchParams.get('sslmode')
  if (sslmode) env.PGSSLMODE = sslmode
  return env
}

/** URL 에 든 비밀번호는 로그·화면에 남기지 않는다 */
function safeUrl(url) {
  try {
    const u = new URL(url)
    if (u.password) u.password = '***'
    return u.toString()
  } catch {
    // 파싱 못 하는 형식이면 통째로 가린다 — 원문을 흘리는 것보다 낫다
    return '(파싱 불가)'
  }
}

async function main() {
  const databaseUrl = process.env.DATABASE_URL
  const backupDir = process.env.BACKUP_DIR
    ? resolve(process.env.BACKUP_DIR)
    : join(homedir(), 'PitchLogBackups')

  const version = pgDumpVersion()
  console.log('환경 점검')
  console.log(`  pg_dump      ${version ? version.raw : '없음'}`)
  console.log(`  DATABASE_URL ${databaseUrl ? safeUrl(databaseUrl) : '없음'}`)
  console.log(`  저장 위치     ${backupDir}`)

  if (!version) {
    fail(
      'pg_dump 을 찾지 못했다.\n' +
      '  PostgreSQL 클라이언트 도구를 설치하고 PATH 에 넣는다.\n' +
      '  Windows: https://www.postgresql.org/download/windows/ (설치 시 Command Line Tools 선택)\n' +
      '  서버가 PostgreSQL 17 이면 pg_dump 도 17 이상이어야 한다 — 낮으면 덤프를 거부한다.',
    )
  }
  if (!databaseUrl) {
    fail('DATABASE_URL 이 없다 — backend/.env 에 넣는다.')
  }
  if (checkOnly) {
    console.log('\n점검만 하고 끝낸다 (--check)')
    return
  }

  await mkdir(backupDir, { recursive: true })
  const outPath = join(backupDir, `pitchlog-${stamp()}.dump`)

  console.log(`\n덤프 시작 → ${outPath}`)
  const startedAt = Date.now()

  let pgEnv
  try {
    pgEnv = pgEnvFrom(databaseUrl)
  } catch (cause) {
    fail(`DATABASE_URL 을 해석하지 못했다: ${cause.message}`)
  }

  await new Promise((resolvePromise, rejectPromise) => {
    const child = spawn(
      'pg_dump',
      ['--format=custom', '--no-owner', '--no-privileges', '--file', outPath],
      { env: { ...process.env, ...pgEnv }, stdio: ['ignore', 'inherit', 'inherit'], shell: false },
    )
    child.on('error', rejectPromise)
    child.on('close', (code) =>
      code === 0 ? resolvePromise() : rejectPromise(new Error(`pg_dump 종료 코드 ${code}`)),
    )
  }).catch((cause) => {
    fail(
      `덤프 실패: ${cause.message}\n` +
      '  버전 불일치라면 위 pg_dump 버전과 Supabase 의 PostgreSQL 버전을 맞춘다.\n' +
      '  연결 오류라면 DATABASE_URL 과 네트워크를 확인한다.',
    )
  })

  const { size } = await stat(outPath)
  const elapsed = ((Date.now() - startedAt) / 1000).toFixed(1)
  console.log(`\n✓ ${human(size)} · ${elapsed}초`)

  const removed = await rotate(backupDir)
  if (removed.length > 0) console.log(`  오래된 백업 ${removed.length}개 삭제`)

  await appendFile(
    join(backupDir, 'backup.log'),
    `${new Date().toISOString()} ok ${outPath} ${size} ${elapsed}s removed=${removed.length}\n`,
  )
}

/**
 * 최근 KEEP_RECENT 개 + 그 앞은 달마다 최신 1개씩 KEEP_MONTHLY 개월치를 남기고 지운다.
 * 파일명에 시각이 들어 있어 이름만으로 정렬·판정한다.
 */
async function rotate(dir) {
  const files = (await readdir(dir))
    .filter((f) => /^pitchlog-\d{8}-\d{4}\.dump$/.test(f))
    .sort()
    .reverse() // 최신 먼저

  const keep = new Set(files.slice(0, KEEP_RECENT))
  const monthsSeen = new Set()
  for (const f of files.slice(KEEP_RECENT)) {
    const month = f.slice('pitchlog-'.length, 'pitchlog-'.length + 6) // YYYYMM
    if (monthsSeen.has(month)) continue
    monthsSeen.add(month)
    if (monthsSeen.size <= KEEP_MONTHLY) keep.add(f)
  }

  const removed = []
  for (const f of files) {
    if (keep.has(f)) continue
    await unlink(join(dir, f))
    removed.push(f)
  }
  return removed
}

await main()
