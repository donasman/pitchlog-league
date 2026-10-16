/**
 * 대회시즌의 데이터 완성도 — 프론트 시즌 선택기가 이걸로 노출 여부를 정한다 (2026-09-07 결정, NEXT_STEPS 7장).
 * `competition_seasons.status`(UPCOMING/IN_PROGRESS/FINISHED) 는 시즌의 진행 상태이지 우리가 받았는지가 아니다.
 * "데이터 없음" 과 "아직 안 받음" 을 구분하려면 backfill_jobs 를 봐야 한다.
 */
import { BackfillPhase } from '../generated/prisma/client.js';

export type DataState = 'NONE' | 'PARTIAL' | 'COMPLETE';
export const DATA_STATES: readonly DataState[] = ['NONE', 'PARTIAL', 'COMPLETE'];

export function dataStateOf(job: { phase: BackfillPhase } | null | undefined): DataState {
  if (!job || job.phase === BackfillPhase.PENDING) return 'NONE';
  if (job.phase === BackfillPhase.DONE) return 'COMPLETE';
  return 'PARTIAL'; // L0 · FIXTURES · DETAILS · RANKINGS · FAILED — 일부는 들어와 있다
}
