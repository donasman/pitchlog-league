-- 경기 단위 상세 재시도 상태 (fix/details-backfill-retry · 2026-10-15).
-- backfill_jobs.cursor_match_id 커서는 id 가 작은데 늦게 끝난 경기와 실패한 경기를 영구히 건너뛰었다.
-- 커서를 버리고 경기마다 시도 횟수 · 마지막 시도 시각을 둔다. 쓰는 곳은 상세 백필(MatchDetailsBackfillService) 하나뿐.
-- 추가형 — 기존 행은 0 · NULL 로 채워진다. 외래키 없음 (relationMode = "prisma").
-- AlterTable
ALTER TABLE "matches"
  ADD COLUMN "detail_attempts" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "detail_last_attempt_at" TIMESTAMPTZ(6);
