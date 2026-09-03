# 백엔드 설계 재검토 (2026-09-03)

> 대상: `V2_DESIGN.md` 1~5·7~8장, `ADR-001-NODE-BACKEND.md`, `BACKEND_GUIDE.md`
> 시점: 백엔드 코드 0줄. **설계를 바꾸는 비용이 가장 싼 시점이다.**

---

## 요약

구조는 견고하다. 특히 세 가지는 그대로 간다.

- **Scheduler / Worker 판별 기준을 "시점"이 아니라 "재시작 지점을 기억해야 하는가"로 잡은 것** (5-3).
  흔히 "초기 수집 vs 운영"으로 나눠 애매해지는데, 이 기준은 실제로 판별이 된다.
- **경기별 선수 기록을 원본으로 두고 누적값은 집계한다** (5-7). `기존 값 + 이번 경기 값` 금지가
  명시돼 있다. 중복 FT 감지에서 통계가 두 배 되는 사고를 구조적으로 막는다.
- **스쿼드를 diff로 다루는 것** (1-3). API가 스냅샷만 주는 제약을 정면으로 인정하고 설계했다.

아래는 **코드를 쓰기 전에 정해야 할 것 5건**, **Phase 0에 추가할 것 2건**,
**Phase 1부터 반영해야 싼 것 2건**이다.

---

## A. 코드 쓰기 전에 고칠 것

### A-1. 시즌 모델이 대회별로 다른 현재 시즌을 표현하지 못한다 ★

```
seasons(id, year, start_date, end_date, is_current)
```

`is_current` 단일 플래그는 **전역으로 현재 시즌이 하나**라고 가정한다. 실제로는 어긋난다.

- UCL 예선은 국내 리그 개막 **전인 7월**에 시작한다
- 시즌 종료 시점이 리그마다 다르다 (분데스리가는 5월 중순, EPL은 5월 말)
- 7~8월에는 지난 시즌 마무리와 새 시즌 프리시즌이 겹친다
- API-Football은 **리그마다 `season` 값을 따로** 준다

지금 구조로는 "UCL은 26-27이 시작됐는데 세리에 A는 아직 25-26"인 상태를 못 담는다.

**제안** — 현재 시즌은 대회에 종속시킨다.

```
seasons(id, year)                        -- 연도 마스터만
competition_seasons(
  competition_id FK, season_id FK,
  api_season_value,                      -- API-Football이 쓰는 값
  start_date, end_date,
  is_current,
  status                                 -- UPCOMING | IN_PROGRESS | FINISHED
)
UNIQUE(competition_id, season_id)
CREATE UNIQUE INDEX ON competition_seasons(competition_id) WHERE is_current
```

2-1이 지적한 "매년 7월 수동 배포" 문제는 이 구조에서도 그대로 해결되고,
대회별 롤오버 시점 차이까지 담긴다.

### A-2. 선수 통계의 팀 귀속을 `squad_entries`로 판단하면 안 된다 ★

`PlayerSeasonStats`는 `UNIQUE(player_id, team_id, competition_id, season_id)`로
이적 선수를 팀별로 분리 집계한다. 설계는 옳다.

문제는 **"이 경기 시점에 어느 팀이었나"를 무엇으로 판단하는가**이다.
`squad_entries.joined_at`은 1-3이 인정하듯 **실제 이적일이 아니라 diff 수집일**이다
(주 1회면 최대 7일 오차, 이적창 마감일엔 하루에 수십 건이 몰린다).
이 값으로 경기를 팀에 귀속시키면 **이적 전후 경기가 엉뚱한 팀에 붙는다.**

**제안** — 경기별 선수 통계 row에 `team_id`를 직접 저장한다.

API-Football의 경기별 선수 통계 응답은 그 경기에서 어느 팀으로 뛰었는지를 준다.
그것을 그대로 저장하면 `squad_entries`의 부정확한 날짜에 의존하지 않는다.

```
player_match_stats(
  id, match_id FK, player_id FK,
  team_id FK,          -- ★ 이 경기에서 뛴 팀. squad_entries를 조회하지 않는다
  competition_id, season_id,
  minutes, goals, assists, cards, rating, ...
)
UNIQUE(match_id, player_id)
```

`squad_entries`는 "현재 스쿼드 명단"을 보여주는 용도로만 쓰고,
**집계의 근거로는 쓰지 않는다.** 이 구분이 문서에 없다.

### A-3. `is_current`와 `left_at IS NULL`이 같은 사실을 두 번 말한다

```
squad_entries(..., joined_at, left_at, is_current BOOLEAN)
```

두 값이 같은 사실을 표현한다. 하나만 갱신되면 **조용히 어긋난다** — 회고 4-6이 막으려던 것과
정확히 같은 구조다. diff 로직이 `left_at`만 쓰고 `is_current`를 놓치는 실수는 실제로 흔하다.

**제안** — `is_current`를 삭제하고 `left_at IS NULL`을 유일한 진실로 둔다.

```
CREATE UNIQUE INDEX ON squad_entries(player_id, season_year) WHERE left_at IS NULL;
```

partial index로 "한 시즌에 현재 소속 팀은 하나"라는 제약이 그대로 유지된다.

### A-4. 임대를 구분할 필드가 없다

`joined_at`/`left_at`만으로는 **완전이적과 임대가 구별되지 않는다.** EPL에서 임대는 흔하고,
"임대 복귀"는 원소속 팀 row가 다시 생기는 것으로만 나타난다. 화면에서 "임대 중"을 표시할 수 없고,
원소속 팀 스쿼드에 임대 나간 선수를 어떻게 다룰지 정의가 없다.

**제안** — `squad_entries`에 이적 유형을 추가한다.

```
transfer_type    -- PERMANENT | LOAN | LOAN_RETURN | YOUTH | UNKNOWN
parent_team_id   -- 임대일 때 원소속 팀 (NULL 허용)
```

diff만으로는 유형을 알 수 없으므로 초기값은 `UNKNOWN`이다. `/transfers`를 도입하기 전까지는
그대로 두되, **필드를 지금 만들어 두면 나중에 마이그레이션 없이 채울 수 있다.**

### A-5. `knockout_ties`에 승리 사유가 없다

```
aggregate_home, aggregate_away, winner_team_id, status
```

합산 점수가 동점일 때 UCL은 연장 → 승부차기로 간다. 그 결과는 `matches.penalty_*`에 있지만,
**tie 레벨에서 "왜 이 팀이 올라갔나"를 알 수 없다.** 합산 3-3에 승자만 있으면 화면이 근거를
표시하지 못한다 — "근거를 함께 제공한다"는 이 서비스의 원칙과 어긋난다.

**제안** — `win_reason` 추가: `AGGREGATE | EXTRA_TIME | PENALTIES | WALKOVER`.

(원정 다득점은 2021년 폐지됐으므로 `AWAY_GOALS`는 넣지 않는다.)

---

## B. Phase 0에 추가할 것

### B-1. API-Football 26-27 시즌 데이터를 실제로 한 번 호출해본다 ★

S0이 "Pro 플랜 구독 완료"로 닫혀 있다. 그건 **결제 확인이지 데이터 확인이 아니다.**

Free 플랜이 2022~2024 시즌만 준다는 걸 발견한 경위를 생각하면, Pro가 26-27을 **실제로**
주는지는 호출해봐야 안다. 회고 3-6의 "재개 시점에야 발견"과 같은 종류의 위험이다.

```
GET /leagues?id=39&season=2026        -- EPL 26-27이 오는가
GET /teams?league=39&season=2026      -- 20팀이 오는가
GET /players/squads?team=33           -- 스쿼드 형식이 문서와 같은가
```

**3콜이면 끝난다.** Phase 0 DoD에 넣는다. Phase 1에 가서 발견하면 로드맵 전체가 밀린다.

### B-2. Prisma `upsert`의 동시성 동작을 확인하고 문서에 적는다

`BACKEND_GUIDE.md`는 "Prisma unique·upsert·transaction으로 중복 수집과 동시 쓰기를 방지"한다고
적고 있다. 그런데 **Prisma의 `upsert()`가 항상 단일 `INSERT ... ON CONFLICT`로 컴파일되지는
않는다.** 중첩 쓰기가 있거나 조건이 단일 unique 필드가 아니면 SELECT 후 INSERT/UPDATE 경로로
떨어지고, 그 사이에 경쟁이 발생하면 `P2002`가 난다.

5-4의 ⚠(백필과 diff가 같은 row를 동시에 변경)가 바로 이 시나리오다.

**Phase 0 스켈레톤(PR #5)에서 확인할 것:**

1. 쓸 upsert 형태가 실제로 `ON CONFLICT`로 나가는지 쿼리 로그로 확인
2. 아니면 `$executeRaw`의 `INSERT ... ON CONFLICT` 또는 `P2002` 포착 후 재시도를 쓴다
3. 어느 쪽이든 **동시 호출 통합 테스트**를 같은 PR에 넣는다 (5-4가 이미 요구하고 있다)

"Prisma가 알아서 해준다"고 가정하면 안 된다.

---

## C. Phase 1부터 반영해야 싼 것

### C-1. 모든 조회 응답에 데이터 기준 시각을 넣는다 ★

5-8(AI)은 "데이터 기준 시각과 근거를 함께 제공"을 원칙으로 삼는다. Phase 5다.
그런데 **프론트엔드는 이미 이걸 기대하고 있다** — `DataTimestamp` 컴포넌트가
`updatedAt`을 받아 "13:42 기준"을 표시한다.

Phase 5에 가서 붙이면 **모든 응답 DTO를 고쳐야 한다.** Phase 1부터 넣으면 공짜다.

**제안** — Phase 1의 모든 조회 응답에 `asOf`(또는 `updatedAt`)를 포함한다.
목록이면 목록 전체의 기준 시각, 단건이면 그 row의 `updated_at`.

### C-2. `live=all` 대신 리그를 지정한다

3-1은 `/fixtures?live=all` 10초 폴링을 전제한다. 호출 수는 1콜로 고정이라 예산상 문제없다.

문제는 **페이로드**다. `live=all`은 전 세계 모든 리그의 라이브 경기를 반환한다.
필요한 건 6개 대회인데 남미·아시아·기타 리그까지 전부 온다.
3-2의 ⚠가 지적한 "처리 시간"의 상당 부분이 **버릴 데이터를 파싱하는 비용**이다.

API-Football은 리그 지정을 지원한다.

```
/fixtures?live=39-140-78-135-61-2
```

호출 수는 그대로 1콜이고 페이로드만 준다. **Phase 2에서 처리량을 실측하기 전에
이것부터 바꿔두면 실측값 자체가 좋아진다.**

---

## D. 사소한 것

| 항목 | 내용 |
|---|---|
| 5-1 표 | Spring/QueryDSL 기준 진단이라 ADR-001 이후 문맥이 낡았다. 교훈은 유효하므로 "v1 진단"임을 더 분명히 하거나 표만 갱신 |
| 8-1 PR #1~#4 | 저장소·모노레포 골격·`.gitignore`·`CLAUDE.md`는 이미 완료됐다. Phase 0 잔여는 실질적으로 #2(CI)·#3(Ruleset)·#5(스켈레톤)·#6(배포 PoC) |
| 1-6 `Coach` | `joined_at`/`left_at` 이력 구조가 필요하다고만 적혀 있고 우선순위가 Phase 3. `squad_entries`와 같은 패턴이므로 Phase 1에 같이 만드는 게 싸다 |

---

## 권장 순서

1. **A-1(시즌)·A-2(통계 귀속)** 을 먼저 정한다 — 나머지 스키마가 여기에 딸려 온다
2. A-3·A-4·A-5는 스키마 확정 시 같이 반영 (필드 추가라 비용 작음)
3. **B-1(API 3콜 검증)을 이번 주에 한다** — 결과에 따라 로드맵이 바뀔 수 있다
4. C-1·C-2는 Phase 1·2 착수 시 규칙으로 적용
