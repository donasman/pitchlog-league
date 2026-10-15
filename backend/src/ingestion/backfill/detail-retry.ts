/**
 * 상세 백필 대상 조건 · 재시도 판정 — 순수 함수. DB 도 API 도 부르지 않는다.
 *
 * ## 왜 커서를 버리나
 *   `backfill_jobs.cursor_match_id` 는 "id > cursor" 로만 앞으로 갔다. id 가 작은데 늦게 끝난
 *   경기와 실패한 경기는 커서 뒤로 밀려 **영구히** 대상에서 빠졌다.
 *   그래서 커서 대신 경기마다 시도 횟수(`matches.detail_attempts`) · 마지막 시도 시각
 *   (`matches.detail_last_attempt_at`) 을 둔다. 대상 조건에 `id` 는 없다.
 *
 * ## 재시도 정책
 *   - 0회: 즉시 대상
 *   - 1회 실패 뒤: 마지막 시도로부터 1h 지나야 다시 대상
 *   - 2회 실패 뒤: 마지막 시도로부터 6h 지나야 다시 대상
 *   - 3회 실패: 영구 제외 (`DETAIL_MAX_ATTEMPTS`). 자동 복구 없음 — 원인을 본 뒤 수동 SQL 로 되살린다.
 *       UPDATE matches SET detail_attempts = 0, detail_last_attempt_at = NULL WHERE ...;
 *   백오프 배열 인덱스 = attempts − 1. 그래서 `DETAIL_MAX_ATTEMPTS === DETAIL_RETRY_BACKOFF_MS.length + 1`.
 *
 * ## 소유권
 *   두 컬럼을 쓰는 곳은 상세 백필(`MatchDetailsBackfillService`) 하나뿐이다.
 *   `detail_checked_at` 은 여기서도 읽기만 한다 — 올리는 쪽은 `promoteIfAllDetailsChecked` (L3·L5).
 *
 * 킥오프 24h 잠금 상수 `RECENT_MATCH_LOCK_MS` 는 이 파일에만 있다 — 상세 백필은 `detailTargetWhere` 를 거쳐 쓴다.
 */
import type { Prisma } from '../../generated/prisma/client.js';

/** 킥오프 뒤 24h 안의 경기는 대상이 아니다 (상세 백필의 기존 24시간 컷과 같은 값) */
export const RECENT_MATCH_LOCK_MS = 24 * 60 * 60 * 1_000;

/** 상세를 모으는 종료 상태. `where.statusShort.in` 에 그대로 펼쳐 넣는다 */
export const DETAIL_FINISHED_STATUSES = ['FT', 'AET', 'PEN'] as const;

/** 이 횟수만큼 실패하면 영구 제외 */
export const DETAIL_MAX_ATTEMPTS = 3;

/** 재시도 대기 — 인덱스 = attempts − 1 (1회 뒤 1h · 2회 뒤 6h) */
export const DETAIL_RETRY_BACKOFF_MS: readonly number[] = [60 * 60 * 1_000, 6 * 60 * 60 * 1_000];

/** 재시도 창 — 0회는 즉시, n회는 마지막 시도가 백오프[n−1] 보다 오래됐을 때만 */
export function detailRetryWhere(now: Date): Prisma.MatchWhereInput {
  return {
    OR: [
      { detailAttempts: 0 },
      ...DETAIL_RETRY_BACKOFF_MS.map((ms, i) => ({
        detailAttempts: i + 1,
        detailLastAttemptAt: { lt: new Date(now.getTime() - ms) },
      })),
    ],
  };
}

/** 한 대회시즌의 상세 백필 대상. 커서(`id > cursor`) 조건은 두지 않는다 */
export function detailTargetWhere(competitionSeasonId: number, now: Date): Prisma.MatchWhereInput {
  return {
    competitionSeasonId,
    detailEligible: true,
    detailCheckedAt: null,
    statusShort: { in: [...DETAIL_FINISHED_STATUSES] },
    kickoffAt: { lt: new Date(now.getTime() - RECENT_MATCH_LOCK_MS) },
    ...detailRetryWhere(now),
  };
}

/** 이번 시도로 승격되지 못했고 시도 횟수가 상한에 닿았으면 포기(영구 제외) */
export function isDetailGiveUp(promoted: boolean, attemptsAfter: number): boolean {
  return !promoted && attemptsAfter >= DETAIL_MAX_ATTEMPTS;
}
