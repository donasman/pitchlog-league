/**
 * /status 적재 + 경고선 판단 (INGESTION_STRATEGY 3-5).
 * 6,000콜/일(한도의 80%)을 넘으면 스케줄러가 폴링을 15초로 강등한다.
 * current() 는 기록 없는 확인(상세 백필), snapshot() 은 기록(하루 1회 잡 · CLI). 만료 임박 warn 은 프로세스당 UTC 하루 1회.
 */
import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';
import { ApiFootballClient } from './api-football.client.js';
import type { ApiStatus } from './api-football.types.js';

export const WARN_THRESHOLD = 6_000;

/** 만료까지 이 기간 미만이면 만료 임박 warn */
const EXPIRY_WARN_MS = 14 * 86_400_000;

@Injectable()
export class QuotaService {
  private readonly logger = new Logger(QuotaService.name);
  /** 만료 임박 warn 을 마지막으로 낸 UTC 날짜(YYYY-MM-DD). 같은 날이면 다시 내지 않는다 */
  private lastExpiryWarnUtcYmd: string | null = null;

  constructor(
    private readonly api: ApiFootballClient,
    private readonly prisma: PrismaService,
  ) {}

  /**
   * /status 1콜 · 기록(INSERT) 없이 현재 사용량만 — 상세 백필의 예산 판정용.
   * 하루 기록은 snapshot()(QuotaSnapshotJob · CLI).
   */
  async current(): Promise<{ used: number; limit: number; overWarn: boolean; expiresOn: Date | null }> {
    const { used, limit, overWarn, expiresOn } = await this.fetchStatus();

    if (overWarn) this.logger.warn(`API 사용량 ${used}/${limit} — 경고선 ${WARN_THRESHOLD} 초과`);
    else this.logger.debug(`API 사용량 ${used}/${limit}`);

    this.warnExpiryOncePerUtcDay(expiresOn);
    return { used, limit, overWarn, expiresOn };
  }

  /** /status 1콜. 스냅샷을 남기고 현재 사용량을 돌려준다 */
  async snapshot(): Promise<{ used: number; limit: number; overWarn: boolean; expiresOn: Date | null }> {
    const { used, limit, overWarn, expiresOn, plan } = await this.fetchStatus();

    await this.prisma.apiQuotaSnapshot.create({
      data: { callsUsed: used, limitDay: limit, plan, expiresOn },
    });

    if (overWarn) this.logger.warn(`API 사용량 ${used}/${limit} — 경고선 ${WARN_THRESHOLD} 초과`);
    else this.logger.log(`API 사용량 ${used}/${limit}`);

    this.warnExpiryOncePerUtcDay(expiresOn);
    return { used, limit, overWarn, expiresOn };
  }

  /** /status 1콜 → 사용량 계산. INSERT·로그 없음. plan 은 snapshot() 의 기록에만 쓴다 */
  private async fetchStatus(): Promise<{
    used: number;
    limit: number;
    overWarn: boolean;
    expiresOn: Date | null;
    plan: string | null;
  }> {
    const { response } = await this.api.get<ApiStatus>('/status');
    const used = response.requests.current;
    const limit = response.requests.limit_day;
    const expiresOn = response.subscription?.end ? new Date(response.subscription.end) : null;
    const overWarn = used >= WARN_THRESHOLD;
    return { used, limit, overWarn, expiresOn, plan: response.subscription?.plan ?? null };
  }

  /**
   * 만료 14일 미만이면 warn — 프로세스당 UTC 하루 1회.
   * UTC 날짜는 live-observer.service.ts(lastFinalizedUtcYmd) 와 같은 `toISOString().slice(0, 10)`.
   */
  private warnExpiryOncePerUtcDay(expiresOn: Date | null): void {
    if (!expiresOn) return;
    const now = new Date();
    if (expiresOn.getTime() - now.getTime() >= EXPIRY_WARN_MS) return;
    const todayYmd = now.toISOString().slice(0, 10);
    if (this.lastExpiryWarnUtcYmd === todayYmd) return;
    this.lastExpiryWarnUtcYmd = todayYmd;
    this.logger.warn(`API-Football 구독 만료 임박: ${expiresOn.toISOString().slice(0, 10)}`);
  }
}
