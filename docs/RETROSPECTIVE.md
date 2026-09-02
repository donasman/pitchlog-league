# PitchLog 회고 — 커밋 이력 분석

> **현재 기준과의 구분:** 이 문서의 `.tsx`, `tsc`, Next.js 관련 경로와 명령은 v1 이력에 대한
> 분석 기록임. 현재 프론트엔드는 React + Vite + JavaScript를 사용하며
> [`FRONTEND_GUIDE.md`](./FRONTEND_GUIDE.md)를 우선 적용함.

> 대상: 2026-05-28 ~ 2026-08-23, 커밋 88개(머지 11 포함), PR 11개
> 목적: 다음 프로젝트(26-27 유럽 리그)에서 같은 비용을 반복하지 않기

---

## 1. 숫자로 본 이력

| 지표 | 값 | 해석 |
|---|---|---|
| 전체 커밋 | 88 (non-merge 77) | |
| `fix` | **35** | 전체의 45% |
| `feat` | 19 | |
| **fix / feat 비율** | **1.8 : 1** | 새 기능 1개당 버그 수정 2개 |
| `test` 타입 커밋 | **0** | 테스트 파일은 3개 존재하나 별도 커밋 타입으로 남기지 않음 |
| Conventional Commits 준수 | 76 / 77 (98.7%) | 매우 우수 |
| main 직접 커밋 | **62 / 77 (80%)** | 규칙은 "직접 커밋 금지" |
| 00~05시 커밋 | **50 / 77 (65%)** | 새벽 집중 |

### 파일 핫스팟 (수정 횟수)

| 파일 | 횟수 |
|---|---|
| `frontend/src/app/matches/page.tsx` | 14 |
| `frontend/src/components/home/HomePage.tsx` | 12 |
| `frontend/src/components/match/MatchDetailPage.tsx` | 10 |
| `frontend/src/app/layout.tsx` | 10 |
| `frontend/src/components/home/HomeMatchSection.tsx` | 9 |
| `backend/.../MatchSchedulerService.java` | 9 |

상위 5개 중 4개가 **"경기를 어떻게 보여줄 것인가"** 영역이다.
2026-08-23 에 이 넷을 전부 서버 컴포넌트로 재작성한 것은 우연이 아니다.

---

## 2. 잘한 것

**커밋 메시지가 구조적이고 구체적이다.**
`fix(batch): 스케줄러 경기 refresh 48콜→1콜 (live=all API 사용)` 처럼
무엇을 왜 바꿨는지가 남아 있다. 두 달 공백 후 복귀했을 때
`fixtureId < 1_000_000` 필터가 2022 시절 값이라는 것을 이력으로 추적할 수 있었다.
Conventional Commits 준수율 98.7%는 실무 기준으로도 높다.

**큰 기능은 PR 로 분리했다.** admin 관리, UI 리디자인, 동적 스케줄러 등은
브랜치를 파서 진행했다.

---

## 3. 문제점

### 3-1. fix 가 feat 의 1.8배 — 재작업이 개발의 절반

정상 범위는 대략 1:1 이하다. 35건의 fix 중 상당수는 **커밋 전에 잡을 수 있었던 것**이다.

### 3-2. 파일 오염이 반복됐다 (6건 이상)

```
fix(batch): FetchWorldCupPlayerStatsStep null bytes 제거
fix(frontend): MatchDetailPage invalid UTF-8 제거
fix(batch): ApiFootballPlayerStatsResponse, BatchJobController 잘린 파일 재커밋
fix(frontend): StatsRankingTable 빌드 에러 수정 — 파일 재작성
fix(frontend): StatusBadge·LiveTicker·HomePage·globals 누락 코드 완성
fix(frontend): HomeMatchSection 중복 줄 제거
```

도구가 파일을 깨뜨렸고, **배포가 실패한 뒤에야** 알았다.
커밋 전 검증 단계가 없어서 깨진 파일이 그대로 원격에 올라갔다.

### 3-3. 빌드가 깨진 채로 푸시됐다

```
fix(frontend): formatMatchTime 인자 2개 → 1개로 수정 (빌드 오류 해결)
fix: 프론트 타입 오류 및 백엔드 빌드 오류 수정
chore: force redeploy   ← 2회
chore(build): gradle-wrapper.jar 강제 추가 (Railway 빌드용)
```

CI 가 없어서 **Cloudflare/Railway 빌드가 사실상 테스트 역할**을 했다.
빌드 실패 → 수정 → 재푸시 사이클이 반복됐다.

### 3-4. 착수 전 검토 없이 만들고 두 시간 만에 지웠다

```
06-17 22:12  feat(batch): FetchOddsStep Bet365 1X2 배당 수집 구현   (117개 파일)
06-18 00:10  refactor: 배당(Odds) 시스템 전면 제거                  (12개 파일)
06-18 00:15  fix(batch): MatchSchedulerService에서 FetchOddsStep 참조 제거
```

**1시간 58분.** 그런데 `FEATURE_PLAN.md` 에는 착수 전부터 본인이 이렇게 써두었다.

> ⚠️ 도박 관련 콘텐츠는 Google AdSense 정책에서 민감 카테고리.
> 7일 제한이 있으므로 DB 저장 필수

**계획서에 리스크를 적어놓고 읽지 않은 채 구현했다.**

### 3-5. 증상만 끄고 원인을 덮었다 — placeholder 사건

```
06-01 01:50  fix(frontend): dynamicParams false 추가 - 빈 generateStaticParams 허용
06-01 01:52  fix(frontend): generateStaticParams 빈배열 방지 - placeholder 추가
```

빌드 에러를 없애려고 넣은 이 한 줄이 **두 달 뒤 사고의 직접 원인**이 됐다.
백엔드가 죽은 뒤에도 빌드는 "성공"했고, `/squads/placeholder` 하나만 있는
빈 사이트가 조용히 배포된 채 두 달간 아무도 몰랐다.

> 급한 불(빌드 실패)은 껐지만 진짜 문제(API 미연결)를 보이지 않게 만들었다.

### 3-6. API 호출 예산을 나중에 계산했다

```
06-19 01:39  fix(batch): 스케줄러 경기 refresh 48콜→1콜 (live=all API 사용)
06-21 22:24  fix(batch): 스케줄러 48콜→1콜, restart 엔드포인트 인증 예외 추가
```

같은 성격의 수정이 두 번. 처음부터 호출 비용을 설계하지 않았다.
Free 플랜의 시즌 제한(2022~2024)도 재개 시점에야 발견했다.

### 3-7. 규칙이 문서에만 존재했다

`CLAUDE.md` 에 "직접 main 커밋 절대 금지"라고 적어두었지만
실제로는 **77개 중 62개(80%)가 main 직접 커밋**이었다.
강제 수단(브랜치 보호 규칙)이 없으면 규칙은 지켜지지 않는다.

### 3-8. 커밋 단위가 너무 컸다

| 커밋 | 파일 수 |
|---|---|
| `feat(batch): FetchOddsStep Bet365 1X2 배당 수집 구현` | 117 |
| `chore: 프로젝트 초기 구조 설정` | 78 |
| `chore(deploy): 배포 준비 완료` | 50 |
| `refactor: 전체 리팩토링 - 커스텀 예외, DB 집계, 배치 step 정리, 프론트 컴포넌트 분리` | 36 |

리뷰도 되돌리기도 불가능한 크기다. 실제로 117개짜리를 통째로 되돌려야 했다.

### 3-9. 새벽 작업에 사고가 몰렸다

00~05시 커밋이 65%. 파일 오염, 빌드 실패, 두 시간 만의 되돌림이
전부 이 시간대에 발생했다.

### 3-10. 테스트가 두 달간 깨진 채 방치됐다 (2026-08-23 발견)

CI 를 만들면서 기존 테스트 3개를 점검했더니 **전부 컴파일조차 되지 않는 상태**였다.
5월에 작성한 뒤 6월 리팩토링에 맞춰 갱신하지 않았고, 아무도 실행하지 않아 몰랐다.

| 테스트 | 깨진 이유 | 원인이 된 커밋 |
|---|---|---|
| `PlayerServiceTest` | `findAllByActivePlayers()` 가 사라지고 `aggregateStatsByActivePlayers()` 로 대체됨 | `refactor: 전체 리팩토링 - ... DB 집계 ...` (06-01) |
| `PlayerSeasonStatsRepositoryTest` | 위와 동일 + `updateStats(22개 인자)` → `updateStats(StatsValues)` | `fix(batch): FetchSquadsStep updateStats StatsValues record로 통일` (06-02) |
| `PlayerControllerTest` | `StatsRankingResponse` 필드 7→9개 / `IllegalArgumentException` 이 404→400 으로 변경 / `AdminAuthFilter` 추가로 `@WebMvcTest` 컨텍스트 로딩 실패 | 여러 커밋 |

**테스트를 작성한 것과 테스트가 살아 있는 것은 다른 문제다.**
실행되지 않는 테스트는 안전망이 아니라 안전망이 있다는 착각을 준다.
이것이 CI 를 최우선 보완책으로 꼽는 이유다.

---

## 4. 보완책

우선순위 순. 위 두 개만 해도 fix 커밋의 상당수가 사라진다.

### 4-1. 최소 CI 도입 ★★★ (2026-08-23 작성 완료)

`.github/workflows/ci.yml` — push·PR(`main`,`dev`)마다 3개 잡이 돈다.

| 잡 | 하는 일 | 막는 문제 |
|---|---|---|
| `file-integrity` | null byte · 깨진 UTF-8 검사 | 3-2 (파일 오염 6건) |
| `frontend` | `npm ci` → `tsc --noEmit` → `next lint` | 3-3 (타입·빌드 오류) |
| `backend` | `./gradlew build` (H2 인메모리 테스트 포함) | 3-3, 3-10 |

⚠️ 프론트는 **`next build` 를 돌리지 않는다.** 빌드 시점에 로컬 백엔드가 필요한
정적 아카이브 구조라 CI 에서는 반드시 실패한다. 여기서는 타입·린트만 검증하고
실제 빌드·배포는 로컬에서 수행한다.

### 4-2. 브랜치 보호 규칙 ★★★

2026-08-23 에 `main` / `dev` / `feature/*` 구조를 도입했다.
GitHub Settings → Branches → Ruleset 으로 `main` 에
"Require a pull request before merging" 을 걸어 **강제**한다.
기본 브랜치를 `dev` 로 바꾸면 PR base 도 자동으로 맞춰진다.

### 4-3. pre-commit 훅 ★★

```bash
# null byte / 깨진 UTF-8 검사 + 타입체크
git diff --cached --name-only -z | xargs -0 grep -lP '\x00' && exit 1
cd frontend && npx tsc --noEmit
```

3-2 의 파일 오염을 커밋 전에 차단한다.

### 4-4. 착수 전 체크리스트 ★★

새 기능을 시작하기 전 3분:

- [ ] API 호출 비용을 계산했는가 (일일 한도 대비)
- [ ] 구독 플랜이 그 데이터에 접근 가능한가
- [ ] 정책·법적 리스크가 있는가 (AdSense, 도박, 저작권)
- [ ] `FEATURE_PLAN.md` 에 내가 적어둔 주의사항을 읽었는가

3-4 의 2시간, 3-6 의 반복 수정을 막는다.

### 4-5. 테스트 확대 ★★

토대는 이미 있다. H2 인메모리 기반으로 3개가 작성돼 있고 외부 DB 없이 돌아간다.

| 파일 | 방식 |
|---|---|
| `PlayerServiceTest` | Mockito 단위 테스트 |
| `PlayerControllerTest` | `@WebMvcTest` + MockBean |
| `PlayerSeasonStatsRepositoryTest` | `@DataJpaTest` (H2, `MODE=PostgreSQL`) |

문제는 **여기서 멈췄다는 것**이다. 정작 사고가 난 영역에는 테스트가 없다.
전부는 필요 없고, **틀리면 조용히 망가지는 것**부터 채운다:

- 배치 Step 의 Upsert 로직 — countries 중복키 오류가 실제로 3건 있었다
- KST/UTC 변환 (`lib/format.ts`) — 시간 관련 fix 가 3회 반복됐다
- `lib/round.ts` 의 라운드 판별·우승자 산출 — 승부차기 분기가 검증되지 않았다
- `BackfillLineupsStep` 의 fixtureId 범위 필터 — 이번 사고의 직접 원인

### 4-6. 조용한 실패 금지 ★★★ (적용 완료)

`CLAUDE.md` 에 원칙으로 명문화했다. 빈 결과를 정상으로 처리하지 않는다.

| 지점 | 이전 | 현재 |
|---|---|---|
| 배치 | 0건 수집 후 COMPLETED | 예외를 던져 FAILED |
| 빌드 | placeholder 생성 후 성공 | `generateStaticParams` throw |
| 프론트 | `.catch(() => {})` | 폴링 제거, 실패 노출 |
| 캐시 | 오래된 응답 재사용 | `prebuild` 로 제거 |

### 4-7. 커밋 크기 줄이기 ★

기능 단위로 쪼갠다. 목표는 **한 커밋 10개 파일 이하**.
되돌릴 수 있는 단위가 곧 실패 비용이다.

---

## 5. 한 줄 요약

> 커밋 메시지는 훌륭했지만 **검증 장치가 없었다.**
> 빌드 실패로만 문제를 발견했고, 급한 불을 끄는 수정이 더 큰 문제를 덮었다.
> 테스트는 있었지만 두 달간 깨진 채였고 아무도 몰랐다.
> CI 하나와 브랜치 보호 규칙 하나가 fix 커밋 35건 중 절반을 없앴을 것이다.
