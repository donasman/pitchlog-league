/**
 * 수집 CLI — 스케줄러 없이 수동 실행.
 *   npm run ingest -- l0
 *   npm run ingest -- l1
 *   npm run ingest -- l2 [--all-seasons] [--season=<year>]
 *   npm run ingest -- l6 [--all-seasons] [--season=<year>] [--only=players|rankings|teams]
 *   npm run ingest -- probe-players [--all-seasons]
 *   npm run ingest -- probe-details --fixture=<id[,id,...]>
 *   npm run ingest -- status
 *   npm run ingest -- logos [--force]
 *
 * HTTP 서버를 띄우지 않고 애플리케이션 컨텍스트만 만든다.
 */
import { NestFactory } from '@nestjs/core';
import { Logger } from '@nestjs/common';
import { AppModule } from '../app.module.js';
import { L0Service } from '../ingestion/l0/l0.service.js';
import { L1Service } from '../ingestion/l1/l1.service.js';
import { L2Service } from '../ingestion/l2/l2.service.js';
import { L6Service, L6_BRANCHES, type L6Branch } from '../ingestion/l6/l6.service.js';
import { LogoService } from '../ingestion/logos/logo.service.js';
import { ProbeService } from '../ingestion/probe/probe.service.js';
import { QuotaService } from '../ingestion/api-football/quota.service.js';
import { ApiFootballClient } from '../ingestion/api-football/api-football.client.js';
import { SEASON_YEARS } from '../ingestion/l0/competitions.catalog.js';

const logger = new Logger('ingest');

const USAGE =
  'l0 | l1 | l2 [--all-seasons] [--season=<year>] | l6 [--all-seasons] [--season=<year>] [--only=players|rankings|teams] | ' +
  'probe-players [--all-seasons] | probe-details --fixture=<id[,id,...]> | status | logos [--force]';

/** `--season=` 검증 — 잘못된 연도로 수백 콜을 태우지 않는다. 부르기 전에 막는다 */
const parseSeasonFlag = (): { ok: true; year: number | undefined } | { ok: false; raw: string } => {
  const raw = flagValue('season');
  if (raw === null) return { ok: true, year: undefined };
  const n = Number(raw);
  if (!Number.isInteger(n) || !(SEASON_YEARS as readonly number[]).includes(n)) return { ok: false, raw };
  return { ok: true, year: n };
};

const hasFlag = (n: string): boolean => process.argv.includes(`--${n}`);
const flagValue = (n: string): string | null => {
  const p = `--${n}=`;
  const hit = process.argv.find((a) => a.startsWith(p));
  return hit ? hit.slice(p.length) : null;
};

async function main(): Promise<void> {
  const [, , command] = process.argv;
  const app = await NestFactory.createApplicationContext(AppModule, { logger: ['log', 'warn', 'error'] });
  try {
    // 로고는 공개 media 호스트에서 받는다 — 키를 요구하지 않는다
    const needsApiKey = command !== 'logos';
    if (needsApiKey && !app.get(ApiFootballClient).isConfigured) {
      logger.error('API_FOOTBALL_KEY 가 없다 — backend/.env 에 넣고 다시 실행');
      process.exitCode = 1;
      return;
    }
    switch (command) {
      case 'status': {
        const q = await app.get(QuotaService).snapshot();
        logger.log(JSON.stringify(q));
        break;
      }
      case 'l0': {
        await app.get(QuotaService).snapshot();
        const s = await app.get(L0Service).run();
        logger.log(JSON.stringify(s, null, 2));
        await app.get(QuotaService).snapshot();
        break;
      }
      case 'l1': {
        await app.get(QuotaService).snapshot();
        const s = await app.get(L1Service).run();
        logger.log(JSON.stringify(s, null, 2));
        await app.get(QuotaService).snapshot();
        if (s.partial) process.exitCode = 1;
        break;
      }
      case 'l2': {
        const season = parseSeasonFlag();
        if (!season.ok) {
          logger.error(`--season=${season.raw} 은 수집 대상이 아니다 — ${SEASON_YEARS.join(' | ')} 중 하나`);
          process.exitCode = 1;
          break;
        }
        await app.get(QuotaService).snapshot();
        const s = await app.get(L2Service).run({ allSeasons: hasFlag('all-seasons'), seasonYear: season.year });
        logger.log(JSON.stringify(s, null, 2));
        await app.get(QuotaService).snapshot();
        if (s.partial) process.exitCode = 1;
        break;
      }
      case 'l6': {
        const season = parseSeasonFlag();
        if (!season.ok) {
          logger.error(`--season=${season.raw} 은 수집 대상이 아니다 — ${SEASON_YEARS.join(' | ')} 중 하나`);
          process.exitCode = 1;
          break;
        }
        // 오타로 갈래 하나를 조용히 다 도는 일이 없게 — 값이 틀리면 부르기 전에 멈춘다
        const onlyRaw = flagValue('only');
        if (onlyRaw !== null && !(L6_BRANCHES as readonly string[]).includes(onlyRaw)) {
          logger.error(`--only=${onlyRaw} 은 없다 — ${L6_BRANCHES.join(' | ')} 중 하나`);
          process.exitCode = 1;
          break;
        }
        await app.get(QuotaService).snapshot();
        const s = await app.get(L6Service).run({
          allSeasons: hasFlag('all-seasons'),
          seasonYear: season.year,
          only: (onlyRaw as L6Branch | null) ?? undefined,
        });
        logger.log(JSON.stringify(s, null, 2));
        await app.get(QuotaService).snapshot();
        if (s.partial) process.exitCode = 1;
        break;
      }
      case 'probe-details': {
        const raw = flagValue('fixture');
        if (raw === null) {
          logger.error('--fixture=<id[,id,...]> 필요 — 예: --fixture=1557377,1557378');
          process.exitCode = 1;
          break;
        }
        const parts = raw.split(',').map((s) => s.trim()).filter(Boolean);
        const ids: number[] = [];
        let hasInvalid = false;
        for (const p of parts) {
          const n = Number(p);
          if (!Number.isInteger(n) || n <= 0) {
            hasInvalid = true;
            break;
          }
          ids.push(n);
        }
        if (hasInvalid || ids.length === 0) {
          logger.error(`--fixture 값이 잘못됐다: ${raw} (양의 정수를 콤마로 구분)`);
          process.exitCode = 1;
          break;
        }
        await app.get(QuotaService).snapshot();
        const summary = await app.get(ProbeService).probeDetails(ids);
        logger.log(JSON.stringify(summary, null, 2));
        await app.get(QuotaService).snapshot();
        if (summary.errors.length > 0) process.exitCode = 1;
        break;
      }
      case 'probe-players': {
        await app.get(QuotaService).snapshot();
        const s = await app.get(ProbeService).probePlayers({ allSeasons: hasFlag('all-seasons') });
        logger.log(JSON.stringify(s, null, 2));
        await app.get(QuotaService).snapshot();
        if (s.rows.some((r) => r.error !== null)) process.exitCode = 1;
        break;
      }
      case 'logos': {
        const force = process.argv.includes('--force');
        const s = await app.get(LogoService).run({ force });
        logger.log(JSON.stringify(s, null, 2));
        if (s.competitions.failed + s.teams.failed > 0) process.exitCode = 1;
        break;
      }
      default:
        logger.error(`알 수 없는 명령: ${command ?? '(없음)'} — ${USAGE}`);
        process.exitCode = 1;
    }
  } finally {
    await app.close();
  }
}

await main();
