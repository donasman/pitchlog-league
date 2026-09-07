/**
 * 수집 CLI — 스케줄러 없이 수동 실행.
 *   npm run ingest -- l0
 *   npm run ingest -- l1
 *   npm run ingest -- l2 [--all-seasons] [--season=<year>]
 *   npm run ingest -- probe-players [--all-seasons]
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
import { LogoService } from '../ingestion/logos/logo.service.js';
import { ProbeService } from '../ingestion/probe/probe.service.js';
import { QuotaService } from '../ingestion/api-football/quota.service.js';
import { ApiFootballClient } from '../ingestion/api-football/api-football.client.js';
import { SEASON_YEARS } from '../ingestion/l0/competitions.catalog.js';

const logger = new Logger('ingest');

const USAGE = 'l0 | l1 | l2 [--all-seasons] [--season=<year>] | probe-players [--all-seasons] | status | logos [--force]';

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
        const raw = flagValue('season');
        let seasonYear: number | undefined;
        if (raw !== null) {
          // 잘못된 연도로 90콜을 태우지 않는다 — 부르기 전에 막는다
          const n = Number(raw);
          if (!Number.isInteger(n) || !(SEASON_YEARS as readonly number[]).includes(n)) {
            logger.error(`--season=${raw} 은 수집 대상이 아니다 — ${SEASON_YEARS.join(' | ')} 중 하나`);
            process.exitCode = 1;
            break;
          }
          seasonYear = n;
        }
        await app.get(QuotaService).snapshot();
        const s = await app.get(L2Service).run({ allSeasons: hasFlag('all-seasons'), seasonYear });
        logger.log(JSON.stringify(s, null, 2));
        await app.get(QuotaService).snapshot();
        if (s.partial) process.exitCode = 1;
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
