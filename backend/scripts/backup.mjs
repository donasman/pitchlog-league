#!/usr/bin/env node
/**
 * DB 백업 (NEXT_STEPS 4장) — pg_dump 를 그대로 부른다
 *
 * Supabase 무료는 백업도 PITR 도 없다. 백필이 8~12일짜리라 날아가면 다시 8~12일이다.
 *
 *   npm run backup -- --check   환경만 점검한다 (실행 방식·버전·저장 위치)
 *   npm run backup              받는다
 *
 * 실행 방식은 자동으로 고른다:
 *   1. PATH 에 pg_dump 가 있으면 그것을 쓴다
 *   2. 없고 docker 가 있으면 postgres 이미지 안에서 돌린다
 *
 * Docker 쪽이 버전 사고를 막는다 — pg_dump 가 서버보다 낮으면 덤프를 거부하는데,
 * 이미지 태그로 고정하면 그 문제가 없다. BACKUP_PG_IMAGE 로 태그를 바꾼다.
 * 볼륨 마운트는 하지 않는다. Windows 경로 변환에서 깨지기 쉬워서, 덤프를 stdout 으로
 * 받아 Node 가 파일에 쓴다.
 *
 * 앱을 띄우지 않는다 — 백업이 애플리케이션 부팅에 의존하면, 앱이 못 뜰 때 백업도 못 받는다.
 * 그래서 Nest 도 Prisma 도 거치지 않고 DATABASE_URL 과 pg_dump 만 쓴다.
 *
 * 형식은 custom(-Fc). 자체 압축이고 pg_restore 로 부분 복원이 되며,
 * --no-owner --no-privileges 라서 다른 서버(로컬·Docker)에도 그대로 복원된다.
 */
import { spawn, spawnSync } from 'node:child_process'
import { createWriteStream } from 'node:fs'
import { mkdir, readdir, stat, unlink, appendFile } from 'node:fs/promises'
import { homedir } from 'node:os'
import { join, resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { pipeline } from 'node:stream/promises'
import { config as loadEnv } from 'dotenv'

const BACKEND_DIR = resolve(dirname(fileURLToPath(import.meta.url)), '..')

// backend/.env.local → backend/.env 순. 앱과 같은 파일을 읽는다
loadEnv({ path: join(BACKEND_DIR, '.env.local') })
loadEnv({ path: join(BACKEND_DIR, '.env') })

/** 보관 정책 — 최근 8개는 무조건, 그 앞은 달마다 1개씩 12개월 */
const KEEP_RECENT = 8
const KEEP_MONTHLY = 12

/** 서버보다 낮으면 덤프가 거부된다. 서버가 더 올라가면 이 값을 올린다 */
const DEFAULT_PG_IMAGE = 'postgres:17'

const PG_DUMP_ARGS = ['--format=custom', '--no-owner', '--no-privileges']
const PG_ENV_KEYS = ['PGHOST', 'PGPORT', 'PGUSER', 'PGPASSWORD', 'PGDATABASE', 'PGSSLMODE']

const checkOnly = process.argv.slice(2).includes('--check')

function fail(message) {
  console.error(`\n✗ ${message}\n`)
  process.exit(1)
}

function versionOf(command) {
  const r = spawnSync(command, ['--version'], { encoding: 'utf8' })
  return r.error || r.status !== 0 ? null : (r.stdout ?? '').trim()
}

/**
 * 어떻게 돌릴지 정한다.
 * docker 는 CLI 가 있어도 데몬이 죽어 있으면 못 쓴다 — 여기서 같이 확인한다.
 * 점검(--check)이 통과했는데 덤프에서 실패하면 점검이 점검 구실을 못 한 것이다.
 */
function chooseRunner() {
  const local = versionOf('pg_dump')
  if (local) return { kind: 'local', label: local, ready: true }

  const docker = versionOf('docker')
  if (!docker) return null

  const image = process.env.BACKUP_PG_IMAGE ?? DEFAULT_PG_IMAGE
  const ping = spawnSync('docker', ['info', '--format', '{{.ServerVersion}}'], { encoding: 'utf8' })
  const daemonUp = !ping.error && ping.status === 0

  return {
    kind: 'docker',
    image,
    ready: daemonUp,
    label: daemonUp
      ? `${docker} · 데몬 ${(ping.stdout ?? '').trim()} · 이미지 ${image}`
      : `${docker} · 데몬 응답 없음`,
  }
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

  const runner = chooseRunner()

  console.log('환경 점검')
  console.log(`  실행 방식     ${runner ? `${runner.kind} — ${runner.label}` : '없음'}`)
  console.log(`  DATABASE_URL ${databaseUrl ? safeUrl(databaseUrl) : '없음'}`)
  console.log(`  저장 위치     ${backupDir}`)

  if (!runner) {
    fail(
      'pg_dump 도 docker 도 찾지 못했다. 둘 중 하나가 필요하다.\n' +
      '  Docker Desktop:  https://www.docker.com/products/docker-desktop/\n' +
      '  PostgreSQL 도구: https://www.postgresql.org/download/windows/ (Command Line Tools 선택)\n' +
      '  직접 설치할 때는 서버(Supabase) 메이저 버전 이상이어야 한다.',
    )
  }
  if (!runner.ready) {
    fail(
      'Docker CLI 는 있는데 데몬이 응답하지 않는다.\n' +
      '  Docker Desktop 을 실행하고 고래 아이콘이 "Running" 이 될 때까지 기다린 뒤 다시 시도한다.\n' +
      '  Docker 를 쓰지 않으려면 PostgreSQL 클라이언트 도구를 설치한다 (서버 메이저 버전 이상).',
    )
  }
  if (!databaseUrl) {
    fail('DATABASE_URL 이 없다 — backend/.env 에 넣는다.')
  }
  if (checkOnly) {
    console.log('\n점검만 하고 끝낸다 (--check)')
    return
  }

  let pgEnv
  try {
    pgEnv = pgEnvFrom(databaseUrl)
  } catch (cause) {
    fail(`DATABASE_URL 을 해석하지 못했다: ${cause.message}`)
  }

  await mkdir(backupDir, { recursive: true })
  const outPath = join(backupDir, `pitchlog-${stamp()}.dump`)

  console.log(`\n덤프 시작 → ${outPath}`)
  const startedAt = Date.now()

  try {
    await runDump(runner, pgEnv, outPath)
  } catch (cause) {
    // 실패한 덤프 파일을 남기면 다음에 정상 백업으로 오인한다
    await unlink(outPath).catch(() => {
      console.warn('  (실패한 덤프 파일을 지우지 못했다 — 직접 지운다)')
    })
    fail(
      `덤프 실패: ${cause.message}\n` +
      '  위에 찍힌 오류를 먼저 본다.\n' +
      '  docker API 연결 실패 → Docker Desktop 이 떠 있는지 확인한다.\n' +
      '  server version mismatch → BACKUP_PG_IMAGE 를 올린다 (예: BACKUP_PG_IMAGE=postgres:18).\n' +
      '  연결·인증 오류 → DATABASE_URL 을 확인한다. Session pooler 가 막으면 direct connection 으로 바꾼다.',
    )
  }

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

async function runDump(runner, pgEnv, outPath) {
  if (runner.kind === 'local') {
    // 로컬은 --file 로 직접 쓴다
    await run('pg_dump', [...PG_DUMP_ARGS, '--file', outPath], { ...process.env, ...pgEnv })
    return
  }

  // 컨테이너에서는 stdout 으로 받아 Node 가 파일에 쓴다 — 볼륨 마운트를 피한다.
  // -e 는 이름만 넘겨 값을 docker 명령줄에 노출하지 않는다
  const envFlags = PG_ENV_KEYS.filter((k) => pgEnv[k] !== undefined).flatMap((k) => ['-e', k])
  await run(
    'docker',
    ['run', '--rm', '-i', ...envFlags, runner.image, 'pg_dump', ...PG_DUMP_ARGS],
    { ...process.env, ...pgEnv },
    outPath,
  )
}

/** stdoutPath 를 주면 자식의 stdout 을 그 파일로 흘린다. 없으면 그대로 콘솔에 붙인다 */
function run(command, args, env, stdoutPath) {
  return new Promise((resolvePromise, rejectPromise) => {
    const child = spawn(command, args, {
      env,
      stdio: ['ignore', stdoutPath ? 'pipe' : 'inherit', 'inherit'],
      shell: false,
    })
    child.on('error', rejectPromise)

    // 파일 쓰기가 끝나기 전에 성공을 알리면 크기가 0 인 덤프를 정상으로 본다
    const written = stdoutPath
      ? pipeline(child.stdout, createWriteStream(stdoutPath))
      : Promise.resolve()

    child.on('close', (code) => {
      written.then(
        () => (code === 0 ? resolvePromise() : rejectPromise(new Error(`${command} 종료 코드 ${code}`))),
        rejectPromise,
      )
    })
  })
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
