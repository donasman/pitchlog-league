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

## 상태 — Phase 2 관문 통과 (2026-10-15) · 2026-10-16 · PR #141 까지

| 영역 | 상태 |
|---|---|
| 스키마 | Prisma 모델 **30** (09-28 `UserFavoriteTeam` 추가) · enum 18 · 외래키 0. partial unique 는 `prisma/sql/partial-indexes.sql`. 09-28 마이그레이션 2개 — `enable_rls_public`(public 테이블 RLS) · `add_user_favorite_teams`. **운영 DB 적용 10-08** — 백업 `pitchlog-20261008-1500.dump`(18.7 MB) 뒤 `prisma migrate deploy` 로 미적용 3개(`20260910120000_search_indexes` 포함) 적용 · `migrate status` up to date. 10-15 마이그레이션 `20261015120000_match_detail_attempts`(+ `rollback.sql`) — `matches.detail_attempts`(INTEGER NOT NULL DEFAULT 0) · `detail_last_attempt_at`(TIMESTAMPTZ(6) NULL) · **운영 DB 10-15 적용** (#139 배포 전) |
| 수집 | **L0** 19대회 · **L1 스쿼드** · **L2 5시즌** · **L3·L5 경기 상세 5시즌**(백필-2 · 09-24 서버 실측에서 완료 확인) · **L4 라이브**(관측 · 쓰기 · FT 즉시 상세 — 운영은 쓰기 모드: 10-16 `LIVE_POLLER_MODE=write` · `LIVE_FT_DETAILS_ENABLED=true` · `/health` `livePoller.mode="write"`) · **L6 시즌 집계** · 로고 자체 저장. L2 는 DB 에 없는 팀(missingTeams)을 만나면 현재 시즌만 그 대회시즌 `/teams` 1콜 재수집(L0 위임 · 10-08 PR #135). 10-15~16 운영 수정: API id 없는(null·0) 선수는 L3 lineups·L5 player-stats 가 건너뛰고 L3 events 는 null 로 둔다(#138 · `ingestion/api-football/api-player-id.ts`) · 상세 백필 커서 제거 + 경기 단위 재시도 상한 3(#139) · 선수 명단 없는 라인업은 `has_lineups=false`(미제공)로 마감(#140) · 상세 백필은 대상 0 인 대회시즌에서 `/status` 를 부르지 않는다(#141). 적재 수치는 `docs/NEXT_STEPS.md` 0장 |
| 조회 API | 엔드포인트 17개 — 대회·팀(+`/:ref`) · 경기(+`/:ref` · `/:ref/detail`) · 순위 · 선수 · 통계(scorers·assisters) · 검색 · **`/api/live`** · **`GET/PUT /api/me/favorites`**(로그인 필요) · `POST /api/assistant` · `/health`. Swagger `/docs` 가 계약 |
| 스케줄러 | `src/scheduler/` 잡 5개 — 백필 워커 · L2 매일 · L1 매주 · 라이브 폴러 · 쿼터 스냅숏. **전부 기본 꺼짐** (`SCHEDULER_ENABLED` 마스터 + 잡별 스위치 4개 `BACKFILL_WORKER_ENABLED`·`L2_DAILY_ENABLED`·`L1_WEEKLY_ENABLED`·`LIVE_POLLER_ENABLED` · `docs/DEPLOY.md`). 쿼터 스냅숏은 개별 스위치가 없다 — 마스터가 켜지고 API 키가 있으면 등록 (`scheduler.module.ts`). `api_quota_snapshots` INSERT(`QuotaService.snapshot()`)는 이 하루 1회 잡(`50 23 * * *` UTC)과 CLI(`cli/ingest.ts`)에만 남았고, 상세 백필은 기록 없는 `current()` 를 쓴다(#141). 이 테이블을 읽는 코드는 없다. 쿼터 판단(라이브 폴러·상세 백필)은 `/status` 의 used 로 한다 |
| 배포 | EC2 systemd (`infra/ec2/`) · 프론트는 Vercel `/api` rewrite. 백업은 EC2 타이머 → S3 매일 + PC 수동 `npm run backup` |
| 테스트 | 10-16 정적 grep(`ce2ce1f`): 단위 34파일 304건(`it(` · `it.each` 3 별도) · e2e 21파일 221건(`it` 202 + `it.skipIf` 19). 원격 DB 가드 11파일 — 아래 "검증" |
| 남은 것 | 운영 DB `api_player_id=0` 선수 행 정리 · L6 주기 잡 · 알림 · 관측 후속 백로그 (`docs/NEXT_STEPS.md` 1장 "10-16 기준 남은 것") |

## 실행

```bash
cp .env.example .env      # DATABASE_URL · SUPABASE_URL(필수 · 없으면 부팅 실패) · API_FOOTBALL_KEY 등을 채운다
npm install
npm run start:dev         # http://localhost:3000 · Swagger /docs · /health
```

### 검증

```bash
npm run verify            # prisma validate · typecheck · lint · 단위 테스트
npm run test:e2e          # e2e (10-16 기준 21파일)
```

도메인 테이블에 가짜 행을 쓰는 e2e 는 **원격 DB 에서 스스로 멈춘다** (10-16 `E2E_ALLOW_REMOTE_DB` grep 기준 11파일) —
`l0`·`l1`·`l2`·`l3`·`l5`·`l6`·`backfill-details`·`user-favorites`·`no-id-players` 9파일은 `beforeAll` 에서 throw 로 거부하고,
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
오케스트레이터(`MatchDetailsBackfillService`). 재실행은 경기 행으로 이어진다 — 매 실행이 대상을 다시 고르고
대회시즌 안에서 `kickoff_at asc, id asc` 로 돈다. 10-15 PR #139 전에는 `backfill_jobs.cursor_match_id` 로 "id > cursor" 만
앞으로 가서, id 가 작은데 늦게 끝난 경기 · 실패한 경기를 영원히 건너뛰었다 (컬럼은 남았지만 상세 백필은 읽지도 쓰지도 않는다).
자세한 규칙은 [BACKEND_GUIDE.md](../docs/BACKEND_GUIDE.md) "오케스트레이터 (backfill)" 절.

- **스키마**: `matches.detail_eligible` · `matches.has_lineups/has_events/has_team_stats/has_player_stats` ·
  `matches.detail_checked_at` · `matches.detail_attempts` · `matches.detail_last_attempt_at` · `matches.stats_state` ·
  `backfill_jobs(phase='DETAILS', total, done, failed)`
- **사전 조건**: L0·L1·L2 완료(대회시즌·팀·경기 존재), 대상 시즌에 `detail_eligible=true` 인 매치가 있어야
  한다. `matches.status_short IN ('FT','AET','PEN')` 이면서 **킥오프 뒤 24시간이 지난** 경기만 집는다 — `kickoff_at < now − 24h`
  (`RECENT_MATCH_LOCK_MS = 24h` · `src/ingestion/backfill/detail-retry.ts:27` · 조건은 `:58`. 종료 시각이 아니라 킥오프 기준이다).
  그중 `detail_checked_at` 이 null 이고 재시도 시점이 된 경기만이다 (`detailTargetWhere` · `src/ingestion/backfill/detail-retry.ts:52`).
- **재시도 상한** (10-15 #139 · `detail-retry.ts` `DETAIL_MAX_ATTEMPTS=3` · `DETAIL_RETRY_BACKOFF_MS=[1h,6h]`): 시도 0회 → 즉시 ·
  1회 → 마지막 시도 1시간 뒤 · 2회 → 6시간 뒤 · 3회 → 포기 (warn 에 복구 SQL). 시도 기록은 raw `UPDATE … RETURNING` 이라
  `updated_at` 을 건드리지 않는다. 확정(`detail_checked_at`)은 `has_*` 가 전부 non-null 일 때만. 포기한 경기를 되살리는 SQL:
  `UPDATE matches SET detail_attempts = 0, detail_last_attempt_at = NULL WHERE detail_checked_at IS NULL AND detail_attempts >= 3;`

사용법:

```bash
npm run ingest -- backfill --dry-run                 # 대상 수·예정 콜 수·남은 상한만 출력, API 안 부름
npm run ingest -- backfill --limit=50                # 50경기 시범 (관문 5단계 중)
npm run ingest -- backfill                           # 오늘 남은 상한까지
npm run ingest -- backfill --season=2025 --limit=200 # 특정 시즌만
```

`--season` 없으면 수집 범위 19대회의 현재 시즌만 (`isCurrent:true` + `ingestScopeWhere` · `match-details-backfill.service.ts:137`).
`--limit` 없으면 오늘 남은 상한(`BACKFILL_DAILY_CAP` − used)까지. 상한은 코드 기본값 5,700(`env.validation.ts:192`) · **운영 env 6,800**
(10-16 EC2 `/etc/pitchlog/backend.env` 확인). 매 경기 앞에 상한 재확인.
대회시즌마다 대상 수를 먼저 세고, 0 이면 사용량 확인 없이 `no_targets` 로 넘어간다 — 대상이 있을 때만 진입 · 매 경기 앞 · 끝 사유 판정에서
`QuotaService.current()`(`/status` 로 사용량만 확인 · INSERT 없음)를 부른다 (10-16 #141). 운영 확인(10-16): 배포 뒤 첫 워커 tick 에서 `/status` 호출 0
(이전엔 tick 당 약 94회). 대회시즌마다 "대상 없음 (targeted=0)" LOG 1줄은 남는다.

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
