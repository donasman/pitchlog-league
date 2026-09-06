# 컵 컷오프 기준 검증

> 생성: 2026-09-04 · `scripts/probe-cup-tiers.mjs` · 시즌 2025 · 100콜
> 검증 대상: **상세 수집 = (1부 팀 참가) OR (16강 이상)**
> 16강 판정은 라운드 이름이 아니라 **참가 팀 16팀 이하**로 한다. 이름은 대회마다 다르다.

## 수집량

| 대회 | 종료 | 1부끼리 | 1부vs하부 | 하부끼리 | 1부 기준 | +16강 규칙 | 수집 | 비율 |
|---|---|---|---|---|---|---|---|---|
| FA Cup | 812 | 9 | 25 | 778 | 34 | +0 | **34** | 4.2% |
| League Cup | 73 | 14 | 17 | 42 | 31 | +2 | **33** | 45.2% |
| Copa del Rey | 108 | 10 | 40 | 58 | 50 | +0 | **50** | 46.3% |
| DFB Pokal | 49 | 10 | 25 | 14 | 35 | +1 | **36** | 73.5% |
| Coppa Italia | 33 | 15 | 12 | 6 | 27 | +4 | **31** | 93.9% |
| Coupe de France | 147 | 10 | 27 | 110 | 37 | +1 | **38** | 25.9% |
| **합계** | 1222 | 68 | 146 | 1008 | 214 | +8 | **222** | |

## 분류별 실제 데이터 ★

> `1부 vs 하부`가 비면 규칙의 전제가 무너진다.
> `하부 vs 하부 · 16강 이상`이 비면 16강 규칙이 헛콜을 만든다.

| 대회 | 분류 | 라운드 | 경기 | 이벤트 | 라인업 | 팀통계 | 선수통계 |
|---|---|---|---|---|---|---|---|
| FA Cup | 1부 vs 하부 (가장 이른) | Round of 64 | Wolves 6-1 Shrewsbury | 17 | 2 | 2 | 2 |
| FA Cup | 하부 vs 하부 · 16강 이전 | Extra Preliminary Round | Pickering Town 3-2 Penrith AFC | 0 | 0 | 0 | 0 |
| FA Cup | 1부 vs 1부 (가장 이른) | Round of 64 | Tottenham 1-2 Aston Villa | 17 | 2 | 2 | 2 |
| League Cup | 1부 vs 하부 (가장 이른) | 2nd Round | Burnley 2-1 Derby | 14 | 2 | 2 | 2 |
| League Cup | 하부 vs 하부 · 16강 이상 | Preliminary Round | Accrington ST 3-1 Oldham | 16 | 2 | 2 | 2 |
| League Cup | 하부 vs 하부 · 16강 이전 | 1st Round | Swansea 3-1 Crawley Town | 16 | 2 | 2 | 2 |
| League Cup | 1부 vs 1부 (가장 이른) | 2nd Round | Wolves 3-2 West Ham | 16 | 2 | 2 | 2 |
| Copa del Rey | 1부 vs 하부 (가장 이른) | Round of 128 | Maracena 0-5 Valencia | 15 | 2 | 0 | 0 |
| Copa del Rey | 하부 vs 하부 · 16강 이전 | 1/128-finals | Sant Just 3-0 Atletico Calatayud | 3 | 0 | 0 | 0 |
| Copa del Rey | 1부 vs 1부 (가장 이른) | Round of 32 | Alaves 1-0 Sevilla | 14 | 2 | 2 | 2 |
| DFB Pokal | 1부 vs 하부 (가장 이른) | 1st Round | SG Sonnenhof Grossaspach 0-4 Bayer Leverkusen | 21 | 2 | 2 | 2 |
| DFB Pokal | 하부 vs 하부 · 16강 이상 | Round of 16 | Hertha BSC 6-1 1. FC Kaiserslautern | 21 | 2 | 2 | 2 |
| DFB Pokal | 하부 vs 하부 · 16강 이전 | 1st Round | FC Saarbrücken 1-3 1. FC Magdeburg | 17 | 2 | 2 | 2 |
| DFB Pokal | 1부 vs 1부 (가장 이른) | 2nd Round | 1. FC Heidenheim 0-1 Hamburger SV | 17 | 2 | 2 | 2 |
| Coppa Italia | 1부 vs 하부 (가장 이른) | 1st Round | Sassuolo 1-0 Catanzaro | 11 | 2 | 2 | 2 |
| Coppa Italia | 하부 vs 하부 · 16강 이상 | Preliminary Round | Virtus Entella 4-0 Ternana | 14 | 2 | 0 | 0 |
| Coppa Italia | 하부 vs 하부 · 16강 이전 | 1st Round | Venezia 4-0 Mantova | 19 | 2 | 2 | 2 |
| Coppa Italia | 1부 vs 1부 (가장 이른) | 2nd Round | AC Milan 3-0 Lecce | 18 | 2 | 2 | 2 |
| Coupe de France | 1부 vs 하부 (가장 이른) | 1/128-finals | Quetigny 1-3 Saint Etienne | 4 | 2 | 0 | 0 |
| Coupe de France | 하부 vs 하부 · 16강 이상 | Round of 16 | Reims 3-0 Le Mans | 16 | 2 | 2 | 2 |
| Coupe de France | 하부 vs 하부 · 16강 이전 | 1/128-finals | Cannes 1-2 Annecy | 3 | 2 | 0 | 0 |
| Coupe de France | 1부 vs 1부 (가장 이른) | Round of 64 | Nice 2-1 Saint Etienne | 12 | 2 | 2 | 2 |

> 라인업·팀통계·선수통계는 **2**가 정상(양 팀). 0이면 데이터 없음.

## 라운드별 참가 팀 수 — 16강 경계가 어디인가

### FA Cup (`45`)

| 라운드 | 팀 | 경기 | 16강 이상 |
|---|---|---|---|
| Extra Preliminary Round | 444 | 222 |  |
| Extra Preliminary Round Replays | 102 | 51 |  |
| Preliminary Round | 272 | 136 |  |
| Preliminary Round Replays | 48 | 24 |  |
| 1st Round Qualifying | 224 | 112 |  |
| 1st Round Qualifying Replays | 46 | 23 |  |
| 2nd Round Qualifying | 158 | 79 |  |
| 2nd Round Qualifying Replays | 30 | 15 |  |
| 3rd Round Qualifying | 104 | 87 |  |
| 1/128-finals | 80 | 40 |  |
| Round of 128 | 40 | 20 |  |
| Round of 64 | 64 | 32 |  |
| Round of 32 | 32 | 16 |  |
| Round of 16 | 16 | 8 | ✅ |
| Quarter-finals | 8 | 4 | ✅ |
| Semi-finals | 4 | 2 | ✅ |
| Final | 2 | 1 | ✅ |

### League Cup (`48`)

| 라운드 | 팀 | 경기 | 16강 이상 |
|---|---|---|---|
| Preliminary Round | 4 | 2 | ✅ |
| 1st Round | 70 | 35 |  |
| 2nd Round | 46 | 23 |  |
| 3rd Round | 32 | 16 |  |
| 4th Round | 16 | 8 | ✅ |
| Quarter-finals | 8 | 4 | ✅ |
| Semi-finals | 4 | 4 | ✅ |
| Final | 2 | 1 | ✅ |

### Copa del Rey (`143`)

| 라운드 | 팀 | 경기 | 16강 이상 |
|---|---|---|---|
| 1/128-finals | 20 | 20 |  |
| Round of 128 | 112 | 56 |  |
| Round of 64 | 56 | 28 |  |
| Round of 32 | 32 | 16 |  |
| Round of 16 | 16 | 8 | ✅ |
| Quarter-finals | 8 | 4 | ✅ |
| Semi-finals | 4 | 4 | ✅ |
| Final | 2 | 1 | ✅ |

### DFB Pokal (`81`)

| 라운드 | 팀 | 경기 | 16강 이상 |
|---|---|---|---|
| 1st Round | 64 | 32 |  |
| 2nd Round | 32 | 16 |  |
| Round of 16 | 16 | 8 | ✅ |
| Quarter-finals | 8 | 4 | ✅ |
| Semi-finals | 4 | 2 | ✅ |
| Final | 2 | 1 | ✅ |

### Coppa Italia (`137`)

| 라운드 | 팀 | 경기 | 16강 이상 |
|---|---|---|---|
| Preliminary Round | 8 | 4 | ✅ |
| 1st Round | 32 | 16 |  |
| 2nd Round | 16 | 8 | ✅ |
| 3rd Round | 16 | 8 | ✅ |
| Quarter-finals | 8 | 4 | ✅ |
| Semi-finals | 4 | 4 | ✅ |
| Final | 2 | 1 | ✅ |

### Coupe de France (`66`)

| 라운드 | 팀 | 경기 | 16강 이상 |
|---|---|---|---|
| 1/128-finals | 184 | 92 |  |
| Round of 128 | 92 | 46 |  |
| Round of 64 | 64 | 32 |  |
| Round of 32 | 32 | 16 |  |
| Round of 16 | 16 | 8 | ✅ |
| Quarter-finals | 8 | 4 | ✅ |
| Semi-finals | 4 | 2 | ✅ |
| Final | 2 | 1 | ✅ |
