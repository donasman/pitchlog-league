// 순수 함수 모듈. NestJS DI 없음.
// 09-26 L4 2판 (쓰기 모드 · 역행 가드) 계약 D6-a.

// 라이브(진행 중) 상태 — /api/live 필터·countLive 등이 재사용.
export const LIVE_STATUSES: readonly string[] = [
  '1H', 'HT', '2H', 'ET', 'BT', 'P', 'SUSP', 'INT', 'LIVE',
];

// 종료 상태 — 스코어 확정.
export const TERMINAL_STATUSES: readonly string[] = ['FT', 'AET', 'PEN'];

// 무산/조기종료 상태 — 관측 중단 + 최상위 rank.
export const CANCELLED_STATUSES: readonly string[] = ['PST', 'CANC', 'ABD', 'AWD', 'WO'];

// /api/live 창 · L4 2판 후속 (fix/l4-live-window-bounds)
//
// finishedAt 은 Match 모델에 없다 (schema.prisma 437-508). kickoff_at 기준 창으로 근사한다.
//   진행 중       = status ∈ LIVE_STATUSES    AND kickoff_at ≥ now − LIVE_LOOKBACK_MS  (6h · A매치·연장·PSO 여유 포함)
//   최근 종료     = status ∈ TERMINAL_STATUSES AND kickoff_at ≥ now − RECENTLY_FINISHED_LOOKBACK_MS
//                                                             (5h · ≈ FT 후 3h · 90'+휴식+연장 여유)
//   L2 보호 만료  = 같은 6시간 · 킥오프 6시간이 지난 진행 중 행은 L2 매일이 다시 덮어 복구
export const LIVE_LOOKBACK_MS: number = 6 * 60 * 60 * 1000;
export const RECENTLY_FINISHED_LOOKBACK_MS: number = 5 * 60 * 60 * 1000;

// 상태 → 순위. SUSP/INT/LIVE 는 null 반환 — 호출자는 "DB 현재 rank 를 그대로 취급" 규칙을 적용.
export function statusRank(status: string): number | null {
  switch (status) {
    case 'NS': case 'TBD': return 0;
    case '1H': return 1;
    case 'HT': return 2;
    case '2H': return 3;
    case 'ET': return 4;
    case 'BT': return 5;
    case 'P':  return 6;
    case 'FT': case 'AET': case 'PEN': return 7;
    case 'PST': case 'CANC': case 'ABD': case 'AWD': case 'WO': return 8;
    default: return null; // SUSP · INT · LIVE · 알 수 없는 값
  }
}

export interface RankInput {
  statusShort: string;
  elapsed: number | null;
}

// 쓰기 허용 판정 (D6-a).
// - cur 은 DB 의 현재 값 (없으면 null · 모든 것이 허용됨)
// - next 는 새로 받아 쓰려는 값
// - SUSP/INT/LIVE 는 rank null — "같은 rank 로 취급" 규칙:
//   * next 가 SUSP/INT/LIVE 면 curRank 를 그대로 newRank 로 본다
//   * cur 이 SUSP/INT/LIVE 면 curRank 를 next 의 rank (있으면) 와 비교하지 않고 조건적 통과
//     (실제로는 다음 tick 에 정상 상태로 전이될 때 판정)
// - 판정: newRank > curRank  OR  (newRank == curRank AND coalesce(newElapsed,0) >= coalesce(curElapsed,0))
// - 스코어는 조건에 넣지 않는다.
export function isWriteAllowed(cur: RankInput | null, next: RankInput): boolean {
  if (!cur) return true;

  const curRank = statusRank(cur.statusShort);
  const nextRankRaw = statusRank(next.statusShort);

  // next 가 알 수 없는 rank (SUSP/INT/LIVE 등) — curRank 를 그대로 취급.
  const newRank = nextRankRaw ?? curRank;
  // cur 이 알 수 없는 rank — 비교 기준을 next 로 맞추면 항상 같은 rank 가 됨.
  const compareCur = curRank ?? newRank;

  if (newRank === null || compareCur === null) return true; // 둘 다 알 수 없음 — 허용

  if (newRank > compareCur) return true;
  if (newRank < compareCur) return false;

  // 같은 rank — elapsed 비교
  const cE = cur.elapsed ?? 0;
  const nE = next.elapsed ?? 0;
  return nE >= cE;
}
