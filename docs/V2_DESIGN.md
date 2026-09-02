# PitchLog v2 — 유럽 클럽축구 시스템 설계

> 작성: 2026-08-24
> 갱신: 2026-08-26 — 설계 검토 반영 (5-4 동시쓰기 안전장치, 3-2 처리량 검증, 4-3 배포 멱등성, 6-1 sitemap 공백)
> 갱신: 2026-08-27 — S0(API-Football 구독) 완료, S1(저장소 이름) `pitchlog-league`로 확정
> 갱신: 2026-08-27 — 실시간 레이어를 Node.js+Socket.io 게이트웨이로 분리 (5-6, 폴리글랏 결정)
> 갱신: 2026-08-28 — 최종 범위를 유럽 5대 리그+UCL로 확정하고 다중 대회·UCL 모델, 화면, WebSocket, 통계·배포 전략 반영
> 갱신: 2026-08-30 — 검증 가능한 AI 챗봇 방법론 반영. 결정적 조회 계층·도구 호출 루프·단계별 도입 전략 추가
> 갱신: 2026-09-01 — 프론트엔드를 React + Vite + JavaScript로 변경. 상세 기준은 `FRONTEND_GUIDE.md` 우선 적용
> 전제: 2026 WC 아카이브(`donasman/pitchlog`)는 `47f3749`에서 동결. v2는 **신규 저장소**에서 시작
> 첫 구현 범위: **EPL (league=39), 26-27 시즌**
> 최종 확정 범위: **유럽 5대 리그 + UEFA Champions League(UCL)**

---

## 0. 결정 요약

| 항목 | 결정 | 근거 |
|---|---|---|
| 저장소 | 신규 생성 | 아카이브 보존 + `Country`→`Team` 전환이 기존 코드를 침범 |
| 첫 구현 범위 | EPL | 20팀/380경기로 수집·실시간·화면·배포 구조를 먼저 검증 |
| 최종 확정 범위 | **유럽 5대 리그 + UCL** | EPL 검증 후 라리가·분데스리가·세리에 A·리그 1과 UCL을 단계적으로 추가. 선택적 확장이 아니라 완료 범위 |
| 프론트엔드 | **React + Vite + JavaScript + Tailwind CSS + shadcn/ui** | 개발자가 직접 이해하고 수정할 수 있는 구성을 우선. shadcn/ui는 `tsx: false`, `rsc: false`로 사용 |
| 프론트 배포 | **Vite 정적 빌드 + CSR** | 초기 화면 구현과 사용자 흐름 검증 우선. 검색 노출 전 프리렌더링·사이트맵 방안 별도 확정 필요 |
| 착수 순서 | 인프라(CI·보호규칙) → 도메인 → 배치 → 프론트 | 회고 4-1/4-2가 fix 커밋 절반을 없앴을 것 |
| 백엔드 스택 | Spring Boot 3.x + Java 21 **유지** | 언어 전환 이득 < v1 자산 손실 (5장) |
| 백엔드 구조 | **대량 백필(Batch)과 실시간 동기화(@Scheduled) 분리** | v1은 둘이 서로를 호출하는 양방향 결합이었음 (5-2) |
| 실시간 레이어 | **Node.js + Socket.io 게이트웨이 분리, Spring Boot와 Redis Pub/Sub로 연결** | WebSocket 푸시를 기본 경로로 확정. REST는 최초·재연결 동기화와 장애 fallback 담당 (5-6, Phase 2 이후 적용) |
| AI 챗봇 | **부분 적용 — LLM은 도구 선택과 설명만 담당** | DB·외부 API 직접 접근 금지. 집계·비교·진출 판정은 결정적 백엔드 계층에서 수행하고 데이터 기준 시각과 호출 근거를 공개 (5-8, Phase 5) |

`FEATURE_PLAN.md` 3장을 기반으로 하되, **거기에 없던 클럽축구 고유 문제(2장)** 를 추가했다.
이 문서는 회고 4-4 "착수 전 체크리스트"를 v2 전체에 미리 적용한 결과다.

> **프론트엔드 기준 변경 안내.** 이 문서의 Next.js, App Router, TypeScript, OpenNext,
> SSR/ISR 관련 내용은 2026-09-01 이전 검토 기록임. 현재 구현에는
> [`FRONTEND_GUIDE.md`](./FRONTEND_GUIDE.md)를 우선 적용함. 도메인·화면·상태 요구사항은
> 유지하되 프레임워크 전용 구현 방식은 React + Vite + JavaScript에 맞게 대체함.

---

## 1. 도메인 모델 전환

### 1-1. `Country` → `Team`

현재 `Country`는 국가대표 전용 필드로 구성돼 있다.

| 현재 (`countries`) | v2 (`teams`) | 변경 사유 |
|---|---|---|
| `code` (FIFA 3자, **Upsert 기준키**) | **삭제** | 클럽에 표준 코드 없음. `api_team_id`를 유일 기준키로 |
| `name` | `name` + `short_name` | "Wolverhampton Wanderers" / "Wolves" — UI에서 둘 다 필요 |
| `flag_url` | `logo_url` | |
| `group_name` | **삭제** | 조 개념 없음 |
| `team_api_id` | `api_team_id` (**UNIQUE, 기준키**) | |
| — | 대회 소속 FK 없음 | 한 팀이 같은 시즌에 국내 리그와 UCL에 동시에 참가하므로 참가 관계는 `competition_entries`에서 관리 |
| — | `venue_name`, `venue_city`, `venue_capacity` | 클럽은 홈구장이 고정 |
| — | `founded` | |

> ⚠️ **`code`를 Upsert 기준키에서 빼는 것이 이 전환의 핵심 리스크다.**
> `FetchCountriesStep`은 `code`로 upsert하고, 회고 3-x에서 "countries 중복키 오류 3건"이
> 실제로 발생했다. v2에서는 `api_team_id` 단일 키로 단순해지므로 오히려 안전해진다.

### 1-2. `Competition`·`Season`·`CompetitionEntry` — 처음부터 다중 대회

첫 구현은 EPL이지만 최종 범위는 5대 리그와 UCL로 확정됐다. 내부 모델은 국내 리그만 뜻하는
`League`보다 상위 개념인 **`Competition`** 을 사용한다. 팀은 한 시즌에 국내 리그와 UCL에
동시에 참가하므로 `Team.competition_id` 또는 `Team.league_id`를 두지 않는다.

```
competitions(
  id, api_competition_id UNIQUE, name, country, logo_url,
  type,                    -- DOMESTIC_LEAGUE | CONTINENTAL_CUP
  format                   -- ROUND_ROBIN | LEAGUE_PHASE_KNOCKOUT
)

seasons(id, year, start_date, end_date, is_current)

competition_entries(
  id, competition_id FK, season_id FK, team_id FK,
  participation_status
)
UNIQUE(competition_id, season_id, team_id)
```

API·화면에서는 사용자 친화적인 표현인 `league`/`competition`을 상황에 맞게 쓸 수 있지만,
도메인의 소유권과 FK는 `Competition`으로 통일한다. 기존 문서의 `league_id`는 이하 구현 시
`competition_id`로 해석한다.

### 1-3. `SquadEntry` — 가장 크게 바뀌는 부분

현재 제약: `UNIQUE(player_id, country_id)`

**클럽에서는 이 제약이 깨진다.** 선수는 시즌 중 이적하고, 임대를 가고, 돌아온다.
한 선수가 한 시즌에 두 클럽 소속일 수 있다.

```
squad_entries(
  id, player_id FK, team_id FK, season_year,
  jersey_number, position,
  joined_at, left_at,          -- NULL이면 현재 소속
  is_current BOOLEAN
)
UNIQUE(player_id, team_id, season_year, joined_at)
UNIQUE(player_id, season_year) WHERE is_current = true
```

**수집 방식 주의:** API-Football `/players/squads`는 **현재 스쿼드 스냅샷만** 반환한다.
이적 이력을 주지 않는다. 따라서:

- 매주 스쿼드를 재수집해 **직전 스냅샷과 diff**를 낸다
- 사라진 선수 → `left_at = 수집일`, `is_current = false`
- 새로 나타난 선수 → 신규 row
- 정확한 이적일이 필요하면 `/transfers` 엔드포인트 별도 호출 (선수당 1콜 — 비싸다, v2 이후)

### 1-4. `Match`

| 현재 | v2 |
|---|---|
| `home_team_api_id`, `home_team_name`, `home_team_logo` (비정규화 3필드) | `home_team_id` FK → `teams` |
| `group_name` ("Group A") | **삭제** |
| `round` ("Round of 16") | `round` 유지 ("Regular Season - 12") + `round_number` INT 추가 |
| — | `competition_id`, `season_id` FK |
| — | `stage`, `leg`, `tie_id` | UCL 리그 페이즈·토너먼트 및 1·2차전 표현 |
| — | `extra_time_*`, `penalty_*`, `aggregate_*`, `winner_team_id` | 연장·승부차기·합산 점수와 진출 팀 |

> ⚠️ 회고에 나온 `fixtureId < 1_000_000` 필터(2022 시절 값, 이번 사고의 직접 원인)는
> **v2 코드에 절대 이식하지 않는다.** 이관 시 grep으로 확인할 것.

`round_number`는 국내 리그의 정렬·필터에 사용한다. UCL은 `stage`를 1차 탐색 기준으로 쓰고,
리그 페이즈 안에서만 `round_number`를 사용한다. 녹아웃 경기는 `tie_id`와 `leg`로 같은 대진의
1·2차전을 연결한다.

### 1-5. `GroupStanding` → `CompetitionStanding`

| 현재 | v2 |
|---|---|
| `UNIQUE(team_api_id)` | `UNIQUE(competition_id, season_id, team_id, stage)` |
| `group_name` "Group A"~"Group L" | **삭제** |
| `enrichWithThirdPlace()` 3위 추론 로직 | **삭제** |

국내 리그는 승격·강등·유럽 대항전 진출 구역을 표시하고, UCL 리그 페이즈는 16강 직행·
플레이오프·탈락 구역을 표시한다. API의 `description`을 보존하되 화면 색상 규칙은
`competition.format`과 `stage`에 따라 구분한다.

### 1-6. 그대로 쓰는 것

- **`Player`** — 이미 클럽 중립적. `nationality`가 문자열이라 국가 FK 의존이 없다. 무수정 이관
- **`PlayerSeasonStats`** — 구현 시 `UNIQUE(player_id, team_id, competition_id, season_id)`로 정규화.
  **이미 리그·시즌·팀을 키에 포함**하고 있어 이적 선수의 분리 집계가 그대로 된다. 설계가 잘 돼 있음
- **`MatchLineupEntry`**, **`PlayerInjury`**, **`H2HRecord`** — 팀 참조만 FK로 교체
- **`Coach`** — `UNIQUE(team_api_id)`. 클럽 감독은 시즌 중 경질되므로 `SquadEntry`와 같은
  `joined_at`/`left_at` 이력 구조 필요 (우선순위 낮음, Phase 3)

### 1-7. UCL 전용 모델 — 리그 페이즈와 녹아웃

UCL은 국내 리그와 같은 `Competition`·`Season`·`Team`·`Match`를 공유하되 진행 형식만
추가한다. 별도 UCL 전용 엔티티를 중복 생성하지 않는다.

```
competition_stages(
  id, competition_id FK, season_id FK,
  stage_type,              -- LEAGUE_PHASE | PLAYOFF | R16 | QF | SF | FINAL
  display_order,
  starts_at, ends_at
)

knockout_ties(
  id, competition_stage_id FK,
  home_team_id FK, away_team_id FK,
  first_leg_match_id FK NULL,
  second_leg_match_id FK NULL,
  aggregate_home, aggregate_away,
  winner_team_id FK NULL,
  status
)
```

- 리그 페이즈 순위는 기존 `LeagueStanding` 개념을 일반화한 `CompetitionStanding`에 저장한다.
- 녹아웃 화면은 `KnockoutTie`를 기준으로 대진·합산 점수·진출 팀을 표시한다.
- 결승은 `leg=SINGLE`, 16강~4강은 `FIRST`/`SECOND`로 표현한다.
- 무승부·연장·승부차기 결과는 정규 점수와 분리 저장해 승자를 재현할 수 있어야 한다.

---

## 2. 월드컵과 클럽축구의 근본적 차이 — 계획서에 없던 항목

이 4가지가 v2에서 **새로 설계해야 하는 것**이다. 코드 재사용으로 해결되지 않는다.

### 2-1. 시즌 롤오버

월드컵은 1회성이라 시즌 개념이 상수였다. 리그는 매년 바뀐다.
`season`을 `@Value` 상수로 두면 매년 7월에 수동 배포가 필요하다.
→ **`seasons` 테이블 + `is_current` 플래그**로 DB에서 관리한다.

### 2-2. 이적시장

1-3에서 다룬 스쿼드 diff 외에, **여름/겨울 이적창 기간에는 스쿼드 수집 주기를 올려야 한다.**
평시 주 1회 → 이적창(6/13~9/1, 1/1~2/3) 일 1회.

### 2-3. 동시 킥오프 — 스케줄러 재설계 지점

월드컵은 동시 진행 경기가 최대 2경기였다. EPL 토요일 15:00은 **5경기가 동시 킥오프**한다.

기존 `MatchSchedulerService`의 LIVE 모드(10초 폴링)는 `/fixtures?live=all` **1콜로 전 경기를
커버**하므로 경기 수가 늘어도 호출량은 그대로다. 이 설계는 그대로 유효하다.

문제는 **윈도우 길이**다. 월드컵은 하루 2~3경기라 LIVE 구간이 짧았지만,
EPL 토요일은 12:30 킥오프 ~ 22:00 종료로 **약 9.5시간** 연속 LIVE다. 아래 3-2에서 검산.

### 2-4. 라운드/순위의 상시 변동

월드컵 순위표는 조별리그 2주만 의미가 있었다. 리그 순위표는 10개월 내내 메인 콘텐츠다.
→ 순위 갱신 실패를 **조용히 넘기면 안 된다** (회고 4-6 원칙). 경기 종료 후 순위 갱신이
실패하면 FAILED로 노출한다.

---

## 3. API 호출 예산 — 첫 구현과 최종 범위 분리 검산

첫 구현인 EPL은 실제 스케줄로 상세 검산하고, 최종 범위인 5대 리그+UCL은 Phase 0에서
최악 경기일 기준으로 다시 계측한다. **Pro 플랜 7,500콜/일, 450콜/분 기준.**

### 3-1. 항목별

| 항목 | 방식 | 매치데이 | 비매치데이 |
|---|---|---|---|
| 라이브 스코어 | `/fixtures?live=all` 10초 폴링 | 3,420 | 0 |
| 리그 순위 | 10분 주기 (LIVE 윈도우 중만) | 57 | 1 |
| 라인업 | 경기당 1콜 × 10경기 | 10 | 0 |
| 선수 통계 | 경기 종료 후 해당 경기 증분 갱신 + 주 1회 전체 보정 | 경기 수에 비례 | ~400 (주 1회 보정) |
| 부상 | 1일 1회 | 1 | 1 |
| 스쿼드 diff | 주 1회 (이적창엔 일 1회) | — | 20 |
| **합계** | | **~3,490** | **~420** |

### 3-2. 검산 — 토요일 최악 케이스

```
12:30 킥오프 ~ 22:00 종료 = 9.5시간
10초 폴링 = 6콜/분 × 60 × 9.5 = 3,420콜
분당 6콜 << 450콜/분 한도 → 여유
일일 3,490콜 / 7,500 = 47% → 여유
```

**첫 구현인 EPL은 외부 API 10초 폴링으로 문제없다.** 브라우저 전달은 5-6의 WebSocket을 사용한다.

> ⚠️ **처리량(충분조건)은 아직 검산 안 됨 — 설계 검토(2026-08-26)에서 지적됨.** 위 계산은
> 호출 예산(필요조건)만 확인한다. `live=all` 1콜의 응답 페이로드는 동시 진행 경기 수에
> 비례해 커지고, 이를 파싱·upsert하는 처리 시간은 호출 횟수와 무관한 별개 변수다.
> 5경기가 IDLE/LINEUP/LIVE 중 서로 다른 상태로 섞여 있을 때 v1의 3단계 스케줄러가 이를
> 다룰 수 있는지, `@Scheduled`가 처리 지연 시 다음 주기와 겹치지 않도록 **오버랩 방지
> 장치(예: ShedLock)** 가 필요한지 Phase 2(실제 라운드 1회 무중단 관측)에서 실측·검증할 것.

### 3-3. 최종 확정 범위 — 5대 리그 + UCL

`live=all`은 대회 수와 무관하게 1콜이지만, **라이브 윈도우와 응답 페이로드가 커진다.**
5대 리그면 토요일 12:00(EPL) ~ 익일 00:00(라리가 심야) = 12시간 → 4,320콜.
여기에 대회별 순위 갱신, 종료 경기 선수 통계, UCL 경기일 호출이 추가된다. 기존 ~4,600콜은
국내 5대 리그만의 추정치이므로 최종 예산으로 간주하지 않는다.

→ 외부 API 폴링은 10초로 시작하되, 최종 범위에서는 15초 조정을 후보로 둔다. 브라우저에는
WebSocket으로 푸시하므로 외부 API 폴링 주기와 사용자 연결 수는 분리된다. Phase 4 진입 전에
다음 항목을 실제 응답 크기와 경기 수로 다시 계산한다.

- 5대 리그와 UCL이 겹치는 최악 경기일의 LIVE 윈도우
- 동시 경기 수에 따른 `live=all` 응답 처리 시간
- 경기 종료 후 선수 통계·순위 추가 호출
- 라인업·부상·스쿼드 페이지네이션
- 7,500콜의 80%인 **6,000콜/일을 운영 경고선**으로 둔 여유율

---

## 4. 배포 전략 — 렌더링 모델 결정

### 4-0. 먼저 정리 — "실시간"은 배포 방식의 문제가 아니다

라우트를 **데이터가 변하는 속도**로 나누면 논점이 분리된다.

| 데이터 | 예 | 갱신 주기 | 렌더링 |
|---|---|---|---|
| 실시간 | 진행 중 경기 스코어·이벤트 | 즉시(푸시) | **WebSocket 푸시 (Node.js 게이트웨이, 5-6)** |
| 준정적 | 순위표, 경기 목록, 홈 | 분~시간 | 서버 렌더 또는 재빌드 |
| 정적 | 선수·팀 상세, 종료된 경기 | 일~주 | 서버 렌더 또는 재빌드 |

**실시간 구간은 어떤 배포 방식을 골라도 서버 렌더가 필요 없다.** 10초마다 서버에서 HTML을
다시 만들 이유가 없고, SEO도 필요 없다(진행 중 스코어를 검색으로 찾지 않는다).
v1은 클라이언트 폴링(라이브 10초, 대기 30초)으로 이를 처리했다.

> **v2 확정 — 브라우저 실시간 경로는 WebSocket 푸시.** Node.js + Socket.io 게이트웨이를
> 두고 Spring Boot와 Redis Pub/Sub로 연결한다 (5-6). Spring Boot가 API-Football을 주기적으로
> 조회하는 외부 폴링은 유지하지만, 브라우저는 백엔드를 10초마다 직접 폴링하지 않는다.
> REST는 최초 화면 로드·재연결 풀 싱크·WebSocket 장애 fallback에만 사용한다.

따라서 **배포 전략의 실제 쟁점은 실시간이 아니라 준정적·정적 구간의 SEO와 첫 페인트**다.
축구 통계 사이트의 트래픽은 "선수명 + 기록" 류 검색 유입이 절대적이고, v1도 `sitemap.ts`·
`robots.ts`를 만들어 이를 전제했다. 페이지 수는 EPL 단독으로도 **~950개**
(선수 ~500 + 경기 380 + 팀 20 + 순위·통계).

### 4-1. Cloudflare Pages는 순수 정적이 아니다 — 다만 권장 경로가 바뀌었다

Pages도 Functions(Workers)로 서버 코드를 실행한다. v1이 정적이었던 건 Pages 때문이 아니라
`output: 'export'`를 썼기 때문이다.

다만 **Cloudflare의 현재 공식 권장은 Pages + `next-on-pages`가 아니라
Workers + `@opennextjs/cloudflare`(OpenNext)** 다. 이전 설계안의 `next-on-pages`는
Edge 런타임 전용이라 Node API를 못 쓰고 ISR 지원이 제한적이었는데, OpenNext는
**Node.js 런타임에서 SSR·ISR·PPR·App Router·미들웨어를 모두 지원**한다.

> ⚠️ **다만 Cloudflare에서 ISR은 공짜가 아니다.** 증분 캐시 백엔드가 필요하고,
> 무료인 Workers Static Assets는 **revalidation을 지원하지 않는다.** KV는 최종적 일관성
> 때문에 공식 문서가 비권장. 실질적으로 **R2(유료) + Cache API** 조합이 필요하고,
> Workers 유료 플랜(월 $5~)이 전제된다. Worker 번들 크기 제한도 무료 3 MiB / 유료 10 MiB.

### 4-2. 선택지 4개

| | A. 정적 + 전량 CSR | B. 정적 + 빌드 훅 (하이브리드) | C. Workers + OpenNext | D. Vercel |
|---|---|---|---|---|
| 구성 | `output: export` + TanStack Query로 전부 클라이언트 fetch | `output: export` + **경기 종료 시 백엔드가 Deploy Hook 호출해 재빌드**, 라이브만 CSR | SSR/ISR (R2 증분 캐시) | SSR/ISR |
| SEO | **약함** — 크롤러가 JS 렌더를 하긴 하나 ~950페이지 규모에선 불리 | **강함** — 완전한 HTML | 강함 | 강함 |
| 신선도 | 즉시 | 경기 종료 후 빌드 시간만큼 지연(수 분) | 라우트별 revalidate | 라우트별 revalidate |
| 비용 | $0 | $0 | ~$5~10/월 (Workers 유료 + R2) | Hobby $0 / Pro $20 |
| 리스크 | **검색 유입 포기.** v1 placeholder 사고와 같은 구조 | 빌드 시점 백엔드 의존, 빌드 횟수 관리 | 어댑터·플랫폼 종속, 번들 크기 | 상업적 사용 시 Pro 필요 |

**A는 배제한다.** SEO 손실이 이 서비스의 존재 이유와 충돌한다.

**B는 EPL 규모의 유력 후보지만 최종 확정은 PoC 이후다.** 라이브 스코어는 WebSocket으로
분리되므로 정적 배포와 충돌하지 않는다. 다만 5대 리그+UCL은 경기일이 분산되고 페이지가
5,000개를 넘으므로 EPL의 "라운드 단위 주 10회" 추정을 최종 범위에 그대로 적용하지 않는다.

**C는 B가 최종 범위에서 막힐 때의 안전판이다.** 5대 리그+UCL의 5,000페이지 이상 빌드가
운영 허용 시간을 넘거나 분 단위 신선도가 필요하면 전환한다.

### 4-3. B안 상세 — 정적 + 빌드 훅

```
경기 종료(FT) 감지 → MatchScheduler
        │
        ├─ DB 갱신 (순위·통계)
        └─ 배포 필요 상태 기록 → 디바운스 후 Deploy Hook POST → Cloudflare Pages 재빌드
                                                    │
                                                    └─ 백엔드에서 EPL ~950 / 최종 5,000+페이지 fetch
```

지켜야 할 것:

1. **디바운스** — 경기마다 빌드하지 않고 N분 무이벤트 후 1회로 묶는다. 대회별 라운드 종료
   시점이 다르고 연기 경기가 있으므로 단일 `last_deployed_round` 컬럼은 사용하지 않는다.
   `deployment_requests(competition_id, season_id, data_version, requested_at, deployed_at, status)`로
   상태를 DB에 저장한다. 인메모리 타이머는 서버 재시작 시 유실되어 트리거가 조용히 사라진다
2. **빌드 실패 = 이전 배포 유지** — Cloudflare 기본 동작. 다만 실패를 **알림으로 노출**한다
3. **`generateStaticParams`가 빈 배열이면 throw** — 회고 4-6. v1의 placeholder 사고가
   정확히 여기서 났다. 백엔드가 죽은 채 빌드가 "성공"하는 경로를 원천 차단
4. **빌드 시점 백엔드 헬스체크** — `prebuild`에서 `/actuator/health` 확인 후 진행
5. **배포 자체의 멱등성** — `data_version`별 성공 배포 여부를 기억해 중복 Deploy Hook 호출을
   막는다. 이는 5-3이
   실시간 동기화(`@Scheduled`)에 세운 "상태 불필요" 원칙과 정면으로 충돌한다.
   Deploy Hook 트리거는 `MatchScheduler` 안에 암묵적으로 섞지 말고, 위 1번의
   `deployment_requests` 상태를 갖는 **별도 컴포넌트로 분리**해 원칙 충돌을
   명시적으로 인정하고 격리할 것

### 4-4. 라우트별 전략 (B안 기준)

| 라우트 | 전략 | 신선도 |
|---|---|---|
| `/matches/[id]` 진행 중 | 정적 셸 + **Socket.io 경기 room 구독** | Spring 수집 주기 내 푸시 |
| `/` 홈 (오늘 경기) | 정적 셸 + 대회/라이브 요약 room 구독 | 즉시 푸시 |
| `/standings` | 정적, 라운드 종료 시 재빌드 | 수 분 |
| `/matches` 목록 | 정적, 라운드 종료 시 재빌드 | 수 분 |
| `/players/[slug]`, `/teams/[slug]` | 정적, 라운드 종료 시 재빌드 | 수 분 |

C안으로 갈 경우 위 표의 "정적, 재빌드"를 각각 ISR `revalidate` 5분/24시간으로 바꾸면 된다.
**두 안의 라우트 설계가 같아서 나중에 갈아타는 비용이 낮다** — 이게 B로 시작해도 되는 이유다.

### 4-5. Phase 0 PoC에서 확인할 것

1. EPL 약 950페이지와 최종 목표 모의 데이터 **5,000페이지 이상**의 정적 빌드 소요 시간
   (둘 중 하나라도 운영 허용 시간을 넘으면 B 재검토)
2. Deploy Hook → 빌드 → 반영까지의 실제 지연
3. 정적 페이지에서 Socket.io 연결·CORS·room 구독·재연결 REST 풀 싱크가 정상 동작
4. (C 대비) OpenNext + R2로 ISR 라우트 1개가 실제 재검증되는지
5. 5대 리그+UCL의 모의 경기 종료 이벤트를 연속 입력했을 때 Deploy Hook이 한 번으로
   디바운스되고 `deployment_requests`가 재시작 후에도 복구되는지

---
## 5. 백엔드 구조 — 배치와 실시간 동기화의 분리

스택은 유지한다: **Spring Boot 3.x + Java 21.** 바꾸는 것은 언어나 프레임워크가 아니라
**스프링을 쓰는 방식**이다. Kotlin·NestJS·Go 전환도 검토했으나, v1 자산(스케줄러, 13개 Step,
엔티티)이 전부 날아가고 회고에서 이미 1.8:1이던 fix/feat 비율을 더 악화시킬 위험이 크다.

### 5-1. v1 진단 — 스프링의 껍데기만 썼다

| 발견 | 근거 (코드) | v2 |
|---|---|---|
| **Spring Batch가 장식** | Step 13개 전부 `.tasklet()` 단발. `.chunk(` **0건**, ItemReader/Writer 없음. `BATCH_*` 테이블 9개와 `Job`/`Step` 보일러플레이트만 남음 | 대량 백필에만 한정하되 **chunk·retry·재시작을 실제로 사용** |
| **QueryDSL 미사용** | `JPAQueryFactory` 사용처가 `QueryDslConfig.java` 자기 자신뿐. 실제 쿼리 **0건**인데 annotationProcessor + `src/main/generated` 유지비만 발생 | 첫 동적 쿼리가 필요한 시점에 결정. 안 쓸 거면 의존성 제거 |
| **마이그레이션 도구 없음** | `ddl-auto: validate` + 수기 `schema.sql`(13테이블). 증거: `fix(db): matches, match_lineup_entries 테이블 schema.sql에 누락분 추가` | **Flyway 필수.** v2는 시즌 롤오버·이적 이력으로 스키마가 상시 변한다 |
| **Spring Security 미사용** | `spring-security-crypto`(BCrypt)만 사용, `AdminAuthFilter`·`JwtUtil`은 수제 → 회고 3-10의 `@WebMvcTest` 컨텍스트 로딩 실패 원인 | Spring Security 정식 도입 |
| **외부 API 보호장치 없음** | WebClient 생짜 호출. rate limit 대응·백오프·서킷브레이커 없음 | **Resilience4j** |
| **테스트 DB 괴리** | H2 `MODE=PostgreSQL` | **Testcontainers** — Postgres 특화 SQL이 늘면 H2가 갈라진다 |

### 5-2. v1의 구조적 결함 — 배치와 스케줄러가 서로를 호출했다

```
MatchSchedulerService ──생성자 주입──> FetchStandingsStep, FetchInjuriesStep,
        ^                              FetchPlayerRatingsStep, FetchPredictionsStep
        │
        └──직접 호출──────────────────  BackfillLineupsStep (배치)
```

코드 주석이 이 상태를 그대로 증언한다:

> Bean 자체는 항상 등록한다 — BackfillLineupsStep 등 배치가 `fetchAndSaveLineups()`를 직접
> 호출하기 때문이다. 이 플래그는 `@Scheduled` 폴링만 차단한다.

양방향 결합 탓에 스케줄러 빈을 내릴 수 없었고, `api-football.scheduler-enabled` 플래그로
`@Scheduled`만 따로 막는 우회가 들어갔다. **Spring Batch 의존성이 런타임 계층까지 번진 것**이
근본 원인이다.

### 5-3. 판별 기준 — "시점"이 아니라 "실패했을 때 어떻게 되는가"

"초기 수집 vs 운영 중"으로 나누면 애매해진다. 선수 통계 백필은 주 1회, 이적창 스쿼드 diff는
매일 도는데 둘 다 배치다. 실제 경계는 **재시작 지점을 기억해야 하는가**이다.

| | 배치 (Spring Batch) | 실시간 동기화 (`@Scheduled`) |
|---|---|---|
| 한 번에 쓰는 API 콜 | 수백 개 | 1~수 개 |
| 중간에 죽으면 | **이어서 해야 함** → 재시작 지점 저장 필요 | 다음 주기에 다시 함 → 상태 불필요 |
| 실패의 결과 | 데이터가 덜 찬다 (사이트는 돎) | **사이트가 틀린 값을 보여준다** |
| 실행 방식 | 수동 트리거 / 주 1회 / 시즌 초 | 10초~1일 주기 |
| v2 해당 작업 | 스쿼드 500명 적재, 선수통계 백필(~400콜), 시즌 롤오버, 과거 라운드 라인업 | `live=all` 10초, 라인업 5분, 순위 10분, 부상 1일 |

즉 **재시작 지점을 기억해야 하면 Spring Batch가 값을 하고, 안 해도 되면 순수 오버헤드다.**
v1은 후자에까지 Batch를 씌웠다.

### 5-4. v2 구조 — 공통 도메인 서비스를 가운데 둔다

두 시스템이 서로를 부르지 않는다. **각자 같은 도메인 서비스를 부른다.**

```
                 StandingsSyncService.sync(competition, season) ← upsert 로직의 유일한 자리
                       ↑                        ↑
       FetchStandingsTasklet              MatchScheduler
       (Batch — 시즌 초 백필,             (@Scheduled — 10분 주기,
        chunk + 재시작)                    상태 없음)
```

원칙 3가지:

1. **`ingest/batch`와 `ingest/schedule`은 서로를 import 하지 않는다** — 둘 다 `domain/*/sync`만 부른다
2. **Spring Batch 의존성은 `ingest/batch` 밖으로 나가지 않는다** — v1에서 번진 것이 결함의 근원
3. **upsert 로직은 도메인 서비스에 한 번만 존재한다** — 테스트를 붙이면 양쪽이 동시에 검증된다 (회고 4-5)

부수 효과: 스케줄러를 끄고 배치만 돌리는 것이 가능해져 `scheduler-enabled` 같은 우회 플래그가
필요 없어진다.

> ⚠️ **동시 쓰기 안전장치 — 설계 검토(2026-08-26)에서 지적됨.** 위 3원칙은 배치/스케줄러의
> *결합도* 문제를 풀 뿐, 두 시스템이 같은 row를 **동시에** upsert할 때의 안전장치는 아니다.
> 여름 이적창(6/13~9/1)은 EPL 시즌 개막(8월)과 실제로 겹치므로, 시즌 초 스쿼드 백필(Batch)과
> 이적창 기간 매일 도는 스쿼드 diff(Schedule)가 같은 선수 row를 동시에 건드릴 수 있다.
> **`*SyncService`의 upsert는 `find-then-save`가 아니라 `ON CONFLICT` 기반이거나
> `@Version` 낙관적 락을 둬야 한다.** `find-then-save`면 예외 없이 조용히 값이 덮어써질 수 있는데,
> 이는 회고 4-6 "조용한 실패 금지" 원칙과 정면으로 충돌한다.
> Phase 1의 `TeamSyncService`/`SquadSyncService` 최초 구현 시점(8-3 #4~#5)에 결정하고
> 테스트를 동반할 것. ArchUnit은 원칙 1·2만 강제할 뿐 이 문제는 정적 분석으로 잡히지 않는다.

### 5-5. 패키지 구조

```
com.pitchlog
├── domain/
│   ├── competition/ team/ player/ match/ standing/
│   │     각각 entity · repository · *SyncService(upsert) · *QueryService(조회)
├── ingest/
│   ├── client/     ← ApiFootballClient (Resilience4j 적용 지점)
│   ├── dto/        ← 외부 API 응답 DTO (@JsonIgnoreProperties 필수)
│   ├── batch/      ← Spring Batch Job/Tasklet — Batch 의존은 여기까지만
│   └── schedule/   ← @Scheduled 스케줄러 — Batch 의존 없음
├── api/            ← controller + response DTO
└── config/
```

v1의 `batch/` 최상위 패키지를 `ingest/` 아래로 내리고 `batch`와 `schedule`을 형제로 둔다.
이름이 구조를 강제한다.

> **ArchUnit 테스트로 원칙 1·2를 CI에서 강제할 것.** 회고 3-7의 교훈 —
> "규칙이 문서에만 존재했다". 문서에 적는 것으로는 지켜지지 않는다.

### 5-6. 실시간 레이어 — Node.js 게이트웨이 (폴리글랏, 2026-08-27 결정)

기존 4-0/5장은 실시간 스코어를 "클라이언트 폴링"으로 처리한다고 정리했다. v2는 여기서
한 단계 더 나아가 **Spring Boot(코어) + Node.js(실시간 게이트웨이) 폴리글랏 구조**를
도입한다.

```
API-Football
     │ live=all (10초 폴링, 기존 그대로)
     ▼
Spring Boot @Scheduled  ──upsert(DB, 동시성 안전장치 5-4)──▶  PostgreSQL
     │
     └─ upsert 성공 후 이벤트 publish
              │
              ▼
        Redis Pub/Sub (channel: match:{fixtureId})
              │
              ▼
        Node.js + Socket.io 게이트웨이  ──WebSocket──▶  브라우저
```

**왜 이 경계를 두는가.** 외부 API 수집·도메인 정합성·DB 쓰기는 Spring Boot가 소유하고,
다수 브라우저 연결과 room별 이벤트 전달은 Node.js가 소유한다. 초기 트래픽만 보면 폴링으로도
충분하지만 최종 범위인 5대 리그+UCL의 동시 경기를 하나의 실시간 채널 계층으로 제공하고,
폴리글랏 아키텍처의 명확한 역할 분리를 직접 검증하기 위한 확정 선택이다.

**역할 경계 — 반드시 지킬 것:**

1. **Node는 API-Football을 직접 호출하지 않는다.** API 클라이언트·DTO는 계속 Spring
   Boot(`ingest/client`)에만 존재한다. Node가 API-Football을 따로 호출하면 두 언어에서
   같은 외부 API 계약을 유지해야 해서 유지보수 비용이 두 배가 된다.
2. **Node는 DB에 쓰지 않는다.** upsert(동시성 안전장치 포함, 5-4)는 여전히 Spring Boot의
   `*SyncService`가 유일한 자리다. Node는 Redis 채널을 구독해서 Socket.io로 릴레이만
   하는 **얇은 게이트웨이**로 스코프를 제한한다.
3. **메시지 브로커는 Redis Pub/Sub — Kafka 아님.** 컨슈머가 Node 게이트웨이 하나뿐인
   상황에서 Kafka의 존재 이유(내구성 있는 로그, 리플레이, 다중 컨슈머 그룹)가 없다.
   Redis Pub/Sub이 이 규모에 맞는 선택이고, "왜 Kafka를 안 썼는가"도 근거 있는 답이 된다.

**새로 생기는 실패 모드 — 조용한 실패 금지(회고 4-6) 원칙과 연결:**

Redis Pub/Sub은 fire-and-forget이라 **Node가 재시작되는 순간의 이벤트는 유실된다.**
Node 재연결 시 Pub/Sub 이벤트만으로 상태를 복구하려 하지 말고 **REST로 현재 경기 상태를 한 번 풀 싱크**하는
로직을 넣는다 — 안 그러면 서버 재시작 한 번에 스코어가 조용히 멈춘 것처럼 보이는,
문서가 계속 경계해온 바로 그 실패 패턴이 재발한다.

- Spring은 DB 트랜잭션 **커밋 이후** Redis 이벤트를 발행한다
- 이벤트에 `fixtureId`, `competitionId`, `updatedAt`, `version`을 포함한다
- Node와 브라우저는 마지막 `version` 이하의 중복·역순 이벤트를 무시한다
- 발행 실패는 기록하고 다음 외부 API 수집 주기에 최신 스냅샷을 다시 발행한다
- 브라우저 연결 실패 시 REST 풀 싱크 후 제한적 폴링으로 fallback한다

**언어 전환 기각(5장) 결정과 충돌 아님.** 5장의 "언어 전환 기각"은 **코어 전체**를
Kotlin/NestJS/Go로 바꾸는 안을 기각한 것이다. 이건 경계가 분명한 위성 서비스 하나를
Node로 추가하는 것이라 별개의 결정이다. 코어(도메인·배치·API)는 계속 Java다.

**적용 시점 — Phase 0/1에는 넣지 않는다.** 아직 도메인 코드도 없는 단계라 지금 구현하지
않는다. **Phase 2의 스케줄러 구현 다음 작업으로 적용하고, Phase 2 완료 조건에 포함한다**
(8장 로드맵 참조).

**비용.** Redis 호스팅(Upstash 무료 티어 또는 Railway addon) + Node 서비스 배포 위치가
추가로 필요하다. 10장 #3(상시 백엔드 Railway $5)에 합산해서 평가할 것 — 현재 문서에
고정비가 종합적으로 검증된 적이 없다는 점도 함께 기억할 것.

### 5-7. 경기 종료 후 확정 처리 — 선수 통계와 순위

실시간 이벤트와 시즌 누적 통계는 확정 시점이 다르다. 경기 중에는 스코어·득점·카드·교체를
WebSocket으로 즉시 제공하고, `FT` 감지 후 해당 경기의 공식 기록을 증분 수집한다.

```
FT 감지
  ├─ 최종 경기 결과 upsert
  ├─ 경기별 선수 통계 upsert
  ├─ 선수 시즌·대회 누적 통계 갱신
  ├─ CompetitionStanding 갱신
  ├─ UCL 녹아웃이면 KnockoutTie 합산 점수·진출 팀 갱신
  └─ 배포 필요 data_version 기록
```

중복 종료 감지에도 득점이 두 번 합산되지 않도록 **경기별 선수 기록을 원본으로 저장**하고,
시즌 누적값은 이를 집계하거나 API의 공식 누적값으로 덮어쓴다. 단순 `기존 값 + 이번 경기 값`
연산은 금지한다. 다음 날 1회와 주 1회 전체 보정 배치를 실행해 공식 기록 정정·누락을 복구한다.

실패 단위는 분리한다. 경기 결과 저장은 성공했지만 선수 통계나 순위 갱신이 실패하면 전체를
성공으로 표시하지 않고 후속 작업별 상태와 재시도 횟수를 남긴다.

### 5-8. AI 챗봇 — 결정적 조회 계층 밖의 자연어 인터페이스

이전 프로젝트에서 검증한 "LLM을 결정적 계층 밖에 둔다"는 원칙은 유지한다. 다만 축구 데이터는
경기 중 계속 바뀌고 종료 후에도 공식 기록이 정정될 수 있으므로, **자료 갱신 때 한 번만 수행하는
사전계산 구조를 그대로 적용하지 않는다.** 대신 배치·경기 이벤트·종료 확정 처리에 맞춰 조회용
데이터를 증분 갱신하는 **결정적 Read Model**을 둔다.

```
데이터 수집·경기 이벤트
├── 원본 데이터 정규화
├── 순위·선수 누적 통계·팀 폼 갱신
├── UCL 합산 점수·진출 팀 판정
└── AI 조회용 Read Model 갱신

사용자 질문
├── LLM이 조회 도구와 인자 선택
├── 서버가 인자 검증 후 QueryService 실행
├── 확정 JSON 반환
├── LLM이 자연어 답변으로 표현
└── 데이터 기준 시각·도구 인자·근거 데이터 공개
```

#### 역할 경계

| 계층 | 담당 | 금지 사항 |
|---|---|---|
| 수집·도메인 계층 | 외부 API 수집, 정규화, 공식 상태 저장 | LLM 판단으로 원본 값 변경 |
| 결정적 조회 계층 | 통계·비교·순위·진출 판정, 필터링, 정렬 | 생성형 모델로 숫자 계산 |
| AI 오케스트레이터 | 질문 의도 파악, 도구·인자 선택, 최대 호출 수 관리 | DB·API 직접 접근, 임의 SQL 생성 |
| 답변·UI 계층 | 결과 설명, 데이터 카드·근거·기준 시각 표시 | 근거 없는 수치·판정 추가 |

재현성의 기준은 "같은 질문이면 항상 같은 문장"이 아니다. **같은 데이터 버전과 같은 조회
조건이면 같은 숫자와 판정이 반환되는 것**을 보장한다. LLM의 표현은 달라질 수 있으며, 중요한
수치와 판정은 자연어 답변만 보여주지 않고 서버 응답 기반 데이터 카드로 함께 표시한다.

#### 사전·증분 계산 대상과 질의 시점 처리

| 증분 갱신해 둘 값 | 질의 시점에 처리할 값 |
|---|---|
| 선수의 시즌·대회 누적 통계 | 사용자가 선택한 선수·기간·지표 조합 조회 |
| 팀 전적, 최근 폼, 홈·원정 집계 | 임의 두 팀·선수 비교 |
| 대회 순위, 승강·진출 구역 | 현재 필터 조건에 맞춘 정렬·상위 N개 추출 |
| UCL 합산 점수와 진출 팀 | 현재 진행 상태를 포함한 대진 조회 |
| 팀·선수·대회 검색 별칭 | 모호한 이름의 후보 탐색과 사용자 확인 |

진행 중 경기 데이터에는 `updatedAt`, 경기 상태, `PROVISIONAL` 여부를 반드시 포함한다. `FT`
감지 후 5-7의 확정 처리 결과로 Read Model을 다시 갱신하고, 익일·주간 보정에서 공식 정정을
반영한다. 과거 도구 응답을 실시간 답변에 재사용하지 않는다.

#### 1차 도구 목록

| 도구 | 설명 | 주요 인자 | 주요 반환값 |
|---|---|---|---|
| `resolve_football_entity` | 팀·선수·대회 이름을 내부 ID로 해석 | `query`, `entityTypes` | 후보 ID·표시명·신뢰도 |
| `get_live_matches` | 현재 진행 중인 경기 조회 | `competitionId?`, `teamId?` | 상태·스코어·최근 이벤트·기준 시각 |
| `get_match_detail` | 경기 상세와 라인업·이벤트 조회 | `fixtureId` | 경기 상태·라인업·이벤트·H2H 요약 |
| `get_competition_standings` | 대회 순위와 구역 조회 | `competitionId`, `seasonId`, `stage?` | 순위·승점·득실·구역 |
| `get_team_summary` | 팀의 시즌 요약 조회 | `teamId`, `competitionId?`, `seasonId` | 전적·순위·최근 폼 |
| `get_team_fixtures` | 팀 일정·결과 조회 | `teamId`, `seasonId`, `competitionId?`, `status?`, `limit` | 경기 목록 |
| `get_player_statistics` | 선수 시즌·대회 통계 조회 | `playerId`, `seasonId`, `competitionId?` | 출전·득점·도움·카드 등 |
| `compare_players` | 동일 기준으로 선수 비교 | `playerIds`, `seasonId`, `competitionId?`, `metrics` | 정규화된 비교값·우위 판정 |
| `get_knockout_bracket` | UCL 토너먼트 대진 조회 | `competitionId`, `seasonId`, `stage?` | 대진·1/2차전·합산·진출 팀 |

도구 인자는 서버에서 허용 목록과 개수 제한을 검증한다. 한 답변의 도구 호출은 **최대 6회**로
제한하고 동일 인자의 중복 호출을 차단한다. 엔티티가 모호하면 `resolve_football_entity` 이후
사용자 확인을 거치며, 초기 버전에는 자유 SQL(Text-to-SQL)을 넣지 않는다.

#### 답변 모드와 검증 UI

- **사실 조회 모드:** 스코어·일정·순위·선수 기록·비교. 서버가 수치와 판정을 확정하며 높은 재현성을 보장한다.
- **AI 해석 모드:** 경기 흐름 요약, 이상값 설명, 비교 결과의 자연어 해설. 답변에 `AI 해석`임을 표시하고 사실 조회 결과와 시각적으로 분리한다.
- 모든 답변은 `AI 답변 + 데이터 카드 + 데이터 기준 시각`을 기본으로 표시한다.
- 상세 근거 영역에서 호출 도구, 정규화된 인자, 원본 반환 JSON을 사용자가 펼쳐볼 수 있게 한다.
- 도구 호출에 실패하거나 데이터가 오래됐으면 추측하지 않고 실패·지연 상태를 그대로 알린다.

AI 기능은 기존 REST/QueryService를 재사용하는 **부가 계층**이다. 도구를 일반 UI 버튼이나 검색
필터로 바꿔도 동일 기능이 동작해야 하며, AI 장애가 경기·순위·통계 화면에 영향을 주면 안 된다.

---

## 6. 프론트엔드 페이지 인벤토리 — 5대 리그 + UCL

첫 구현은 EPL이지만 화면 정보구조는 처음부터 다중 대회를 전제로 한다. 대회·시즌 선택 상태를
공통 탐색 조건으로 두고, 국내 리그와 UCL의 서로 다른 형식은 `competition.format`에 따라
화면 컴포넌트를 전환한다.

> ⚠️ **범위 변경 (2026-08-27) — 디자인도 새로 한다.** v2는 UI를 v1 그대로 옮기지 않고
> 새로 디자인한다. 즉 이 장의 "유지"(6-1)·"무수정 이관"(6-3) 표기는 **v1 코드를 그대로
> 재사용한다는 뜻이 아니라, v1을 분석해서 나온 요구사항 — 어떤 라우트·데이터·상태 로직이
> 필요한지 — 이 이미 문서화돼 있다는 뜻으로 읽는다.** v1에서 실제로 가져가는 건 코드가
> 아니라 **이 문서(그리고 `FEATURE_PLAN.md`/`RETROSPECTIVE.md`)에 정리해둔 내용**이 거의
> 전부라고 본다. Phase 3(프론트엔드) 착수 시: UI 컴포넌트(`PitchFormation` 등 6-3 목록)는
> 디자인부터 새로 하되, 라우트 목록(6-1)·삭제 대상 판단(6-2)·상태 로직(`matchStatus.js`
> 등 6-3의 "기타" 항목)·타입 변경(6-5)은 계속 참고 자료로 쓴다.

### 6-1. 라우트별 판정

| 라우트 | v2 | 작업 내용 | 규모 |
|---|---|---|---|
| `/` | 재작성 | 오늘의 주요 경기, 선택 대회의 이번 라운드/스테이지, 순위 요약, 득점 Top5. 기본 대회는 사용자 설정 또는 EPL | **대** |
| — | **신규** `/competitions` | 5대 리그와 UCL 목록, 현재 시즌·진행 상태 | 신규 |
| — | **신규** `/competitions/[slug]` | 대회 허브. 순위·일정·통계·참가 팀과 UCL 녹아웃 진입점 | 신규 |
| `/squads` | **`/teams`** | 대회·시즌 필터가 있는 참가 팀 목록. 팀 수를 20으로 고정하지 않음 | 중 |
| `/squads/[country]` | **`/teams/[slug]`** | 팀 정보·홈구장·참가 대회·현재 순위·최근/다음 경기·스쿼드 | 중 |
| — | **신규** `/teams/[slug]/fixtures` | 전체/국내 리그/UCL 필터가 있는 팀별 일정·결과 | 신규 |
| `/standings` | 유지 | 대회·시즌 선택. 국내 리그는 승격/강등 구역, UCL 리그 페이즈는 직행/플레이오프/탈락 구역 표시 | 대 |
| `/matches` | 유지 | 대회·시즌·팀 필터. 국내 리그는 라운드, UCL은 리그 페이즈/플레이오프/녹아웃 스테이지 선택 | 중 |
| `/matches/[fixtureId]` | 유지 | 라인업·H2H·예측·상태 배지 + UCL 1·2차전/합산 점수/진출 팀 표시 | 중 |
| — | **신규** `/competitions/[slug]/knockout` | UCL 플레이오프~결승 대진, 1·2차전 합산 점수와 진출 팀 | 신규 |
| `/players/[slug]` | 유지 | 소속 팀·시즌 통계 + 대회 필터와 전체 대회 합산 보기 | 중 |
| `/stats`, `/stats/top-*` | 유지 | 시즌·대회별 득점/도움/카드 랭킹. 기존 `source` 토글은 제거하고 competition 필터로 대체 | 중 |
| `/injuries` | 유지 | 대회·팀 필터 | 소 |
| `/admin/*` | 유지 | 팀·대회·시즌 검색 기반 관리 화면 | 중 |
| `scripts/generate-sitemap.js` | 신규 | 대회/팀/선수/경기/팀 fixtures/UCL knockout URL 전수 생성. SEO 방식 확정 전까지 별도 작업으로 관리 | 중 |
| — | **신규** 공통 대회 네비 | 5대 리그·UCL과 시즌 선택. URL 또는 검색 파라미터에 선택 상태 보존 | 신규 |
| — | **신규** `/assistant` 또는 공통 AI 패널 | 일정·순위·선수 기록·비교 질의. 데이터 카드·기준 시각·근거 펼치기 제공 | Phase 5 |

`/teams/[slug]/fixtures`는 핵심 동선이다. 한 팀이 국내 리그와 UCL에 동시에 참가하므로 대회
필터가 필수이며, 기본값은 전체 일정이다. URL 공유 시 선택한 시즌·대회가 유지돼야 한다.

### 6-2. 삭제·재설계되는 자산

| 파일 | 사유 |
|---|---|
| `lib/round.js` **기존 로직 참고** | 국내 리그와 UCL을 함께 지원하는 `competitionStage`·`roundNumber` 유틸로 재작성 |
| `components/standings/GroupTable.jsx` | 조 개념 |
| `HomePage`의 `ThirdPlaceSection`·`enrichWithThirdPlace`·`getThirdPlaceRankings` | 3위 결정전은 범위 밖 |
| 기존 `TournamentBracketSection` | 그대로 이관하지 않고 UCL용 `KnockoutBracket`으로 신규 설계 |
| `components/ui/CountryFlag.jsx` | `TeamLogo`로 흡수 |
| `components/admin/CountrySearchInput.jsx` | `TeamSearchInput`으로 대체 |

국내 리그 정규시즌에서는 무승부가 정상 결과지만 UCL 녹아웃에는 연장·승부차기·합산 점수가
필요하다. 기존 `getTournamentResult`는 폐기하되 1-7의 정규화된 경기·대진 모델을 기준으로
진출 팀을 계산하는 새 로직과 테스트를 작성한다.

### 6-3. 무수정 이관 — v1에서 가장 값어치 있는 부분

- **라인업 UI 일체**: `PitchFormation` · `FootballField` · `PlayerMarker` · `PlayerSidebar` · `BenchList`
- **경기 상세**: `MatchDetailView` · `H2HSection` · `PredictionCard` · `StatusBadge` · `lib/matchStatus.js`
- **공통 UI**: `PageHeader` · `EmptyState` · `PlayerAvatar` · `BackLink` · `TeamLogo` · `FormBadge`
- **기타**: `InjuryBadge` · `ResultsTicker` · `theme-provider` · `theme-toggle`

경기 상태 코드(`NS`/`1H`/`HT`/`FT`/`AET`/`PEN`…)는 API-Football 공통이므로 기존 로직을
JavaScript의 `matchStatus.js`로 옮겨 사용함.

> ⚠️ **계획서 정정.** `FEATURE_PLAN.md` 3-1은 재사용 자산으로 `RadarStatsChart`를 들었지만
> **최종본에 이 파일은 존재하지 않는다.** 어느 시점에 삭제됐다. 선수 능력치 레이더 차트가
> 필요하면 v2에서 새로 만들어야 한다.

### 6-4. ⚠️ 빌드 시점 무음 실패 — B안의 최대 위험

회고 4-6은 "조용한 실패 금지 (적용 완료)"로 적혀 있으나, **부분 적용이었다.**

적용된 곳 — 동적 라우트의 `generateStaticParams`:

```ts
// PlayerDetailPage.jsx — 기존 동작 예시
if (slugs.size === 0) {
  throw new Error('[generateStaticParams] 스쿼드에서 선수를 한 명도 얻지 못했습니다.')
}
```

**적용되지 않은 곳 — 목록 페이지의 데이터 fetch:**

```ts
// SquadsPage.jsx — 피해야 할 동작 예시
} catch { /* 빌드 시 API 없을 경우 빈 배열 */ }
```

`/squads`·`/stats`·`/matches`·`/standings`는 백엔드가 죽어도 **빈 페이지로 빌드가 성공한다.**
전수 조사 결과 무음 `catch`가 **20곳**이며, 그중 빌드 시점 경로가 다수다.

이것이 위험한 이유는 **B안(정적 + 빌드 훅)이 빌드 성공을 신뢰하기 때문**이다. 백엔드가
잠깐 죽은 사이 Deploy Hook이 돌면 빈 사이트가 성공적으로 배포된다 — 회고 3-5의
placeholder 사고와 **정확히 같은 구조**다.

v2 규칙:

1. 빌드 시점 데이터 fetch는 **catch 하지 않는다.** 실패하면 빌드가 죽어야 한다
2. `prebuild`에서 `/actuator/health` 확인 (4-3)
3. 클라이언트 런타임 fetch만 catch 허용 — 단 **에러 상태를 UI에 노출**한다
4. CI에 `grep -rn "catch {" src/` 검사를 넣어 신규 무음 catch를 차단

### 6-5. 프론트엔드 데이터 구조 변경

아래 표의 표기는 v1 TypeScript 모델을 분석해 정리한 데이터 형태임. v2에서는 별도의
`types/index.ts`를 만들지 않고 JavaScript 객체, 정규화 함수, JSDoc으로 같은 계약을 관리함.

| v1 | v2 |
|---|---|
| `Country { code, flagUrl, groupName }` | `Team { apiTeamId, originalName, displayName, shortDisplayName, logoUrl, venue, competitions[] }` |
| — | `Competition { id, slug, originalName, displayName, type, format }` + `Season` |
| `StandingGroup { groupName, standings[] }` | `CompetitionStanding { competitionId, seasonId, stage, entries[] }` |
| `MatchSummary.round: string` | `+ competitionId, stage, roundNumber, leg, tieId, aggregateScore` |
| `SquadResponse { country, players[] }` | `SquadResponse { team, season, players[] }` |
| `StatsRanking` — `source: 'worldcup' \| 'season'` | `source` 제거, `competitionId`·`seasonId` 필터 추가 |

### 6-6. URL 스킴 변경과 SEO

`/squads/kor` → `/teams/tottenham` 류의 경로 변경이 발생하지만, **v1은 별도 도메인의 종료된
아카이브이므로 리다이렉트 부담이 없다.** v2를 새 도메인에서 시작하면 SEO 손실은 0이다.
단 v2 출시 후에는 팀 slug를 함부로 바꾸지 않는다 — 클럽 개명(예: 구단명 변경)이 실제로
발생하므로, slug는 `api_team_id` 기반의 안정 키에서 파생시키고 표시명만 바꾼다.

### 6-7. 한국어·영어 이름 매칭

API-Football에서 받은 영어 이름은 원본 데이터로 보존한다. 한국어 표시 이름은 원본 문자열을
덮어쓰지 않고 별도 Localization 데이터로 관리한다. 팀·선수·대회 연결 기준은 이름이 아니라
`api_team_id`, `api_player_id`, `api_competition_id`임.

```text
TeamLocalization
- team_id FK
- locale
- name
- short_name
- search_aliases
- reviewed

UNIQUE(team_id, locale)
```

`PlayerLocalization`, `CompetitionLocalization`도 같은 구조를 사용함. 선수 이름은 자동 음역
결과를 확정 데이터로 사용하지 않으며, 주요 선수부터 검수된 한국어 이름을 등록함. 매칭되지 않은
데이터는 `요청 언어 → 영어 → API 원본` 순서로 fallback하여 빈 이름이 화면에 나오지 않게 함.

프론트엔드 컴포넌트는 저장 구조를 직접 알지 않고 백엔드 DTO의 `displayName`,
`shortDisplayName`, `originalName`만 사용함. UI 문구 번역은 프론트엔드 리소스에서 처리하고,
팀·선수·대회 이름과 검색 별칭은 백엔드가 관리함. URL slug는 언어 전환과 무관하게 유지함.

---

## 7. 처음부터 넣는 안전장치 — 회고 4장 반영

**Phase 0에서 코드보다 먼저 만든다.** 회고의 결론이 "CI 하나와 브랜치 보호 하나가
fix 커밋 35건 중 절반을 없앴을 것"이었다.

| # | 항목 | 회고 근거 | v2 적용 |
|---|---|---|---|
| 1 | CI (`file-integrity`/`frontend`/`backend`) | 4-1 | 프론트는 `npm ci` → `npm run lint` → `npm run build`로 Vite 빌드 검증 |
| 2 | 브랜치 보호 규칙 | 4-2 (main 직접 커밋 80%) | 첫 커밋 직후 Ruleset 설정. 기본 브랜치 `dev` |
| 3 | pre-commit 훅 | 4-3 (파일 오염 6건) | null byte·UTF-8 검사 + ESLint |
| 4 | 착수 전 체크리스트 | 4-4 (배당 2시간 사건) | 이 문서 자체가 1회차 적용 결과 |
| 5 | 테스트 우선순위 | 4-5 | 아래 7-1 |
| 6 | 조용한 실패 금지 | 4-6 | `CLAUDE.md`에 원칙 이관 |
| 7 | 커밋 10파일 이하 | 4-7 | pre-commit에서 경고 |

### 7-1. 처음부터 쓰는 테스트 — "틀리면 조용히 망가지는 것"

회고 4-5가 지목한 4개 영역을 v2에서는 **코드와 같은 PR에** 넣는다.

- 스쿼드 diff 로직 (이적 처리) — v2에서 새로 생긴 최대 리스크
- Upsert 로직 (`api_team_id` 기준)
- KST/UTC 변환 (`lib/format.js`) — 아카이브에서 3회 반복 수정
- 스케줄러 모드 전환 (IDLE/LINEUP/LIVE 경계 조건)
- WebSocket room 구독·재연결 풀 싱크·중복/역순 이벤트 무시
- 경기 종료 후 선수 통계·순위·UCL 합산 점수의 멱등 갱신
- 국내 리그 라운드와 UCL stage/leg/tie 경계 조건

> 회고 3-10: 테스트 3개가 두 달간 컴파일조차 안 되는 상태였다.
> **CI가 매 PR에서 돌리지 않으면 같은 일이 반복된다.**

---

## 8. 단계별 로드맵

| Phase | 내용 | 산출물 | 검증 |
|---|---|---|---|
| **0** | 안전장치 + 배포 PoC (프로덕션 코드 없음) | 빈 스켈레톤 + 녹색 CI | 아래 8-2 완료 기준 |
| **1** | `Competition`/`Team`/`Season`/`CompetitionEntry` + `Player` 이관 + Localization 기반 + EPL 스쿼드 수집 | EPL 20팀 ~500선수 DB 적재, 영어 원본·한국어 표시명 구조 | 스쿼드 diff·다중 대회 참가·이름 fallback 테스트 통과 |
| **2** | 경기·라인업·순위·종료 후 통계 + 스케줄러 + WebSocket 게이트웨이 | EPL 매치데이 자동 갱신·푸시 | 실제 라운드 1회 무중단 관측, 재연결 복구 |
| **3** | 다중 대회·한국어/영어 프론트 + 배포 파이프라인 | EPL 공개 사이트, 언어 전환, 5대 리그/UCL 공통 화면 구조 | 양 언어 반응형 화면, Lighthouse, 백엔드·Socket 장애 시 오류/fallback 확인 |
| **4** | 라리가·분데스리가·세리에 A·리그 1 + UCL 데이터 활성화 | **최종 확정 범위 완성** | 최종 API 예산, 5,000+페이지 배포, UCL 녹아웃 검증 |
| **5** | 결정적 조회 도구 + AI 챗봇 | 사실 조회·선수 비교·근거 공개가 가능한 AI 패널 | 숫자 환각 0건, 동일 데이터 버전의 판정 일치, 도구 한도·실패 처리 검증 |

> Node.js 실시간 게이트웨이(5-6)는 Phase 0/1에는 넣지 않는다. Phase 2에서 Spring 스케줄러와
> Redis 발행을 먼저 구현한 뒤 Socket.io 게이트웨이를 연결하며, Phase 2 완료 조건에 포함한다.

**Phase 0을 건너뛰지 않는 것이 이 로드맵의 유일한 핵심이다.**

### 8-0. 선행 조건 — 착수를 막는 것

| | 내용 | 담당 |
|---|---|---|
| **S0** | ~~API-Football 구독 확인.~~ **완료 (2026-08-27) — Pro 플랜 구독함.** (Free는 시즌 2022~2024만 접근 가능해 26-27 데이터를 못 받는 문제였음) | 본인 ✅ |
| **S1** | ~~저장소 이름 결정~~ **`pitchlog-league`로 확정 (2026-08-27)** | 본인 ✅ |

S0·S1 모두 해결 완료 (2026-08-27) — Phase 0 착수를 막던 두 선행조건이 없어졌다.

### 8-1. Phase 0 — PR 단위 분해

회고 4-7의 "한 커밋 10파일 이하"를 처음부터 적용한다.

| PR | 내용 | 산출물 | 담당 |
|---|---|---|---|
| **#1** | 저장소 생성(`pitchlog-league`), 모노레포 골격(`backend/`·`frontend/`·`.github/`), `.gitignore`, `CLAUDE.md` | 빈 뼈대 | repo 생성만 본인 |
| **#2** | CI 이관 — `file-integrity`/`frontend`/`backend` 3잡 + **Vite lint·build 추가** | 녹색 CI | |
| **#3** | 브랜치 보호 Ruleset — `main`에 PR 필수 + CI 통과 필수, 기본 브랜치 `dev` | GitHub 설정 | **본인** (Settings 권한) |
| **#4** | pre-commit 훅 — null byte·깨진 UTF-8 + ESLint + 10파일 초과 경고 | `.githooks/pre-commit` | |
| **#5** | Spring Boot 스켈레톤 — Flyway `V1__init.sql`(빈), Actuator health, Testcontainers, ArchUnit 규칙 1개 | `./gradlew build` 통과 | |
| **#6** | **배포 PoC** — 4-5의 5가지 확인 | 배포 방식 확정 | |

> **#2에서 `npm run lint`와 `npm run build`를 CI에 넣는 것이 요점이다.** 화면 구현 단계는
> 고정 Mock Data로 Vite 빌드를 검증하고, 백엔드 연결 후에는 API 계약 테스트를 별도로 추가함.
> 회고 3-3의 "빌드가 깨진 채로 푸시됨"을 구조적으로 막는 목적은 동일함.

### 8-2. Phase 0 완료 기준 (DoD)

- [ ] PR 하나가 CI 3잡 통과 → `dev` 머지 → `main` 직접 push가 보호규칙에 막히는 것 확인
- [ ] `./gradlew build`가 Testcontainers로 Postgres 띄우고 통과
- [ ] ArchUnit 규칙이 `ingest/schedule` → `ingest/batch` 의존을 실제로 실패시킴
- [ ] 배포 PoC 5항목 확인 → **10장 #2 닫기**

### 8-3. Phase 1 — 첫 도메인 코드

1. Flyway `V2__competitions_teams.sql` — `competitions`·`teams`·`seasons`·`competition_entries`
2. 엔티티 + 리포지토리 (`Competition`/`Team`/`Season`/`CompetitionEntry`), `Player`는 v1에서 이관
3. `ApiFootballClient` + Resilience4j (rate limit·백오프)
4. `TeamSyncService` — EPL 20팀 적재. **첫 upsert 로직이므로 테스트 동반**
5. `SquadSyncService` + **diff 로직** — v2 최대 리스크(1-3). 테스트 필수
6. Spring Batch Job 1개 — 시즌 초 스쿼드 벌크 적재, chunk + 재시작

Phase 1의 검증 기준은 "20팀 500선수가 DB에 있다"가 아니라
**"스쿼드 diff 테스트가 이적 시나리오를 통과한다"** 이다.

---
## 9. 기술 부채 — 가져갈 것 / 버릴 것

| 항목 | 아카이브 상태 | v2 처리 |
|---|---|---|
| Next.js 14.2.5 (보안 권고) | 그대로 | **이관 안 함. React + Vite + JavaScript로 신규 구성** |
| Node 20.11.1 (wrangler가 22 요구) | `npx wrangler@3`로 우회 | **v2는 Node 22 고정** (`.nvmrc` + CI matrix) |
| `pitchlog_dump.sql` (2026-05 낡은 덤프) | 저장소에 있음 | **이관 안 함.** 아카이브에서도 제거 권장 |
| `install.cmd` (Claude Code 설치 스크립트) | 루트+backend 2곳 | **이관 안 함.** 프로젝트와 무관 |
| 어드민 기본 비밀번호 `admin/admin1234!` | 그대로 | **v2는 환경변수 필수화** — 미설정 시 부팅 실패 |
| 배당(Odds) | 미구현, `fixture_odds` 테이블만 존재 | **v2에서도 보류.** AdSense 정책 리스크 + 7일 제한. 테이블도 안 만듦 |
| `fixtureId < 1_000_000` 필터 | `BackfillLineupsStep` | **이관 금지.** grep으로 확인 |
| `.github/workflows/ci.yml` | 2026-08-23 작성 | 구조만 참고. 프론트는 `npm ci`·ESLint·Vite build로 재작성 |
| `MatchSchedulerService` 3단계 스케줄러 | 완성도 높음 | **이관.** 리그에서 진가 발휘 |
| `PitchFormation` | 요구사항·상태 로직 참고 | 새 디자인으로 구현 |
| `RadarStatsChart` | 최종본에 파일 없음 | 필요 시 신규 구현 |

### 아카이브 저장소 정리 (선택)

```bash
git checkout -b chore/cleanup
git rm --cached pitchlog_dump.sql install.cmd backend/install.cmd
echo -e "\npitchlog_dump.sql\ninstall.cmd" >> .gitignore
git commit -m "chore: 프로젝트와 무관한 덤프·설치 스크립트 저장소에서 제거"
git push origin chore/cleanup
```

---

## 10. 미결정 사항

| # | 항목 | 결정 시점 | 비고 |
|---|---|---|---|
| 1 | ~~저장소 이름~~ | **확정 (2026-08-27)** | **`pitchlog-league`** |
| 2 | 배포 방식 (B 정적+빌드훅 / C Workers+OpenNext / D Vercel) | Phase 0 PR #6 PoC 후 | 4-5의 5항목이 기준. A(전량 CSR)는 SEO 손실로 배제 |
| 3 | 상시 백엔드 (Railway Hobby $5) | Phase 2 전 | 아카이브는 평시 $0였음 — 성격이 다른 결정 |
| 4 | ~~API-Football Pro 구독 시점~~ | **완료 (2026-08-27)** | Pro 플랜 구독 완료 — 26-27 시즌 데이터 접근 가능 |
| 5 | 이적 이력 정밀도 (`/transfers` 사용 여부) | Phase 3 | 선수당 1콜 — 비쌈 |
| 6 | QueryDSL 유지 여부 | 첫 동적 쿼리 필요 시점 | v1에서는 사용처 0건이었음 (5-1) |
| 7 | ~~실시간 레이어 적용 여부·시점~~ | **확정: Phase 2** | WebSocket 기본 경로, Redis Pub/Sub + Node/Socket.io. REST 동기화·fallback 포함 |
| 8 | AI 제공 모델·호스팅·월 호출 예산 | Phase 5 착수 전 | 기능 설계는 모델 비종속. 비용·응답시간·한국어 품질을 PoC로 비교 |
| 9 | AI 패널 진입 방식 (`/assistant` 전용 / 전역 패널) | Phase 3 화면 설계 시 | 모바일 사용성, 현재 화면 문맥 전달 범위와 함께 결정 |

> ✅ **4번 해결 완료 (2026-08-27).** API-Football Pro 플랜 구독 완료 — 26-27 시즌 데이터
> 접근 가능해짐. 아카이브에서 "재개 시점에야 발견"했던 문제(회고 3-6)와 같은 종류가 될 뻔했지만
> Phase 1 착수 전에 미리 확인해 막았다.

---

## 부록 — 착수 전 체크리스트 (회고 4-4) 적용 결과

- [x] **첫 구현 API 호출 비용을 계산했는가** → 3장. EPL 일 3,490콜 / 7,500 (47%)
- [ ] **최종 범위 API 호출 비용을 실측했는가** → 5대 리그+UCL 최악 경기일은 Phase 4 진입 전 실측. 6,000콜/일 경고선 적용
- [x] **구독 플랜이 그 데이터에 접근 가능한가** → API-Football Pro 구독 완료. 26-27 시즌 접근 확인
- [x] **정책·법적 리스크가 있는가** → 배당 보류 유지(AdSense). 로고·선수 사진은 API 제공분만 사용
- [x] **`FEATURE_PLAN.md`에 적어둔 주의사항을 읽었는가** → 3장 전체가 그 결과
- [x] **AI가 숫자와 판정을 생성하지 않는가** → 5-8. 결정적 QueryService 결과만 사용하고 DB·외부 API 직접 접근 금지
- [ ] **AI 비용·지연·품질을 실측했는가** → Phase 5 전 대표 질문 세트와 동시 사용자 조건으로 PoC
