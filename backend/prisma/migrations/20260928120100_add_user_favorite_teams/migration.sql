-- 즐겨찾기 팀. userId 는 Supabase auth.users.id (UUID) — 우리 스키마에 auth 테이블이 없어 FK 는 없다.
-- teamId 도 relationMode="prisma" 라 FK 없음. 참조 무결성은 서비스 층에서 검증.
CREATE TABLE "user_favorite_teams" (
  "userId"    UUID          NOT NULL,
  "teamId"    INTEGER       NOT NULL,
  "position"  INTEGER       NOT NULL,
  "createdAt" TIMESTAMP(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "user_favorite_teams_pkey" PRIMARY KEY ("userId", "teamId")
);

-- (userId, position) 유니크로 순서 충돌을 막는다. DELETE + createMany 는 트랜잭션 안에서 한다.
CREATE UNIQUE INDEX "user_favorite_teams_userId_position_key"
  ON "user_favorite_teams" ("userId", "position");

CREATE INDEX "user_favorite_teams_userId_idx"
  ON "user_favorite_teams" ("userId");

-- teamId 도 인덱스. 팀 삭제 시 자식 존재 확인(SELECT) 성능·백엔드 무결성 검사용.
CREATE INDEX "user_favorite_teams_teamId_idx"
  ON "user_favorite_teams" ("teamId");

-- 정책 없는 RLS = 전부 거절. NestJS 만 service_role 로 붙는다.
ALTER TABLE "user_favorite_teams" ENABLE ROW LEVEL SECURITY;
