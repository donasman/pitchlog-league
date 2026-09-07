-- 통계 확정 상태 (PRD 4-2 · SCHEMA_DESIGN 3-3, 2026-09-07 결정). L2 는 기본값 NONE 만 쓰고 L5 가 올린다
-- CreateEnum
CREATE TYPE "StatsState" AS ENUM ('NONE', 'RECHECK', 'CONFIRMED');

-- AlterTable
ALTER TABLE "matches"
  ADD COLUMN "stats_state" "StatsState" NOT NULL DEFAULT 'NONE',
  ADD COLUMN "confirmed_at" TIMESTAMPTZ(6);
