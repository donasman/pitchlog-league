# 스키마 설계

> 2026-09-06. **`V2_DESIGN.md` 1장(도메인 모델 전환)을 구체화하고 일부 대체한다.**
> 그 장은 월드컵 스키마에서 클럽 스키마로 *무엇을 바꾸는가*를 다뤘고,
> 이 문서는 실측 이후 확정된 범위에서 *실제 테이블이 어떻게 생겼는가*를 정한다.
>
> 근거: `INGESTION_STRATEGY.md`(수집 범위·컷오프) · `DATA_RULES.md`(값의 세 상태) ·
> `API_FIELDS_FULL.md`(필드 실측) · `BACKEND_DESIGN_REVIEW.md`(A-1~A-5)

---

## 0. 확정 전제

| 항목 | 값 | 결정일 |
|---|---|---|
| **외래키** | **사용하지 않음.** Prisma `relationMode = "prisma"`. 무결성은 백엔드 책임 | 2026-09-06 |
| **기본키** | 내부 서로게이트 ID + `external_ids` 매핑 | 2026-09-06 |
| **이력 모델** | SCD Type 2는 **스쿼드·감독만** | 2026-09-06 |
| 범위 | 12대회(리그 6 + 컵 6) × 최근 5시즌 | 2026-09-04 |
| 저장소 | Supabase 무료 500MB (추정 사용 ~270MB) | 2026-09-04 |
| DB | PostgreSQL + Prisma | ADR-001 |

명명 규칙: **DB는 snake_case, Prisma 모델은 PascalCase + `@@map`.**
시각 컬럼은 전부 `timestamptz`, 날짜만 필요한 곳은 `date`.

---

## 1. 설계 원칙

이 스키마가 따르는 여섯 가지다. 이후 모든 테이블 결정은 이 중 하나로 설명된다.

**① 원본과 파생을 나눈다.**
경기별 기록이 원본이고 시즌 누적은 파생이다. 파생은 언제든 원본에서 다시 만들 수 있어야 한다.
`기존 값 + 이번 경기 값` 연산을 금지한다 — 중복 FT 감지에서 두 배가 된다 (V2_DESIGN 5-7).
파생 테이블에는 `source` 컬럼을 두어 자체 집계인지 API 공식값인지 구분한다.

**② 자연키는 유니크 제약으로, 조인은 내부 ID로.**
`api_*_id`에 UNIQUE를 걸어 수집 멱등성을 보장하고, 테이블 간 참조는 내부 `Int` ID로 한다.
1차 소스 식별자는 컬럼으로, **2차 소스는 `external_ids` 행으로** 붙인다 (2-6).

**③ 시간을 두 종류로 구분한다.**
"언제 일어난 일인가"(유효시간)와 "언제 그렇게 알게 됐는가"(기록시간)는 다르다.
스쿼드 diff의 `joined_at`은 실제 이적일이 아니라 **수집일**이므로 기록시간이다.
이 구분을 흐리면 경기의 팀 귀속이 틀린다 (6장).

**④ 결손은 값이 아니라 상태다.**
`0`(발생 안 함) · `null`(측정 안 됨) · **미제공**(데이터 자체가 없음)은 다르다.
셋째는 값 컬럼이 아니라 **경기 단위 플래그**로 표현한다 (`DATA_RULES.md` 3장).

**⑤ 비정규화는 정당화하고 갱신 책임자를 적는다.**
비정규화한 컬럼마다 이유와 "누가 언제 이 값을 채우는가"를 9장 표에 남긴다.
책임자가 없는 비정규화 컬럼은 만들지 않는다.

**⑥ 무결성은 DB가 아니라 코드와 테스트가 지킨다.**
외래키를 쓰지 않기로 했으므로 이건 선택이 아니라 의무다 (2장).

---

## 2. 외래키 없이 가는 설계

### 2-1. Prisma 설정

```prisma
datasource db {
  provider     = "postgresql"
  url          = env("DATABASE_URL")
  relationMode = "prisma"
}
```

이 한 줄로 바뀌는 것:

- 마이그레이션에 `FOREIGN KEY` 제약이 생성되지 않는다
- `onDelete` / `onUpdate` 참조 동작을 **Prisma Client가 애플리케이션에서 흉내 낸다** — 추가 쿼리가 나간다
- **관계 스칼라 필드에 인덱스가 자동으로 생기지 않는다** ★

### 2-2. 관계 컬럼 인덱스는 의무다 ★

외래키가 있을 때 PostgreSQL이 자동 인덱스를 만들어주지는 않지만, Prisma는 관계 필드에
인덱스를 만들어 왔다. `relationMode = "prisma"`에서는 그게 없어진다.

> **규칙: 다른 테이블의 ID를 담는 모든 컬럼에 `@@index`를 명시한다. 예외 없다.**

빠뜨려도 에러가 나지 않고 그냥 느려진다. `player_match_stats.match_id`에 인덱스가 없으면
경기 상세 화면 한 번에 36만 행 순차 스캔이다.

복합 인덱스가 커버하는 경우에만 단일 인덱스를 생략할 수 있고, 그때는 주석으로 이유를 남긴다.

### 2-3. 고아 행 검사를 상시화한다

FK가 없으면 고아 행이 **조용히** 생긴다. 회고가 지목한 "틀리면 조용히 망가지는 것"의 전형이다.
백필이 8일짜리라 수집 순서가 한 번 꼬이면 화면에 빈 칸이 뜰 때까지 아무도 모른다.

검사 쿼리를 코드로 두고 **두 곳에서 돌린다.**

| 어디 | 언제 | 실패 시 |
|---|---|---|
| L6 보정 잡 | 일 1회 | 로그 + 관리 화면 경고. 자동 삭제 금지 |
| CI 통합 테스트 | 매 PR | 실패 처리 |

```sql
-- 예: 존재하지 않는 경기를 가리키는 선수 기록
SELECT s.id, s.match_id
FROM player_match_stats s
LEFT JOIN matches m ON m.id = s.match_id
WHERE m.id IS NULL
LIMIT 100;
```

검사 대상 관계는 11개다 — `player_match_stats → matches/players/teams`,
`lineup_entries → matches/players`, `match_events → matches/teams`,
`standings → competition_seasons/teams`, `squad_entries → players/teams`,
`matches → competition_seasons/rounds/teams`.

**자동 삭제하지 않는다.** 고아 행은 원인이 수집 순서 버그이므로, 지우면 증상만 사라지고
원인이 남는다.

### 2-4. 부모-먼저 순서를 파이프라인이 보장한다

```
competitions → seasons → competition_seasons → competition_rounds
             → venues → teams → competition_entries
             → players → squad_entries
             → matches → (events · lineups · team_stats · player_stats)
             → standings · *_season_stats · top_rankings
```

수집 서비스는 이 순서를 **트랜잭션 경계**로 나눠 실행한다. 경기 상세 4종은 경기 행이
커밋된 뒤에만 시작한다. 백필 Worker의 `phase`가 이 순서를 그대로 따른다.

선수는 예외가 있다 — 라인업·경기 통계에 **스쿼드에 없는 선수**가 나온다(이적 직후, 유스 승격).
이 경우 `players`에 최소 정보로 먼저 upsert하고 프로필은 나중에 채운다.
**"없으면 건너뛴다"가 아니라 "없으면 만든다"** 로 처리한다.

### 2-5. 삭제 순서를 문서에 박는다

Cascade가 없으므로 보관 정책 실행 시 순서가 틀리면 고아가 남는다.

```
1. player_match_stats
2. lineup_entries → match_lineups
3. match_events
4. team_match_stats
5. bracket_slots → knockout_ties
6. matches
7. standings · player_season_stats · team_season_stats · top_rankings
8. competition_rounds
9. competition_seasons
```

역순으로 만들고 정순으로 지운다. 10장의 보관 시나리오가 이 순서를 사용한다.

### 2-6. `external_ids` — 1차는 컬럼, 2차는 행

```
external_ids(
  id, entity_type, entity_id, source, external_id,
  UNIQUE(source, entity_type, external_id),
  INDEX(entity_type, entity_id)
)
```

`entity_type`: `COMPETITION | TEAM | PLAYER | COACH | VENUE`

**비대칭을 의도적으로 둔다.** API-Football id는 각 테이블의 `api_*_id` 유니크 컬럼에 두고,
`external_ids`에는 **2차 소스(Sportmonks 등)만** 넣는다.

이유는 백필이다. 45,000콜을 도는 동안 모든 upsert가 매핑 테이블을 조인하면 그만큼 느려진다.
2차 소스를 붙일 때 마이그레이션이 아니라 행 추가로 끝난다는 원래 목적(`DATA_RULES.md` 1-3)은
테이블이 처음부터 존재하는 것으로 이미 달성된다.

2차 소스 도입 시점에 1차 id도 `external_ids`로 옮길지는 그때 정한다.

---

## 3. 테이블 정의

### 3-1. 기준 데이터

```
competitions(
  id, api_competition_id UNIQUE,
  name, country, country_code, logo_url,
  type,            -- LEAGUE | CUP | SUPER_CUP
  format,          -- ROUND_ROBIN | LEAGUE_PHASE_KNOCKOUT | KNOCKOUT
  top_flight_competition_id NULL,   -- 컵 → 그 나라 1부 리그. 컷오프 판정에 쓴다
  is_tracked,      -- 우리가 수집하는 12개
  display_order
)
INDEX(top_flight_competition_id)
```

`top_flight_competition_id`가 컵 컷오프의 근거다. FA Cup(45) → Premier League(39).
전체 800개 대회 카탈로그를 다 넣지 않고 **`is_tracked = true`인 12개 + 슈퍼컵 5개만** 넣는다.

```
seasons(id, year UNIQUE)
```

연도 마스터만 둔다. 시작·종료일과 현재 여부는 대회에 종속된다.

```
competition_seasons(
  id, competition_id, season_id,
  api_season_value,        -- API-Football이 쓰는 값
  start_date, end_date,
  status,                  -- UPCOMING | IN_PROGRESS | FINISHED
  is_current,
  coverage JSON,           -- 참고용. 수집 조건으로 쓰지 않는다
  list_from_round_id NULL, -- 1부 팀 최초 등장 라운드 (계산 결과 캐시)
  detail_cutoff_round_id NULL,
  as_of
)
UNIQUE(competition_id, season_id)
CREATE UNIQUE INDEX ON competition_seasons(competition_id) WHERE is_current
INDEX(season_id), INDEX(status)
```

**설계검토 A-1을 그대로 적용한다.** 현재 시즌은 전역이 아니라 대회별이다. 실측에서
Copa del Rey·Coupe de France는 2026 시즌이 아직 없고 FA컵은 등록만 됐다.

`coverage`는 저장하되 **수집 조건으로 쓰지 않는다** (`DATA_RULES.md` 6장).
시즌 초에 전부 `false`였다가 켜지기 때문이다. 진단용으로만 본다.

```
competition_rounds(
  id, competition_season_id,
  name,                -- API 원문. "Round of 16" · "1/8-finals" · "Regular Season - 12"
  ordinal,             -- 시간순 정렬용
  team_count, match_count,
  is_late_stage,       -- 역순 연속 16팀 이하 → 16강 이상
  has_top_flight,      -- 1부 팀이 등장하는 라운드인가
  first_kickoff_at
)
UNIQUE(competition_season_id, name)
INDEX(competition_season_id, ordinal)
```

**라운드를 테이블로 만드는 게 이번 설계의 변경점이다.** V2_DESIGN 1-4는 `matches.round`
문자열과 `round_number` INT였는데, 컵이 들어오면서 그걸로 부족해졌다.
정렬 순서가 이름에서 유도되지 않고(`Extra Preliminary Round` < `1/128-finals` < `Round of 64`),
`is_late_stage`·`has_top_flight`가 수집 대상 판정에 쓰이기 때문이다.

```
teams(
  id, api_team_id UNIQUE,
  name, short_name, code, country,
  founded, logo_url, venue_id NULL,
  first_seen_competition_id NULL   -- 컵 하부팀 진단용
)
INDEX(venue_id), INDEX(country)

venues(id, api_venue_id UNIQUE, name, city, country, capacity, surface, image_url)

competition_entries(id, competition_season_id, team_id)
UNIQUE(competition_season_id, team_id)
INDEX(team_id)
```

`competition_entries`가 **1부 팀 집합의 근거**다. 컵 경기 수집 판정은
"홈 또는 원정이 `competition_entries`(1부 리그 시즌)에 있는가"로 한다.

### 3-2. 사람과 이력

```
players(
  id, api_player_id UNIQUE,
  name, firstname, lastname,
  birth_date NULL, birth_place NULL, birth_country NULL,
  nationality, height_cm NULL, weight_kg NULL, photo_url,
  profile_fetched_at NULL      -- 최소 정보로 만든 행인지 구분
)
```

`profile_fetched_at`이 NULL이면 라인업에서 이름만 보고 만든 행이다 (2-4).

```
squad_entries(                       -- SCD Type 2
  id, player_id, team_id, season_year,
  jersey_number NULL, position NULL,
  valid_from,            -- 이 소속이 유효해진 시점 (= 관측일. 실제 이적일 아님)
  valid_to NULL,         -- NULL이면 현재 소속
  observed_at,           -- 이 사실을 언제 수집했나 (기록시간)
  transfer_type,         -- PERMANENT | LOAN | LOAN_RETURN | YOUTH | UNKNOWN
  parent_team_id NULL    -- 임대 시 원소속
)
CREATE UNIQUE INDEX ON squad_entries(player_id, season_year) WHERE valid_to IS NULL
INDEX(team_id, season_year), INDEX(player_id)
```

**`is_current`를 두지 않는다** (설계검토 A-3). `valid_to IS NULL`이 유일한 진실이고,
partial unique index가 "한 시즌에 현재 소속은 하나"를 강제한다.
같은 사실을 두 곳에 적으면 하나만 갱신됐을 때 조용히 어긋난다.

```
coaches(id, api_coach_id UNIQUE, name, birth_date NULL, nationality NULL, photo_url)

coach_tenures(id, coach_id, team_id, valid_from, valid_to NULL, observed_at)
CREATE UNIQUE INDEX ON coach_tenures(team_id) WHERE valid_to IS NULL
INDEX(coach_id)
```

실측에서 `/coachs?team=33`이 2건을 반환했다 — 감독 교체가 이력으로 온다.
`age`·`birth`·`firstname` 등이 `null`로 오는 경우가 많아 대부분 NULL 허용이다.

### 3-3. 경기

```
matches(
  id, api_fixture_id UNIQUE,
  competition_season_id, round_id,
  kickoff_at, status_short, status_long,
  elapsed NULL, extra_elapsed NULL,
  venue_id NULL, referee NULL,
  home_team_id, away_team_id,
  goals_home NULL, goals_away NULL,
  ht_home NULL, ht_away NULL,
  ft_home NULL, ft_away NULL,
  et_home NULL, et_away NULL,
  pen_home NULL, pen_away NULL,
  winner_team_id NULL,
  tie_id NULL, leg NULL,          -- FIRST | SECOND | SINGLE

  -- 수집 판정과 결손 (DATA_RULES 3장 세 번째 상태)
  detail_eligible,                -- 컷오프 규칙 결과. false면 상세를 부르지 않는다
  has_events NULL,                -- NULL = 아직 확인 안 함
  has_lineups NULL,
  has_team_stats NULL,
  has_player_stats NULL,
  detail_checked_at NULL,

  data_version,                   -- 실시간 이벤트 순서 보장
  as_of, updated_at
)
INDEX(competition_season_id, kickoff_at)
INDEX(round_id)
INDEX(home_team_id, kickoff_at)
INDEX(away_team_id, kickoff_at)
INDEX(kickoff_at)                 -- 홈 "오늘의 경기"
INDEX(status_short) WHERE status_short IN ('1H','HT','2H','ET','P')   -- 라이브 조회
INDEX(tie_id)
```

**`detail_eligible`이 컷오프를 물리적으로 표현한다.** 라운드 단위가 아니라 경기 단위인 이유는
실측 때문이다 — Copa del Rey `Round of 128`의 Maracena 0-5 Valencia는 1부 팀이 있는데도
팀통계·선수통계가 0이었다. 대회나 라운드로 뭉뚱그리면 이 케이스를 못 담는다.

`has_*`가 **3값 논리**다. `NULL`은 미확인, `false`는 확인했고 없음, `true`는 있음.
`false`인 경기는 다시 부르지 않는다. 단 **FT 후 24시간 이내는 `NULL`로 되돌려 재시도**한다 —
데이터가 늦게 채워지는 경우가 있다 (`INGESTION_STRATEGY.md` 4-2 ①).

```
knockout_ties(
  id, competition_season_id, round_id,
  home_team_id, away_team_id,
  first_leg_match_id NULL, second_leg_match_id NULL,
  aggregate_home NULL, aggregate_away NULL,
  winner_team_id NULL,
  win_reason NULL,       -- AGGREGATE | EXTRA_TIME | PENALTIES | WALKOVER
  status                 -- SCHEDULED | IN_PROGRESS | DECIDED
)
INDEX(competition_season_id, round_id)
```

**설계검토 A-5.** 합산 3-3에 승자만 있으면 화면이 근거를 못 보여준다.
원정 다득점은 2021년 폐지됐으므로 `AWAY_GOALS`를 넣지 않는다.
UCL 전용이던 것이 이제 **7개 대회에 적용된다**(컵 6 + UCL).

```
bracket_slots(
  id, competition_season_id, round_id, slot_index,
  state,                 -- CONFIRMED | PENDING_WINNER | UNDRAWN
  match_id NULL, tie_id NULL,
  source_slot_a_id NULL, source_slot_b_id NULL,
  placeholder_label NULL -- "Round of 32 승자" · "예선 통과"
)
UNIQUE(competition_season_id, round_id, slot_index)
INDEX(match_id)
```

**대진표 골격이다.** 컷오프 이후는 순수 녹아웃이라 구조가 정해져 있으므로
경기가 없어도 슬롯을 그릴 수 있다. 현재 시즌 골격은 직전 시즌 `competition_rounds`를
템플릿으로 만든다 — 5개년을 백필하므로 템플릿이 이미 생긴다.

`source_slot_*`는 자기 참조다. FK가 없으니 순환 참조 걱정 없이 만들 수 있는 대신,
사이클 검사를 애플리케이션이 해야 한다.

### 3-4. 경기 상세 — 원본

```
match_events(
  id, match_id, seq,
  minute, minute_extra NULL,
  team_id, player_id NULL, assist_player_id NULL,
  type,          -- Goal | Card | subst | Var  (실측 4종)
  detail, comments NULL
)
UNIQUE(match_id, seq)
INDEX(match_id, minute)
INDEX(player_id)
```

`player_id`가 `null`로 오는 경우가 실측에 있다(팀 단위 VAR 등). NULL 허용이다.

```
match_lineups(id, match_id, team_id, formation, coach_id NULL)
UNIQUE(match_id, team_id)

lineup_entries(
  id, match_id, team_id, player_id,
  jersey_number NULL, position NULL, grid NULL, is_starter
)
UNIQUE(match_id, player_id)
INDEX(match_id, team_id, is_starter)
INDEX(player_id)
```

`grid`는 벤치 선수에서 `null`이다(실측). 정상이다.

```
team_match_stats(
  id, match_id, team_id,
  shots_on_goal, shots_off_goal, total_shots, blocked_shots,
  shots_insidebox, shots_outsidebox,
  fouls, corner_kicks, offsides, ball_possession,
  yellow_cards, red_cards, goalkeeper_saves,
  total_passes, passes_accurate, passes_percentage,
  expected_goals NULL, goals_prevented NULL
)
UNIQUE(match_id, team_id)
INDEX(team_id)
```

API는 `{type, value}` 배열로 주지만 **컬럼으로 펼친다.** 18종이 고정이고 실측으로 확인됐으며,
EAV로 두면 팀 상세의 xG 추이 같은 질의가 매번 피벗이 된다.
지표가 늘면 컬럼을 추가한다 — 5년에 한 번 있을 일이다.

`expected_goals`·`goals_prevented`만 NULL 허용이다. 나머지는 `null → 0` 정규화 대상
(`DATA_RULES.md` 3-1).

```
player_match_stats(                  -- ★ 전체 용량의 30%
  id, match_id, player_id,
  team_id,                  -- 비정규화 (설계검토 A-2)
  competition_season_id,    -- 비정규화 (집계 성능)
  minutes, jersey_number NULL, position NULL,
  rating NULL, is_captain, is_substitute,
  shots_total, shots_on,
  goals_total, goals_conceded, assists, saves,
  passes_total, passes_key, passes_accuracy,
  tackles_total, blocks, interceptions,
  duels_total, duels_won,
  dribbles_attempts, dribbles_success, dribbles_past,
  fouls_drawn, fouls_committed,
  yellow_cards, red_cards,
  penalty_won, penalty_committed, penalty_scored, penalty_missed, penalty_saved,
  offsides
)
UNIQUE(match_id, player_id)
INDEX(player_id, competition_season_id)
INDEX(competition_season_id, team_id)
INDEX(match_id)
```

**`team_id`를 직접 저장하는 것이 설계검토 A-2의 핵심이다.**
`squad_entries.valid_from`은 실제 이적일이 아니라 수집일이라 최대 7일 오차가 있다.
그 값으로 경기를 팀에 귀속시키면 이적 전후 경기가 엉뚱한 팀에 붙는다.
API 응답이 "그 경기에서 어느 팀으로 뛰었는지"를 주므로 그대로 저장한다.

`rating`은 **절대 0으로 바꾸지 않는다.** 평점 0점과 평점 없음은 다르고,
0으로 바꾸면 정렬에서 최하위로 올라온다.

API 오타는 여기서 고친다 — `penalty.commited` → `penalty_committed`.

### 3-5. 파생·집계

```
standings(
  id, competition_season_id, team_id,
  group_name NULL, stage NULL,
  rank, points, played, win, draw, lose,
  goals_for, goals_against, goal_diff,
  home_played, home_win, home_draw, home_lose, home_gf, home_ga,
  away_played, away_win, away_draw, away_lose, away_gf, away_ga,
  form NULL, description NULL, status NULL,
  as_of, updated_at
)
UNIQUE(competition_season_id, team_id, group_name)
INDEX(competition_season_id, rank)
```

`description`·`status`가 `null`로 오는 것을 실측에서 확인했다. 구역 표기가 없는 대회가 있다.
**컵에는 이 테이블에 행이 생기지 않는다** — 전 컵 `standings: false`다.

```
player_season_stats(
  id, player_id, team_id, competition_season_id,
  appearances, lineups_count, minutes,
  goals, assists, yellow_cards, yellowred_cards, red_cards,
  rating_avg NULL, ... ,
  source,            -- AGGREGATED | API
  as_of
)
UNIQUE(player_id, team_id, competition_season_id)
INDEX(competition_season_id, goals DESC)
INDEX(player_id)
```

`source`가 원칙 ①의 장치다. 자체 집계인지 API 공식값인지 구분해야
"화면 숫자가 API와 다르다"는 문의를 추적할 수 있다.

```
team_season_stats(
  id, competition_season_id, team_id,
  form NULL,
  played_home, played_away, played_total,
  wins_*, draws_*, loses_*, goals_for_*, goals_against_*,
  biggest_win_home NULL, biggest_win_away NULL,
  biggest_lose_home NULL, biggest_lose_away NULL,
  clean_sheet_*, failed_to_score_*,
  penalty_scored, penalty_missed,
  formations JSON,      -- 포메이션별 출전 횟수
  cards JSON,           -- 시간대별 분포
  as_of
)
UNIQUE(competition_season_id, team_id)
```

`formations`와 `cards`만 JSON이다. 시간대 구간(`0-15` ~ `106-120`)이 8개 × 2종 × 2속성
= 32컬럼인데 전부 `null`로 오는 경우가 실측에서 많았고, 화면에서는 통째로 그려진다.
**질의 대상이 아니라 표시 대상**이므로 JSON이 맞다.

```
top_rankings(
  id, competition_season_id, category, rank,
  player_id, team_id, value, as_of
)
UNIQUE(competition_season_id, category, rank)
```

`category`: `SCORERS | ASSISTS | YELLOW_CARDS | RED_CARDS`.
전용 엔드포인트가 대회당 1콜이므로 `player_season_stats`에서 뽑지 않고 따로 저장한다
(원칙 ①의 예외 — API 공식 순위가 우리 집계보다 권위 있다).

### 3-6. 운영

```
injuries(id, competition_season_id, player_id, team_id, match_id NULL,
         type, reason, fixture_date, as_of)
UNIQUE(player_id, competition_season_id, fixture_date)
INDEX(team_id), INDEX(match_id)

backfill_jobs(id, competition_season_id UNIQUE, phase, cursor_match_id NULL,
              total, done, failed, started_at, updated_at, last_error NULL)

ingestion_runs(id, layer, competition_season_id NULL, started_at, finished_at NULL,
               status, calls_used, error NULL)
INDEX(layer, started_at)

api_quota_snapshots(id, captured_at, calls_used, limit_day, plan, expires_on)
```

`api_quota_snapshots`는 `/status` 응답을 적재한다.
`INGESTION_STRATEGY.md` 3-5의 경고선(6,000콜) 판단과 구독 만료 감시가 여기서 나온다.

### 3-7. 다국어

```
localized_names(
  id, entity_type, entity_id, locale,
  name, short_name NULL,
  source                -- MANUAL | API | AUTO
)
UNIQUE(entity_type, entity_id, locale)
INDEX(entity_type, locale)
```

`entity_type`: `TEAM | PLAYER | COMPETITION | ROUND | VENUE`

**`ROUND`가 새로 들어간다.** `1/128-finals`·`Extra Preliminary Round`를 한국어로 옮겨야 하고,
대회마다 체계가 다르다. 지금 프론트의 `PLAYER_NAMES` 하드코딩을 이 테이블로 옮긴다.

컵 컷오프를 목록 단계에서 자른 덕에 팀은 700개가 아니라 **64개 규모**로 유지된다.

---

## 4. 검토 ① 접근 경로 분석 — 화면에서 인덱스까지

각 화면이 실제로 내는 질의를 역추적한다. **외래키가 없어 인덱스가 자동으로 생기지 않으므로
이 표가 인덱스 목록의 근거다.**

| 화면 (PRD) | 질의 | 사용 인덱스 | 비고 |
|---|---|---|---|
| 홈 — 오늘의 경기 | `matches WHERE kickoff_at BETWEEN … AND competition_season_id IN (…)` | `matches(kickoff_at)` | 실측 `/fixtures?date=`가 451건. 12대회로 좁힌다 |
| 홈 — 순위 사이드바 | `standings WHERE competition_season_id = ? ORDER BY rank LIMIT 6` | `standings(competition_season_id, rank)` | |
| 순위 `/standings` | 위와 같음, LIMIT 없음 | 같음 | 20행 |
| 경기 목록 `/matches` | `matches WHERE competition_season_id = ? AND kickoff_at … ORDER BY kickoff_at` | `matches(competition_season_id, kickoff_at)` | 필터가 대회+날짜라 복합 인덱스가 정확히 맞는다 |
| 경기 상세 — 헤더 | `matches WHERE api_fixture_id = ?` | UNIQUE | |
| 경기 상세 — 타임라인 | `match_events WHERE match_id = ? ORDER BY minute` | `match_events(match_id, minute)` | |
| 경기 상세 — 라인업 | `match_lineups`, `lineup_entries WHERE match_id = ?` | `lineup_entries(match_id, team_id, is_starter)` | |
| 경기 상세 — 통계 탭 | `team_match_stats WHERE match_id = ?` | UNIQUE(match_id, team_id) | `has_team_stats = false`면 질의하지 않는다 |
| 경기 상세 — 선수 평점 | `player_match_stats WHERE match_id = ?` | `player_match_stats(match_id)` | **FK 없으면 여기가 36만 행 풀스캔** |
| 대회 허브 | `competition_seasons` + `competition_rounds` | `competition_seasons(competition_id) WHERE is_current` | |
| 녹아웃 대진표 | `bracket_slots WHERE competition_season_id = ? ORDER BY round, slot_index` | UNIQUE(cs_id, round_id, slot_index) | 슬롯이 없으면 골격만 그린다 |
| 통계 랭킹 `/stats` | `top_rankings WHERE competition_season_id = ? AND category = ? ORDER BY rank` | UNIQUE(cs_id, category, rank) | 사전 계산돼 있어 조인 없음 |
| 팀 상세 — 요약 | `team_season_stats WHERE competition_season_id = ? AND team_id = ?` | UNIQUE | |
| 팀 상세 — 최근 경기 | `matches WHERE (home_team_id = ? OR away_team_id = ?) ORDER BY kickoff_at DESC LIMIT 5` | `matches(home_team_id, kickoff_at)` + `(away_team_id, kickoff_at)` | **OR는 두 인덱스를 각각 타야 한다.** UNION ALL로 쓰는 편이 안전 |
| 팀 상세 — 스쿼드 | `squad_entries WHERE team_id = ? AND season_year = ? AND valid_to IS NULL` | `squad_entries(team_id, season_year)` | |
| 선수 상세 — 시즌별 | `player_season_stats WHERE player_id = ?` | `player_season_stats(player_id)` | |
| 선수 상세 — 경기 로그 | `player_match_stats WHERE player_id = ? AND competition_season_id = ?` | `player_match_stats(player_id, competition_season_id)` | |
| 선수 상세 — 소속 이력 | `squad_entries WHERE player_id = ? ORDER BY valid_from` | `squad_entries(player_id)` | |

**여기서 나온 주의 두 개.**

1. **팀 최근 경기의 `OR`** — PostgreSQL이 두 인덱스를 BitmapOr로 합칠 수는 있지만
   정렬과 LIMIT이 붙으면 계획이 나빠진다. `UNION ALL` 후 정렬하거나,
   `team_id`를 담은 `match_participants(match_id, team_id, is_home)` 보조 테이블을 두는 안이 있다.
   **지금은 UNION ALL로 가고, 느리면 보조 테이블을 만든다.** (미결정 #2)
2. **`player_match_stats(match_id)`** — 경기 상세가 매번 타는 경로다.
   `UNIQUE(match_id, player_id)`가 선두 컬럼을 커버하므로 단일 인덱스는 생략 가능하지만,
   명시적으로 둔다. 규칙 2-2의 예외를 만들지 않는 편이 팀에 설명하기 쉽다.

---

## 5. 검토 ② CRUD 매트릭스 — 동시 쓰기 지점

수집 계층(`BACKEND_FEATURES.md` L0~L6)과 백필 Worker가 어느 테이블을 쓰는지 늘어놓으면
**같은 행을 두 경로가 건드리는 지점**이 드러난다.

| 테이블 | L0 | L1 | L2 | L3 | L4 | L5 | L6 | 백필 |
|---|---|---|---|---|---|---|---|---|
| competitions · seasons · competition_seasons | **C/U** | | | | | | U | C/U |
| competition_rounds | | | **C/U** | | | | U | C/U |
| teams · venues · competition_entries | **C/U** | U | | | | | | C/U |
| players | | **C/U** | | U | | U | U | C/U |
| squad_entries | | **C/U** | | | | | | C |
| coach_tenures | | **C/U** | | | | | | C |
| matches | | | **C/U** | U | **U** | **U** | U | C/U |
| match_events | | | | | **C/U** | U | | C |
| match_lineups · lineup_entries | | | | **C** | | U | U | C |
| team_match_stats · player_match_stats | | | | | | **C/U** | U | C |
| standings | | | | | U | **U** | U | C/U |
| player_season_stats · team_season_stats | | | | | | U | **U** | C/U |
| top_rankings | | | | | | | **U** | C/U |
| injuries | | **C/U** | | | | | U | C |

**충돌 지점 세 곳이 보인다.**

**① `matches` — L4 · L5 · 백필이 동시에 쓴다.**
라이브 폴링이 스코어를 갱신하는 중에 백필이 과거 시즌을 넣는 건 다른 행이라 안전하다.
문제는 **L4와 L5**다. FT 감지 직후 폴링이 한 번 더 돌면 `status`를 덮어쓸 수 있다.
→ `data_version`을 조건부 갱신에 쓴다. `WHERE data_version < ?`로 역행 갱신을 막는다.

**② `players` — L1 · L3 · L5 · 백필이 만든다.**
라인업과 경기 통계에 스쿼드에 없는 선수가 나온다(2-4). 네 경로가 같은 선수를 동시에
`INSERT`할 수 있다. → `api_player_id` UNIQUE + `ON CONFLICT DO NOTHING`.
**Prisma `upsert()`가 항상 `ON CONFLICT`로 컴파일되지는 않는다** (설계검토 B-2).
쿼리 로그로 확인하고, 아니면 `$executeRaw`를 쓴다. 동시 호출 통합 테스트를 같은 PR에 넣는다.

**③ `squad_entries` — L1과 백필이 겹치면 이중 이력이 생긴다.**
백필이 현재 시즌 스쿼드를 넣는 동안 주간 diff가 돌면 같은 선수에 두 행이 열린다.
partial unique index가 막아주지만 그건 **에러로 막는 것**이라 diff가 실패한다.
→ 백필 진행 중에는 해당 대회-시즌의 L1을 건너뛴다. `backfill_jobs`를 락으로 쓴다.

### 5-1. 멱등성 키 정리

| 테이블 | 멱등 키 | 재실행 시 |
|---|---|---|
| competitions · teams · players · venues · coaches | `api_*_id` | UPDATE |
| competition_seasons | `(competition_id, season_id)` | UPDATE |
| competition_rounds | `(competition_season_id, name)` | UPDATE |
| matches | `api_fixture_id` | 조건부 UPDATE (`data_version`) |
| match_events | `(match_id, seq)` | UPDATE |
| lineup_entries | `(match_id, player_id)` | UPDATE |
| team_match_stats | `(match_id, team_id)` | UPDATE |
| player_match_stats | `(match_id, player_id)` | **UPDATE — 절대 증분 연산 금지** |
| standings | `(competition_season_id, team_id, group_name)` | UPDATE |
| player_season_stats | `(player_id, team_id, competition_season_id)` | 전체 재계산 후 덮어쓰기 |
| squad_entries | `(player_id, season_year) WHERE valid_to IS NULL` | diff 판정 후 INSERT 또는 close |

---

## 6. 검토 ③ 시간 모델 — SCD2와 이중 시간

### 6-1. 두 종류의 시간

| | 유효시간 (valid time) | 기록시간 (transaction time) |
|---|---|---|
| 뜻 | 현실에서 언제 참이었나 | 우리 DB가 언제 그렇게 알았나 |
| 컬럼 | `valid_from` · `valid_to` | `observed_at` |
| 예 | "선수가 이 팀 소속인 기간" | "우리가 이 소속을 수집한 날" |

**API-Football은 스쿼드 스냅샷만 준다.** 이력을 만드는 건 우리 몫이고,
그래서 `valid_from`은 **실제 이적일이 아니라 수집일**이다. 주 1회 수집이면 최대 7일 오차이고,
이적창 마감일에는 하루에 수십 건이 몰린다.

**이 구분이 흐려지면 통계가 엉뚱한 팀에 붙는다.** 그래서:

> `squad_entries`는 "현재 스쿼드 명단"을 보여주는 용도로만 쓰고,
> **집계의 근거로는 쓰지 않는다.** 경기의 팀 귀속은 `player_match_stats.team_id`가 결정한다.

이 문장이 설계검토 A-2의 결론이고, 이번 스키마에서 두 테이블이 분리된 이유다.

### 6-2. SCD2를 스쿼드·감독으로 한정한 이유

| 대상 | 이력 | 판단 |
|---|---|---|
| 스쿼드 소속 | **SCD2** | 화면이 요구한다(선수 소속 이력). 이적이 잦다 |
| 감독 | **SCD2** | 시즌 중 경질이 흔하다. 실측에서 한 팀에 2건 |
| 팀명·엠블럼 | 덮어쓰기 | 바뀌는 빈도가 낮고 과거 표기를 보여줄 화면이 없다 |
| 선수 프로필 | 덮어쓰기 | 같음 |
| 순위표 | 덮어쓰기 | 라운드별 스냅샷은 5시즌 × 6대회 × 38라운드 × 20팀 ≈ 23만 행(약 25MB). **500MB 제약에서 우선순위가 낮다** |
| 경기장 | 덮어쓰기 | |

순위표 스냅샷은 나중에 추가할 수 있다 — `standings`에 `round_id`를 넣고 UNIQUE를 확장하면
되므로 마이그레이션이 크지 않다. **지금 안 하는 것이지 못 하는 게 아니다.**

### 6-3. 임대 처리

`transfer_type`은 diff만으로는 알 수 없어 `UNKNOWN`으로 시작한다 (설계검토 A-4).
`/transfers`를 선수 상세 진입 시 지연 수집할 때 채워 넣는다.
`parent_team_id`는 임대일 때만 채운다.

**필드를 지금 만들어 두는 것이 요점이다.** 나중에 마이그레이션 없이 값만 채운다.

---

## 7. 검토 ④ 볼륨·카디널리티

5시즌 · 12대회 · 컵 컷오프 적용 기준. 경기 상세는 리그 1,941 + 컵 222 = **2,163경기/시즌**.

| 테이블 | 행 수 | 추정 크기 | 증가 요인 |
|---|---|---|---|
| `player_match_stats` | **324,000** | **81 MB** | 경기 × 30명 |
| `lineup_entries` | 432,000 | 35 MB | 경기 × 40명(벤치 포함) |
| `match_events` | 162,000 | 19 MB | 경기 × 15 |
| `player_season_stats` | ~30,000 | 9 MB | 선수 × 팀 × 대회시즌 |
| `players` | ~15,000 | 8 MB | 5시즌 누적, 이적 포함 |
| `team_match_stats` | 21,600 | 5 MB | 경기 × 2 |
| `matches` | **12,410** | 4 MB | 리그 9,705 + 컵 목록 2,705 |
| `squad_entries` | ~16,500 | 2 MB | |
| `injuries` | ~12,000 | 2 MB | |
| `bracket_slots` | ~1,500 | 0.2 MB | 컵 7개 × 5시즌 × 15슬롯 |
| `standings` | 600 | 0.1 MB | 리그만 |
| 나머지 | ~5,000 | 1 MB | |
| **데이터 합계** | | **~166 MB** | |
| **+ 인덱스 60%** | | **~266 MB** | 500MB의 **53%** |

**FK를 안 쓰면 인덱스가 줄어들 것 같지만 그렇지 않다.** 2-2에서 관계 컬럼마다
인덱스를 명시하기로 했으므로 총량은 비슷하다. 다만 제약 검사 비용이 없어
**쓰기는 빨라진다** — 45,000콜 백필에서 이건 실질적인 이득이다.

`matches` 행 수가 12,410인데 상세는 10,815경기 분량만 있다. 차액 1,595는
컵 목록만 받은 경기(`detail_eligible = false`)다.

---

## 8. 검토 ⑤ 널 가능성 매트릭스

`DATA_RULES.md` 3장의 세 상태를 컬럼별로 못박는다.

| 상태 | 표현 | 예 |
|---|---|---|
| 발생하지 않음 | `0` (NOT NULL) | 카드·오프사이드·슈팅·파울·태클·듀얼·드리블·페널티 |
| 측정되지 않음 | `NULL` 허용 | `rating` · `expected_goals` · `goals_prevented` · `position` · `jersey_number` |
| **데이터 미제공** | **`matches.has_* = false`** | FA컵 예선, Copa del Rey 1/128 |

### 8-1. NOT NULL + DEFAULT 0 으로 정규화하는 컬럼

`player_match_stats`의 `shots_*` · `goals_total` · `assists` · `saves` · `passes_*`(accuracy 제외) ·
`tackles_*` · `blocks` · `interceptions` · `duels_*` · `dribbles_*` · `fouls_*` ·
`yellow_cards` · `red_cards` · `penalty_*` · `offsides`

`team_match_stats`의 `expected_goals` · `goals_prevented`를 뺀 16개 전부.

정규화 계층이 API 응답의 `null`을 0으로 바꾼 뒤 저장한다.
**DB DEFAULT에 의존하지 않는다** — 명시적으로 0을 써야 "정규화가 돌았다"가 보장된다.

### 8-2. NULL을 유지하는 컬럼

| 컬럼 | 이유 |
|---|---|
| `player_match_stats.rating` | **평점 0점과 평점 없음은 다르다.** 0으로 바꾸면 정렬 최하위로 올라온다 |
| `player_match_stats.passes_accuracy` | 패스 0회면 정확도가 정의되지 않는다 |
| `team_match_stats.expected_goals` · `goals_prevented` | 측정 안 된 경기가 있다 |
| `matches.goals_*` · `ht_*` · `ft_*` | 미시작 경기 |
| `matches.et_*` · `pen_*` | 연장·승부차기가 없었으면 NULL. **0이 아니다** |
| `matches.referee` · `venue_id` · `elapsed` | 실측에서 자주 `null` |
| `standings.description` · `status` | 구역 표기가 없는 대회 |
| `lineup_entries.grid` | 벤치 선수 |
| `match_events.player_id` · `assist_player_id` | 팀 단위 이벤트 |
| `coaches.birth_date` · `nationality` 등 | 실측에서 대부분 `null` |

**`et_*`와 `pen_*`을 0으로 채우면 안 된다.** "연장 0-0"과 "연장 없음"이 구분되지 않아
`win_reason` 판정이 틀린다.

### 8-3. 3값 논리를 쓰는 컬럼

`matches.has_events` · `has_lineups` · `has_team_stats` · `has_player_stats`

`NULL`=미확인 · `false`=확인했고 없음 · `true`=있음.
`false`는 재수집하지 않는 근거이므로 **함부로 쓰면 데이터가 영영 안 채워진다.**
FT 후 24시간 이내는 `NULL`로 되돌린다.

---

## 9. 검토 ⑥ 비정규화 정당화표

원칙 ⑤에 따라 비정규화한 컬럼마다 이유와 갱신 책임자를 적는다.

| 컬럼 | 정규화하면 | 비정규화 이유 | 갱신 책임 | 어긋날 위험 |
|---|---|---|---|---|
| `player_match_stats.team_id` | `squad_entries` 조인 | **`squad_entries`의 날짜가 부정확하다.** 이적 전후 경기가 엉뚱한 팀에 붙는다 (A-2) | L5 수집 시 API 응답 그대로 | 없음 — API가 원본 |
| `player_match_stats.competition_season_id` | `matches` 조인 | 선수 상세의 시즌별 집계가 매번 조인이 된다. 32만 행 | L5 수집 시 `matches`에서 복사 | 경기의 대회가 바뀌면 어긋남. 사실상 불변 |
| `matches.round_id` | 라운드 문자열 | 정렬·컷오프 판정에 쓴다 | L2 수집 시 | 라운드명 변경 시. `competition_rounds` upsert가 흡수 |
| `matches.goals_*` | `match_events` 집계 | 목록 화면이 스코어만 필요하다. 이벤트 조인은 과하다 | L4·L5. API 값이 원본 | 이벤트와 불일치 가능 → L6 보정에서 대조 |
| `standings.*` | `matches` 집계 | **API 공식 순위가 우리 계산보다 권위 있다.** 승점 삭감 등 규칙이 반영돼 있다 | L5·L6가 API 값으로 덮어씀 | 없음 — 자체 계산하지 않는다 |
| `top_rankings.*` | `player_season_stats` 정렬 | 전용 엔드포인트가 대회당 1콜이고 공식값이다 | L6 주 1회 | 자체 집계와 다를 수 있음 → `source`로 구분 |
| `team_season_stats.formations` (JSON) | 별도 테이블 | 표시 전용이고 질의 대상이 아니다 | L6 주 1회 | 없음 |

**`standings`를 자체 계산하지 않는 것**이 이 표에서 가장 중요한 결정이다.
승점 삭감·상대 전적 우선 등 리그별 규칙을 우리가 재현하면 반드시 틀린다.
API 값을 저장하고 `as_of`를 함께 보여준다.

---

## 10. 검토 ⑦ 삭제·보관 시나리오

500MB 한계선에 닿았을 때 무엇을 지우는가. **FK가 없으므로 순서가 곧 안전장치다** (2-5).

### 1단계 — 과거 시즌 벤치 명단 (약 12 MB)

```sql
DELETE FROM lineup_entries
WHERE is_starter = false
  AND match_id IN (SELECT id FROM matches WHERE competition_season_id IN (:old_seasons));
```

잃는 것: 과거 시즌 경기의 벤치 명단. 선발과 교체 투입은 `match_events`에 남는다.
**되돌리려면** 해당 경기의 `/fixtures/lineups`를 다시 부른다 — 경기당 1콜.

### 2단계 — 가장 오래된 시즌의 경기별 선수 기록 (약 16 MB/시즌)

```sql
-- 반드시 player_season_stats 를 먼저 확정한 뒤에 실행한다
DELETE FROM player_match_stats WHERE competition_season_id IN (:oldest_season);
UPDATE competition_seasons SET detail_retention = 'AGGREGATED_ONLY' WHERE id IN (:oldest_season);
```

**이건 설계 원칙 ①을 깬다.** 원본이 사라지면 집계를 다시 계산할 수 없다.
`competition_seasons.detail_retention`으로 그 사실을 기록해 화면이
"이 시즌은 경기별 기록이 없습니다"를 말할 수 있게 한다.

**마지막 수단이다.** 되돌리려면 그 시즌 경기 수 × 1콜을 다시 쓴다(약 2,000콜).

### 3단계 — Pro 전환

$25/월. 8GB에 일 백업 7일치가 붙는다.

### 삭제하지 않는 것

`matches` · `standings` · `players` · `squad_entries`는 지우지 않는다.
용량이 작고, 지우면 화면 전체가 깨진다.

---

## 11. 마이그레이션 순서

Prisma migration을 이 순서로 쪼갠다. 각 단계가 독립적으로 배포 가능해야 한다.

| # | 이름 | 내용 |
|---|---|---|
| 1 | `init_reference` | competitions · seasons · competition_seasons · competition_rounds · venues · teams · competition_entries · external_ids |
| 2 | `init_people` | players · squad_entries · coaches · coach_tenures |
| 3 | `init_matches` | matches · knockout_ties · bracket_slots |
| 4 | `init_match_details` | match_events · match_lineups · lineup_entries · team_match_stats · player_match_stats |
| 5 | `init_aggregates` | standings · player_season_stats · team_season_stats · top_rankings · injuries |
| 6 | `init_ops` | backfill_jobs · ingestion_runs · api_quota_snapshots · localized_names |

1~2가 Phase 1의 첫 코드다 (`NEXT_STEPS.md` 3-1). 3~4는 Phase 2, 5~6은 병행 가능하다.

**partial unique index는 Prisma가 스키마 파일로 표현하지 못한다.**
`competition_seasons(competition_id) WHERE is_current`,
`squad_entries(player_id, season_year) WHERE valid_to IS NULL`,
`coach_tenures(team_id) WHERE valid_to IS NULL` 세 개는
마이그레이션 SQL에 **직접 써 넣는다.** 잊으면 중복이 조용히 들어온다.

---

## 12. 미결정

| # | 항목 | 결정 시점 |
|---|---|---|
| 1 | ID 타입 — `Int` vs `BigInt` | `player_match_stats`가 32만 행이라 `Int`로 충분하다. 10시즌으로 늘릴 계획이 생기면 재검토 |
| 2 | 팀 최근 경기 질의 — `UNION ALL` vs `match_participants` 보조 테이블 | Phase 2에서 실측 후 |
| 3 | 순위표 라운드별 스냅샷 | 500MB 여유가 확인되면. `standings`에 `round_id` 추가 + UNIQUE 확장 |
| 4 | `injuries`의 멱등 키 | `/injuries` 응답에 안정적인 식별자가 없다. `(player_id, cs_id, fixture_date)`로 시작하고 중복이 생기면 조정 |
| 5 | `localized_names`를 테이블로 둘지 JSON 파일로 둘지 | i18n 문서에서. 팀 64개 규모면 파일도 가능하다 |
| 6 | Prisma `upsert()`가 `ON CONFLICT`로 컴파일되는지 | **Phase 0 스켈레톤에서 쿼리 로그로 확인** (설계검토 B-2). 아니면 `$executeRaw` |

---

## 부록 — 이 문서가 적용한 검토 방법

| 방법 | 어디에 | 무엇을 찾았나 |
|---|---|---|
| 접근 경로 분석 | 4장 | 팀 최근 경기의 `OR` 문제, 인덱스 목록의 근거 |
| CRUD 매트릭스 | 5장 | `matches`·`players`·`squad_entries` 동시 쓰기 충돌 3건 |
| 멱등성 키 정리 | 5-1 | 테이블별 재실행 규칙 |
| SCD2 · 이중 시간 모델 | 6장 | `squad_entries`를 집계 근거로 쓰면 안 되는 구조적 이유 |
| 원본/파생 분리 | 1·9장 | `standings`를 자체 계산하지 않는 결정 |
| 볼륨·카디널리티 | 7장 | 266MB(53%). `player_match_stats`가 절반 |
| 널 가능성 매트릭스 | 8장 | `et_*`·`pen_*`을 0으로 채우면 `win_reason`이 틀림 |
| 비정규화 정당화표 | 9장 | 컬럼 7개, 갱신 책임자 명시 |
| 삭제·보관 시나리오 | 10장 | FK 없는 환경의 삭제 순서 |
