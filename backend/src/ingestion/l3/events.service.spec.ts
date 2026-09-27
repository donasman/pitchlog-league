/**
 * L3EventsService.persist — 승격 헬퍼 호출 계약 유닛.
 *
 * 판 A(L3/L5 배치)와 판 B(L4 라이브) 가 같은 persist() 를 공유한다.
 * opts.promote=false 이면 promoteIfAllDetailsChecked 는 절대 안 부른다.
 *
 * 실제 정렬·delete+insert·트랜잭션은 test/l3.e2e-spec.ts 가 검증한다.
 * 여기서는 빈 items 로 최소 경로만 (findUnique → $transaction → 조건부 promote)
 * 통과시켜 승격 호출 여부만 확인한다.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { PrismaService } from '../../prisma/prisma.service.js';
import type { ApiFootballClient } from '../api-football/api-football.client.js';

vi.mock('../../common/match-detail-status.js', () => ({
  promoteIfAllDetailsChecked: vi.fn(async () => ({ promoted: false, hasAll: false })),
}));

import { promoteIfAllDetailsChecked } from '../../common/match-detail-status.js';
import { L3EventsService } from './events.service.js';

describe('L3EventsService.persist — 승격 헬퍼 호출 계약', () => {
  const MATCH_ID = 2;
  const API_FIXTURE_ID = 999_002;

  let prisma: {
    match: {
      findUnique: ReturnType<typeof vi.fn>;
      updateMany: ReturnType<typeof vi.fn>;
    };
    matchEvent: {
      deleteMany: ReturnType<typeof vi.fn>;
    };
    $transaction: ReturnType<typeof vi.fn>;
  };
  let api: { get: ReturnType<typeof vi.fn> };
  let service: L3EventsService;

  beforeEach(() => {
    vi.mocked(promoteIfAllDetailsChecked).mockClear();

    prisma = {
      match: {
        findUnique: vi.fn(async () => ({
          id: MATCH_ID,
          apiFixtureId: API_FIXTURE_ID,
          detailEligible: true,
        })),
        // 빈 응답 브랜치 안 $transaction([...]) 이 array 원소를 만들 때
        // match.updateMany({...}) 호출을 즉시 부른다 (실행은 $transaction 안에서)
        updateMany: vi.fn(async () => ({ count: 1 })),
      },
      matchEvent: {
        deleteMany: vi.fn(async () => ({ count: 0 })),
      },
      // 빈 응답 브랜치는 array-form $transaction 을 부른다 — 결과는 안 본다
      $transaction: vi.fn(async () => []),
    };
    api = { get: vi.fn() };

    service = new L3EventsService(
      prisma as unknown as PrismaService,
      api as unknown as ApiFootballClient,
    );
  });

  it('persist({promote:false}) 는 promoteIfAllDetailsChecked 를 부르지 않는다 (빈 응답 브랜치)', async () => {
    const res = await service.persist(MATCH_ID, API_FIXTURE_ID, [], { promote: false });

    expect(res.ok).toBe(true);
    expect(res.hasEvents).toBe(false);
    expect(res.promoted).toBe(false);
    expect(promoteIfAllDetailsChecked).not.toHaveBeenCalled();
    expect(api.get).not.toHaveBeenCalled();
  });

  it('persist({promote:true}) 는 promoteIfAllDetailsChecked 를 정확히 한 번 부른다 (빈 응답 브랜치)', async () => {
    const res = await service.persist(MATCH_ID, API_FIXTURE_ID, [], { promote: true });

    expect(res.ok).toBe(true);
    expect(res.hasEvents).toBe(false);
    expect(promoteIfAllDetailsChecked).toHaveBeenCalledTimes(1);
    expect(promoteIfAllDetailsChecked).toHaveBeenCalledWith(prisma, MATCH_ID);
  });
});
