# PitchLog League — Claude Code 가이드

> EPL(잉글리시 프리미어리그) 선수 정보·통계 웹서비스 (PitchLog v2)
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
│   │   ├── competition/ team/ player/ match/ standing/ statistics/
│   │   ├── ingestion/           ← API-Football·schedule·jobs
│   │   ├── realtime/            ← NestJS Gateway + Socket.io
│   │   ├── ai/                  ← 결정적 조회 도구·LLM 오케스트레이터
│   │   └── common/
│   └── prisma/                  ← schema·migration
├── frontend/                    ← React + Vite + JavaScript, Node 22 고정
│   └── src/
│       ├── pages/               ← teams, players, matches, standings, stats
│       ├── routes/              ← React Router 라우트 정의
│       ├── components/          ← ui, player, team, standings, matches
│       ├── services/            ← 백엔드 API 연결 계층
│       ├── mocks/               ← 화면 검증용 Mock Data
│       └── utils/
├── design/                      ← Web Foundation 토큰·다크 테마
├── infra/                       ← docker-compose.yml, 배포 설정
├── docs/
│   ├── BACKEND_GUIDE.md         ← 백엔드 개발 기준 (ADR-001 기반, 현재 기준)
│   ├── FRONTEND_GUIDE.md        ← 프론트엔드 개발 기준 (현재 기준)
│   ├── V2_DESIGN.md             ← 설계 원본 (이 저장소의 유일한 설계 근거)
│   ├── V2_DESIGN_REVIEW.md      ← 설계 검토 결과 (확정 4건은 V2_DESIGN.md에 반영됨)
│   ├── RETROSPECTIVE.md         ← v1 회고 — 이 문서의 코드 규칙 다수가 여기서 나옴
│   └── FEATURE_PLAN.md          ← v1 기능 현황 + v2 초안 (참고용)
├── output/                      ← 현재 발표본과 변경 요약
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

```
feature/<이름>  ──PR──▶  dev  ──(검증 통과 후 PR)──▶  main  ──▶  배포
   (개발)              (통합·테스트)                (배포 가능 상태 유지)
```

- 모든 기능 개발은 `feature/`(또는 `fix/`, `chore/` 등) 브랜치에서 시작해 **`dev`로 PR**
- `dev`에서 통합 후 테스트(CI 3잡 + 필요 시 수동 검증)
- 테스트 완료된 `dev`를 **`main`으로 PR** → 머지 시 배포 트리거
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

### 5. dev → main 릴리즈 PR (배포 트리거)

```bash
# dev가 테스트 완료 상태일 때
```
https://github.com/donasman/pitchlog-league/compare/main...dev 에서 PR 생성 → 머지 시 배포

### 6. Phase 단위 릴리즈 태그

v1의 주차 단위(`v0.2-wk2`) 대신 **Phase 기반**으로 태그한다 (V2_DESIGN.md 8장 로드맵과 통일).

```bash
# main에 Phase 완료 내용이 머지된 시점에 실행
git checkout main
git pull origin main
git tag -a v0-phase0 -m "Phase 0: 안전장치 + 배포 PoC 완료"
git push origin v0-phase0
```

Phase별 태그 이름: `v0-phase0`, `v1-phase1-domain`, `v2-phase2-scheduler`,
`v3-phase3-frontend`, `v4-phase4-multileague`.

---

## 코드 작성 규칙

### Backend (TypeScript)

- NestJS + TypeScript strict mode, Node.js 22 기준
- 외부 API DTO와 내부 API 응답 DTO 분리, ValidationPipe 적용
- 서비스 중 외부 API 호출 절대 금지 (배치·스케줄러 시점에만 허용)
- Prisma unique·upsert·transaction으로 중복 수집과 동시 쓰기를 방지
- Prisma migration을 DB 구조의 단일 기준으로 사용
- 테스트는 Jest·Supertest와 PostgreSQL 테스트 환경 사용
- 외부 API 호출에는 timeout·호출 제한·제한된 retry·backoff 적용
- Redis·BullMQ는 대량 작업 또는 다중 인스턴스 확장 시에만 도입

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
  (`validate:data` → `check:i18n` → `lint` → `build` 순차 실행)

---

## 환경변수 관리 (보안)

절대 커밋 금지 파일:
- `backend/.env`
- `backend/.env.local`
- `frontend/.env`
- `frontend/.env.local`
- `frontend/.env*.local`

API-Football API 키는 환경변수로만 주입한다.
**어드민 비밀번호는 환경변수 필수화** — 미설정 시 부팅 실패 (v1의 기본값
`admin/admin1234!` 방치 문제 재발 방지, V2_DESIGN.md 9장).

---

## 선행조건 완료 현황

- ✅ **S0 — API-Football 구독**: Pro 플랜 구독 완료 (2026-08-27). 26-27 시즌 데이터 접근 가능
- ✅ **S1 — 저장소 이름**: `pitchlog-league`로 확정, 이 저장소가 그 결과물
- Phase 0 착수를 막던 두 조건 모두 해소됨 → **PR #1(저장소 골격)부터 바로 진행 가능**

## 개발 로드맵 현황 (V2_DESIGN.md 8장 기준)

| Phase | 내용 | 검증 기준 | 상태 |
|---|---|---|---|
| **0** | 안전장치 + 배포 PoC (프로덕션 코드 없음) | 8-2 DoD 4항목 | 🚧 진행 (저장소 골격·문서 완료 / CI·배포 PoC 미착수) |
| **1** | `League`/`Team`/`Season` 도메인 + `Player` 이관 + EPL 스쿼드 수집 | 스쿼드 diff 테스트 통과 | 🔲 대기 |
| **2** | 경기·라인업·순위 + 스케줄러 이관 | 실제 라운드 1회 무중단 관측 | 🔲 대기 |
| **3** | 프론트(신규 디자인) + 배포 파이프라인 | Lighthouse, 백엔드 다운 시 에러 노출 | 🚧 진행 (Mock 기반 화면·i18n 완료 / 실 API 연결·배포 미착수) |
| **4** | `League` 다중화 → 5대 리그 + UCL | API 예산 재검산 | 🔲 대기 |

Phase 0 DoD, PR 단위 분해(#1~#6), Phase 1의 구체적 작업 순서는 `V2_DESIGN.md` 8-1·8-3 참조.

Phase 3은 백엔드보다 먼저 Mock Data 기반으로 진행했다. 화면·라우팅·i18n은 구현돼 있고
`services/api.js`가 Mock을 반환하는 상태이므로, 실 API 연결과 배포가 남은 작업이다.
현재 진행 상황과 다음 순서는 `docs/NEXT_STEPS.md`가 기준이다.

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
