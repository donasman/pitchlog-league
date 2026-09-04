# 컵 대회 재조사 — 실제 경기 데이터 기준

> 생성: 2026-09-04 · `scripts/probe-cups.mjs` · 기준 시즌 2025 · 59콜
> 1차 조사(시즌 2026)에서 FA Cup 이 껍데기로, 코파 델 레이·쿠프 드 프랑스가 없음으로 나온 것을
> **완료된 시즌**으로 다시 확인한 결과다. 커버리지 플래그와 실제 응답을 둘 다 적는다.

## 주요 컵 — 실제 경기 데이터

| 대회 | ID | 시즌 경기 | 표본 | 라운드 | 이벤트 | 라인업 | 팀통계 | 선수통계 |
|---|---|---|---|---|---|---|---|---|
| FA Cup | `45` | 872 | 초반 라운드 | Extra Preliminary Round | 0 | 0 | 0 | 0 |
| FA Cup | `45` | 872 | 후반 라운드 | Final | 10 | 2 | 2 | 2 |
| League Cup | `48` | 93 | 초반 라운드 | Preliminary Round | 16 | 2 | 2 | 2 |
| League Cup | `48` | 93 | 후반 라운드 | Final | 11 | 2 | 2 | 2 |
| Copa del Rey | `143` | 137 | 초반 라운드 | 1/128-finals | 3 | 0 | 0 | 0 |
| Copa del Rey | `143` | 137 | 후반 라운드 | Semi-finals | 19 | 2 | 2 | 2 |
| DFB Pokal | `81` | 63 | 초반 라운드 | 1st Round | 21 | 2 | 2 | 2 |
| DFB Pokal | `81` | 63 | 후반 라운드 | Final | 14 | 2 | 2 | 2 |
| Coppa Italia | `137` | 45 | 초반 라운드 | Preliminary Round | 14 | 2 | 0 | 0 |
| Coppa Italia | `137` | 45 | 후반 라운드 | Final | 19 | 2 | 2 | 2 |
| Coupe de France | `66` | 201 | 초반 라운드 | 1/128-finals | 3 | 2 | 0 | 0 |
| Coupe de France | `66` | 201 | 후반 라운드 | Final | 16 | 2 | 2 | 2 |

> 라인업·팀통계·선수통계는 **2**가 정상이다 (양 팀). 0이면 그 라운드는 데이터가 없다.

## 국가별 컵 전량

### England — 11개

| ID | 대회 | 시즌 수 | 범위 | 2025 시즌 | 제공 항목 |
|---|---|---|---|---|---|
| `46` | EFL Trophy | 16 | 2011~2026 | ✅ | events, lineups, stats_fixture, stats_player, standings, players, top_scorers |
| `45` | FA Cup | 16 | 2011~2026 | ✅ | events, lineups, stats_fixture, stats_player, players, top_scorers |
| `47` | FA Trophy | 16 | 2011~2026 | ✅ | events, lineups, players, top_scorers |
| `48` | League Cup | 16 | 2011~2026 | ✅ | events, lineups, stats_fixture, stats_player, players, top_scorers, injuries |
| `528` | Community Shield | 15 | 2012~2026 | ✅ | events, lineups, stats_fixture, stats_player, players, top_scorers, injuries |
| `698` | FA Women's Cup | 7 | 2019~2025 | ✅ | events, lineups |
| `697` | WSL Cup | 7 | 2020~2026 | ✅ | events, lineups |
| `871` | Premier League Cup | 6 | 2021~2026 | ✅ | events, lineups, standings, players, top_scorers |
| `1068` | FA Youth Cup | 3 | 2023~2025 | ✅ | events, lineups |
| `1156` | National League Cup | 3 | 2024~2026 | ✅ | events, lineups, players, top_scorers |
| `670` | Community Shield Women | 1 | 2020~2020 | ❌ | events, lineups |

### Spain — 4개

| ID | 대회 | 시즌 수 | 범위 | 2025 시즌 | 제공 항목 |
|---|---|---|---|---|---|
| `556` | Super Cup | 11 | 2016~2026 | ✅ | events, lineups, stats_fixture, stats_player, players, top_scorers |
| `143` | Copa del Rey | 8 | 2018~2025 | ✅ | events, lineups, stats_fixture, stats_player, players, top_scorers |
| `735` | Copa Federacion | 7 | 2020~2026 | ✅ | events |
| `1058` | Supercopa Femenina | 4 | 2023~2026 | ✅ | events, lineups |

### Germany — 4개

| ID | 대회 | 시즌 수 | 범위 | 2025 시즌 | 제공 항목 |
|---|---|---|---|---|---|
| `529` | Super Cup | 16 | 2011~2026 | ✅ | events, lineups, stats_fixture, stats_player, players, top_scorers, injuries |
| `81` | DFB Pokal | 16 | 2011~2026 | ✅ | events, lineups, stats_fixture, stats_player, players, top_scorers, injuries |
| `715` | DFB Junioren Pokal | 7 | 2020~2026 | ✅ | events, lineups, players, top_scorers |
| `947` | DFB Pokal - Women | 5 | 2022~2026 | ✅ | events, lineups |

### Italy — 8개

| ID | 대회 | 시즌 수 | 범위 | 2025 시즌 | 제공 항목 |
|---|---|---|---|---|---|
| `547` | Super Cup | 11 | 2014~2025 | ✅ | events, lineups, stats_fixture, stats_player, players, top_scorers |
| `137` | Coppa Italia | 11 | 2016~2026 | ✅ | events, lineups, stats_fixture, stats_player, players, top_scorers |
| `704` | Coppa Italia Primavera | 7 | 2020~2026 | ✅ | events, lineups |
| `817` | Super Cup Primavera | 6 | 2020~2025 | ✅ | events |
| `891` | Coppa Italia Serie C | 6 | 2021~2026 | ✅ | events, lineups, players, top_scorers |
| `892` | Coppa Italia Serie D | 5 | 2021~2025 | ✅ | events, lineups, players, top_scorers |
| `1171` | Coppa Italia Women | 2 | 2024~2025 | ✅ | players, top_scorers |
| `1198` | Serie A Cup Women | 2 | 2025~2026 | ✅ | events, lineups |

### France — 3개

| ID | 대회 | 시즌 수 | 범위 | 2025 시즌 | 제공 항목 |
|---|---|---|---|---|---|
| `66` | Coupe de France | 15 | 2011~2025 | ✅ | events, lineups, stats_fixture, stats_player, players, top_scorers |
| `526` | Trophée des Champions | 15 | 2012~2026 | ✅ | events, lineups, stats_fixture, stats_player, players, top_scorers |
| `65` | Coupe de la Ligue | 9 | 2011~2019 | ❌ | events, lineups, stats_fixture, stats_player, players, top_scorers |
