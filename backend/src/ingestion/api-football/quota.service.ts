/**
 * /status 적재 + 경고선 판단 (INGESTION_STRATEGY 3-5).
 * 6,000콜/일(한도의 80%)을 넘으면 스케줄러가 폴링을 15초로 강등한다.
 */
import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';
import { ApiFootballClient } from './api-football.client.js';
import type { ApiStatus } from './api-football.types.js';

export const WARN_THRESHOLD = 6_000;

@Injectable()
export class QuotaService {
  private readonly logger = new Logger(QuotaService.name);

  constructor(
    private readonly api: ApiFootballClient,
    private readonly prisma: PrismaService,
  ) {}

  /** /status 1콜. 스냅샷을 남기고 현재 사용량을 돌려준다 */
  async snapshot(): Promise<{ used: number; limit: number; overWarn: boolean; expiresOn: Date | null }> {
    const { response } = await this.api.get<ApiStatus>('/status');
    const used = response.requests.current;
    const limit = response.requests.limit_day;
    const expiresOn = response.subscription?.end ? new Date(response.subscription.end) : null;

    await this.prisma.apiQuotaSnapshot.create({
      data: { callsUsed: used, limitDay: limit, plan: response.subscription?.plan ?? null, expiresOn },
    });

    const overWarn = used >= WARN_THRESHOLD;
    if (overWarn) this.logger.warn(`API 사용량 ${used}/${limit} — 경고선 ${WARN_THRESHOLD} 초과`);
    else this.logger.log(`API 사용량 ${used}/${limit}`);

    if (expiresOn && expiresOn.getTime() - Date.now() < 14 * 86_400_000) {
      this.logger.warn(`API-Football 구독 만료 임박: ${expiresOn.toISOString().slice(0, 10)}`);
    }
    return { used, limit, overWarn, expiresOn };
  }
}
