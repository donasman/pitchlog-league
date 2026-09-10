-- 검색용 GIN trigram · btree lower_prefix 인덱스 — Prisma 스키마로 표현되지 않는다
-- (SCHEMA_DESIGN 11장 확장 · 원본: prisma/sql/search-indexes.sql, 그대로 붙였다)
--
-- 스키마 변경이 없어 자동 생성 stub 이 비어 있다 — 아래는 손으로 넣은 것.
-- 실 DB 에는 16개 중 11개 인덱스가 이미 걸려 있다. IF NOT EXISTS 로 흡수한다.
-- 새로 만드는 것은 lower_prefix btree 5개 (players 3 · localized_names 2).

-- 확장: pg_trgm 은 Supabase Postgres 에 미리 설치되어 있지 않다 (실측 EXT_BEFORE=[])
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- ─────────────────────────────────────────────────────────────
-- 1. GIN trigram (3자 이상 부분 일치 · ILIKE '%q%')
-- ─────────────────────────────────────────────────────────────

-- players — 실제 컬럼은 name (NOT NULL) · firstname (NULLABLE) · lastname (NULLABLE).
-- players 에는 short_name 컬럼이 없다 (schema.prisma Player 모델 line 345-373 확인).
CREATE INDEX IF NOT EXISTS players_name_trgm_idx
  ON players USING GIN (name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS players_firstname_trgm_idx
  ON players USING GIN (firstname gin_trgm_ops)
  WHERE firstname IS NOT NULL;
CREATE INDEX IF NOT EXISTS players_lastname_trgm_idx
  ON players USING GIN (lastname gin_trgm_ops)
  WHERE lastname IS NOT NULL;

-- teams — name (NOT NULL) · short_name (NULLABLE)
CREATE INDEX IF NOT EXISTS teams_name_trgm_idx
  ON teams USING GIN (name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS teams_short_name_trgm_idx
  ON teams USING GIN (short_name gin_trgm_ops)
  WHERE short_name IS NOT NULL;

-- competitions — name 만 존재. short_name 컬럼 자체가 없다 (schema.prisma Competition 모델 확인)
CREATE INDEX IF NOT EXISTS competitions_name_trgm_idx
  ON competitions USING GIN (name gin_trgm_ops);

-- localized_names — name (NOT NULL) · short_name (NULLABLE). 지금은 0행이지만 시드 후 활성
CREATE INDEX IF NOT EXISTS localized_names_name_trgm_idx
  ON localized_names USING GIN (name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS localized_names_short_name_trgm_idx
  ON localized_names USING GIN (short_name gin_trgm_ops)
  WHERE short_name IS NOT NULL;

-- ─────────────────────────────────────────────────────────────
-- 2. btree text_pattern_ops (2자 접두 · lower(col) LIKE 'q%')
-- ─────────────────────────────────────────────────────────────
-- 실측: GIN trigram 은 q.length < 3 이면 인덱스 못 써서 Seq Scan (~67 ms 유지).
-- 2자 접두 btree 로 폴백하면 0.9 ms. 05 API 는 q.length===2 일 때 접두 SQL 을 태운다.

CREATE INDEX IF NOT EXISTS players_name_lower_prefix_idx
  ON players (lower(name) text_pattern_ops);
CREATE INDEX IF NOT EXISTS players_firstname_lower_prefix_idx
  ON players (lower(firstname) text_pattern_ops)
  WHERE firstname IS NOT NULL;
CREATE INDEX IF NOT EXISTS players_lastname_lower_prefix_idx
  ON players (lower(lastname) text_pattern_ops)
  WHERE lastname IS NOT NULL;

CREATE INDEX IF NOT EXISTS teams_name_lower_prefix_idx
  ON teams (lower(name) text_pattern_ops);
CREATE INDEX IF NOT EXISTS teams_short_name_lower_prefix_idx
  ON teams (lower(short_name) text_pattern_ops)
  WHERE short_name IS NOT NULL;

CREATE INDEX IF NOT EXISTS competitions_name_lower_prefix_idx
  ON competitions (lower(name) text_pattern_ops);

CREATE INDEX IF NOT EXISTS localized_names_name_lower_prefix_idx
  ON localized_names (lower(name) text_pattern_ops);
CREATE INDEX IF NOT EXISTS localized_names_short_name_lower_prefix_idx
  ON localized_names (lower(short_name) text_pattern_ops)
  WHERE short_name IS NOT NULL;
