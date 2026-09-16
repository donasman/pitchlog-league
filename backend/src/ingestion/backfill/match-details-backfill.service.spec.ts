/**
 * MatchDetailsBackfillService dailyCap 주입 (feat/backfill-daily-cap-env).
 *
 * run() 전체를 mock 하지 않는다 — constructor 가 ConfigService.get('BACKFILL_DAILY_CAP') 을
 * 읽어 this.dailyCap 에 넣는지만 검증. 예산 계산(effectiveLimit = min(q.limit, this.dailyCap))
 * 은 dailyCap 필드를 직접 참조하므로 이 필드가 주입값과 같으면 계약 성립.
 *
 * 다른 의존성은 사용되지 않으므로 {} 로 대체.
 */
import { describe, expect, it, vi } from 'vitest';
import type { ConfigService } from '@nestjs/config';
import { MatchDetailsBackfillService } from './match-details-backfill.service.js';
import type { EnvironmentVariables } from '../../config/env.validation.js';

function makeService(dailyCap: number): MatchDetailsBackfillService {
  const config = {
    get: vi.fn().mockReturnValue(dailyCap),
  } as unknown as ConfigService<EnvironmentVariables, true>;
  return new MatchDetailsBackfillService(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    {} as any, {} as any, {} as any, {} as any,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    {} as any, {} as any, {} as any, {} as any,
    config,
  );
}

describe('MatchDetailsBackfillService · dailyCap 주입', () => {
  it('ConfigService 로 6800 주입 시 dailyCap=6800 (백필-2 운영값)', () => {
    const svc = makeService(6800);
    expect(svc.dailyCap).toBe(6800);
  });

  it('기본값 5700 (env 미설정 시 validateEnv 가 채워 주입)', () => {
    const svc = makeService(5700);
    expect(svc.dailyCap).toBe(5700);
  });
});
