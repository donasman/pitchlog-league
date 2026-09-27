/**
 * L3LineupsService.persist — 승격 헬퍼 호출 계약 유닛.
 *
 * 판 A(L3/L5 배치)와 판 B(L4 라이브) 가 같은 persist() 를 공유한다.
 * 라이브에서는 다른 갈래가 아직 채워지지 않은 상태로 부를 수 있으므로
 * opts.promote=false 일 때 promoteIfAllDetailsChecked 를 절대 부르면 안 된다.
 *
 * 여기서는 진짜 저장 로직·트랜잭션은 검증하지 않는다 — 그건 test/l3.e2e-spec.ts 소관.
 * 이 파일은 빈 items 로 persist 를 호출해 최소 경로만 통과시키고 (findUnique →
 * updateMany → 조건부 promote) 승격 헬퍼 호출 여부만 관측한다.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { PrismaService } from '../../prisma/prisma.service.js';
import type { ApiFootballClient } from '../api-football/api-football.client.js';

// promote 헬퍼는 모듈 스코프 함수라 vi.mock 로 갈아끼운다. 아래 import 는
// 모킹된 버전을 참조하게 되고, 서비스가 부르는 곳도 같은 모듈이라 같은 스텁을 본다.
vi.mock('../../common/match-detail-status.js', () => ({
  promoteIfAllDetailsChecked: vi.fn(async () => ({ promoted: false, hasAll: false })),
}));

import { promoteIfAllDetailsChecked } from '../../common/match-detail-status.js';
import { L3LineupsService } from './lineups.service.js';

describe('L3LineupsService.persist — 승격 헬퍼 호출 계약', () => {
  const MATCH_ID = 1;
  const API_FIXTURE_ID = 999_001;

  let prisma: {
    match: {
      findUnique: ReturnType<typeof vi.fn>;
      updateMany: ReturnType<typeof vi.fn>;
    };
  };
  let api: { get: ReturnType<typeof vi.fn> };
  let service: L3LineupsService;

  beforeEach(() => {
    vi.mocked(promoteIfAllDetailsChecked).mockClear();

    prisma = {
      match: {
        findUnique: vi.fn(async () => ({
          id: MATCH_ID,
          apiFixtureId: API_FIXTURE_ID,
          detailEligible: true,
          homeTeamId: 10,
          awayTeamId: 20,
        })),
        updateMany: vi.fn(async () => ({ count: 1 })),
      },
    };
    api = { get: vi.fn() };

    service = new L3LineupsService(
      prisma as unknown as PrismaService,
      api as unknown as ApiFootballClient,
    );
  });

  it('persist({promote:false}) 는 promoteIfAllDetailsChecked 를 부르지 않는다 (빈 응답 브랜치)', async () => {
    const res = await service.persist(MATCH_ID, API_FIXTURE_ID, [], { promote: false });

    expect(res.ok).toBe(true);
    expect(res.hasLineups).toBe(false);
    expect(res.promoted).toBe(false);
    expect(promoteIfAllDetailsChecked).not.toHaveBeenCalled();
    // 외부 호출은 persist 안에서 하지 않는다
    expect(api.get).not.toHaveBeenCalled();
  });

  it('persist({promote:true}) 는 promoteIfAllDetailsChecked 를 정확히 한 번 부른다 (빈 응답 브랜치)', async () => {
    const res = await service.persist(MATCH_ID, API_FIXTURE_ID, [], { promote: true });

    expect(res.ok).toBe(true);
    expect(res.hasLineups).toBe(false);
    expect(promoteIfAllDetailsChecked).toHaveBeenCalledTimes(1);
    expect(promoteIfAllDetailsChecked).toHaveBeenCalledWith(prisma, MATCH_ID);
  });
});
