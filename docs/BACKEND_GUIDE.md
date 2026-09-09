# PitchLog 백엔드 개발 기준

> 확정: 2026-09-02  
> 기술 결정: `ADR-001-NODE-BACKEND.md`

## 기술 구성

- Node.js 22 (`backend/.nvmrc`)
- NestJS 12 + TypeScript strict mode. **ESM** — 상대 import 에 `.js` 확장자를 붙인다
- PostgreSQL + **Prisma 7** — `prisma.config.ts` 필수, 드라이버 어댑터(`@prisma/adapter-pg`) 필수,
  생성 클라이언트는 `src/generated/prisma/` (gitignore 됨, `prisma generate` 로 만든다)
- REST API + OpenAPI/Swagger — `/docs`. **Swagger 스펙이 응답 계약이다**
- NestJS WebSocket Gateway + Socket.io
- **vitest + Supertest** (Nest 12 기본. Jest 아님) · **oxlint** (ESLint 아님)
- Redis + BullMQ는 대량 작업 또는 다중 인스턴스 확장 시 도입
- `@nestjs/observe`·`@nestjs/mau` 는 `nest new` 가 넣지만 **쓰지 않는다** (유료 SaaS)

## 모듈 경계

수집 계층(L0~L6)이 디렉터리 이름이다. 아래는 2026-09-07 현재 실재하는 것과
아직 없는 것을 구분한 것이다.

```text
backend/src
├── competition/ team/            조회 API — 있음
├── player/ match/ standing/ statistics/   Phase 2
├── ingestion/
│   ├── api-football/             HTTP client · 쿼터 — 있음
│   ├── l0/                       대회·시즌·팀·경기장 — 있음
│   ├── l1/                       스쿼드 스냅샷 + diff — 있음
│   ├── logos/                    로고 자체 저장 — 있음
│   ├── screen-scope.ts           "화면에 나오는 대회" 단일 정의 — 있음
│   └── l2/ l3/ l4/ l5/ l6/       Phase 2
├── realtime/                     Phase 2 (Gateway)
├── ai/                           Phase 5
├── cli/ config/ health/ prisma/  있음
└── common/
```

`scripts/`(백업·복원 리허설)는 `src` 밖이다 — 앱 부팅에 의존하지 않아야 한다.
백업이 애플리케이션에 의존하면 앱이 못 뜰 때 백업도 못 받는다.

- Controller, Scheduler, Worker, Gateway는 도메인 규칙을 복제하지 않는다.
- 외부 API 응답 DTO와 내부 응답 DTO를 분리한다.
- 모든 입력은 ValidationPipe를 통과한다.
- Prisma schema와 migration을 DB 구조의 단일 기준으로 사용한다.
- 외부 API ID에는 unique constraint를 두고 upsert를 멱등하게 구현한다.
- 여러 데이터를 함께 확정할 때 Prisma transaction을 사용한다.

## 데이터베이스 — 외래키를 쓰지 않는다 (2026-09-06 확정)

`relationMode = "prisma"` 를 사용한다. 참조 무결성은 애플리케이션이 책임진다.
상세는 `SCHEMA_DESIGN.md` 2장. 코드 리뷰에서 확인할 세 가지:

- **다른 테이블의 ID를 담는 모든 컬럼에 `@@index` 를 명시한다. 예외 없다.**
  FK가 없으면 Prisma가 인덱스를 만들어주지 않는다. 빠뜨려도 에러가 아니라 느려질 뿐이다.
- **고아 행 검사를 L6 보정 잡과 CI 통합 테스트 양쪽에서 돌린다.** 자동 삭제하지 않는다.
- **수집은 부모-먼저 순서를 지킨다.** 라인업·경기 통계에 스쿼드에 없는 선수가 나오면
  건너뛰지 말고 최소 정보로 `players` 를 먼저 만든다.

partial unique index 3개(`competition_seasons` · `squad_entries` · `coach_tenures`)는
Prisma schema로 표현되지 않으므로 마이그레이션 SQL에 직접 쓴다 — `prisma/sql/partial-indexes.sql`.

`relationMode = "prisma"` + PostgreSQL 은 `NoAction` 을 **허용하지 않는다** (`Cascade`·`Restrict`·`SetNull` 만).
전 관계에 `Restrict` 를 명시한다. Restrict 는 에뮬레이션이라 Prisma Client 로 부모를 지우면
자식 확인 SELECT 가 먼저 나가고 있으면 에러다.
안전장치로 두되, 보관 정책의 대량 삭제는 `$executeRaw` 로 순서대로 직접 한다.

고아 행 검사는 `IntegrityService` (`src/prisma/integrity.service.ts`) — 관계 18개.
`test/integrity.e2e-spec.ts` 가 CI 에서 돌고, L6 보정 잡이 일 1회 호출한다.

## 작업 실행

- 다음 주기에 다시 실행해도 되는 짧은 작업은 NestJS Scheduler를 사용한다.
- 수백 건 처리, 진행률, 실패 지점 재개가 필요하면 BullMQ Job으로 승격한다.
  **단 5개년 백필은 승격하지 않는다 (2026-09-07)** — `backfill_jobs` 가 DB 체크포인트라 단일 루프로 충분하다.
  워커는 `/status` 를 읽어 **일일 상한(5,700콜)** 을 스스로 지킨다 (`INGESTION_STRATEGY.md` 5-1).
- 경기 상세 워커는 백필이 끝난 뒤에도 같은 코드로 "어제 끝난 경기" 를 하루 1회 받는다. L4 실시간은 그 뒤에 얹는다.
- 스케줄러와 Worker의 중복 실행을 막는 lock·job key를 둔다.
- API 호출 제한, timeout, 제한된 retry와 exponential backoff를 공통 HTTP client에 적용한다.

## 실시간

- DB commit 성공 후에만 Socket.io 이벤트를 발행한다.
- 이벤트에는 `fixtureId`, `competitionId`, `updatedAt`, `version`을 포함한다.
- 브라우저는 중복·역순 version을 무시한다.
- 최초 연결과 재연결은 REST 풀 싱크 후 room을 구독한다.
- 단일 인스턴스에서는 Redis를 사용하지 않는다. 다중 Gateway 확장 시 Redis adapter를 추가한다.

## AI · Assistant (MCP)

- LLM은 DB·외부 API에 직접 접근하지 않는다.
- 집계·비교·순위·진출 판정은 결정적 application 계층이 수행한다. LLM 은 그 계층을 **MCP 도구**로만 부른다.
- 도구 계층은 `backend/src/assistant/` — 6도메인 서비스를 얇게 감싼 어댑터 10개다. Prisma 직접 접근·SQL 생성 금지.
- MCP stdio 서버는 `backend/src/cli/mcp.ts` (`npm run mcp`). Claude Desktop 등이 tools/list · tools/call 로 접근.
- 도구 반환은 `{ tool, args, asOf, data }` wrapper. `data` 는 조회 API DTO 그대로 — 프론트/AI 가 같은 계약을 본다. `list_matches` 는 필요 시 `truncated`/`total` 도 함께.
- 도구 인자 · 반환 · `asOf` 를 응답에 남긴다. UI 는 "근거 카드" 로 이 값을 그대로 보여준다.
- 도구 description 최상단에 3상태 문구(0=실측 0 · null=측정 안 됨 · 미제공 플래그) 를 박는다 — LLM 이 null 을 0 으로 접지 않도록.
- **`POST /api/assistant`** (2026-09-09) — Gemini 클라이언트가 assistant 도구 층을 부른다. 요청 `{question:string, 1~500자}` · 응답 `{answer, evidence:[{tool,args,asOf}], data:[wrapper 그대로], truncated, model}`. IP 당 분당 10회 메모리 카운터 (커스텀 `AssistantRateLimitGuard`).
- 상한: 도구 호출 5회 · 전체 30초. 넘으면 지금까지 받은 데이터로 답하고 `truncated:true`.
- 에러: 키 없음 503 · Gemini 429 → 429 · Gemini 오류 502 · 타임아웃 504. 메시지는 i18n 키 (`assistant.error.*`).
- 시스템 프롬프트 규칙: 도구 없이 숫자·순위·기록을 말하지 않는다 · 도구로 답할 수 없으면 "그 데이터는 아직 없다" 고 답한다 · `null` 은 0 이 아니라 "측정 안 됨" 이다 · 답변 언어는 질문 언어를 따른다.
- 실 키 smoke: `npm run smoke:assistant` — golden.json 에서 5건(답 가능 3 + tool:null 2)을 실행해 환각 검사(answer 의 숫자가 data 에 실제 존재하는지)까지 확인. 키 없으면 SKIP 하고 exit 0.
- SDK: `@google/genai@2.21.0` (function calling). 모델은 `GEMINI_MODEL` (기본 `gemini-3.5-flash`).

## 응답 캐시 · 페이지 상한

- **`/api/*` 전역 인터셉터** — `common/cache-headers.interceptor.ts` 가 응답 본문 sha256 로 `ETag` (weak) 을 만들고 `Cache-Control: public, max-age=60` 을 붙인다. `If-None-Match` 가 일치하면 304 로 짧게 끝낸다. `/health` 는 `/api` prefix 밖이라 자연 제외.
- **`/api/matches` 페이지 상한** — `limit` (기본 100 · 최대 500) 을 받고 응답에 `total`·`hasMore` 를 함께 넣는다. 이 계약이 없으면 시즌 전체(수백건 · 490KB 실측)를 통째로 내려보낸다.
- assistant 도구 `list_matches` 는 자체 컷을 유지한다 (기본 50 · 최대 200 · wrapper 의 `truncated`·`total`).
- 서버 in-memory 캐시·Redis 는 아직 넣지 않는다 — 서버 한 대 · 수집 시점에만 데이터가 바뀐다. 서버화 이후 다시 본다.

## 환경변수

`.env`, `.env.local`, 비밀 키 파일은 커밋하지 않는다. 애플리케이션 시작 시 환경변수 schema를
검증하고 필수 값이 없으면 즉시 실패한다.

필수 후보:

- `DATABASE_URL`
- `API_FOOTBALL_KEY` — 없이도 앱은 뜬다. 첫 호출에서만 요구한다 (조회 서버·CI 용)
- `CORS_ORIGIN` — 프론트 출처 허용 목록(쉼표). **비우면 CORS 를 켜지 않는다**
- `LOGO_OUTPUT_DIR` · `BACKUP_DIR` · `BACKUP_PG_IMAGE` · `BACKUP_SCHEMA` — 운영 스크립트용
- `JWT_SECRET`(관리 기능 도입 시)
- `REDIS_URL`(BullMQ 또는 다중 인스턴스 도입 시)
- `LLM_API_KEY`(Phase 5)
- `GEMINI_API_KEY` — `POST /api/assistant` 용. 미설정 시 엔드포인트가 503
- `GEMINI_MODEL` — Gemini 모델 이름 (기본 `gemini-3.5-flash`)

기준은 `backend/.env.example` 이다. 새 변수는 거기에 먼저 넣는다.
