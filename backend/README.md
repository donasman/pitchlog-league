# backend — PitchLog Core API

NestJS 기반 핵심 서비스. 외부 축구 API 수집, REST API, 실시간 Gateway, AI 조회 도구를
하나의 모듈형 모놀리스에서 운영한다.

- 스택: NestJS + TypeScript, PostgreSQL + Prisma, Socket.io, vitest + Supertest
- 실시간 이벤트는 DB commit 성공 후 이 애플리케이션의 Gateway가 직접 발행한다
- 숫자·순위·비교·진출 판정은 전부 이 계층에서 확정한다
- **외래키를 만들지 않는다** (`relationMode = "prisma"`). 참조 무결성은 이 계층 책임

기술 결정 근거는 [ADR-001](../docs/ADR-001-NODE-BACKEND.md), 상세 개발 기준은
[BACKEND_GUIDE.md](../docs/BACKEND_GUIDE.md)를 따른다.
현재 진행 상황과 다음 순서는 [NEXT_STEPS.md](../docs/NEXT_STEPS.md)가 기준이다.

## 상태 — Phase 1 진행 중 (2026-09-08)

| 영역 | 상태 |
|---|---|
| 스키마 | Prisma 모델 29 · enum 17 · 인덱스 90 · 외래키 0. partial unique 4개는 `prisma/sql/partial-indexes.sql` |
| 수집 | **L0**(대회 17 · 대회시즌 83 · 팀 1,888) · **L1 스쿼드**(155팀) · **L2 5시즌**(라운드 1,070 · 경기 9,787 · 순위 654) · **L6 시즌 집계**(선수 통계 30,925 · 랭킹 2,335 · 팀 통계 489 · 선수 13,591) · 로고 자체 저장 |
| 조회 API | `/api/competitions`(+`/:ref`) · `/api/teams`(+`/:ref`) · **`/api/matches`(+`/:ref`) · `/api/standings`** (09-07). Swagger `/docs` 가 계약 |
| 백업 | `pg_dump` 주기 백업 + 복원 리허설 (로컬 보관 · 수동 실행) |
| 테스트 | 단위 53 · e2e 9파일 74건 (`l0`·`l1`·`l2`·`l6` 는 로컬 DB·CI 에서만) |
| 남은 것 | L3·L5 경기 상세(1장 3번) → 서버화·배포 → L4 실시간 (`docs/NEXT_STEPS.md` 1장) |

## 실행

```bash
cp .env.example .env      # DATABASE_URL · API_FOOTBALL_KEY 등을 채운다
npm install
npm run start:dev         # http://localhost:3000 · Swagger /docs · /health
```

### 검증

```bash
npm run verify            # prisma validate · typecheck · lint · 단위 53건
npm run test:e2e          # e2e 9파일 74건
```

`l0`·`l1`·`l2`·`l6` e2e 는 도메인 테이블에 가짜 행을 쓴다. **원격 DB 에서는 스스로 거부한다** —
로컬 Postgres 를 쓰거나 CI 에서 돌린다 (2026-09-07 에 Supabase dev 로 돌려 가짜 팀이
실 데이터에 섞인 적이 있다). 뚫어야 할 때만 `E2E_ALLOW_REMOTE_DB=1`.

`integrity.e2e-spec.ts` 는 가짜 행을 쓰지 않는다 — 붙은 DB 의 **참조 26개**에 고아 행이
없는지 본다. 외래키가 없으므로 이것이 참조 무결성의 유일한 자동 검증이다.

### 수집 (CLI)

```bash
npm run ingest -- status  # API 쿼터 스냅샷
npm run ingest -- l0      # 대회·시즌·팀·경기장
npm run ingest -- l1      # 스쿼드 스냅샷 + diff (155콜)
npm run ingest -- l2      # 라운드·경기·순위 — 화면 6대회 현재 시즌 (18콜)
npm run ingest -- l2 --all-seasons     # 5시즌 전부
npm run ingest -- l2 --season=2024     # 한 시즌만 (플래그는 등호 형태다)
npm run ingest -- l6 --all-seasons     # 시즌 집계 — 선수 통계·랭킹·팀 통계
npm run ingest -- l6 --season=2026 --only=rankings   # 갈래 하나만
npm run ingest -- probe-players --all-seasons        # /players 페이지 수만 재본다 (쓰기 없음)
npm run ingest -- logos   # 로고를 받아 ../frontend/public/logos 에 저장
```

**플래그는 `--이름=값` 형태만 읽는다** (`cli/ingest.ts` 의 `flagValue`). `--season 2024` 처럼
띄어 쓰면 조용히 무시되고 현재 시즌만 돈다 — 오타 가드도 등호 형태에만 걸린다.

`--only=` 로 갈래 하나만 돌리면 **`backfill_jobs` 를 닫지 않는다** — 일부만 받아 놓고
`dataState` 가 COMPLETE 라고 말하면 시즌 선택기가 빈 화면을 노출한다.

스케줄러는 아직 없다. Phase 2 에서 붙인다.

### 백업

```bash
npm run backup -- --check # 실행 방식(pg_dump/Docker)·DATABASE_URL·마지막 성공 점검
npm run backup            # 홈/PitchLogBackups 에 custom 포맷 덤프
npm run backup:verify     # 일회용 postgres 컨테이너에 복원해 운영 DB 와 행 수 대조
```

앱을 띄우지 않는다 — 백업이 애플리케이션 부팅에 의존하면 앱이 못 뜰 때 백업도 못 받는다.
`pg_dump` 가 PATH 에 없으면 Docker 컨테이너로 돈다.

## 모듈 구조

```
src/
├── competition/ team/     조회 API (player·match·standing·statistics 는 Phase 2)
├── ingestion/
│   ├── api-football/      HTTP client · 쿼터 스냅샷
│   ├── l0/                대회·시즌·팀·경기장 + 카탈로그
│   ├── l1/                스쿼드 스냅샷 + diff (squad-diff.ts 는 순수 함수)
│   ├── logos/             로고 자체 저장
│   └── screen-scope.ts    "화면에 나오는 대회" 단일 정의
├── prisma/                PrismaService · batch-upsert · IntegrityService
├── cli/                   ingest CLI
└── common/ config/ health/
scripts/                   backup.mjs · restore-check.mjs (앱과 무관하게 돈다)
```
