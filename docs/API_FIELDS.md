# API-Football 제공 데이터 — 실측 결과

> 측정: 2026-09-03 · `scripts/probe-api-football.mjs` 실행 결과
> 대상: Premier League(39) · 시즌 2026 · 경기 #1557377 (Aston Villa 0-1 Arsenal)
> **이 문서는 추정이 아니라 실제 응답에서 확인한 값이다.**

---

## ⚠ 구독 만료 — 2026-09-22

측정 시점 기준 **19일 남음.** Phase 1 진행 중에 만료된다.
갱신 일정을 확인하지 않으면 수집이 어느 날 401로 멈춘다.

| 항목 | 값 |
|---|---|
| 플랜 | Pro |
| 일 한도 | 7,500 |
| 만료 | 2026-09-22 |

## B-1 해소 — 26-27 시즌 접근 확인

`BACKEND_DESIGN_REVIEW.md` B-1이 요구한 실호출 검증을 완료했다.

커버리지가 전부 `true`다.

| 항목 | 제공 |
|---|---|
| 라인업 · 경기 통계 · 선수 통계 | ✅ |
| 순위 · 선수 · 부상 · 예측 | ✅ |

팀 20개, 로고 URL(`media.api-sports.io/football/teams/{id}.png`), 경기장 정보(이름·수용인원)
모두 `/teams` 한 번으로 확인했다.

---

## 1. 팀 경기 통계 `/fixtures/statistics` — 18개

| 분류 | 항목 |
|---|---|
| 슈팅 | Shots on Goal · Shots off Goal · Total Shots · Blocked Shots · Shots insidebox · Shots outsidebox |
| 패스 | Total passes · Passes accurate · Passes % |
| 점유 | Ball Possession |
| 세트피스 | Corner Kicks · Offsides |
| 파울 | Fouls · Yellow Cards · Red Cards |
| 수비 | Goalkeeper Saves |
| **고급** | **expected_goals** · **goals_prevented** |

- `expected_goals` — 팀 단위 xG. 실측값 `0.33`
- `goals_prevented` — 골키퍼가 막아낸 기대실점. 실측값 `0.00`

## 2. 선수별 경기 통계 `/fixtures/players` — 11개 그룹

```
games      minutes · number · position · rating · captain · substitute
shots      total · on
goals      total · conceded · assists · saves
passes     total · key · accuracy
tackles    total · blocks · interceptions
duels      total · won
dribbles   attempts · success · past
fouls      drawn · committed
cards      yellow · red
penalty    won · commited · scored · missed · saved
offsides   (단일 값)
```

⚠ `penalty.commited`는 API의 오타다. 그대로 온다. 정규화할 때 `committed`로 바꾼다.

## 3. 선수 시즌 통계 `/players`

경기 통계와 **같은 구조**에 다음이 추가된다.

```
games        + appearences · lineups          (appearances 아님 — API 오타)
substitutes  in · out · bench
cards        + yellowred                      (경기 통계에는 없음)
team/league  id · name · logo · country · flag · season
```

페이지네이션됨 — EPL 한 시즌이 23페이지.

---

## 3-1. 추가 확인된 엔드포인트 (2026-09-03 2차 probe)

수집 계획에 없던 것들을 점검했다. **하나 빼고 전부 사용 가능하다.**

| 엔드포인트 | 결과 | 쓸 곳 |
|---|---|---|
| `/players/topscorers` | ✅ 20건 | 득점 랭킹 — **대회당 1콜** |
| `/players/topassists` | ✅ 20건 | 도움 랭킹 — 대회당 1콜 |
| `/players/topyellowcards` | ✅ 20건 | 카드 랭킹 — 대회당 1콜 |
| `/teams/statistics` | ✅ | 팀 상세 화면. 아래 참조 |
| `/fixtures/rounds` | ✅ 38건 | 라운드 목록. 문자열 파싱 대체 |
| `/fixtures/headtohead` | ✅ 5건 | H2H. 자체 계산 대체 |
| `/sidelined` | ⚠ | `league`·`season` 파라미터를 받지 않는다. **엔드포인트가 없는 게 아니라 호출 형태가 다르다** — `player`·`coach` 기준일 가능성. 필요해지면 재확인 |

### 랭킹 전용 엔드포인트 — 콜 95% 절감

원래 계획은 `/players`를 23페이지 전수 수집해(~400콜) 자체 집계하는 것이었다.
전용 엔드포인트를 쓰면 **6대회 × 3종 = 18콜**이다.

전체 선수 통계는 **선수 상세 화면용으로만** 남긴다.

### `/teams/statistics` — 팀 상세를 공짜로 채운다

최상위 키 11개가 온다.

```
league · team · form · fixtures · goals · biggest
clean_sheet · failed_to_score · penalty · lineups · cards
```

- `form` — 최근 경기 결과 문자열
- `fixtures` — 홈/원정 승·무·패
- `biggest` — 최다 점수차 승리·패배
- `clean_sheet` · `failed_to_score` — 무실점·무득점 경기 수
- `lineups` — **포메이션별 출전 횟수**
- `cards` — 시간대별 카드 분포로 추정

팀 상세 화면 대부분을 자체 집계 없이 채울 수 있다.
`lineups`는 "이 팀이 4-3-3을 몇 번 썼나"라서 다른 사이트에 흔치 않은 소재다.

---

## 4. 없는 것

| 항목 | 상태 | 대응 |
|---|---|---|
| **선수 단위 xG** | ❌ 없음 | 팀 xG만 가능. "선수 시즌 xG" 화면은 만들 수 없다 |
| 기대 어시스트(xA) | ❌ 없음 | — |
| 슈팅 위치 좌표 | ❌ 없음 | 자체 xG 계산 불가 |
| 이적 이력 | △ `/transfers` 별도 | 선수당 1콜 — 비쌈 |

**결론:** xG는 **경기 단위 팀 지표**로만 쓴다. 경기 상세 화면에는 넣을 수 있고,
선수 상세나 통계 랭킹에는 넣을 수 없다.

---

## 5. ⚠ null 처리 규칙 — 정규화 계층에서 반드시 적용

**0이어야 할 값이 `null`로 온다.** 실측에서 확인됨.

```
Red Cards = null        ← 퇴장 0장인데 null
offsides  = null        ← 선수 통계
```

그대로 저장하면 화면에 `-`가 뜨거나 합계 계산이 깨진다.
**항목별로 다르게 처리한다.**

| 처리 | 대상 | 이유 |
|---|---|---|
| `null → 0` | 카드 · 오프사이드 · 슈팅 · 파울 · 태클 · 듀얼 · 드리블 · 페널티 | 발생하지 않았다는 뜻 |
| `null` 유지 | rating · expected_goals · goals_prevented | 측정되지 않았을 수 있다 — 0과 다르다 |
| `null` 유지 | position · number | 값이 없는 것 |

⚠ **rating을 0으로 바꾸면 안 된다.** 평점 0점과 평점 없음은 다르다.
순위 정렬에서 평점 0인 선수가 최하위로 올라간다.

---

## 6. 화면 설계에 주는 영향

| 화면 | 넣을 수 있는 것 | 못 넣는 것 |
|---|---|---|
| 경기 상세 · 통계 탭 | xG · goals_prevented 포함 18개 전체 | — |
| 선수 상세 | 평점 · 키패스 · 듀얼 승률 · 드리블 성공률 · 인터셉트 | 선수 xG |
| 통계 랭킹 | 득점 · 도움 · 카드 · 평점 | xG 랭킹 |
| 팀 상세 | 경기별 xG 추이 | — |

**xG를 쓸 수 있게 된 것이 이번 확인의 가장 큰 소득이다.**
경기 상세에서 "슈팅 7개, xG 0.33"을 나란히 보여주면
"많이 쐈지만 좋은 기회는 아니었다"가 읽힌다 — 일반 사이트에 흔치 않다.

---

## 7. 다중 소스 — 지금은 단일, 구조는 열어둔다 (2026-09-03 개정)

선수 단위 xG가 없어 다른 제공자를 검토했다.
**결론: Phase 1은 API-Football 단일 소스로 가되, 다중 소스를 받을 구조는 지금 만들어둔다.**

### 7-1. 검토한 제공자

| 제공자 | 고급 통계 | 현재 시즌 | 판정 |
|---|---|---|---|
| Opta (Stats Perform) | 최상급 | ✅ | ❌ **기업 전용** — 공식 FAQ에 "designed for organisations rather than individual use". 공개 가격 없음 |
| StatsBomb Open Data | 슈팅 좌표 · xG · 360 | ❌ 과거만 | △ 26-27 시즌 없음. 별도 실험용 (출처 표기 조건) |
| Understat | xG · xA | ✅ | △ 공식 API 없음 — 스크래핑. 안정성 위험 |
| FBref | 상세 지표 다수 | ✅ | ❌ API 없음, 스크래핑 차단 적극적 |
| **Sportmonks** | xG 포함 | ✅ | **○ 유료. 2차 소스 도입 시 1순위** |
| football-data.org | 기본만 | ✅ | ❌ xG 없음 |

### 7-2. 다중 소스는 나쁜 게 아니다 — 규칙이 필요할 뿐

각 소스의 강점만 뽑아 정규화하는 것은 표준적인 데이터 파이프라인 패턴이다.
`BACKEND_GUIDE.md`가 이미 **"외부 API 응답 DTO와 내부 DTO를 분리한다"** 고 정해뒀으므로
구조적으로 받을 자리도 있다.

문제가 되는 건 **같은 지표를 두 소스가 줄 때**뿐이다. 그래서 규칙 하나를 둔다.

> **한 지표는 한 소스에서만 가져온다.**

필드 단위로 소스를 못 박으면 값이 어긋날 일이 없다.

| 지표 | 소스 |
|---|---|
| 경기 · 순위 · 라인업 · 선수 기본 통계 | API-Football |
| 팀 xG · goals_prevented | API-Football |
| 선수 xG · xA | (도입 시) 2차 소스 |

그리고 화면에 **"이 xG는 ○○ 기준"** 이라고 출처를 밝히면,
"데이터 기준 시각과 근거를 함께 제공한다"는 원칙에 오히려 부합한다.

### 7-3. 실제 비용은 ID 매핑이다

소스마다 식별자가 다르다. Understat은 팀을 이름으로, API-Football은 `id 33`으로 준다.
매핑 테이블을 수기로 만들어야 하고, 승격·강등이 있으면 매년 손봐야 한다.
100팀 규모면 감당 가능하지만 공짜는 아니다.

### 7-4. 지금 해둘 것 — `external_ids` 테이블 ★

`api_team_id` 단일 컬럼(1-1)을 **별도 테이블로 분리한다.**

```
external_ids(
  id,
  entity_type,    -- TEAM | PLAYER | COMPETITION
  entity_id FK,
  source,         -- API_FOOTBALL | SPORTMONKS | ...
  external_id,
  UNIQUE(source, entity_type, external_id)
)
```

지금은 `source`에 `API_FOOTBALL` 하나만 들어간다. **비용이 사실상 0인데**,
2차 소스를 붙일 때 스키마 마이그레이션이 아니라 행 추가로 끝난다.
컬럼 하나로 두면 그 시점에 테이블을 새로 만들고 전부 옮겨야 한다.

푸시 구독의 `owner_key`(PRD 8-1)와 같은 접근이다 — 지금 공짜인 확장 지점을 남긴다.

### 7-5. 순서

**1차 소스로 도메인을 세운 뒤 2차를 얹는다.**

Phase 1에서 API-Football만으로 팀·선수·스쿼드를 채우고 정규화 계층이 실제로 도는 것을
확인한다. 그 다음에 2차 소스를 붙이면 "이미 도는 파이프라인에 소스 추가"라 훨씬 쉽다.
백엔드 코드가 0줄인 상태에서 다중 소스부터 설계하면 둘 다 끝나지 않는다.

### 7-6. 2차 소스 도입 판단 시점

Phase 2 완료 후. 그때 다음이 참이면 도입한다.

- 선수 단위 xG·xA가 화면에서 실제로 필요하다고 판단됨
- 1차 소스 수집이 안정적으로 돌고 있음
- `external_ids` 매핑을 채울 여력이 있음

---

## 재확인 방법

```bash
cd C:\Dev\pitchlog-league
API_FOOTBALL_KEY=키 node scripts/probe-api-football.mjs

# 전체 키 경로까지 보려면
DUMP_KEYS=1 API_FOOTBALL_KEY=키 node scripts/probe-api-football.mjs
```
