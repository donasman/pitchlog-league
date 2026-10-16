#!/usr/bin/env node
/**
 * backfill-entity-apiids.mjs — 일회성 도구.
 *
 * frontend/src/i18n/entityNames.js 의 90개 항목에 apiId 필드를 역기입한다.
 * 목적: seed 스크립트가 이름 조회 → apiId 로 단일화되기 위한 최초 채우기 (Q3 규약 3단계).
 *
 * 흐름:
 *   1. entityNames.js 를 동적 import 로 로드 (기존 값 무건드)
 *   2. 각 항목에 대해 LOWER(name) = LOWER(en) 로 DB 조회. 성공한 apiId 를 map 에
 *   3. NOT_FOUND / DUPLICATE 는 하드코딩된 OVERRIDE 를 씀 (실 DB 조회로 확정한 40개 값)
 *   4. entityNames.js 파일 원문을 정규식으로 편집:  `keyname: { ...`  →  `keyname: { apiId:N, ...`
 *      ko/en/shortEn/shortKo 값은 절대 건드리지 않는다
 *      JSDoc @type 주석도 apiId:number 추가
 *   5. 실행 후 예상: 90/90 항목이 apiId 필드를 가짐 · git diff 로 ko/en 무변경 확인
 *
 * 안전:
 *   - 실 DB 는 SELECT 만 (READ ONLY)
 *   - entityNames.js 편집은 문자열 조작 · AST 없음 · 정규식 실패 시 그 라인은 원본 유지
 *   - 실행 후 dry-run seed 로 90/90 검증 (별도 명령)
 *
 * 실행:
 *   node backend/scripts/backfill-entity-apiids.mjs
 */

import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { dirname, resolve } from 'node:path';
import { PrismaClient } from '../src/generated/prisma/client.ts';
import { PrismaPg } from '@prisma/adapter-pg';
import 'dotenv/config';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ENTITY_NAMES_PATH = resolve(__dirname, '..', '..', 'frontend', 'src', 'i18n', 'entityNames.js');

/**
 * NOT_FOUND / DUPLICATE 39+1=40 항목의 apiId — 사용자가 판단한 값.
 * DB 조회에서 확정된 값. LaLiga=140, Vitinha=128384 (PSG · 사용자 선택).
 */
const OVERRIDE = {
  TEAM: {
    newcastle: 34, spurs: 47, westham: 48, wolves: 39, bournemouth: 35,
    leicester: 46, ipswich: 57, barca: 529, atletico: 530, villarreal: 533,
    girona: 547, bayernmunich: 157, inter: 505, napoli: 492, juventus: 496,
    lazio: 487, atalanta: 499, fiorentina: 502, psg: 85, marseille: 81,
    nice: 84, lens: 116, monaco: 91, lyon: 80, rennes: 94, lille: 79,
  },
  PLAYER: {
    lewandowski: 521, vinicius: 762, osimhen: 2780, griezmann: 56,
    'de-paul': 2472, simons: 162016, brandt: 984, vlahovic: 30415,
    pellegrini: 782, leekangin: 927, lacazette: 1467,
    vitinha: 128384,  // 사용자 선택: PSG · 179경기 · Ligue1+UCL
  },
  COMPETITION: {
    laliga: 140,
  },
};

async function loadEntityNames() {
  const url = pathToFileURL(ENTITY_NAMES_PATH).href;
  const mod = await import(url);
  return {
    TEAM: mod.TEAM_NAMES,
    PLAYER: mod.PLAYER_NAMES,
    COMPETITION: mod.COMPETITION_NAMES,
  };
}

async function resolveByName(prisma, entityType, en) {
  if (entityType === 'TEAM') {
    const rows = await prisma.$queryRaw`SELECT api_team_id FROM teams WHERE LOWER(name) = LOWER(${en})`;
    if (rows.length === 1) return rows[0].api_team_id;
    return null;
  }
  if (entityType === 'PLAYER') {
    const rows = await prisma.$queryRaw`SELECT api_player_id FROM players WHERE LOWER(name) = LOWER(${en})`;
    if (rows.length === 1) return rows[0].api_player_id;
    return null;
  }
  const rows = await prisma.$queryRaw`SELECT api_competition_id FROM competitions WHERE LOWER(name) = LOWER(${en})`;
  if (rows.length === 1) return rows[0].api_competition_id;
  return null;
}

async function buildApiIdMap(prisma, entityNames) {
  const map = { TEAM: {}, PLAYER: {}, COMPETITION: {} };
  for (const type of ['TEAM', 'PLAYER', 'COMPETITION']) {
    for (const [key, labels] of Object.entries(entityNames[type])) {
      if (OVERRIDE[type][key] != null) {
        map[type][key] = OVERRIDE[type][key];
        continue;
      }
      const apiId = await resolveByName(prisma, type, labels.en);
      if (apiId != null) {
        map[type][key] = apiId;
      } else {
        console.error(`[backfill] MISSING ${type}/${key} en="${labels.en}" — override 에도 없고 이름 조회 실패`);
      }
    }
  }
  return map;
}

/**
 * entityNames.js 원문에 apiId 필드를 삽입한다.
 *   `키: { en:'...',` → `키: { apiId:N, en:'...',`
 * 이미 apiId 가 있으면 건너뛴다 (멱등).
 * ko/en/shortEn/shortKo 는 절대 건드리지 않는다 (regex 앞부분만 매치).
 */
function injectApiIds(source, apiIdMap) {
  let out = source;
  let sectionType = null;
  const lines = out.split('\n');
  const newLines = lines.map(line => {
    if (line.includes('export const TEAM_NAMES')) sectionType = 'TEAM';
    else if (line.includes('export const PLAYER_NAMES')) sectionType = 'PLAYER';
    else if (line.includes('export const COMPETITION_NAMES')) sectionType = 'COMPETITION';

    if (!sectionType) return line;

    // key 패턴:  `  키: { en:` 또는 `  'de-paul': { en:`
    // 이미 apiId 가 있으면 건너뜀
    const m = line.match(/^(\s*)('?[\w-]+'?):\s*\{\s*(en:)/);
    if (!m) return line;
    if (line.includes('apiId:')) return line;
    const rawKey = m[2];
    const key = rawKey.replace(/^'|'$/g, '');
    const apiId = apiIdMap[sectionType]?.[key];
    if (apiId == null) return line;
    return line.replace(/\{\s*en:/, `{ apiId:${apiId}, en:`);
  });
  return newLines.join('\n');
}

/**
 * JSDoc @type 주석에 apiId:number 를 앞에 추가한다.
 * `{en:string, ko:string, shortEn:string, shortKo:string}` → `{apiId:number, en:string, ...}`
 */
function updateJsDoc(source) {
  return source.replace(
    /\{en:string, ko:string, shortEn:string, shortKo:string\}/g,
    '{apiId:number, en:string, ko:string, shortEn:string, shortKo:string}',
  );
}

async function main() {
  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
  const prisma = new PrismaClient({ adapter });
  try {
    console.log(`[backfill] loading entityNames from ${ENTITY_NAMES_PATH}`);
    const entityNames = await loadEntityNames();
    const totals = {
      TEAM: Object.keys(entityNames.TEAM).length,
      PLAYER: Object.keys(entityNames.PLAYER).length,
      COMPETITION: Object.keys(entityNames.COMPETITION).length,
    };
    console.log(`[backfill] counts: TEAM=${totals.TEAM} PLAYER=${totals.PLAYER} COMPETITION=${totals.COMPETITION}`);

    console.log('[backfill] resolving apiIds (DB LOWER match + override)...');
    const apiIdMap = await buildApiIdMap(prisma, entityNames);

    const missing = [];
    for (const type of ['TEAM', 'PLAYER', 'COMPETITION']) {
      for (const key of Object.keys(entityNames[type])) {
        if (apiIdMap[type][key] == null) missing.push(`${type}/${key}`);
      }
    }
    if (missing.length > 0) {
      console.error(`[backfill] STOP · ${missing.length} entries still missing:`);
      for (const m of missing) console.error(`  - ${m}`);
      process.exit(1);
    }
    console.log(`[backfill] resolved 90/90. Writing entityNames.js...`);

    const original = readFileSync(ENTITY_NAMES_PATH, 'utf8');
    const withDocs = updateJsDoc(original);
    const withApiIds = injectApiIds(withDocs, apiIdMap);

    if (withApiIds === original) {
      console.log('[backfill] no change (already contains apiId)');
    } else {
      writeFileSync(ENTITY_NAMES_PATH, withApiIds, 'utf8');
      console.log('[backfill] wrote entityNames.js');
    }
  } finally {
    await prisma.$disconnect();
  }
}

main().catch(err => { console.error(err); process.exit(1); });
