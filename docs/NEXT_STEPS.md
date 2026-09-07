# PitchLog 다음 작업 순서

> 갱신: 2026-09-07 (2차, 조회 API 후) · 이전 판(09-06)을 대체한다.
> 근거 문서: `INGESTION_STRATEGY.md` · `SCHEMA_DESIGN.md` · `DATA_RULES.md` ·
> `API_INVENTORY.md` · `PRD.md` · `BACKEND_FEATURES.md`

**설계는 충분하다. 코드가 돌기 시작했다 — 문서는 코드가 바꾼 사실만 갱신한다.**
아래는 코드로 넘어가는 순서다. 세션을 새로 열면 **1장부터** 본다.

---

## 0. 지금 어디까지 왔나

| 영역 | 상태 |
|---|---|
| 설계 문서 | ✅ 완료 — docs 24개 + 디자인 브리프 9개 |
| 디자인 | ✅ 완료 — 시안 13개, 토큰 1파일 |
| API 실측 | ✅ 완료 — 엔드포인트 53종·컵 30개·5시즌·과거 깊이 전수 조사 |
| 수집 전략 | ✅ 확정 — 12대회 × 5시즌, 컵 컷오프, 백필 계획 |
| 스키마 설계 | ✅ 확정 — 테이블 30개, 외래키 미사용 |
| 프론트엔드 | 🚧 1~8단계 화면 구현 완료. **실 API 첫 연결**(`VITE_USE_MOCK` 전환 · 대회·팀) — 경기·순위·선수는 아직 Mock 전용, 컵 화면 남음 |
| **백엔드** | 🚧 Nest 12 · Prisma 29테이블 · API 클라이언트 · 배치 upsert · **L0 실 적재 완료**(17대회 · 82대회시즌 · 고유 팀 1,888) · **조회 API 4개**(`/api/competitions`(+:ref) · `/api/teams`(+:ref), Swagger `/docs`) |
| CI · DB | ✅ CI 2잡(`frontend-verify`·`backend-verify`, e2e 5파일 28건) · Supabase dev **서울**(ap-northeast-2, 09-07 이전 — L0 200초 → 71초) · 기본 브랜치 `dev` · Ruleset `protect-main`·`protect-dev` |
| 배포 | ❌ 배포 PoC 미착수 |
| 백업 | ❌ 없음 — **백필 전 필수** |

### 확정된 범위

| 항목 | 값 |
|---|---|
| 대회 | **12개** — 5대 리그 + UCL + 국내 컵 6개 (+슈퍼컵 5개) |
| 시즌 | **최근 5시즌** (2022~2026) |
| 컵 수집 | 목록은 1부 팀 최초 등장 라운드부터 · 상세는 (1부 참가 OR 16강 이상) |
| DB | Supabase 무료 500MB. 추정 사용 266MB (53%) |
| 백필 | 약 45,400콜 · **8~12일** |
| 외래키 | **사용하지 않음.** 무결성은 백엔드 책임 |

---

## 1. 지금 당장 — 다음 세션 첫 작업

09-07 에 끝낸 것: 서울 리전 이전 · L0 재실행 · 조회 API 4개(PR #12) · `output/` 정리 ·
`protect-dev` Ruleset · 원격 브랜치 4개 삭제 · 프론트 첫 연결 · **브라우저 실측** ·
**로고 자체 저장 CLI**(5장을 앞으로 당김).

### 실측에서 나온 것 (09-07, 브라우저)

`/competitions` 6개 · `/teams` 5그룹(EPL 20 · 라리가 20 · 분데스 18) · 헤더 선택기 ·
미구현 화면 오류 표시 — 전부 의도대로 동작했다. **로고만 빼고.**

팀 목록 한 화면의 로고 96개가 **11초가 지나도 전부 로딩 미완료**였다
(`loaded: 0, failed: 0, pending: 96`). 같은 URL 을 하나만 받으면 200·90KB 로 멀쩡하다.
원본이 1개당 90KB 이고 media 호스트가 동시 연결을 조인다. 한 화면에 8.6MB 다.

**폴백이 작동하지 않는다는 게 더 큰 문제였다.** 실패가 아니라 "영원히 로딩 중" 이라
`<img onError>` 가 불리지 않아 이니셜로 넘어가지 못하고 회색 사각형만 남는다.
그래서 5장 "로고 자체 저장" 을 8단계 백필보다 앞으로 당겼다.

### 남은 일

- [ ] **Windows 에서 로고 받기** — `cd backend && npm install && npm run ingest -- logos`
      (`sharp` 신규 의존성. 로고는 공개 media 라 API 키가 필요 없다)
      → `frontend/public/logos/{teams,competitions}/<apiId>.webp` 96×96, 6대회 참가팀 155개.
      받은 뒤 저장소에 커밋한다
- [ ] **재실측** — 팀 목록에서 로고가 뜨는지, 파일 없는 팀이 이니셜로 폴백하는지
- [ ] `npm run verify`(프론트 build 포함) · 백엔드 `lint`·`typecheck` — 리눅스 VM 에서는
      네이티브 바인딩(rollup·oxlint·sharp)이 Windows 용이라 못 돈다

그 뒤는 **4단계 백업**이다. 8단계 백필 전에 반드시 끝내야 한다.

연결된 폴더의 셸은 리눅스 VM이라 네트워크가 없다. **push·pull·npm·prisma 는 Windows 터미널에서 직접 실행한다.**

---

### 09-07 프론트 첫 연결에서 정한 것

| 항목 | 결정 |
|---|---|
| Mock ↔ 실 API | `VITE_USE_MOCK` 로 **통째로** 전환. 한 화면에 섞지 않는다 |
| 미구현 화면 | `NotImplementedError` 로 드러낸다. 빈 목록으로 위장하면 "없음"과 "아직 없음"을 구분 못 한다 |
| 팀 배지 | 우리 정적 파일(`/logos/teams/<apiId>.webp`) 우선, 없으면 404 즉시 → 이니셜 폴백. media URL 직링크는 실측에서 못 쓴다는 게 확인됐다 |
| 대회 노출 | 백엔드 17개 중 화면은 6개 — `normalize.js` 의 `VISIBLE_COMPETITION_API_IDS` |
| 라우팅 | 기존 slug 유지. 대회 6개는 별칭 표로 `ref`→기존 slug·id 로 옮긴다 |
| 팀 한국어 이름 | 없다. `entityNames` 는 Mock id 키라 1,888팀에 못 붙인다 — 11단계 `localized_names` 적재로 해결 |
| 선수 검색 | 실 API 모드에서는 인덱스에서 뺀다 (9단계 L1 전까지 조회 API 없음) |

파일: `services/http.js`(fetch 래퍼) · `services/normalize.js`(정규화 계층 = 11장) ·
`services/live.js`(실 API) · `services/mock.js`(기존 api.js) · `services/api.js`(전환 스위치)

---

## 2. Phase 0 마무리 — 1~2일

코드가 쌓이기 전이 가장 싸다.

- [x] ~~**CI**~~ ✅ `.github/workflows/frontend.yml` — `paths` 필터, `npm run verify`,
      무음 catch 검사(빈 catch + `.catch(() => null)`). 이 검사가 `StandingsPage.jsx`의
      기존 위반 1건을 잡아 같이 고쳤다
- [x] ~~pre-commit 훅~~ ✅ `.githooks/pre-commit` — null byte · 깨진 UTF-8 · `.env` ·
      하드코딩된 API 키. **각 개발 환경에서 `git config core.hooksPath .githooks` 1회 필요**
- [x] ~~GitHub 설정~~ ✅ 기본 브랜치 `dev`, `protect-main` · `protect-dev` 둘 다 (PR 필수 + `frontend-verify`·`backend-verify`, 09-07)
- [x] ~~Supabase 프로젝트 생성~~ ✅ `pitchlog-league-dev` (ap-southeast-1). prod 는 필요 시. Session pooler 5432 사용
- [x] ~~NestJS 스켈레톤~~ ✅ Nest 12 · `/health` · Swagger `/docs` · 환경변수 검증 · PrismaService(adapter-pg)
- [ ] 배포 PoC (PR #6) — 정적 빌드 시간, Deploy Hook 지연, Socket.io 연결

---

## 3. Prisma 스키마 — 2~3일

`SCHEMA_DESIGN.md` 기준. 초기 마이그레이션 1개 (11장 개정).

- [x] ~~schema.prisma~~ ✅ 모델 29개 · enum 17개 · `relationMode="prisma"` · ID 컬럼 인덱스 전부
- [x] ~~partial unique index~~ ✅ `prisma/sql/partial-indexes.sql` — `--create-only` 로 만든
      init 마이그레이션 끝에 붙인다
- [x] ~~고아 행 검사~~ ✅ `IntegrityService` 관계 18개 + 슬롯 순환 검사 · `test/integrity.e2e-spec.ts`
- [x] ~~Windows 에서 검증~~ ✅ validate · generate · typecheck · lint 통과
- [x] ~~Supabase dev URL 로 `migrate dev`~~ ✅ `20260906144654_init` — 테이블 29 · 인덱스 90 · FK 0.
      partial index 4개 SQL 끝에 수동 추가. `/health` db:true, e2e 3건 통과(고아 행 검사 포함)
- [x] ~~Prisma `upsert()`가 `ON CONFLICT`로 컴파일되는지~~ ✅ 확인 대신 **강제** — `prisma/batch-upsert.ts` 가
      raw `INSERT … ON CONFLICT` 를 만든다. `test/l0.e2e-spec.ts` 가 쿼리 로그로 문장 수까지 검사 (B-2 종결).
      동시 호출 테스트는 `players` 를 만드는 PR 에서
- [x] ~~백엔드 CI~~ ✅ `backend.yml` — Postgres 16 컨테이너, partial index 존재 확인까지. **첫 실행은 PR 에서**

관계 컬럼 `@@index` 누락은 리뷰 체크 항목이다 (`BACKEND_GUIDE.md`).

---

## 4. 백업 — 반나절 · 백필 전 필수 ★

Supabase 무료는 **백업도 PITR도 없다.** 백필이 8~12일짜리인데 날아가면 다시 8~12일이다.

- [ ] `pg_dump` 주 1회 잡
- [ ] 저장 위치 결정 — R2 / GitHub Release / 로컬
- [ ] 복원 1회 리허설 — 받아본 적 없는 백업은 백업이 아니다

**이것 없이 백필을 시작하지 않는다.**

---

## 5. 공통 HTTP client + L0 — 2일

수집 기능보다 클라이언트를 먼저 만든다. v1은 보호장치 없이 수집부터 만들었고 회고가 그걸 지목했다.

- [x] timeout · 호출 제한 · 제한된 retry · exponential backoff — `ingestion/api-football/`
- [x] `/status` 적재 → `api_quota_snapshots`. **경고선 6,000콜/일 판단의 근거** — `npm run ingest -- status`
- [x] 배치 upsert 헬퍼 `prisma/batch-upsert.ts` — 행 단위 upsert 가 Supabase 왕복에 막혀(5초 트랜잭션 한도) 추가.
      테이블당 1문장, ON CONFLICT 보장(설계검토 B-2 종결). 이후 모든 수집 계층이 이걸 쓴다
- [x] ~~L0 기준 데이터~~ ✅ 09-07 첫 실 적재 — 17대회 · 82대회시즌(2026 미제공 컵 3개) · 고유 팀 1,888 · 3분 20초 · 건너뜀 0.
      `test/l0.e2e-spec.ts` 가 가짜 API 로 같은 흐름을 CI 마다 돈다. 이름 반영 재실행은 1장
- [x] `API_FOOTBALL_KEY` 없이도 앱이 뜬다 — 키는 첫 호출에서만 요구 (CI·조회 서버용, PR #9)
- [x] ~~로고는 내려받아 자체 저장~~ ✅ 09-07 — `ingest -- logos` 가 받아 96×96 webp 로 줄여
      `frontend/public/logos/` 에 쓴다. 저장소 안이라 배포 인프라(백엔드 호스팅·R2) 결정에
      묶이지 않고 Cloudflare Pages 가 그대로 서빙한다. 옮기려면 `VITE_LOGO_BASE_URL` 접두사만 바꾼다.
      동시 4개 · 재시도 2회 · 이미 있는 파일은 건너뜀(`--force` 로 전체 재수집).
      범위는 화면에 나오는 6대회 현재 시즌 참가팀 — 백필로 팀이 늘면 다시 돌린다.
      **`npm install` 과 첫 실행은 Windows 에서** (1장)

---

## 6. 조회 API 2개 + 응답 계약 — 3~4일

**DTO 계약을 별도 문서로 쓰지 않는다. Swagger 스펙이 계약이다.**
문서로 쓰면 코드와 갈라진다.

- [x] ~~`GET /competitions` · `GET /standings`~~ → **`/api/competitions`(+`/:ref`) · `/api/teams`(+`/:ref`)** ✅ 09-07.
      순위표는 L2 전엔 데이터가 없어 `/standings` 는 L2 와 같이. Swagger `/docs` 가 계약. e2e 11건
- [x] ~~모든 응답에 `asOf`~~ ✅ `common/as-of.ts` — 목록은 최신 행, 단건은 그 행
- [x] **식별자 `ref` = `<apiId>-<slug>`** 결정 — `common/ref.ts`. 근거는 BACKEND_FEATURES 2장
- [x] **대회시즌 `dataState`**(NONE/PARTIAL/COMPLETE) — `common/data-state.ts`. 시즌 선택기 노출 기준
- [ ] 결손 표기 규약 — 컵 경기의 `hasTeamStats` 등을 응답에 어떻게 실을지 (경기 API 만들 때)
- [x] ~~프론트 `services/api.js`를 이 스펙에 맞춘다~~ ✅ 09-07 — 대회 목록·상세 · 팀 목록·상세.
      `VITE_USE_MOCK` 으로 Mock/실 API 를 통째로 전환한다. 백엔드는 `CORS_ORIGIN` 으로 출처를 받는다

---

## 7. 화면 구성 변경 — 6번과 병렬 가능

컵과 5개년이 들어오면서 새로 필요한 것들이다.

- [ ] **대진표** — 슬롯 3상태(`CONFIRMED` / `PENDING_WINNER` / `UNDRAWN`).
      "Round of 32 승자" · "추첨 예정" · "예선 통과" 표기
- [ ] **컵 경기 상세의 통계 탭 결손** — 오류가 아니라 정상 상태로 구분해 보여준다.
      `EmptyState`에 `action` prop이 없다 (1단계 감사 #11)
- [ ] **시즌 선택기** — 백필이 끝나지 않은 시즌은 노출하지 않는다.
      부분적으로 찬 순위표는 사용자가 최신인 줄 안다
- [ ] **컵 대회 화면** — 순위표가 없다. 리그와 구조가 달라야 한다
- [x] ~~1단계 감사 12건~~ ✅ `c6c43b4`에서 전부 수정됨. 단 #11의 `EmptyState` `action` prop은
      여전히 없다 — 컵 통계 탭 결손 표시에서 필요하다

---

## 8. L2 일정 + 백필 실행 — 8~12일

`INGESTION_STRATEGY.md` 5장 그대로.

- [ ] `competition_rounds` 적재 — 컷오프 판정의 근거
- [ ] BullMQ Worker 승격 — 백필이 Redis를 실제로 도입하는 첫 작업
- [ ] `backfill_jobs` 재시작 지점
- [ ] **최신 시즌부터 역순.** 1일차에 2026 시즌이 끝나면 사이트를 열 수 있다
- [ ] 백필은 비경기일에 몰고 경기일에는 폴링을 우선한다

---

## 9. L1 스쿼드 diff ★ 관문

완료 기준은 "500선수가 DB에 있다"가 아니라
**"스쿼드 diff 테스트가 이적 시나리오를 통과한다"** 이다.

⚠ **백필 진행 중에는 해당 대회-시즌의 L1을 건너뛴다.** 이중 이력이 생기면
partial unique index가 에러로 막아서 diff가 실패한다 (`SCHEMA_DESIGN.md` 5장 충돌 ③).

---

## 10. L3~L5 실시간 + 확정 처리

- [ ] 라이브 폴링 윈도우 개폐 — 10초 × 24시간이면 8,640콜로 한도를 그것만으로 넘긴다
- [ ] 주기 강등 규칙 — 누적 6,000 초과 / 백필 중 / 진행 경기 1개 이하면 15초
- [ ] 오버랩 방지 + **한 주기 처리 시간 계측**
- [ ] `data_version` 조건부 갱신 — FT 직후 폴링이 상태를 되돌리는 것을 막는다
- [ ] 녹아웃 tie 확정 — 2차전 FT 후 합산·승자·`win_reason`

---

## 11. 프론트 실 API 연결 + 배포

- [x] ~~`services/api.js` Mock → fetch~~ ✅ 09-07 — 대회·팀만. 나머지는 L1·L2 뒤
- [x] ~~null 정규화 계층~~ ✅ `services/normalize.js` — `ref`→slug, format enum, 시즌 객체→라벨,
      상세에만 있는 값(경기장 등)을 목록에서도 `null` 로 맞춘다
- [ ] Socket.io 연결 + REST 풀 싱크 fallback
- [ ] i18n — `localized_names` 적재 후 프론트 `entityNames.js` 제거

---

## 12. 아직 안 쓴 문서 — 코드를 막지 않는다

| 문서 | 언제 |
|---|---|
| 설계·기획 의도 변경 정리 | 7단계 즈음. 컵·5개년이 PRD 전제를 바꾼 것을 반영 |
| i18n 범위 재산정 | 8단계 전. 라운드명 번역 체계, 컵 참가 팀 64개 |
| 시즌 롤오버 운영 규칙 | 8단계 전. 대회마다 시즌 등록 시점이 다르다 |

---

## 13. Phase 대응

| Phase | 이 문서의 단계 | 검증 |
|---|---|---|
| 0 | 2 | 배포 PoC + CI |
| 1 | 3·4·5·6·9 | 스쿼드 diff 테스트 통과 |
| 2 | 8·10 | **실제 라운드 1회 무중단 관측** |
| 3 | 7·11 | 백엔드 다운 시 오류 노출 |
| 4 | — | 최종 API 예산 실측 (6,000콜/일 경고선) |
| 5 | — | AI 어시스턴트, 숫자 환각 0건 |

로드맵 표의 Phase 4는 원래 "리그 다중화"였으나 **컵 6개가 Phase 1부터 범위에 들어왔다.**
Phase 4의 실질 내용은 L6 보정·푸시 알림·예산 실측으로 바뀐다.

---

## 14. 남은 미결정

| # | 항목 | 언제 |
|---|---|---|
| 2 | Tailwind 팔레트 통합 | 프론트 교체 시. 감사 #6(`--muted-foreground` 4.38:1)이 여기 걸린다 |
| 4 | 모바일 필터 바 형태 | 경기 탭 모바일 구현 시 |
| 6 | 다크 모드 기본값 | 배포 전 |
| 7 | 팀 엠블럼 없을 때 | 컵 하부팀에서 상시 발생한다. 실 API 연결 시 |
| — | 상시 백엔드 호스팅 (Railway Hobby $5) | Phase 2 전 |
| — | 팀 최근 경기 질의 — `UNION ALL` vs 보조 테이블 | Phase 2 실측 후 |
| — | 백필을 어느 Phase에 넣을지 | Phase 1 완료 시점에 판단 |

`SCHEMA_DESIGN.md` 12장과 `INGESTION_STRATEGY.md` 8장에 각 문서의 미결정이 따로 있다.
