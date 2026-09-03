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

## 재확인 방법

```bash
cd C:\Dev\pitchlog-league
API_FOOTBALL_KEY=키 node scripts/probe-api-football.mjs

# 전체 키 경로까지 보려면
DUMP_KEYS=1 API_FOOTBALL_KEY=키 node scripts/probe-api-football.mjs
```
