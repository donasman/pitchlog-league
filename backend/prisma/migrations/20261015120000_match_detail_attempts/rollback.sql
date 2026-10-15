-- 롤백. migration.sql 에 짝을 맞춰 두 컬럼을 지운다 (추가 역순).
ALTER TABLE "matches"
  DROP COLUMN "detail_last_attempt_at",
  DROP COLUMN "detail_attempts";
