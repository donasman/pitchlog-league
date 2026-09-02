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
├── backend/                     ← Spring Boot 3.x + Java 21
│   └── src/main/java/com/pitchlog/
│       ├── domain/              ← league/ team/ player/ match/ standing/
│       │     각각 entity · repository · *SyncService(upsert) · *QueryService(조회)
│       ├── ingest/
│       │   ├── client/          ← ApiFootballClient (Resilience4j 적용 지점)
│       │   ├── dto/             ← 외부 API 응답 DTO (@JsonIgnoreProperties 필수)
│       │   ├── batch/           ← Spring Batch Job/Tasklet — Batch 의존은 여기까지만
│       │   └── schedule/        ← @Scheduled 스케줄러 — Batch 의존 없음
│       ├── api/                 ← controller + response DTO
│       └── config/
├── frontend/                    ← React + Vite + JavaScript, Node 22 고정
│   └── src/
│       ├── pages/               ← teams, players, matches, standings, stats
│       ├── routes/              ← React Router 라우트 정의
│       ├── components/          ← ui, player, team, standings, matches
│       ├── services/            ← 백엔드 API 연결 계층
│       ├── mocks/               ← 화면 검증용 Mock Data
│       └── utils/
├── docker-compose.yml
├── docs/
│   ├── V2_DESIGN.md             ← 설계 원본 (이 저장소의 유일한 설계 근거)
│   ├── V2_DESIGN_REVIEW.md      ← 설계 검토 결과 (확정 4건은 V2_DESIGN.md에 반영됨)
│   ├── RETROSPECTIVE.md         ← v1 회고 — 이 문서의 코드 규칙 다수가 여기서 나옴
│   └── FEATURE_PLAN.md          ← v1 기능 현황 + v2 초안 (참고용)
├── output/                      ← 현재 발표본과 변경 요약
├── archive/presentations/       ← 이전 발표본 보관
└── README.md
```

`domain/*/sync`가 upsert 로직의 유일한 자리다. `ingest/batch`와 `ingest/schedule`은
서로 import하지 않고 각자 같은 도메인 서비스만 호출한다 (V2_DESIGN.md 5-4).

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
| `chore/` | 설정, 의존성, 환경 | `chore/flyway-setup` |
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

### Backend (Java)

- 패키지: `com.pitchlog.*` 준수. `ingest/batch`와 `ingest/schedule`은 서로 import 금지
  (ArchUnit으로 CI에서 강제 — V2_DESIGN.md 5-4, 5-5)
- Java record, `@NoArgsConstructor(access = PROTECTED)`, 정적 팩토리 메서드 패턴 사용
- 외부 API DTO에 `@JsonIgnoreProperties(ignoreUnknown = true)` 필수
- 서비스 중 외부 API 호출 절대 금지 (배치·스케줄러 시점에만 허용)
- **`*SyncService`의 upsert는 `ON CONFLICT` 또는 `@Version` 낙관적 락 필수** — 배치
  백필과 스케줄러 동기화가 같은 row를 동시에 쓸 수 있음 (V2_DESIGN.md 5-4 ⚠️)
- 마이그레이션은 **Flyway 필수** (`ddl-auto: validate`, 수기 schema.sql 금지)
- 테스트 DB는 **Testcontainers**(Postgres) 사용, H2 금지
- 외부 API 호출에는 **Resilience4j**(rate limit·백오프·서킷브레이커) 적용

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

---

## 환경변수 관리 (보안)

절대 커밋 금지 파일:
- `backend/src/main/resources/application-secret.yml`
- `backend/src/main/resources/application-local.yml`
- `frontend/.env`
- `frontend/.env.local`
- `frontend/.env*.local`

API-Football API 키는 반드시 `application-secret.yml`에만 저장.
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
| **0** | 안전장치 + 배포 PoC (프로덕션 코드 없음) | 8-2 DoD 4항목 | 🔲 대기 (PR #1~#6) |
| **1** | `League`/`Team`/`Season` 도메인 + `Player` 이관 + EPL 스쿼드 수집 | 스쿼드 diff 테스트 통과 | 🔲 대기 |
| **2** | 경기·라인업·순위 + 스케줄러 이관 | 실제 라운드 1회 무중단 관측 | 🔲 대기 |
| **3** | 프론트(신규 디자인) + 배포 파이프라인 | Lighthouse, 백엔드 다운 시 에러 노출 | 🔲 대기 |
| **4** | `League` 다중화 → 5대 리그 + UCL | API 예산 재검산 | 🔲 대기 |

Phase 0 DoD, PR 단위 분해(#1~#6), Phase 1의 구체적 작업 순서는 `V2_DESIGN.md` 8-1·8-3 참조.

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
