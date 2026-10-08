# backend — PitchLog Core API

NestJS 기반 핵심 서비스. 외부 축구 API 수집, REST API, 라이브 폴러, AI 조회 도구, 로그인 사용자 즐겨찾기를
하나의 모듈형 모놀리스에서 운영한다.

- 스택: NestJS + TypeScript, PostgreSQL(Supabase) + Prisma, `@nestjs/schedule`, `jose`(Supabase JWT 검증), vitest + Supertest
- 실시간은 Socket.io Gateway 가 아니라 **REST 폴링**이다 — 프론트가 `GET /api/live` 를 15초마다 부른다 (09-27 PR #123). 서버 쪽은 DB commit 뒤 `data_version` 을 올리고, 프론트가 그 값으로 병합한다
- 숫자·순위·비교·진출 판정은 전부 이 계층에서 확정한다
- **외래키를 만들지 않는다** (`relationMode = "prisma"`). 참조 무결성은 이 계층 책임

기술 결정 근거는 [ADR-001](../docs/ADR-001-NODE-BACKEND.md), 상세 개발 기준은
[BACKEND_GUIDE.md](../docs/BACKEND_GUIDE.md)를 따른다.
현재 진행 상황과 다음 순서는 [NEXT_STEPS.md](../docs/NEXT_STEPS.md)가 기준이다.

## 상태 — Phase 2 진행 중 (2026-10-08 · PR #135 까지)

| 영역 | 상태 |
|---|---|
| 스키마 | Prisma 모델 **30** (09-28 `UserFavoriteTeam` 추가) · enum 18 · 외래키 0. partial unique 는 `prisma/sql/partial-indexes.sql`. 09-28 마이그레이션 2개 — `enable_rls_public`(public 테이블 RLS) · `add_user_favorite_teams`. **운영 DB 적용 10-08** — 백업 `pitchlog-20261008-1500.dump`(18.7 MB) 뒤 `prisma migrate deploy` 로 미적용 3개(`20260910120000_search_indexes` 포함) 적용 · `migrate status` up to date |
| 수집 | **L0** 19대회 · **L1 스쿼드** · **L2 5시즌** · **L3·L5 경기 상세 5시즌**(백필-2 · 09-24 서버 실측에서 완료 확인) · **L4 라이브**(관측 · 쓰기 · FT 즉시 상세) · **L6 시즌 집계** · 로고 자체 저장. L2 는 DB 에 없는 팀(missingTeams)을 만나면 현재 시즌만 그 대회시즌 `/teams` 1콜 재수집(L0 위임 · 10-08 PR #135). 적재 수치는 `docs/NEXT_STEPS.md` 0장 |
| 조회 API | 엔드포인트 17개 — 대회·팀(+`/:ref`) · 경기(+`/:ref` · `/:ref/detail`) · 순위 · 선수 · 통계(scorers·assisters) · 검색 · **`/api/live`** · **`GET/PUT /api/me/favorites`**(로그인 필요) · `POST /api/assistant` · `/health`. Swagger `/docs` 가 계약 |
| 스케줄러 | `src/scheduler/` 잡 5개 — 백필 워커 · L2 매일 · L1 매주 · 라이브 폴러 · 쿼터 스냅숏. **전부 기본 꺼짐** (`SCHEDULER_ENABLED` 마스터 + 잡별 스위치 4개 `BACKFILL_WORKER_ENABLED`·`L2_DAILY_ENABLED`·`L1_WEEKLY_ENABLED`·`LIVE_POLLER_ENABLED` · `docs/DEPLOY.md`). 쿼터 스냅숏은 개별 스위치가 없다 — 마스터가 켜지고 API 키가 있으면 등록 (`scheduler.module.ts`) |
| 배포 | EC2 systemd (`infra/ec2/`) · 프론트는 Vercel `/api` rewrite. 백업은 EC2 타이머 → S3 매일 + PC 수동 `npm run backup` |
| 테스트 | 10-08 정적 grep: 단위 31파일 289건(`it(` · `it.each` 1 별도) · e2e 20파일 210건(`it` 191 + `it.skipIf` 19). 원격 DB 가드 10파일 — 아래 "검증" |
| 남은 것 | 운영 L4 쓰기 모드 확인 · 실제 라운드 1회 무중단 관측 · L6 주기 잡 · 알림 (`docs/NEXT_STEPS.md` 1장 "10-08 기준 남은 것") |

## 실행

```bash
cp .env.example .env      # DATABASE_URL · SUPABASE_URL(필수 · 없으면 부팅 실패) · API_FOOTBALL_KEY 등을 채운다
npm install
npm run start:dev         # http://localhost:3000 · Swagger /docs · /health
```

### 검증

```bash
npm run verify            # prisma validate · typecheck · lint · 단위 테스트
npm run test:e2e          # e2e (10-08 기준 20파일)
```

도메인 테이블에 가짜 행을 쓰는 e2e 는 **원격 DB 에서 스스로 멈춘다** (10-08 `E2E_ALLOW_REMOTE_DB` grep 기준 10파일) —
`l0`·`l1`·`l2`·`l3`·`l5`·`l6`·`backfill-details`·`user-favorites` 8파일은 `beforeAll` 에서 throw 로 거부하고,
`match-detail`·`search` 2파일은 `it.skipIf(skipIfRemote())` 로 건너뛴다.
로컬 Postgres 를 쓰거나 CI 에서 돌린다 (2026-09-07 에 Supabase dev 로 돌려 가짜 팀이
실 데이터에 섞인 적이 있다). 뚫어야 할 때만 `E2E_ALLOW_REMOTE_DB=1`.

`integrity.e2e-spec.ts` 는 가짜 행을 쓰지 않는다 — 붙은 DB 의 **참조 26개**에 고아 행이
없는지 본다. 외래키가 없으므로 이것이 참조 무결성의 유일한 자동 검증이다.

### 수집 (CLI)

```bash
npm run ingest -- status  # API 쿼터 스냅샷
npm run ingest -- l0      # 대회·시즌·팀·경기장
npm run ingest -- l1      # 스쿼드 스냅샷 + diff (155콜)
npm run ingest -- l2      # 라운드·경기·순위 — 수집 범위(isTracked) 19대회 현재 시즌 (리그·UEFA 8 × 3콜 + 컵·슈퍼컵 11 × 2콜 = 최대 46콜 · missingTeams 시 대회시즌당 /teams 최대 1콜)
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

운영에서는 같은 서비스를 스케줄러 잡(`src/scheduler/`)이 부른다 — 백필 워커(`backfill`) · L2 매일 · L1 매주.
스케줄러 자리에서는 `--all-seasons` 를 쓰지 않는다. 켜고 끄는 방법과 상태 확인(`/health` 의 scheduler 블록)은 `docs/DEPLOY.md`.

### 어시스턴트 (MCP)

`backend/src/assistant/` — 조회 서비스 10개를 LLM 이 부를 수 있는 **MCP 도구**로 감싼 계층.
같은 도구를 두 곳에서 쓴다 — 사이트의 `POST /api/assistant`(Gemini · 프론트 `AssistantPanel`, 09-09 PR #41)와
stdio MCP 서버(Claude Desktop 등 외부 MCP 클라이언트).

```bash
npm run mcp   # nest build && node dist/cli/mcp.js — stdout 은 JSON-RPC 전용, 로그는 stderr
```

Claude Code CLI 는 프로젝트마다 `mcp.cmd` 를 wrapper 로 두고 `claude mcp add` 로 등록한다:

```bash
claude mcp add pitchlog --scope user -- cmd /c C:\Dev\pitchlog-league\backend\mcp.cmd
```

`mcp.cmd` (3줄) 는 자기 폴더로 cd 후 `node dist\cli\mcp.js` 를 부른다.
cwd 가 `backend/` 이므로 서버 프로세스가 `.env` 를 직접 읽는다 —
`claude mcp add --env DATABASE_URL=...` 로 값을 넘기지 않는다.
실측 사고(2026-09-09): 셸 파싱이 `postgresql://postgres.xxx:pw@host` 형식의
사용자명을 `postgres` 로 잘라 인증 실패. wrapper 방식으로 우회한다.

등록 후 `claude mcp list` 로 확인. Claude 세션에서 `list_competitions` 등
도구 10개가 노출된다 (2026-09-09 실 연결 · 질의 성공).

도구 목록·인자 스키마·description(3상태 문구 포함)은 tools/list 로 노출된다. 도구 반환은
`{ tool, args, asOf, data }` — `data` 는 REST API DTO 와 같다. `list_matches` 는 자동으로
`from/to = today ±7d (KST)`, `limit=50` (max 200) — 잘렸으면 wrapper 에 `truncated:true, total:N`.

`GEMINI_MODEL` 권장 기본값은 **`gemini-3.5-flash-lite`** (2026-09-11). 이유는 무료 티어 RPD.
Flash 3.x 계열(3·3.5·3.6·3.7·3.8) 과 2.5-Flash 는 전부 RPD 20 이라 시연에서 3번째 질문부터 429.
Flash Lite 계열(3.1-flash-lite · 3.5-flash-lite) 만 RPD 500(TPM 250K · RPM 15).
근거: `docs/NEXT_STEPS.md` "429 원인 재판정" 절 (AI Studio 대시보드 실측 표).
09-09 기록 "gemini-2.5-flash 404 (신규 프로젝트에 제공되지 않는다)" 는 낡았다 — 지금은
한도가 잡혀 있다(3.x-flash 와 같은 취급 · RPD 20). `env.validation.ts:144` 코드 기본값은
10-07 에도 `gemini-3.5-flash` (`.env.example` 은 `gemini-3.6-flash`) — 운영은 `infra/ec2/backend.env.example` 의 lite 를 쓴다. 기본값 이관은 별도 판.

### 경기 상세 백필 (L3·L5)

L3·L5 4개 서비스(`lineups` · `events` · `team_stats` · `player_stats`)를 대회시즌 순서로 순차 호출하는
오케스트레이터(`MatchDetailsBackfillService`). `backfill_jobs.cursor_match_id` 로 재실행이 이어진다.
자세한 규칙은 [BACKEND_GUIDE.md](../docs/BACKEND_GUIDE.md) "오케스트레이터 (backfill)" 절.

- **스키마**: `matches.detail_eligible` · `matches.has_lineups/has_events/has_team_stats/has_player_stats` ·
  `matches.detail_checked_at` · `matches.stats_state` · `backfill_jobs(phase='DETAILS', cursor_match_id, total, done, failed)`
- **사전 조건**: L0·L1·L2 완료(대회시즌·팀·경기 존재), 대상 시즌에 `detail_eligible=true` 인 매치가 있어야
  한다. `matches.status_short IN ('FT','AET','PEN')` 이면서 종료 후 24시간 지난 경기만 집는다.

사용법:

```bash
npm run ingest -- backfill --dry-run                 # 대상 수·예정 콜 수·남은 상한만 출력, API 안 부름
npm run ingest -- backfill --limit=50                # 50경기 시범 (관문 5단계 중)
npm run ingest -- backfill                           # 오늘 남은 상한까지
npm run ingest -- backfill --season=2025 --limit=200 # 특정 시즌만
```

`--season` 없으면 수집 범위 19대회의 현재 시즌만 (`isCurrent:true` + `ingestScopeWhere` · `match-details-backfill.service.ts:130`).
`--limit` 없으면 오늘 남은 상한(5,700 - used)까지. 매 경기 앞에 상한 재확인.

**관문**: 첫 대량 쓰기 전 `npm run backup` 필수. 무인 실행(나머지 4시즌)은 백업 자동화(09-16 S3) 뒤에 스케줄러 백필 워커로 돌았고, 09-24 서버 실측에서 완료 상태였다.

중단 사유 6종(`quota_exhausted` · `daily_cap` · `limit_reached` · `no_targets` · `done` · `error`)은
stdout 요약에 대회시즌별 `processed`·`failed`·`stoppedReason` 으로 표시된다.

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
├── competition/ team/ match/ standing/ player/ statistics/ search/  조회 API
├── live/                  GET /api/live (진행 중 + 최근 종료 — kickoff 5h 이내 ≈ FT 후 3h)
├── auth/                  Supabase Auth JWT 가드 (ES256 · JWKS DI 토큰 SUPABASE_JWKS)
├── user-favorites/        GET/PUT /api/me/favorites
├── assistant/             MCP 도구 층 (조회 서비스 wrapper) + POST /api/assistant
├── scheduler/             잡 5개 + SchedulerState (/health 노출)
├── ingestion/
│   ├── api-football/      HTTP client · 쿼터 스냅샷
│   ├── l0/                대회·시즌·팀·경기장 + 카탈로그
│   ├── l1/                스쿼드 스냅샷 + diff (squad-diff.ts 는 순수 함수)
│   ├── l2/                라운드·경기·순위
│   ├── l3/ l5/            경기 상세 — 라인업 · 이벤트 · 팀/선수 통계
│   ├── l4/                라이브 폴러 — live-window · observer · writer(역행 가드) · finalizer(FT 상세)
│   ├── l6/                시즌 집계 — 선수 통계 · 랭킹 · 팀 통계
│   ├── backfill/          MatchDetailsBackfillService (backfill_jobs 체크포인트)
│   ├── probe/             실측 전용 (쓰기 없음)
│   ├── logos/             로고 자체 저장
│   └── screen-scope.ts    수집·노출 범위 4층 — ingestScopeWhere · matchVisibleWhere · competitionVisibleWhere · squadScopeWhere
├── prisma/                PrismaService · batch-upsert(updateWhere) · IntegrityService
├── cli/                   ingest · mcp · check-details · seed-localized-names
└── common/ config/ health/
scripts/                   backup.mjs · restore-check.mjs (앱과 무관하게 돈다)
```
