/**
 * localized_names 시드 CLI — frontend/src/i18n/entityNames.js 의 한국어 표기를 DB 로 옮긴다.
 *
 * 실행:
 *   npm run seed:localized-names -- --dry-run   (미리보기 · DB 안 씀)
 *   npm run seed:localized-names                (실 upsert)
 *
 * 규약 (Q3 3단계 완료 이후):
 *   · entityNames.js 의 apiId 필드가 진실. api_team_id/api_player_id/api_competition_id 로 직접 조회
 *   · apiId 없는 항목은 SKIP (backfill 이 채워야 정상) · scripts/backfill-entity-apiids.mjs 로 채운다
 *   · 성공한 항목만 LocalizedName 에 upsert (entityType + entityId + locale='ko' unique)
 *   · source = MANUAL. 재실행 안전 (멱등). 기존 행 삭제 금지.
 *   · entityNames.js 는 절대 수정하지 않는다 (프론트가 진실 · Q4 규약 · backfill 만 예외)
 *
 * 이름 조회 경로는 삭제됐다 (2026-09-10 · Q3 3단계 규약 · 표기 편차로 조용히 깨지는 것 방지).
 * 최초 채우기가 필요하면 scripts/backfill-entity-apiids.mjs 를 실행한다.
 *
 * 종료 코드:
 *   · 성공한 것이 하나라도 있고 --dry-run 이 아니면 0
 *   · 모든 항목 실패 → 1
 *   · --dry-run 이면 항상 0
 */
import { NestFactory } from '@nestjs/core';
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';
import { AppModule } from '../app.module.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { EntityType } from '../generated/prisma/client.js';

interface EntityLabels {
  apiId: number;
  en: string;
  ko: string;
  shortEn: string;
  shortKo: string;
}
interface EntityMap {
  TEAM_NAMES: Record<string, EntityLabels>;
  PLAYER_NAMES: Record<string, EntityLabels>;
  COMPETITION_NAMES: Record<string, EntityLabels>;
}

type SeedStatus = 'OK' | 'NO_API_ID' | 'DB_MISS';

interface SeedResult {
  entityType: EntityType;
  key: string;
  apiId: number | null;
  englishName: string;
  koreanName: string;
  shortKo: string | null;
  status: SeedStatus;
  matchedInternalId?: number | null;
}

function hasFlag(name: string): boolean {
  return process.argv.includes(`--${name}`);
}

async function loadEntityNames(): Promise<EntityMap> {
  // src (dist) 에서 3단계 위 → repo 루트 → frontend/src/i18n/entityNames.js
  const here = fileURLToPath(import.meta.url);
  const jsPath = path.resolve(here, '..', '..', '..', '..', 'frontend', 'src', 'i18n', 'entityNames.js');
  const url = pathToFileURL(jsPath).href;
  const mod = (await import(url)) as {
    TEAM_NAMES?: Record<string, EntityLabels>;
    PLAYER_NAMES?: Record<string, EntityLabels>;
    COMPETITION_NAMES?: Record<string, EntityLabels>;
  };
  if (!mod.TEAM_NAMES || !mod.PLAYER_NAMES || !mod.COMPETITION_NAMES) {
    throw new Error(`entityNames.js 에 3개 export 가 다 있어야 한다: ${jsPath}`);
  }
  return {
    TEAM_NAMES: mod.TEAM_NAMES,
    PLAYER_NAMES: mod.PLAYER_NAMES,
    COMPETITION_NAMES: mod.COMPETITION_NAMES,
  };
}

/** apiId (API-Football id) 로 내부 id 조회. 없으면 DB_MISS */
async function resolveInternalId(
  prisma: PrismaService,
  entityType: EntityType,
  apiId: number,
): Promise<number | null> {
  if (entityType === EntityType.TEAM) {
    const rows = await prisma.$queryRaw<Array<{ id: number }>>`
      SELECT id FROM teams WHERE api_team_id = ${apiId}
    `;
    return rows[0]?.id ?? null;
  }
  if (entityType === EntityType.PLAYER) {
    const rows = await prisma.$queryRaw<Array<{ id: number }>>`
      SELECT id FROM players WHERE api_player_id = ${apiId}
    `;
    return rows[0]?.id ?? null;
  }
  const rows = await prisma.$queryRaw<Array<{ id: number }>>`
    SELECT id FROM competitions WHERE api_competition_id = ${apiId}
  `;
  return rows[0]?.id ?? null;
}

async function processEntity(
  prisma: PrismaService,
  entityType: EntityType,
  key: string,
  labels: EntityLabels,
): Promise<SeedResult> {
  const koreanName = labels.ko;
  const shortKo = labels.shortKo?.trim() || null;
  const apiId = typeof labels.apiId === 'number' ? labels.apiId : null;

  if (apiId == null) {
    return {
      entityType,
      key,
      apiId: null,
      englishName: labels.en,
      koreanName,
      shortKo,
      status: 'NO_API_ID',
    };
  }

  const internalId = await resolveInternalId(prisma, entityType, apiId);
  if (internalId == null) {
    return {
      entityType,
      key,
      apiId,
      englishName: labels.en,
      koreanName,
      shortKo,
      status: 'DB_MISS',
    };
  }

  return {
    entityType,
    key,
    apiId,
    englishName: labels.en,
    koreanName,
    shortKo,
    status: 'OK',
    matchedInternalId: internalId,
  };
}

async function main(): Promise<void> {
  const dryRun = hasFlag('dry-run');
  const app = await NestFactory.createApplicationContext(AppModule, { logger: ['warn', 'error'] });
  const prisma = app.get(PrismaService);

  try {
    // 실행 전 현재 행 수
    const before = await prisma.localizedName.count();
    console.log(`[seed] localized_names rows before: ${before}${dryRun ? ' (dry-run)' : ''}`);

    const entityNames = await loadEntityNames();

    const jobs: Array<{ entityType: EntityType; key: string; labels: EntityLabels }> = [
      ...Object.entries(entityNames.TEAM_NAMES).map(([key, labels]) => ({ entityType: EntityType.TEAM, key, labels })),
      ...Object.entries(entityNames.PLAYER_NAMES).map(([key, labels]) => ({ entityType: EntityType.PLAYER, key, labels })),
      ...Object.entries(entityNames.COMPETITION_NAMES).map(([key, labels]) => ({
        entityType: EntityType.COMPETITION,
        key,
        labels,
      })),
    ];
    console.log(`[seed] processing ${jobs.length} entries...`);

    const results: SeedResult[] = [];
    for (const job of jobs) {
      const r = await processEntity(prisma, job.entityType, job.key, job.labels);
      results.push(r);
      const suffix =
        r.status === 'OK'
          ? `→ internalId=${r.matchedInternalId}`
          : r.status === 'NO_API_ID'
            ? '(entityNames.js 에 apiId 없음 · scripts/backfill-entity-apiids.mjs 로 채운다)'
            : `apiId=${r.apiId} DB 에 없음`;
      const line = `[seed] entity=${r.entityType} key=${r.key} apiId=${r.apiId ?? '?'} status=${r.status} ${suffix}`.trim();
      if (r.status === 'OK') console.log(line);
      else console.error(line);
    }

    const ok = results.filter((r) => r.status === 'OK');
    const noApiId = results.filter((r) => r.status === 'NO_API_ID');
    const dbMiss = results.filter((r) => r.status === 'DB_MISS');

    if (!dryRun && ok.length > 0) {
      let upserted = 0;
      for (const r of ok) {
        if (r.matchedInternalId == null) continue;
        await prisma.localizedName.upsert({
          where: {
            entityType_entityId_locale: {
              entityType: r.entityType,
              entityId: r.matchedInternalId,
              locale: 'ko',
            },
          },
          create: {
            entityType: r.entityType,
            entityId: r.matchedInternalId,
            locale: 'ko',
            name: r.koreanName,
            shortName: r.shortKo,
            source: 'MANUAL',
          },
          update: {
            name: r.koreanName,
            shortName: r.shortKo,
            source: 'MANUAL',
          },
        });
        upserted++;
      }
      console.log(`[seed] upserted ${upserted} / ${jobs.length}`);
    } else if (dryRun) {
      console.log(`[seed] dry-run · would upsert ${ok.length} / ${jobs.length}`);
    }

    if (noApiId.length + dbMiss.length > 0) {
      console.error(`[seed] failed ${noApiId.length + dbMiss.length} (${noApiId.length} NO_API_ID · ${dbMiss.length} DB_MISS) — list above`);
    }

    const after = await prisma.localizedName.count();
    console.log(`[seed] localized_names rows after: ${after}${dryRun ? ' (dry-run · unchanged)' : ''}`);

    // 종료 코드
    if (ok.length === 0 && jobs.length > 0) {
      process.exitCode = 1;
    }
  } finally {
    await app.close();
  }
}

await main().catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});
