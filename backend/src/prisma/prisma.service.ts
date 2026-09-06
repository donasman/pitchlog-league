/**
 * Prisma 7 — 드라이버 어댑터 필수. Rust 엔진 없이 pg 로 직접 붙는다.
 *
 * relationMode = "prisma" 이므로 DB 에 외래키가 없다. 참조 무결성은
 * 도메인 서비스가 지키고, IntegrityService 가 주기적으로 검사한다.
 */
import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../generated/prisma/client.js';
import type { EnvironmentVariables } from '../config/env.validation.js';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);

  constructor(config: ConfigService<EnvironmentVariables, true>) {
    const adapter = new PrismaPg({
      connectionString: config.get('DATABASE_URL', { infer: true }),
      // Supabase 무료 플랜 동시 연결 200. 단일 인스턴스 기준 여유 있게
      max: 10,
    });
    super({
      adapter,
      log:
        config.get('NODE_ENV', { infer: true }) === 'development'
          ? [{ emit: 'event', level: 'query' }, 'warn', 'error']
          : ['warn', 'error'],
    });
  }

  async onModuleInit(): Promise<void> {
    await this.$connect();
    this.logger.log('PostgreSQL 연결');
  }

  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
  }

  /** 헬스체크용 — 연결만 확인한다 */
  async ping(): Promise<boolean> {
    try {
      await this.$queryRaw`SELECT 1`;
      return true;
    } catch (err) {
      this.logger.error('DB ping 실패', err instanceof Error ? err.stack : String(err));
      return false;
    }
  }
}
