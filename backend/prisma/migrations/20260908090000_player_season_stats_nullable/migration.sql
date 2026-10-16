-- 시즌 집계의 "측정 안 됨" 을 0 과 구분한다 (DATA_RULES 3-2 확장, 2026-09-08).
-- 근거 — API_FIELDS_FULL.md 의 `/players` "null 로 온 필드" 목록 (2026 · 2020 · 2015 실측):
--   · goals.assists · cards.yellowred 는 **2026 목록에는 없고 2020·2015 목록에만 있다**.
--     최신 시즌은 값을 주는데 과거 시즌만 null 이라면 "0회" 가 아니라 그 시즌 커버리지가 없다는 뜻이다.
--   · passes.key 는 세 시즌 **모두** null 로 오는데 3-1(null→0) 목록에도 3-2(null 유지) 목록에도
--     없어 규칙 자체가 미정의였다 → 안전한 쪽(null 유지)을 고른다.
--   · shots.* · tackles.* · duels.* · dribbles.success 도 2026 에 null 로 오지만 3-1 이 이미
--     "null→0" 으로 규정한 필드라 그대로 0 으로 접는다. 이 셋만 예외인 이유가 그것이다.
-- DEFAULT 도 같이 뗀다 — 값을 안 넣으면 0 이 아니라 "모름" 이어야 한다.
ALTER TABLE "player_season_stats"
  ALTER COLUMN "assists"         DROP NOT NULL,
  ALTER COLUMN "assists"         DROP DEFAULT,
  ALTER COLUMN "yellowred_cards" DROP NOT NULL,
  ALTER COLUMN "yellowred_cards" DROP DEFAULT,
  ALTER COLUMN "passes_key"      DROP NOT NULL,
  ALTER COLUMN "passes_key"      DROP DEFAULT;
