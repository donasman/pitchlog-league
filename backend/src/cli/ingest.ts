/**
 * 수집 CLI — 스케줄러 없이 수동 실행.
 *   npm run ingest -- l0
 *   npm run ingest -- status
 *
 * HTTP 서버를 띄우지 않고 애플리케이션 컨텍스트만 만든다.
 */
import { NestFactory } from '@nestjs/core';
import { Logger } from '@nestjs/common';
import { AppModule } from '../app.module.js';
import { L0Service } from '../ingestion/l0/l0.service.js';
import { QuotaService } from '../ingestion/api-football/quota.service.js';
import { ApiFootballClient } from '../ingestion/api-football/api-football.client.js';

const logger = new Logger('ingest');

async function main(): Promise<void> {
  const [, , command] = process.argv;
  const app = await NestFactory.createApplicationContext(AppModule, { logger: ['log', 'warn', 'error'] });
  try {
    if (!app.get(ApiFootballClient).isConfigured) {
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
      default:
        logger.error(`알 수 없는 명령: ${command ?? '(없음)'} — l0 | status`);
        process.exitCode = 1;
    }
  } finally {
    await app.close();
  }
}

await main();
