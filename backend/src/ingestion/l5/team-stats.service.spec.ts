/**
 * L5TeamStatsService.persist — 승격 헬퍼 호출 계약 유닛.
 *
 * 판 A(L3/L5 배치)와 판 B(L4 라이브) 가 같은 persist() 를 공유한다.
 * opts.promote=false 이면 promoteIfAllDetailsChecked 는 절대 안 부른다.
 *
 * 실제 18항목 파싱·team_match_stats upsert 는 e2e 소관.
 * 여기서는 빈 items 로 최소 경로만 (findUnique → updateMany → 조건부 promote)
 * 통과시켜 승격 호출 여부만 확인한다.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { PrismaService } from '../../prisma/prisma.service.js';
import type { ApiFootballClient } from '../api-football/api-football.client.js';

vi.mock('../../common/match-detail-status.js', () => ({
  promoteIfAllDetailsChecked: vi.fn(async () => ({ promoted: false, hasAll: false })),
}));

import { promoteIfAllDetailsChecked } from '../../common/match-detail-status.js';
import { L5TeamStatsService } from './team-stats.service.js';

describe('L5TeamStatsService.persist — 승격 헬퍼 호출 계약', () => {
  const MATCH_ID = 3;
  const API_FIXTURE_ID = 999_003;

  let prisma: {
    match: {
      findUnique: ReturnType<typeof vi.fn>;
      updateMany: ReturnType<typeof vi.fn>;
    };
  };
  let api: { get: ReturnType<typeof vi.fn> };
  let service: L5TeamStatsService;

  beforeEach(() => {
    vi.mocked(promoteIfAllDetailsChecked).mockClear();

    prisma = {
      match: {
        findUnique: vi.fn(async () => ({
          id: MATCH_ID,
          apiFixtureId: API_FIXTURE_ID,
          detailEligible: true,
        })),
        updateMany: vi.fn(async () => ({ count: 1 })),
      },
    };
    api = { get: vi.fn() };

    service = new L5TeamStatsService(
      prisma as unknown as PrismaService,
      api as unknown as ApiFootballClient,
    );
  });

  it('persist({promote:false}) 는 promoteIfAllDetailsChecked 를 부르지 않는다 (빈 응답 브랜치)', async () => {
    const res = await service.persist(MATCH_ID, API_FIXTURE_ID, [], { promote: false });

    expect(res.ok).toBe(true);
    expect(res.hasTeamStats).toBe(false);
    expect(res.promoted).toBe(false);
    expect(promoteIfAllDetailsChecked).not.toHaveBeenCalled();
    expect(api.get).not.toHaveBeenCalled();
  });

  it('persist({promote:true}) 는 promoteIfAllDetailsChecked 를 정확히 한 번 부른다 (빈 응답 브랜치)', async () => {
    const res = await service.persist(MATCH_ID, API_FIXTURE_ID, [], { promote: true });

    expect(res.ok).toBe(true);
    expect(res.hasTeamStats).toBe(false);
    expect(promoteIfAllDetailsChecked).toHaveBeenCalledTimes(1);
    expect(promoteIfAllDetailsChecked).toHaveBeenCalledWith(prisma, MATCH_ID);
  });
});
