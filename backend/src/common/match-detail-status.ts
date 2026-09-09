/**
 * L3~L5 공용 승격 헬퍼 — 네 개의 상세 갈래(lineups·events·team stats·player stats)가
 * 모두 non-NULL 이 되면 그 경기를 CONFIRMED 로 올린다 (DATA_RULES 3장, D20).
 *
 * 규칙:
 *   · 네 has_* 가 하나라도 NULL 이면 아무것도 하지 않는다 (미확인).
 *   · `detail_eligible = true` 인 행만 대상. updateMany + count === 1 로 소유권 검사.
 *   · 갱신 컬럼은 `detail_checked_at` · `stats_state` · `confirmed_at` 뿐.
 *     `tie_id` · `leg` · `data_version` 등 다른 계층 소유 컬럼은 절대 건드리지 않는다 (D18).
 *
 * L3 두 서비스가 각자 자기 갈래(hasLineups·hasEvents)를 쓴 뒤 이 함수를 부른다.
 * 다른 두 갈래가 아직 NULL 이면 hasAll=false 로 조용히 반환한다.
 */
import { StatsState } from '../generated/prisma/client.js';
import type { PrismaService } from '../prisma/prisma.service.js';

export interface PromoteResult {
  /** stats_state 가 CONFIRMED 로 올라갔는가 */
  promoted: boolean;
  /** 네 has_* 가 모두 non-NULL 인가 (승격 조건 충족 여부) */
  hasAll: boolean;
}

export async function promoteIfAllDetailsChecked(
  prisma: PrismaService,
  matchId: number,
): Promise<PromoteResult> {
  const m = await prisma.match.findUnique({
    where: { id: matchId },
    select: {
      hasLineups: true,
      hasEvents: true,
      hasTeamStats: true,
      hasPlayerStats: true,
      detailCheckedAt: true,
      statsState: true,
    },
  });
  if (!m) return { promoted: false, hasAll: false };

  const hasAll =
    m.hasLineups !== null &&
    m.hasEvents !== null &&
    m.hasTeamStats !== null &&
    m.hasPlayerStats !== null;
  if (!hasAll) return { promoted: false, hasAll: false };

  const now = new Date();
  const res = await prisma.match.updateMany({
    where: { id: matchId, detailEligible: true },
    data: {
      detailCheckedAt: now,
      statsState: StatsState.CONFIRMED,
      confirmedAt: now,
    },
  });
  return { promoted: res.count === 1, hasAll: true };
}
