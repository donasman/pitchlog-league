-- partial unique index 3개 — Prisma 스키마로 표현되지 않는다 (SCHEMA_DESIGN 11장)
--
-- 적용 방법:
--   npx prisma migrate dev --create-only --name init
--   → 생성된 prisma/migrations/<ts>_init/migration.sql 끝에 이 파일 내용을 붙인다
--   → npx prisma migrate dev
--
-- 잊으면 중복이 조용히 들어온다:
--   · 한 대회에 현재 시즌이 둘
--   · 한 선수가 같은 시즌에 현재 소속이 둘 (백필과 주간 diff 충돌 시)
--   · 한 팀에 현재 감독이 둘

-- 대회당 현재 시즌은 하나 (설계검토 A-1)
CREATE UNIQUE INDEX IF NOT EXISTS "competition_seasons_current_uq"
  ON "competition_seasons" ("competition_id")
  WHERE "is_current" = true;

-- 한 시즌에 현재 소속 팀은 하나 — is_current 컬럼 대신 valid_to IS NULL 이 유일한 진실 (A-3)
CREATE UNIQUE INDEX IF NOT EXISTS "squad_entries_current_uq"
  ON "squad_entries" ("player_id", "season_year")
  WHERE "valid_to" IS NULL;

-- 한 팀에 현재 감독은 하나
CREATE UNIQUE INDEX IF NOT EXISTS "coach_tenures_current_uq"
  ON "coach_tenures" ("team_id")
  WHERE "valid_to" IS NULL;

-- 라이브 조회 부분 인덱스 — 진행 중 경기만 (SCHEMA_DESIGN 3-3). 선택 사항이지만 싸다
CREATE INDEX IF NOT EXISTS "matches_live_idx"
  ON "matches" ("kickoff_at")
  WHERE "status_short" IN ('1H', 'HT', '2H', 'ET', 'BT', 'P', 'LIVE');
