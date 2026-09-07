---
name: pitchlog-e2e-fixture
description: PitchLog 백엔드에 새 수집 계층(L3 이후)이나 조회 API 의 e2e 를 쓸 때 — 가짜 API 클라이언트·픽스처 id 대역·afterAll 정리 순서 규칙.
---

# PitchLog e2e 픽스처 규칙

본보기: `backend/test/l1.e2e-spec.ts` · `l2.e2e-spec.ts`. 새 파일은 이 둘의 구조를 그대로 따른다.
판정 로직은 순수 함수 단위 테스트(`src/**/*.spec.ts`)가 보고, e2e 는 **DB 에 실제로 쓸 때만 드러나는 것**(unique·정리·멱등·소유권·고아 행)만 본다.

## 뼈대

1. **원격 DB 가드** — `beforeAll` 첫 줄. `DATABASE_URL` 호스트가 localhost/127.0.0.1/::1 이 아니고 `CI` 도 `E2E_ALLOW_REMOTE_DB=1` 도 아니면 throw. 가짜 데이터가 Supabase dev 에 섞인 사고(09-07)를 막는다.
2. **가짜 `ApiFootballClient`** — `overrideProvider(ApiFootballClient).useValue(fake)`. `calls: string[]` 와 `get callCount()` 를 반드시 둔다(`IngestionRunService` 가 콜 수 차분에 쓴다). 모르는 경로는 throw. 모르는 league 는 **빈 응답**(다른 e2e 가 남긴 대회가 있어도 쓰지 않게).
3. **픽스처 id 는 카탈로그 밖 대역** — 이미 쓴 것: l1 = 대회 990_039 · 팀 990_00x · 선수 990_1xx/700_xxx. l2 = 대회 991_140/991_143 · 팀 991_001~020/992_00x · 경기장 993_001 · 경기 994_xxx. **새 파일은 995_xxx 부터** 잡고 파일 머리에 적는다. 어설션은 이 대역으로 좁힌다 — 전역 count 를 쓰지 않는다.
4. **화면 범위 조건** — 대회가 수집 대상이 되려면 `isTracked: true` · `displayOrder ≤ 100` · 현재 시즌 `isCurrent: true`. 컵 컷을 시험하려면 `format: KNOCKOUT` + `topFlightCompetitionId` 를 픽스처 리그로 지정해 1부 팀 집합을 결정적으로 만든다.
5. **`afterAll` 정리** — 반드시. `l0.e2e-spec.ts` 는 대회시즌·팀·참가를 **전역으로** 세므로 픽스처 하나가 남으면 그쪽 어설션 여섯 개가 한꺼번에 깨진다(09-07 CI 실제 사례). 파일 실행 순서에 기대지 않는다.
   - 자식부터: `standings → matches → competition_rounds → backfill_jobs → competition_entries → competition_seasons → (참조 끊기) competitions → venues → teams` (L1 이면 `squad_entries → players` 먼저). `relationMode="prisma"` 의 Restrict 가 자식이 남으면 부모 삭제를 막는다.
   - `seasons` 는 지우지 않는다 — l0 가 같은 연도를 쓴다.
   - 컵이 리그를 `topFlightCompetitionId` 로 참조하면 `updateMany` 로 끊고 지운다.
   - 정리 실패는 `console.warn` 으로만 — throw 하면 진짜 실패 원인이 가려진다.
   - `await app?.close()` — `beforeAll` 이 가드에서 죽으면 `app` 이 없다.
6. **마지막 테스트는 고아 행 검사** — `app.get(IntegrityService).findOrphans()` 가 `[]`.

## 소유권 경계를 시험하는 법

다른 계층의 컬럼(`has_*` · `detail_checked_at` · `data_version` · `tie_id` · `leg` · `stats_state`)을 재실행이 지우지 않는지: 값을 직접 넣고 `run()` 뒤 그대로인지 본다(l2 e2e 5번).

## 숫자 확인

픽스처가 만드는 기대 수치(컷 ordinal · 팀 수 · 저장 경기 수)는 **추정하지 말고** 순수 함수를 같은 입력으로 실제로 돌려 확인한 뒤 어설션에 쓴다(l2 e2e 작성 때 한 방식 — Cowork 에서는 클라우드 컨테이너, CLI 에서는 로컬 vitest).

## 실행

Cowork VM 에서는 못 돈다(vitest 네이티브 바인딩·원격 DB 가드). `npx tsc --noEmit` 만 VM 에서. 실제 실행은 CI 또는 로컬 Postgres. 사용자에게 "e2e N건은 CI 에서 처음 확인된다" 고 말한다.
