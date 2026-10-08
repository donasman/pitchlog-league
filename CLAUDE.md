# PitchLog League — Claude Code 가이드

> 유럽 5대 리그 + UEFA Champions League 축구 데이터 서비스 (PitchLog v2)
> 확정 범위: ~~12대회~~ → **19대회**(5대 리그 + UCL + 국내 컵 6 + 슈퍼컵 5 + UEL + UECL) × 최근 5시즌 (2026-09-17 확장 · PR #85, `docs/INGESTION_STRATEGY.md` 1장)
> Repository: https://github.com/donasman/pitchlog-league
> 환경: Windows Git Bash
> 전신: `donasman/pitchlog`(2026 WC 아카이브, `47f3749`에서 동결) — 설계 근거는
> 그 저장소의 `docs/V2_DESIGN.md`/`docs/V2_DESIGN_REVIEW.md`/`docs/RETROSPECTIVE.md`/`docs/FEATURE_PLAN.md`를
> 이 저장소로 옮겨온 것이 전부. v1 코드는 참고하지 않는다(UI는 새로 디자인한다).

---

## 프로젝트 구조

```
pitchlog-league/                 ← 모노레포 루트
├── backend/                     ← NestJS + TypeScript + Prisma
│   ├── src/
│   │   ├── competition/ team/ match/ standing/ player/ statistics/ search/ live/   ← 조회 API
│   │   ├── auth/ user-favorites/ ← Supabase Auth JWT 가드 · GET/PUT /api/me/favorites
│   │   ├── scheduler/           ← 백필 워커 · L2 매일 · L1 매주 · 라이브 폴러 · 쿼터 스냅숏
│   │   ├── assistant/           ← LLM 도구 층 + POST /api/assistant (Gemini)
│   │   ├── ingestion/           ← api-football · l0 · l1 · l2 · l3 · l4 · l5 · l6 · backfill · probe · logos · screen-scope.ts
│   │   ├── cli/                 ← ingest · mcp(stdio 서버) · check-details · seed-localized-names
│   │   └── common/ config/ prisma/ health/
│   ├── prisma/                  ← schema · migration · partial-indexes.sql
│   ├── scripts/                 ← backup.mjs · restore-check.mjs (DB 백업·복원 리허설)
│   └── test/                    ← e2e — l0·l1·l2·l3·l5·l6·assistant·search·match-detail 등. 단위는 src 안 *.spec.ts
├── frontend/                    ← React + Vite + JavaScript, Node 22 고정
│   └── src/
│       ├── pages/               ← competitions · teams · players · matches · standings · stats · notifications · Match (UCL 대진표는 대회 페이지 탭으로 흡수 · #104)
│       ├── routes/              ← React Router 라우트 정의
│       ├── components/          ← ui · home · competition · assistant · layout · notifications
│       ├── contexts/            ← AssistantContext · AuthContext · FavoritesContext · NotificationContext
│       ├── services/            ← api(전환 스위치) · mock · live · normalize · http · favorites · clock · env
│       ├── mocks/               ← 화면 검증용 Mock Data
│       └── layouts/ lib/ styles/ utils/ hooks/ i18n/ locales/ assets/
│   └── public/logos/            ← 자체 저장 로고 (teams · competitions)
├── design/                      ← Web Foundation 토큰·다크 테마
├── infra/ec2/                   ← EC2 배포 — bootstrap · deploy · systemd 유닛(백엔드·백업 타이머) · S3 백업 (Docker 안 씀)
├── docs/
│   ├── BACKEND_GUIDE.md         ← 백엔드 개발 기준 (ADR-001 기반, 현재 기준)
│   ├── FRONTEND_GUIDE.md        ← 프론트엔드 개발 기준 (현재 기준)
│   ├── V2_DESIGN.md             ← 설계 원본 (이 저장소의 유일한 설계 근거)
│   ├── V2_DESIGN_REVIEW.md      ← 설계 검토 결과 (확정 4건은 V2_DESIGN.md에 반영됨)
│   ├── RETROSPECTIVE.md         ← v1 회고 — 이 문서의 코드 규칙 다수가 여기서 나옴
│   └── FEATURE_PLAN.md          ← v1 기능 현황 + v2 초안 (참고용)
├── archive/presentations/       ← 이전 발표본 보관
└── README.md
```

Controller, Scheduler, Worker, Gateway는 규칙을 복제하지 않고 같은 application 계층을 호출한다.
백엔드 상세 규칙은 `docs/BACKEND_GUIDE.md`를 우선 적용한다.

---

## Git 전략

### 브랜치 전략 — `dev` 통합, `main` 배포 (2026-08-27 확정)

v1의 순수 GitHub Flow(feature → main 직접)에서 바뀌었다. **`dev`가 기본 브랜치(통합
브랜치)이고, `main`은 배포 브랜치다.**

> **현재 상태 (10-08 확인)**: 운영 배포는 `dev` 기준이다 (09-16~) — EC2 는 `deploy.sh dev`,
> Vercel Production Branch 는 `dev` (`docs/DEPLOY.md` "첫 배포 5" · "Vercel" 절). `main` 릴리즈는 한 번도 실시하지 않아
> `origin/main` 은 #4 에 멈춰 있다. `.github/workflows` 는 `backend.yml`·`frontend.yml` verify 뿐이고
> 배포 워크플로는 없다 — 배포는 사람이 `deploy.sh` 를 실행하고 Vercel 은 Git 연동으로 빌드한다.

```
feature/<이름>  ──PR──▶  dev  ──(검증 통과 후 PR)──▶  main  ──▶  배포
   (개발)              (통합·테스트)                (배포 가능 상태 유지)
```

- 모든 기능 개발은 `feature/`(또는 `fix/`, `chore/` 등) 브랜치에서 시작해 **`dev`로 PR**
- `dev`에서 통합 후 테스트(CI 2잡 `frontend-verify`·`backend-verify` + 필요 시 수동 검증)
- **`pull_request` 에는 `paths` 필터를 두지 않는다** — 필터에 걸려 워크플로가 안 돌면
  required check 가 "보고 대기" 로 영원히 멈춘다 (09-07 실제로 막혔다)
- 테스트 완료된 `dev`를 **`main`으로 PR** (정책상 `main` 이 배포 브랜치 — 현재는 위 "현재 상태" 대로 `dev` 에서 배포)
- `main`·`dev` 모두 직접 커밋 금지. `main`은 PR + CI 통과 필수 Ruleset으로 보호
- GitHub 저장소의 기본 브랜치(default branch)는 `dev`로 설정한다 (Phase 0 PR #3)

### 브랜치 네이밍

| 접두사 | 용도 | 예시 |
|---|---|---|
| `feature/` | 신규 기능 | `feature/team-sync-service` |
| `fix/` | 버그 수정 | `fix/squad-diff-duplicate` |
| `chore/` | 설정, 의존성, 환경 | `chore/prisma-setup` |
| `docs/` | 문서, README | `docs/api-spec` |
| `refactor/` | 리팩토링 | `refactor/standing-service` |

### 커밋 메시지 — Conventional Commits

```
<type>(<scope>): <한국어 또는 영어 설명>
```

**type 목록:** `feat`, `fix`, `chore`, `docs`, `refactor`, `test`, `style`

**scope 예시:** `domain`, `ingest`, `api`, `frontend`, `db`, `deploy`, `config`

**커밋 예시:**
```
feat(domain): TeamSyncService EPL 20팀 upsert 구현
feat(ingest): SquadSyncService 이적 diff 로직
fix(schedule): 동시 킥오프 시 오버랩 방지 락 추가
chore(deploy): Cloudflare 빌드 훅 환경변수 설정
docs: V2_DESIGN.md 8장 로드맵 갱신
refactor(domain): StandingService upsert 단일화
test(ingest): 스쿼드 diff 이적 시나리오 테스트
```

### PR 전략

- 기능 하나 = PR 하나. **PR 대상은 원칙적으로 `dev`.**
- `dev` → `main` PR은 릴리즈 단위로 별도로 낸다 (Phase 완료 시점, 또는 배포가 필요한 시점)
- PR 제목도 Conventional Commits 형식 사용
- `Closes #이슈번호`로 이슈 자동 닫기

---

## Git 자동화 워크플로우

### 1. 새 feature 브랜치 시작 (dev 기준)

```bash
git checkout dev
git pull origin dev
git checkout -b feature/<브랜치명>
```

### 2. 작업 후 커밋

```bash
git add .
git status
git commit -m "<type>(<scope>): <설명>"
```

### 3. dev로 PR

```bash
git push origin feature/<브랜치명>
```

이후 https://github.com/donasman/pitchlog-league/compare/dev...feature/<브랜치명> 에서 PR 생성

### 4. dev 머지 후 브랜치 정리

```bash
git checkout dev
git pull origin dev
git branch -d feature/<브랜치명>
git push origin --delete feature/<브랜치명>
```

### 5. dev → main 릴리즈 PR

```bash
# dev가 테스트 완료 상태일 때
```
https://github.com/donasman/pitchlog-league/compare/main...dev 에서 PR 생성.
정책상 이 머지가 배포 시점이지만, **현재 상태(10-08)는 운영 배포가 `dev` 기준이고 `main` 릴리즈 PR 은
아직 한 번도 내지 않았다** ("브랜치 전략" 절의 현재 상태 참고). 배포 자동화 워크플로는 없다.

### 6. Phase 단위 릴리즈 태그

v1의 주차 단위(`v0.2-wk2`) 대신 **Phase 기반**으로 태그한다 (V2_DESIGN.md 8장 로드맵과 통일).

```bash
# main에 Phase 완료 내용이 머지된 시점에 실행
git checkout main
git pull origin main
git tag -a v0-phase0 -m "Phase 0: 안전장치 + 배포 완료"
git push origin v0-phase0
```

Phase별 태그 이름: `v0-phase0`, `v1-phase1-domain`, `v2-phase2-scheduler`,
`v3-phase3-frontend`, `v4-phase4-multileague`.

---

## 에이전트 작업 방식

기능 하나를 구현할 때 main 은 **직접 구현하지 않고** 아래 순서로 서브에이전트를 부린다.
전체 절차와 각 단계 지시문은 `pitchlog-agent-run` 스킬, 근거는 `docs/AGENT_WORKFLOW.md`.

```
01 탐색 A·B   02 결정   03 설계   04 확정·멈춤 │ 05 구현 A·B   06 검증   07 PR·기록
 병렬          main     planner   사용자 확인   │  병렬          별도      pr-flow
 ←──── 계약이 아직 움직인다. 뒤집혀도 한 턴 ────→ │ ←── 계약 동결. 문서 수정 금지 ──→
```

- 병렬은 01 과 05 에서만. 02·03 은 직렬.
- **04 에서 반드시 멈춘다** — 결정 목록·설계안·A/B 파일 집합을 보여주고 확인받기 전에 05 로 가지 않는다.
- 05 지시문에는 확정 계약을 문서 참조가 아니라 **값으로** 박는다. 05 도중 계약이 바뀌면 진행 중인 구현을 버린다.
- 직군: `backend-explorer` · `frontend-explorer` · `planner` · `backend-implementer` · `frontend-implementer` · `backend-verifier` · `frontend-verifier`.
  스택 구분이 없는 작업(`ingest` · CI · 문서)은 범용 `explorer` · `implementer` · `verifier`.
- 환각 규칙 넷 — 읽지 않은 것은 없는 것 · 쓴 에이전트가 검증하지 않는다 · 근거는 문서 절 번호 · 테스트가 진실.
  보고에 "통과할 것" · "아마 있을 것" 은 못 쓴다. 통과한 **출력**만 쓴다.
- 한 판 끝나면 `docs/AGENT_RUNS.md` 에 한 줄. 구조는 이 기록에 근거해서만 고친다.

훅(`.claude/settings.json` → `.claude/hooks/`)이 기계적으로 막는 것: `src/mocks` 수정 · `.env` 계열 수정 ·
프론트 `.ts/.tsx` 생성 · `schema.prisma` 의 `relationMode` 를 `"prisma"` 밖으로 바꾸기 ·
마이그레이션 SQL 의 `FOREIGN KEY` · `dev`/`main` 직접 커밋·push ·
Bash 안 인라인 스크립트(`python -c` · `node -e` · heredoc)로 파일 쓰기 ·
`--no-verify` 로 pre-commit 우회 · `git reset --hard` · `git clean -f` · 강제 push.

이와 별개로 `.githooks/pre-commit` (git 이 커밋 직전에 부른다) 은 널 바이트 · 깨진 UTF-8 ·
`.env` 스테이징 · API 키(이름 기반 4종 + `AIza…` 형식) 를 잡는다.
사람이 직접 쳐도 걸리는 것은 이 층이다.

**`@relation` 은 막지 않는다** — `relationMode = "prisma"` 라 외래키가 안 생긴다.
훅이 막으면 우회하지 않는다 — 막힌 이유가 곧 규칙이다. 자세한 것은 `docs/AGENT_WORKFLOW.md` 7장.

## 코드 작성 규칙

### Backend (TypeScript)

- NestJS + TypeScript strict mode, Node.js 22 기준
- 외부 API DTO와 내부 API 응답 DTO 분리, ValidationPipe 적용
- 서비스 중 외부 API 호출 절대 금지 (배치·스케줄러 시점에만 허용)
- Prisma unique·upsert·transaction으로 중복 수집과 동시 쓰기를 방지
- Prisma migration을 DB 구조의 단일 기준으로 사용
- 테스트는 vitest·Supertest와 PostgreSQL 테스트 환경 사용 (e2e 는 같은 DB 를 쓰므로 파일 병렬 끔)
- 외부 API 호출에는 timeout·호출 제한·제한된 retry·backoff 적용
- Redis·BullMQ는 다중 인스턴스 확장 시에만 도입. **5개년 백필도 안 쓴다** — `backfill_jobs` 체크포인트 + 단일 루프 (09-07)

### Frontend (JavaScript)

- React + Vite + JavaScript 기준, Node 22 고정 (`.nvmrc`)
- TypeScript를 사용하지 않으며 새 소스는 `.js`·`.jsx`로 작성
- React Router DOM 사용. 대회·시즌 필터는 URL에 보존
- Tailwind CSS + shadcn/ui JavaScript 모드 사용 (`tsx: false`, `rsc: false`)
- 경로 별칭은 `jsconfig.json`과 `vite.config.js`에 동일하게 구성
- Server Components는 TypeScript 때문이 아니라 현재 Vite SPA 구조와 맞지 않아 사용하지 않음
- **UI는 v1을 그대로 이관하지 않고 새로 디자인한다** — v1에서 가져오는 건 로직/데이터
  형태(경기 상태값, 라운드 계산 방식 등)까지만 참고 (V2_DESIGN.md 6장 ⚠️)
- API 오류를 빈 데이터로 바꾸지 않고 오류 상태를 UI에 노출
- 프론트엔드의 현재 기준은 `docs/FRONTEND_GUIDE.md`를 우선 적용
- CI에 무음 `catch {}` 검사(grep) 포함
- 커밋 전 `frontend`에서 `npm run verify` 실행
  (`validate:data` → `check:i18n` → `lint` → `test` → `build` 순차 실행 · `frontend/package.json` `verify`)

---

## 환경변수 관리 (보안)

절대 커밋 금지 파일:
- `backend/.env`
- `backend/.env.local`
- `frontend/.env`
- `frontend/.env.local`
- `frontend/.env*.local`

백엔드 변수 목록·검증의 기준은 `backend/src/config/env.validation.ts` 다. 예시 값은 `backend/.env.example` ·
`infra/ec2/backend.env.example` · `frontend/.env.example` 에 있다 — 단 일부 스케줄러 변수는 example 에 없다
(`L2_DAILY_*` · `L1_WEEKLY_*` 는 어느 example 에도 없고, `SCHEDULER_ENABLED` · `BACKFILL_WORKER_*` · `LIVE_POLLER_*` 는 EC2 템플릿에만 있다). 10-08 기준 추가된 것:

| 변수 | 위치 | 뜻 |
|---|---|---|
| `SUPABASE_URL` | backend | **필수** — 비거나 URL 이 아니면 env 검증에서 부팅 실패 (#129~). JWKS·issuer 판정. 10-07 EC2 재시작 루프의 원인 |
| `CORS_ORIGIN` | backend | 프론트 출처 허용 목록(쉼표). **비우면 CORS 를 켜지 않는다** |
| `LOGO_OUTPUT_DIR` | backend | `ingest -- logos` 저장 위치 (기본 `../frontend/public/logos`) |
| `BACKUP_DIR` · `BACKUP_PG_IMAGE` · `BACKUP_SCHEMA` | backend | 백업 저장 위치·Docker 이미지·대상 스키마 |
| `SCHEDULER_ENABLED` | backend | 스케줄러 마스터 스위치 (기본 `false` — 어떤 잡도 등록 안 함) |
| `BACKFILL_WORKER_*` · `BACKFILL_DAILY_CAP` | backend | 백필 워커 스위치(`_ENABLED`)·`_CRON`·`_LIMIT`·`_SEASONS` · 일일 자율 상한 |
| `L2_DAILY_ENABLED`·`_CRON` · `L1_WEEKLY_ENABLED`·`_CRON` | backend | L2 매일 · L1 매주 잡 스위치·cron |
| `LIVE_POLLER_*` · `LIVE_FT_DETAILS_ENABLED` | backend | L4 라이브 폴러 스위치(`_ENABLED`)·주기·강등/정지 임계·probe·`_MODE`(observe/write) · FT 즉시 상세 |
| `VITE_USE_MOCK` | frontend | `false` 면 실 API. 기본은 Mock |
| `VITE_API_BASE_URL` · `VITE_LOGO_BASE_URL` | frontend | 백엔드 주소 · 로고 정적 파일 접두사 |
| `VITE_SUPABASE_URL` · `VITE_SUPABASE_PUBLISHABLE_KEY` | frontend | 둘 다 있어야 로그인 UI 가 뜬다 (Vercel Production·Preview 에 10-08 등록) |

API-Football API 키는 환경변수로만 주입한다.
**어드민 기능은 없다** (10-08 확인 — `backend/src` 에 어드민 코드·변수 없음). v1 의 기본값
`admin/admin1234!` 방치 문제는 "필수값에 기본값을 두지 않는다" 원칙으로 `env.validation.ts` 머리 주석에 남아 있다.

---

## 선행조건 완료 현황

- ✅ **S0 — API-Football 구독**: Pro 플랜 구독 완료 (2026-08-27). 26-27 시즌 데이터 접근 가능
- ✅ **S1 — 저장소 이름**: `pitchlog-league`로 확정, 이 저장소가 그 결과물
- Phase 0 착수를 막던 두 조건 모두 해소됨 → **PR #1(저장소 골격)부터 바로 진행 가능**

## 개발 로드맵 현황 (V2_DESIGN.md 8장 기준)

| Phase | 내용 | 검증 기준 | 상태 |
|---|---|---|---|
| **0** | 안전장치 + 배포 (~~Railway + Pages~~ → **EC2 + Vercel**, 09-15 결정) | 8-2 DoD 4항목 | ✅ CI·Ruleset·pre-commit·Supabase·스켈레톤 · **배포 운영 중(09-16 · `dev` 기준)** / `main` 릴리즈·Phase 태그 미실시 |
| **1** | `Competition`/`Team`/`Season` 도메인 + `Player` + 스쿼드 수집 | 스쿼드 diff 테스트 통과 | 🚧 **관문 통과(09-07)** — L0 · L1 스쿼드 · 조회 API · 백업·복원 리허설 / L1 #9~#11 남음 |
| **2** | 경기·라인업·순위 + 스케줄러 + 5개년 백필 → **그 뒤** 실시간 | 5시즌 완전 + 실제 라운드 1회 무중단 관측 | 🚧 백필-1(09-08) · L3·L5(#46) · **백필-2 완료(09-24 확인)** · 스케줄러 L2 매일·L1 매주(#109) · **L4 실시간 코드 4판**(#111~#123) · L2 missingTeams 자가 복구(#135 · 10-08) / 운영 쓰기 모드 확인 · **실제 라운드 1회 무중단 관측** 남음 |
| **3** | 프론트(신규 디자인) + 배포 파이프라인 | Lighthouse, 백엔드 다운 시 에러 노출 | 🚧 진행 — 실 API 연결 · 경기 상세 3탭(#47) · 팀 상세 배선 + 홈 득점 순위 + 리그 순위 일반화(#48) · 레이아웃 정렬(#49) · 전역 검색 + 한국어 시드(#50) · 어시스턴트(도구 층 + LLM + 근거 카드) · 어시스턴트 응답 압축(#52) · 로고 적용 · 배포(EC2+Vercel) · 대진표 탭(#104) · 라이브 15초 폴링(#123) · 언어별 이름(#126) · **Google 로그인 + 서버 저장 즐겨찾기**(#129 · 운영 개시 10-08) / **알림**(Mock 만) 남음 |
| **4** | L6 보정 · 푸시 알림 · 최종 예산 실측 | 6,000콜/일 경고선 | 🚧 L6 수집 코드는 09-08 에 들어갔다(백필-1). 스케줄러는 있으나 L6 주기 잡은 없다 |

> ⚠️ **범위가 바뀌었다 (2026-09-04~06).** 원래 Phase 1은 EPL 단독이었고 Phase 4가 다중화였으나,
> 실측 이후 **12대회(5대 리그 + UCL + 국내 컵 6개) × 최근 5시즌**이 Phase 1부터 범위에 들어왔다.
> 09-17 에 슈퍼컵 5 · UEL · UECL 이 더해져 **19대회**가 됐다 (PR #85).
> Phase 4의 실질 내용은 다중화가 아니라 보정·알림·예산 실측이다.
> 수집 범위와 콜 예산은 `docs/INGESTION_STRATEGY.md`, 테이블은 `docs/SCHEMA_DESIGN.md`가 기준이다.
> **외래키를 사용하지 않는다** — 참조 무결성은 백엔드 책임 (`docs/BACKEND_GUIDE.md`).

Phase 0 DoD, PR 단위 분해(#1~#6), Phase 1의 구체적 작업 순서는 `V2_DESIGN.md` 8-1·8-3 참조.

Phase 3은 백엔드보다 먼저 Mock Data 기반으로 진행했다. `services/api.js` 는 이제
**`VITE_USE_MOCK` 으로 `mock.js`·`live.js` 중 하나를 고르는 전환 스위치**다 (09-07).
대회·팀·경기·순위·선수·통계·경기 상세·전역 검색·어시스턴트·라이브·즐겨찾기는 실 API 를 탄다.
UCL 대진표는 백엔드 tie 없이 프론트 `buildTies` 가 경기 목록에서 만든다 (#104 · 백엔드 영속화는 2027-02).
**알림**만 백엔드가 없고 `NotificationContext` 가 Mock 을 직접 읽는다.
배포(09-16)와 과거 4시즌 경기 상세 백필(09-24)은 끝났다 (10-07 문서 동기화).
운영 Google 로그인·서버 저장 즐겨찾기는 10-08 에 열렸다 (운영 DB 마이그레이션 · Vercel env · Supabase provider — `docs/DEPLOY.md`).
**09-07 중간 점검(`docs/PLAN_REVIEW.md`)** 이 순서를 확정했다 — 기록 백필 먼저, 실시간은 그 뒤.
현재 진행 상황과 다음 순서는 `docs/NEXT_STEPS.md` 1장이 기준이다.

---

## 자주 쓰는 명령어 참고

```bash
# 현재 브랜치 및 상태 확인
git status
git branch -a

# 변경 이력 확인
git log --oneline --graph --all

# 특정 파일만 스테이징
git add backend/src/...

# 마지막 커밋 메시지 수정 (푸시 전에만)
git commit --amend -m "수정된 메시지"

# 원격 브랜치 목록 최신화
git fetch --prune

# dev 기준 최신화
git checkout dev && git pull origin dev
```

### 백엔드 운영 (backend/ 에서)

```bash
npm run verify                  # prisma validate · typecheck · lint · 단위 테스트
npm run test:e2e                # e2e — 원격 DB 가드 10파일: throw 8 (l0·l1·l2·l3·l5·l6·backfill-details·user-favorites) · skipIf 2 (match-detail·search). 로컬 DB·CI 에서만

npm run ingest -- status        # API 쿼터 스냅샷
npm run ingest -- l0            # 대회·시즌·팀·경기장
npm run ingest -- l1            # 스쿼드 스냅샷 + diff
npm run ingest -- l2            # 라운드·경기·순위 — 수집 범위(isTracked) 19대회 현재 시즌
npm run ingest -- l2 --all-seasons   # 5시즌 전부 (한 시즌은 --season=2024, 등호 형태다)
npm run ingest -- l6 --all-seasons   # 시즌 집계 — 선수 통계·랭킹·팀 통계 (--only=players|rankings|teams)
npm run ingest -- probe-players --all-seasons   # /players 페이지 수 실측 (쓰기 없음)
npm run ingest -- logos         # 로고를 받아 frontend/public/logos 에 저장

npm run backup -- --check       # 백업 환경 점검 (pg_dump/docker · 마지막 성공)
npm run backup                  # pg_dump — 홈/PitchLogBackups
npm run backup:verify           # 일회용 컨테이너에 복원해 행 수 대조
```

### 프론트엔드 (frontend/ 에서)

```bash
npm run verify                  # validate:data · check:i18n · lint · test · build
npm run dev                     # VITE_USE_MOCK=false 면 실 API (VITE_API_BASE_URL 필요)
```

**연결된 폴더의 셸은 네트워크가 없다.** push·pull·npm·prisma·pg_dump 는
Windows 터미널에서 직접 실행한다.
