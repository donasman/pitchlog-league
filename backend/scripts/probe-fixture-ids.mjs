/**
 * L4 3판 실측 대조 — /fixtures?ids= 응답 안 4배열이 개별 엔드포인트와 shape 동일한가.
 *
 * 사용:
 *   cd backend
 *   node scripts/probe-fixture-ids.mjs 1622630
 *
 * .env 는 backend/.env 를 스크립트가 직접 파싱해 API_FOOTBALL_KEY 를 읽는다.
 *
 * 1콜 (개별 콜은 하지 않는다 · 로컬 개별 픽스처와 비교):
 *   GET /fixtures?ids=<id> → test/fixtures/fixture-ids-<id>.json
 *
 * 대조 깊이 (4서비스 persist 코드가 실제로 읽는 경로 기준):
 *   lineups   : [0] top · startXI[0].player · substitutes[0].player · coach · team
 *   events    : [0] top · time · team · player · assist
 *   statistics: [0] top · statistics[0] (type·value) · team
 *   players   : [0] top · players[0].player · players[0].statistics[0] top · games · goals · cards
 *
 * 전부 √ 면 stdout 마지막 줄에 "OK 05 진행 가능". 하나라도 DIFF 면 "STOP DIFF 있음".
 */
import { writeFile, readFile, mkdir, stat, readdir } from 'node:fs/promises';
import { join, resolve } from 'node:path';

const BASE_URL = 'https://v3.football.api-sports.io';
const [, , fixtureIdRaw] = process.argv;
if (!fixtureIdRaw) {
  console.error('사용: node scripts/probe-fixture-ids.mjs <fixtureId>');
  process.exit(1);
}
const fixtureId = Number(fixtureIdRaw);
if (!Number.isInteger(fixtureId)) {
  console.error(`fixtureId 정수 아님: ${fixtureIdRaw}`);
  process.exit(1);
}

// backend/.env 파싱 — dotenv 안 씀 (스크립트가 backend 안에서 돈다 · 값에 = 포함 허용)
async function loadKey() {
  if (process.env.API_FOOTBALL_KEY) return process.env.API_FOOTBALL_KEY;
  const envPath = resolve(process.cwd(), '.env');
  try {
    const raw = await readFile(envPath, 'utf8');
    for (const line of raw.split(/\r?\n/)) {
      if (!line || line.startsWith('#')) continue;
      const eq = line.indexOf('=');
      if (eq === -1) continue;
      const k = line.slice(0, eq).trim();
      if (k !== 'API_FOOTBALL_KEY') continue;
      let v = line.slice(eq + 1).trim();
      if (v.startsWith('"') && v.endsWith('"')) v = v.slice(1, -1);
      if (v.startsWith("'") && v.endsWith("'")) v = v.slice(1, -1);
      return v;
    }
  } catch {}
  return null;
}

const key = await loadKey();
if (!key) {
  console.error('API_FOOTBALL_KEY 없음 (backend/.env 또는 env).');
  process.exit(1);
}

async function get(path, params) {
  const url = new URL(path, BASE_URL);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, String(v));
  const res = await fetch(url, { headers: { 'x-apisports-key': key } });
  if (!res.ok) throw new Error(`${path} → HTTP ${res.status}`);
  return res.json();
}

const idsPath = resolve(process.cwd(), `test/fixtures/fixture-ids-${fixtureId}.json`);
const refDir = resolve(process.cwd(), 'test/fixtures/api-football');
await mkdir(resolve(process.cwd(), 'test/fixtures'), { recursive: true });

console.log(`GET /fixtures?ids=${fixtureId}`);
const idsBody = await get('/fixtures', { ids: fixtureId });
await writeFile(idsPath, JSON.stringify(idsBody, null, 2));
console.log(`  saved ${idsPath}`);

const idsItems = idsBody?.response ?? [];
if (!idsItems.length) {
  console.error('ids 응답 response 배열 비어 있음.');
  process.exit(1);
}
const item = idsItems[0];

async function readRef(name) {
  try {
    return JSON.parse(await readFile(join(refDir, `${name}_${fixtureId}.json`), 'utf8'));
  } catch (e) {
    return null;
  }
}

const sortedKeys = (v) => (v && typeof v === 'object' && !Array.isArray(v) ? Object.keys(v).sort() : []);
const diff = (a, b) => {
  const onlyA = a.filter((k) => !b.includes(k));
  const onlyB = b.filter((k) => !a.includes(k));
  return { same: onlyA.length === 0 && onlyB.length === 0, onlyA, onlyB };
};

const rows = [];
function row(gate, path, ids, ref) {
  const A = sortedKeys(ids);
  const B = sortedKeys(ref);
  const d = diff(A, B);
  rows.push({ gate, path, idsKeys: A, refKeys: B, ...d });
}

// ─── lineups ─────────────────────────────────────────────────
{
  const idsArr = Array.isArray(item.lineups) ? item.lineups : [];
  const ref = (await readRef('lineups'))?.response ?? [];
  console.log(`\n## lineups  · ids length=${idsArr.length} · ref length=${ref.length}`);
  const i0 = idsArr[0] ?? null;
  const r0 = ref[0] ?? null;
  row('lineups', '[0] top', i0, r0);
  row('lineups', '[0].team', i0?.team, r0?.team);
  row('lineups', '[0].coach', i0?.coach, r0?.coach);
  row('lineups', '[0].startXI[0].player', i0?.startXI?.[0]?.player, r0?.startXI?.[0]?.player);
  row('lineups', '[0].substitutes[0].player', i0?.substitutes?.[0]?.player, r0?.substitutes?.[0]?.player);
}

// ─── events ──────────────────────────────────────────────────
{
  const idsArr = Array.isArray(item.events) ? item.events : [];
  const ref = (await readRef('events'))?.response ?? [];
  console.log(`\n## events   · ids length=${idsArr.length} · ref length=${ref.length}`);
  const i0 = idsArr[0] ?? null;
  const r0 = ref[0] ?? null;
  row('events', '[0] top', i0, r0);
  row('events', '[0].time', i0?.time, r0?.time);
  row('events', '[0].team', i0?.team, r0?.team);
  row('events', '[0].player', i0?.player, r0?.player);
  row('events', '[0].assist', i0?.assist, r0?.assist);
}

// ─── statistics ──────────────────────────────────────────────
{
  const idsArr = Array.isArray(item.statistics) ? item.statistics : [];
  const ref = (await readRef('statistics'))?.response ?? [];
  console.log(`\n## statistics · ids length=${idsArr.length} · ref length=${ref.length}`);
  const i0 = idsArr[0] ?? null;
  const r0 = ref[0] ?? null;
  row('statistics', '[0] top', i0, r0);
  row('statistics', '[0].team', i0?.team, r0?.team);
  row('statistics', '[0].statistics[0]', i0?.statistics?.[0], r0?.statistics?.[0]);
}

// ─── players ─────────────────────────────────────────────────
{
  const idsArr = Array.isArray(item.players) ? item.players : [];
  const ref = (await readRef('players'))?.response ?? [];
  console.log(`\n## players  · ids length=${idsArr.length} · ref length=${ref.length}`);
  const i0 = idsArr[0] ?? null;
  const r0 = ref[0] ?? null;
  row('players', '[0] top', i0, r0);
  row('players', '[0].players[0] top', i0?.players?.[0], r0?.players?.[0]);
  row('players', '[0].players[0].player', i0?.players?.[0]?.player, r0?.players?.[0]?.player);
  const iS = i0?.players?.[0]?.statistics?.[0] ?? null;
  const rS = r0?.players?.[0]?.statistics?.[0] ?? null;
  row('players', '[0].players[0].statistics[0] top', iS, rS);
  row('players', 'stats[0].games', iS?.games, rS?.games);
  row('players', 'stats[0].goals', iS?.goals, rS?.goals);
  row('players', 'stats[0].cards', iS?.cards, rS?.cards);
  row('players', 'stats[0].passes', iS?.passes, rS?.passes);
  row('players', 'stats[0].shots', iS?.shots, rS?.shots);
  row('players', 'stats[0].tackles', iS?.tackles, rS?.tackles);
  row('players', 'stats[0].duels', iS?.duels, rS?.duels);
  row('players', 'stats[0].dribbles', iS?.dribbles, rS?.dribbles);
  row('players', 'stats[0].fouls', iS?.fouls, rS?.fouls);
  row('players', 'stats[0].penalty', iS?.penalty, rS?.penalty);
}

console.log('\n=== 대조표 (persist 코드가 실제 읽는 경로) ===');
console.log('참고: fixture 1622630 자기 자신의 개별 4엔드포인트 픽스처와 대조. ids vs 개별.\n');
console.log('gate       | path                                    | verdict  | diff');
console.log('-----------|-----------------------------------------|----------|---------------------------');
for (const r of rows) {
  const verdict = r.same ? '√'.padEnd(8, ' ') : 'DIFF'.padEnd(8, ' ');
  const diffTxt = r.same
    ? ''
    : `onlyIds=[${r.onlyA.join(',')}] onlyRef=[${r.onlyB.join(',')}]`;
  console.log(`${r.gate.padEnd(11)}| ${r.path.padEnd(40)}| ${verdict} | ${diffTxt}`);
}

const anyDiff = rows.some((r) => !r.same);
console.log(anyDiff ? '\nSTOP · DIFF 있음' : '\nOK · 05 진행 가능');
process.exit(anyDiff ? 2 : 0);
