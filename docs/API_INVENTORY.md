# API-Football — 내 키로 가져올 수 있는 데이터

> 생성: 2026-09-04 · `scripts/probe-api-inventory.mjs` v2
> 기준: 리그 39 · 시즌 2026 · 팀 33 · 총 142콜

**근거 범위 —** 각 행의 상태·건수·필드는 실제 응답에서 확인한 값이다.
다만 *어떤 엔드포인트를 두드릴지*는 공식 v3 문서 목록과 대조해 정한 것이며,
문서에 없는 비공개 엔드포인트가 있다면 여기에 나타나지 않는다.

전체 키 경로·샘플은 `docs/api-inventory.json`.

## 6대회 커버리지

| 대회 | 시즌 | 미제공 항목 |
|---|---|---|
| Premier League (39) | 2026-08-21 ~ 2027-05-30 | 없음 — 전체 제공 |
| LaLiga (140) | 2026-08-15 ~ 2027-05-30 | 없음 — 전체 제공 |
| Bundesliga (78) | 2026-08-28 ~ 2027-05-22 | 없음 — 전체 제공 |
| Serie A (135) | 2026-08-22 ~ 2027-05-30 | 없음 — 전체 제공 |
| Ligue 1 (61) | 2026-08-21 ~ 2027-05-29 | 없음 — 전체 제공 |
| UCL (2) | 2026-07-07 ~ 2027-01-27 | 없음 — 전체 제공 |

## 컵 대회 — 조회로 찾은 ID와 커버리지

> ID가 공개 문서에 없어 `/leagues?country=X&type=cup`으로 직접 조회한 결과다.

| 국가 | ID | 대회 | 시즌 | 미제공 항목 |
|---|---|---|---|---|
| England | `48` | League Cup | 2026-08-01 ~ 2026-09-08 | standings, injuries |
| England | `47` | FA Trophy | 2026-08-28 ~ 2026-09-12 | fixtures_lineups, stats_fixtures, stats_players, standings, players, top_scorers, top_assists, top_cards, injuries |
| England | `528` | Community Shield | 2026-08-16 ~ 2026-08-16 | standings, injuries, odds |
| England | `46` | EFL Trophy | 2026-09-02 ~ 2026-09-02 | standings, injuries, odds |
| England | `697` | WSL Cup | 2026-09-23 ~ 2026-12-16 | fixtures_events, fixtures_lineups, stats_fixtures, stats_players, standings, players, top_scorers, top_assists, top_cards, injuries, odds |
| England | `1156` | National League Cup | 2026-08-11 ~ 2026-11-03 | stats_fixtures, stats_players, standings, players, top_scorers, top_assists, top_cards, injuries, odds |
| England | `871` | Premier League Cup | 2026-08-11 ~ 2026-12-09 | stats_fixtures, stats_players, standings, players, top_scorers, top_assists, top_cards, injuries |
| England | `45` | FA Cup | 2026-09-04 ~ 2026-09-05 | fixtures_events, fixtures_lineups, stats_fixtures, stats_players, standings, players, top_scorers, top_assists, top_cards, injuries |
| Spain | `556` | Super Cup | 2027-02-02 ~ 2027-02-02 | fixtures_events, fixtures_lineups, stats_fixtures, stats_players, standings, injuries, odds |
| Spain | `1058` | Supercopa Femenina | 2027-01-20 ~ 2027-01-20 | fixtures_events, fixtures_lineups, stats_fixtures, stats_players, standings, players, top_scorers, top_assists, top_cards, injuries, odds |
| Spain | `735` | Copa Federacion | 2026-09-09 ~ 2026-09-09 | fixtures_events, fixtures_lineups, stats_fixtures, stats_players, standings, players, top_scorers, top_assists, top_cards, injuries, odds |
| Germany | `81` | DFB Pokal | 2026-08-21 ~ 2026-09-02 | standings, injuries |
| Germany | `947` | DFB Pokal - Women | 2026-08-15 ~ 2026-09-26 | stats_fixtures, stats_players, standings, players, top_scorers, top_assists, top_cards, injuries, odds |
| Germany | `715` | DFB Junioren Pokal | 2026-07-31 ~ 2026-08-29 | fixtures_lineups, stats_fixtures, stats_players, standings, players, top_scorers, top_assists, top_cards, injuries, odds |
| Germany | `529` | Super Cup | 2026-08-22 ~ 2026-08-22 | standings, injuries, odds |
| Italy | `137` | Coppa Italia | 2026-08-08 ~ 2026-12-02 | standings, injuries |
| Italy | `1198` | Serie A Cup Women | 2026-08-22 ~ 2026-09-05 | stats_fixtures, stats_players, standings, players, top_scorers, top_assists, top_cards, injuries |
| Italy | `704` | Coppa Italia Primavera | 2026-08-21 ~ 2026-10-28 | stats_fixtures, stats_players, standings, players, top_scorers, top_assists, top_cards, injuries, odds |
| Italy | `891` | Coppa Italia Serie C | 2026-08-14 ~ 2026-10-28 | fixtures_lineups, stats_fixtures, stats_players, standings, players, top_scorers, top_assists, top_cards, injuries |
| France | `526` | Trophée des Champions | 2026-08-16 ~ 2026-08-16 | standings, injuries, odds |
| World | `34` | World Cup - Qualification South America | 2023-09-07 ~ 2025-09-09 | injuries, odds |
| World | `30` | World Cup - Qualification Asia | 2023-10-12 ~ 2025-11-18 | injuries, odds |
| World | `31` | World Cup - Qualification CONCACAF | 2024-03-22 ~ 2025-11-19 | odds |
| World | `33` | World Cup - Qualification Oceania | 2024-09-05 ~ 2025-03-24 | stats_fixtures, stats_players, standings, injuries, odds |
| World | `893` | UEFA U19 Championship - Qualification | 2025-10-08 ~ 2026-03-23 | stats_fixtures, stats_players, injuries, odds |
| World | `894` | Asian Cup Women - Qualification | 2025-06-23 ~ 2025-07-19 | fixtures_lineups, stats_fixtures, stats_players, standings, players, top_scorers, top_assists, top_cards, injuries, odds |
| World | `952` | AFC U23 Asian Cup - Qualification | 2025-09-03 ~ 2025-09-09 | stats_fixtures, stats_players, standings, odds |
| World | `869` | CECAFA Club Cup | 2025-09-02 ~ 2025-09-15 | fixtures_lineups, stats_fixtures, stats_players, standings, players, top_scorers, top_assists, top_cards, injuries, odds |
| World | `886` | UEFA U17 Championship - Qualification | 2025-10-01 ~ 2026-06-09 | stats_fixtures, stats_players, injuries, odds |
| World | `1207` | CONCACAF Series | 2025-11-12 ~ 2026-03-30 | stats_fixtures, stats_players, standings, players, top_scorers, top_assists, top_cards, injuries, odds |
| World | `1012` | AFC U17 Asian Cup | 2025-11-22 ~ 2026-05-22 | stats_fixtures, stats_players, standings, players, top_scorers, top_assists, top_cards, injuries, odds |
| World | `927` | World Cup - Women - Qualification Concacaf | 2025-11-27 ~ 2026-11-28 | fixtures_lineups, stats_fixtures, stats_players, standings, players, top_scorers, top_assists, top_cards, injuries, odds |
| World | `1208` | Arabian Gulf Cup U23 | 2025-12-04 ~ 2025-12-16 | fixtures_lineups, stats_fixtures, stats_players, players, top_scorers, top_assists, top_cards, injuries, odds |
| World | `1` | World Cup | 2026-06-11 ~ 2026-07-19 | odds |
| World | `13` | CONMEBOL Libertadores | 2026-02-04 ~ 2026-09-15 | injuries, odds |
| World | `11` | CONMEBOL Sudamericana | 2026-03-03 ~ 2026-09-16 | injuries |
| World | `10` | Friendlies | 2026-01-01 ~ 2026-11-15 | standings, injuries, odds |
| World | `666` | Friendlies Women | 2026-01-11 ~ 2026-10-13 | stats_fixtures, stats_players, standings, injuries, odds |
| World | `667` | Friendlies Clubs | 2026-01-03 ~ 2026-09-30 | stats_fixtures, stats_players, standings, players, top_scorers, top_assists, top_cards, injuries |
| World | `1213` | Kings World Cup Nations | 2026-01-03 ~ 2026-01-17 | stats_fixtures, stats_players, standings, injuries, odds |
| World | `1214` | OFC Pro League | 2026-01-17 ~ 2026-05-24 | stats_fixtures, stats_players, injuries, odds |
| World | `903` | The Atlantic Cup | 2026-01-25 ~ 2026-02-06 | stats_fixtures, stats_players, standings, players, top_scorers, top_assists, top_cards, injuries, odds |
| World | `1123` | UAE-Qatar - Super Cup | 2026-01-22 ~ 2026-01-25 | stats_fixtures, stats_players, standings, injuries, odds |
| World | `1216` | Serie Rio De La Plata | 2026-01-11 ~ 2026-01-27 | stats_fixtures, stats_players, standings, players, top_scorers, top_assists, top_cards, injuries, odds |
| World | `912` | CONCACAF Women U17 | 2026-01-24 ~ 2026-02-03 | fixtures_lineups, stats_fixtures, stats_players, standings, players, top_scorers, top_assists, top_cards, injuries, odds |
| World | `16` | CONCACAF Champions League | 2026-02-04 ~ 2026-05-31 | standings, injuries, odds |
| World | `1217` | FIFA Women Champions Cup | 2025-10-08 ~ 2026-02-01 | stats_fixtures, stats_players, standings, players, top_scorers, top_assists, top_cards, injuries, odds |
| World | `913` | CONMEBOL - UEFA Finalissima | 2026-03-27 ~ 2026-03-27 | fixtures_events, fixtures_lineups, stats_fixtures, stats_players, standings, players, top_scorers, top_assists, top_cards, injuries, odds |
| World | `27` | OFC Champions League | 2026-01-30 ~ 2026-08-22 | stats_fixtures, stats_players, standings, players, top_scorers, top_assists, top_cards, injuries, odds |
| World | `897` | Asian Cup Women | 2026-03-01 ~ 2026-03-21 | stats_fixtures, stats_players, standings, players, top_scorers, top_assists, top_cards, injuries, odds |
| World | `1085` | CONMEBOL U20 Femenino | 2026-02-04 ~ 2026-02-28 | stats_fixtures, stats_players, standings, players, top_scorers, top_assists, top_cards, injuries, odds |
| World | `541` | CONMEBOL Recopa | 2026-02-20 ~ 2026-02-27 | stats_fixtures, stats_players, standings, injuries, odds |
| World | `904` | SheBelieves Cup | 2026-03-01 ~ 2026-03-07 | fixtures_lineups, stats_fixtures, stats_players, standings, players, top_scorers, top_assists, top_cards, injuries, odds |
| World | `537` | CONCACAF U20 | 2026-07-24 ~ 2026-08-09 | stats_fixtures, stats_players, standings, players, top_scorers, top_assists, top_cards, injuries, odds |
| World | `5` | UEFA Nations League | 2026-09-24 ~ 2026-11-17 | fixtures_events, fixtures_lineups, stats_fixtures, stats_players, players, top_scorers, top_assists, top_cards, injuries, odds |
| World | `772` | Leagues Cup | 2026-08-04 ~ 2026-09-07 | standings, injuries |
| World | `540` | CONMEBOL Libertadores U20 | 2026-03-07 ~ 2026-03-22 | stats_fixtures, stats_players, standings, injuries, odds |
| World | `37` | World Cup - Qualification Intercontinental Play-offs | 2026-03-26 ~ 2026-03-31 | standings, injuries, odds |
| World | `910` | Youth Viareggio Cup | 2026-03-09 ~ 2026-03-23 | fixtures_events, fixtures_lineups, stats_fixtures, stats_players, standings, players, top_scorers, top_assists, top_cards, injuries, odds |
| World | `1222` | FIFA Series | 2026-03-25 ~ 2026-03-31 | stats_fixtures, stats_players, standings, injuries, odds |
| World | `970` | CONMEBOL - U17 | 2026-04-03 ~ 2026-04-19 | stats_fixtures, stats_players, players, top_scorers, top_assists, top_cards, injuries, odds |
| World | `1013` | All-Island Cup - Women | 2026-04-04 ~ 2026-07-18 | fixtures_lineups, stats_fixtures, stats_players, players, top_scorers, top_assists, top_cards, injuries, odds |
| World | `1102` | UEFA U17 Championship - Women | 2026-05-04 ~ 2026-05-17 | stats_fixtures, stats_players, standings, players, top_scorers, top_assists, top_cards, injuries, odds |
| World | `493` | UEFA U19 Championship | 2026-06-28 ~ 2026-07-11 | stats_fixtures, stats_players, standings, players, top_scorers, top_assists, top_cards, injuries, odds |
| World | `973` | CAF Cup of Nations - U17 | 2026-05-13 ~ 2026-06-02 | stats_fixtures, stats_players, players, top_scorers, top_assists, top_cards, injuries, odds |
| World | `914` | Tournoi Maurice Revello | 2026-05-31 ~ 2026-06-13 | stats_fixtures, stats_players, standings, injuries, odds |
| World | `950` | World Cup - U17 - Women | 2026-10-17 ~ 2026-10-25 | fixtures_events, fixtures_lineups, stats_fixtures, stats_players, standings, players, top_scorers, top_assists, top_cards, injuries, odds |
| World | `587` | World Cup - U17 | 2026-11-19 ~ 2026-11-25 | fixtures_events, fixtures_lineups, stats_fixtures, stats_players, standings, players, top_scorers, top_assists, top_cards, injuries, odds |
| World | `921` | UEFA U17 Championship | 2026-05-25 ~ 2026-06-07 | stats_fixtures, stats_players, players, top_scorers, top_assists, top_cards, injuries, odds |
| World | `1028` | CONCACAF Central American Cup | 2026-07-29 ~ 2026-09-18 | stats_fixtures, stats_players, standings, players, top_scorers, top_assists, top_cards, injuries |
| World | `856` | CONCACAF Caribbean Club Championship | 2026-08-04 ~ 2026-09-17 | stats_fixtures, stats_players, standings, players, top_scorers, top_assists, top_cards, injuries |
| World | `1132` | AFC Challenge League | 2026-08-11 ~ 2026-10-24 | fixtures_lineups, stats_fixtures, stats_players, standings, players, top_scorers, top_assists, top_cards, injuries, odds |
| World | `1129` | ASEAN Club Championship | 2026-09-01 ~ 2027-04-01 | fixtures_events, fixtures_lineups, stats_fixtures, stats_players, standings, players, top_scorers, top_assists, top_cards, injuries, odds |
| World | `2` | UEFA Champions League | 2026-07-07 ~ 2027-01-27 | 없음 — 전체 제공 |
| World | `848` | UEFA Europa Conference League | 2026-07-07 ~ 2026-12-17 | injuries |
| World | `3` | UEFA Europa League | 2026-07-09 ~ 2027-01-28 | stats_players, injuries |
| World | `525` | UEFA Champions League Women | 2026-07-22 ~ 2026-09-02 | stats_players, standings, players, top_scorers, top_assists, top_cards, injuries |
| World | `918` | UEFA U19 Championship - Women | 2026-06-27 ~ 2026-07-10 | stats_fixtures, stats_players, standings, players, top_scorers, top_assists, top_cards, injuries, odds |
| World | `18` | AFC Champions League Two | 2026-08-12 ~ 2026-12-09 | stats_fixtures, stats_players, injuries |
| World | `17` | AFC Champions League Elite | 2026-08-11 ~ 2027-02-16 | stats_fixtures, stats_players, injuries, odds |
| World | `1140` | AFC Women's Champions League | 2026-08-17 ~ 2026-08-23 | stats_fixtures, stats_players, standings, players, top_scorers, top_assists, top_cards, injuries, odds |
| World | `531` | UEFA Super Cup | 2026-08-12 ~ 2026-08-12 | standings, injuries, odds |
| World | `1189` | Asean Championship Women | 2026-07-10 ~ 2026-07-16 | fixtures_lineups, stats_fixtures, stats_players, standings, players, top_scorers, top_assists, top_cards, injuries, odds |
| World | `940` | COTIF Tournament | 2026-07-21 ~ 2026-07-28 | fixtures_lineups, stats_fixtures, stats_players, standings, players, top_scorers, top_assists, top_cards, injuries, odds |
| World | `534` | CONCACAF Caribbean Club Shield | 2026-07-23 ~ 2026-07-31 | stats_fixtures, stats_players, standings, players, top_scorers, top_assists, top_cards, injuries, odds |
| World | `1016` | CAC Games | 2026-07-30 ~ 2026-08-07 | stats_fixtures, stats_players, players, top_scorers, top_assists, top_cards, injuries, odds |
| World | `1236` | Como Cup | 2026-07-28 ~ 2026-08-01 | stats_fixtures, stats_players, standings, players, top_scorers, top_assists, top_cards, injuries, odds |
| World | `1237` | Central American and Caribbean Games | 2026-07-29 ~ 2026-08-06 | stats_fixtures, stats_players, standings, players, top_scorers, top_assists, top_cards, injuries, odds |
| World | `12` | CAF Champions League | 2026-09-05 ~ 2026-09-12 | fixtures_events, fixtures_lineups, stats_fixtures, stats_players, standings, players, top_scorers, top_assists, top_cards, injuries |
| World | `937` | Emirates Cup | 2026-08-09 ~ 2026-08-09 | stats_fixtures, stats_players, standings, players, top_scorers, top_assists, top_cards, injuries, odds |
| World | `20` | CAF Confederation Cup | 2026-09-05 ~ 2026-09-12 | fixtures_events, fixtures_lineups, stats_fixtures, stats_players, standings, players, top_scorers, top_assists, top_cards, injuries |
| World | `1039` | Premier League International Cup | 2026-08-19 ~ 2027-01-27 | fixtures_lineups, stats_fixtures, stats_players, standings, players, top_scorers, top_assists, top_cards, injuries |
| World | `1191` | UEFA Europa Cup - Women | 2026-08-26 ~ 2026-09-02 | stats_players, standings, players, top_scorers, top_assists, top_cards, injuries |
| World | `1168` | FIFA Intercontinental Cup | 2026-08-26 ~ 2026-09-19 | standings, injuries, odds |
| World | `533` | CAF Super Cup | 2026-11-08 ~ 2026-11-08 | fixtures_events, fixtures_lineups, stats_fixtures, stats_players, standings, players, top_scorers, top_assists, top_cards, injuries, odds |
| World | `890` | U20 Elite League | 2026-09-25 ~ 2027-03-30 | fixtures_events, fixtures_lineups, stats_fixtures, stats_players, standings, players, top_scorers, top_assists, top_cards, injuries, odds |
| World | `919` | Mediterranean Games | 2026-08-22 ~ 2026-08-28 | stats_fixtures, stats_players, standings, players, top_scorers, top_assists, top_cards, injuries, odds |
| World | `965` | AFC U20 Asian Cup | 2026-08-31 ~ 2026-09-06 | fixtures_lineups, stats_fixtures, stats_players, standings, players, top_scorers, top_assists, top_cards, injuries |
| World | `920` | World Cup - U20 - Women | 2026-09-05 ~ 2026-09-13 | fixtures_events, fixtures_lineups, stats_fixtures, stats_players, players, top_scorers, top_assists, top_cards, injuries, odds |
| World | `25` | Gulf Cup of Nations | 2026-09-23 ~ 2026-09-30 | fixtures_events, fixtures_lineups, stats_fixtures, stats_players, standings, players, top_scorers, top_assists, top_cards, injuries, odds |

## 최근 5개 시즌 실측

> 커버리지 플래그가 아니라 **실제 응답 건수**다. 플래그가 켜져 있어도 데이터가 없을 수 있다.

### 대회별 경기 존재 여부

| 시즌 | Premier League | LaLiga | Bundesliga | Serie A | Ligue 1 | UCL |
|---|---|---|---|---|---|---|
| **2022** | ✅ 2023-05-28 | ✅ 2023-06-04 | ✅ 2023-06-05 | ✅ 2023-06-11 | ✅ 2023-06-03 | ✅ 2023-06-10 |
| **2023** | ✅ 2024-05-19 | ✅ 2024-05-26 | ✅ 2024-05-27 | ✅ 2024-06-02 | ✅ 2024-06-02 | ✅ 2024-06-01 |
| **2024** | ✅ 2025-05-25 | ✅ 2025-05-25 | ✅ 2025-05-26 | ✅ 2025-05-25 | ✅ 2025-05-29 | ✅ 2025-05-31 |
| **2025** | ✅ 2026-05-24 | ✅ 2026-05-24 | ✅ 2026-05-25 | ✅ 2026-05-24 | ✅ 2026-05-29 | ✅ 2026-05-30 |
| **2026** | ✅ 2026-08-31 | ✅ 2026-09-03 | ✅ 2026-08-30 | ✅ 2026-08-31 | ✅ 2026-09-03 | ✅ 2026-08-26 |

### 주 대회(리그 39) 항목별 실측 건수

| 시즌 | 경기 | 순위 행 | 선수 | 득점랭킹 | 팀 경기통계 | 선수 경기통계 | 라인업 | 이벤트 | 표본 경기 |
|---|---|---|---|---|---|---|---|---|---|
| **2022** | 380 | 20 | 20건 / 45p | 20 | 2 | 2 | 2 | 12 | 867946 |
| **2023** | 380 | 20 | 20건 / 51p | 19 | 2 | 2 | 2 | 15 | 1035037 |
| **2024** | 380 | 20 | 20건 / 57p | 19 | 2 | 2 | 2 | 16 | 1208021 |
| **2025** | 380 | 20 | 20건 / 34p | 20 | 2 | 2 | 2 | 18 | 1378969 |
| **2026** | 380 | 20 | 20건 / 23p | 20 | 2 | 2 | 2 | 14 | 1557367 |

## 과거 시즌 깊이 — 6대회

> 각 항목이 **처음 제공되는 시즌**이다. 그 이전 시즌은 경기는 있어도 해당 데이터가 없다.

| 대회 | 시즌 수 | 범위 | 순위 | 이벤트 | 라인업 | 팀통계 | 선수통계 | 부상 |
|---|---|---|---|---|---|---|---|---|
| Premier League | 17 | 2010~2026 | 2010 | 2010 | 2010 | 2014 | 2014 | 2020 |
| LaLiga | 17 | 2010~2026 | 2010 | 2010 | 2010 | 2014 | 2015 | 2020 |
| Bundesliga | 17 | 2010~2026 | 2010 | 2010 | 2010 | 2015 | 2015 | 2020 |
| Serie A | 17 | 2010~2026 | 2010 | 2010 | 2010 | 2015 | 2015 | 2020 |
| Ligue 1 | 17 | 2010~2026 | 2010 | 2010 | 2010 | 2015 | 2015 | 2020 |
| UCL | 16 | 2011~2026 | 2011 | 2011 | 2011 | 2015 | 2015 | 2020 |

- **Premier League** 제공 시즌: 2010, 2011, 2012, 2013, 2014, 2015, 2016, 2017, 2018, 2019, 2020, 2021, 2022, 2023, 2024, 2025, 2026
- **LaLiga** 제공 시즌: 2010, 2011, 2012, 2013, 2014, 2015, 2016, 2017, 2018, 2019, 2020, 2021, 2022, 2023, 2024, 2025, 2026
- **Bundesliga** 제공 시즌: 2010, 2011, 2012, 2013, 2014, 2015, 2016, 2017, 2018, 2019, 2020, 2021, 2022, 2023, 2024, 2025, 2026
- **Serie A** 제공 시즌: 2010, 2011, 2012, 2013, 2014, 2015, 2016, 2017, 2018, 2019, 2020, 2021, 2022, 2023, 2024, 2025, 2026
- **Ligue 1** 제공 시즌: 2010, 2011, 2012, 2013, 2014, 2015, 2016, 2017, 2018, 2019, 2020, 2021, 2022, 2023, 2024, 2025, 2026
- **UCL** 제공 시즌: 2011, 2012, 2013, 2014, 2015, 2016, 2017, 2018, 2019, 2020, 2021, 2022, 2023, 2024, 2025, 2026

## 전체 대회 카탈로그

시즌 2026 기준 **800개 대회 · 134개 국가**
(리그 553 · 컵 247)

12개 커버리지 항목을 전부 제공하는 대회: **15개**

국가별 대회 수 상위 20:

| 국가 | 대회 수 |
|---|---|
| Brazil | 95 |
| World | 81 |
| Spain | 31 |
| Germany | 30 |
| England | 25 |
| Australia | 21 |
| Italy | 21 |
| Norway | 15 |
| Czech-Republic | 15 |
| Sweden | 14 |
| Portugal | 14 |
| Russia | 13 |
| Romania | 13 |
| USA | 12 |
| Greece | 11 |
| Poland | 11 |
| Argentina | 10 |
| Finland | 10 |
| Belgium | 10 |
| Switzerland | 9 |

전체 목록(ID·커버리지 포함)은 `docs/api-inventory.json`의 `catalog` 키에 있다.

## 엔드포인트 요약 — 데이터 확인 49 · 0건 3 · 실패 1

## 구독·메타

| 요청 | 상태 | 건수 | 키 | 쓸 곳 |
|---|---|---|---|---|
| `/status` | ✅ | 0 | 11 | 구독 플랜·일 한도·만료일·잔여 콜 |
| `/timezone` | ✅ | 427 | 0 | 지원 타임존 |
| `/countries` | ✅ | 171 | 3 | 국가 목록 |

## 대회

| 요청 | 상태 | 건수 | 키 | 쓸 곳 |
|---|---|---|---|---|
| `/leagues?id=39&season=2026` | ✅ | 1 | 28 | 대회 정보 + 커버리지 플래그 |
| `/leagues/seasons` | ✅ | 20 | 0 | 제공 시즌 연도 |
| `/standings?league=39&season=2026` | ✅ | 1 | 44 | 순위표 — 사이트 핵심 |
| `/fixtures/rounds?league=39&season=2026` | ✅ | 38 | 0 | 라운드 목록 |

## 팀

| 요청 | 상태 | 건수 | 키 | 쓸 곳 |
|---|---|---|---|---|
| `/teams?league=39&season=2026` | ✅ | 20 | 16 | 팀 목록 + 로고 + 경기장 |
| `/teams/statistics?league=39&season=2026&team=33` | ✅ | 11 | 218 | 팀 시즌 통계 — 팀 상세 |
| `/teams/seasons?team=33` | ✅ | 17 | 0 | 해당 팀 제공 시즌 |
| `/teams/countries` | ✅ | 234 | 3 | 팀 보유 국가 |
| `/venues?country=England` | ✅ | 896 | 8 | 경기장 상세 |
| `/coachs?team=33` | ✅ | 2 | 24 | 감독 + 경력 |
| `/transfers?team=33` | ✅ | 278 | 16 | 이적 이력 — 임대 구분용 |

## 경기

| 요청 | 상태 | 건수 | 키 | 쓸 곳 |
|---|---|---|---|---|
| `/fixtures?league=39&season=2026&last=1` | ✅ | 1 | 54 | 경기 목록 |
| `/fixtures?live=39-140-78-135-61-2` | ⚠ 0건 | 0 | 0 | 라이브 폴링 6대회 (진행 경기 없으면 0건 정상) |
| `/fixtures?date=2026-09-04` | ✅ | 451 | 54 | 날짜 기준 조회 — 홈 "오늘의 경기" |
| `/fixtures?team=33&season=2026&last=5` | ✅ | 5 | 54 | 팀 최근 경기 — 팀 상세 폼 |
| `/fixtures/statistics?fixture=1557377` | ✅ | 2 | 7 | 팀 경기 통계 (xG 포함) |
| `/fixtures/events?fixture=1557377` | ✅ | 16 | 16 | 득점·카드·교체 — 타임라인 |
| `/fixtures/lineups?fixture=1557377` | ✅ | 2 | 32 | 라인업·포메이션·벤치 |
| `/fixtures/players?fixture=1557377` | ✅ | 2 | 54 | 선수별 경기 통계 |
| `/predictions?fixture=1557377` | ✅ | 1 | 548 | 승부 예측·확률 |
| `/injuries?fixture=1557377` | ✅ | 18 | 22 | 경기별 결장자 |
| `/fixtures/headtohead?h2h=33-40&last=5` | ✅ | 5 | 54 | 맞대결 기록 |

## 선수

| 요청 | 상태 | 건수 | 키 | 쓸 곳 |
|---|---|---|---|---|
| `/players?league=39&season=2026&page=1` | ✅ | 20 | 75 | 선수 시즌 통계 (페이지네이션) |
| `/players/squads?team=33` | ✅ | 1 | 11 | 스쿼드 스냅샷 — diff 대상 |
| `/players/seasons` | ✅ | 46 | 0 | 선수 통계 제공 시즌 |
| `/players/profiles?player=131` | ✅ | 1 | 16 | 선수 프로필 |
| `/players/teams?player=131` | ✅ | 11 | 5 | 선수 소속팀 이력 |
| `/trophies?player=131` | ✅ | 22 | 4 | 선수 수상 이력 |
| `/sidelined?player=131` | ✅ | 3 | 3 | 선수 결장 이력 |
| `/transfers?player=131` | ✅ | 1 | 16 | 선수 이적 이력 |
| `/injuries?league=39&season=2026` | ✅ | 415 | 22 | 부상자 명단 |
| `/trophies?coach=1993` | ✅ | 16 | 4 | 감독 수상 이력 |
| `/sidelined?coach=1993` | ⚠ 0건 | 0 | 0 | 감독 결장 이력 |

## 선수 이력 · 과거 데이터 깊이

| 요청 | 상태 | 건수 | 키 | 쓸 곳 |
|---|---|---|---|---|
| `/players/seasons?player=131` | ✅ | 11 | 0 | 이 선수의 통계 보유 시즌 전량 |
| `/players/teams?player=131` | ✅ | 11 | 5 | 전 소속팀 목록 + 팀별 시즌 |
| `/players?league=39&season=2020&page=1` | ✅ | 20 | 75 | 6년 전 선수 통계 — 실제로 오는가 |
| `/players?league=39&season=2015&page=1` | ✅ | 20 | 75 | 11년 전 선수 통계 |
| `/standings?league=39&season=2010` | ✅ | 1 | 44 | 16년 전 순위표 |
| `/fixtures?league=39&season=2010&last=1` | ✅ | 1 | 54 | 16년 전 경기 |
| `/transfers?team=33&season=2015` | ❌ {"season":"The Season field do not exist."} | 0 | 0 | 과거 이적 이력 |

## 랭킹

| 요청 | 상태 | 건수 | 키 | 쓸 곳 |
|---|---|---|---|---|
| `/players/topscorers?league=39&season=2026` | ✅ | 20 | 75 | 득점 — 대회당 1콜 |
| `/players/topassists?league=39&season=2026` | ✅ | 20 | 75 | 도움 |
| `/players/topyellowcards?league=39&season=2026` | ✅ | 20 | 75 | 경고 |
| `/players/topredcards?league=39&season=2026` | ✅ | 20 | 75 | 퇴장 |

## 배당 (사용 계획 없음 — 플랜 포함 여부만)

| 요청 | 상태 | 건수 | 키 | 쓸 곳 |
|---|---|---|---|---|
| `/odds/bookmakers` | ✅ | 33 | 2 | 북메이커 |
| `/odds/bets` | ✅ | 338 | 2 | 베팅 종류 |
| `/odds?league=39&season=2026&page=1` | ✅ | 10 | 22 | 사전 배당 |
| `/odds/mapping` | ✅ | 100 | 8 | 배당 제공 경기 매핑 |
| `/odds/live` | ⚠ 0건 | 0 | 0 | 실시간 배당 |
| `/odds/live/bets` | ✅ | 266 | 2 | 실시간 베팅 종류 |

## 엔드포인트별 최상위 필드

### `/status`

```
account · requests · subscription
```

### `/teams/statistics`

```
biggest · cards · clean_sheet · failed_to_score · fixtures · form · goals · league · lineups · penalty · team
```

## 지표·유형 목록 (배열 안의 `type` 값)

### `/transfers`

- `[].transfers[].type` (5종) — Free · Loan · N/A · € 250K · € 3M

### `/fixtures/statistics`

- `[].statistics[].type` (18종) — Ball Possession · Blocked Shots · Corner Kicks · Fouls · Goalkeeper Saves · Offsides · Passes % · Passes accurate · Red Cards · Shots insidebox · Shots off Goal · Shots on Goal · Shots outsidebox · Total Shots · Total passes · Yellow Cards · expected_goals · goals_prevented

### `/fixtures/events`

- `[].type` (4종) — Card · Goal · Var · subst

### `/sidelined`

- `[].type` (2종) — Ankle Injury · Knock

### `/transfers`

- `[].transfers[].type` (4종) — Loan · N/A · € 400K · € 6.7M

## null 로 온 필드 — 정규화 계층에서 판단할 자리

> 0을 뜻하는 null과 "값 없음"을 뜻하는 null이 섞여 있다. `DATA_RULES.md` 3장 규칙 참조.

- `/standings` — [].league.standings[][].description
- `/teams/statistics` — biggest.loses.home, biggest.wins.away, cards.red.0-15.percentage, cards.red.0-15.total, cards.red.106-120.percentage, cards.red.106-120.total, cards.red.16-30.percentage, cards.red.16-30.total, cards.red.31-45.percentage, cards.red.31-45.total, cards.red.46-60.percentage, cards.red.46-60.total, cards.red.61-75.percentage, cards.red.61-75.total, cards.red.76-90.percentage, cards.red.76-90.total, cards.red.91-105.percentage, cards.red.91-105.total, cards.yellow.0-15.percentage, cards.yellow.0-15.total, cards.yellow.106-120.percentage, cards.yellow.106-120.total, cards.yellow.16-30.percentage, cards.yellow.16-30.total, cards.yellow.46-60.percentage, cards.yellow.46-60.total, cards.yellow.61-75.percentage, cards.yellow.61-75.total, cards.yellow.76-90.percentage, cards.yellow.76-90.total, goals.against.minute.0-15.percentage, goals.against.minute.0-15.total, goals.against.minute.106-120.percentage, goals.against.minute.106-120.total, goals.against.minute.61-75.percentage, goals.against.minute.61-75.total, goals.against.minute.91-105.percentage, goals.against.minute.91-105.total, goals.for.minute.0-15.percentage, goals.for.minute.0-15.total, goals.for.minute.106-120.percentage, goals.for.minute.106-120.total, goals.for.minute.16-30.percentage, goals.for.minute.16-30.total, goals.for.minute.46-60.percentage, goals.for.minute.46-60.total, goals.for.minute.91-105.percentage, goals.for.minute.91-105.total
- `/teams/countries` — [].code, [].flag
- `/coachs` — [].age, [].birth.country, [].birth.date, [].birth.place, [].career[].end, [].firstname, [].height, [].lastname, [].nationality, [].weight
- `/fixtures` — [].score.extratime.away, [].score.extratime.home, [].score.penalty.away, [].score.penalty.home
- `/fixtures` — [].fixture.periods.first, [].fixture.periods.second, [].fixture.referee, [].fixture.status.elapsed, [].fixture.status.extra, [].fixture.venue.city, [].fixture.venue.id, [].fixture.venue.name, [].goals.away, [].goals.home, [].league.flag, [].score.extratime.away, [].score.extratime.home, [].score.fulltime.away, [].score.fulltime.home, [].score.halftime.away, [].score.halftime.home, [].score.penalty.away, [].score.penalty.home, [].teams.away.winner, [].teams.home.winner
- `/fixtures` — [].fixture.referee, [].fixture.status.extra, [].fixture.venue.city, [].fixture.venue.id, [].league.flag, [].score.extratime.away, [].score.extratime.home, [].score.penalty.away, [].score.penalty.home, [].teams.away.winner, [].teams.home.winner
- `/fixtures/events` — [].assist.id, [].assist.name, [].comments, [].player.id, [].player.name, [].time.extra
- `/fixtures/lineups` — [].substitutes[].player.grid
- `/fixtures/players` — [].players[].statistics[].dribbles.attempts, [].players[].statistics[].dribbles.past, [].players[].statistics[].dribbles.success, [].players[].statistics[].duels.total, [].players[].statistics[].duels.won, [].players[].statistics[].fouls.committed, [].players[].statistics[].fouls.drawn, [].players[].statistics[].goals.saves, [].players[].statistics[].goals.total, [].players[].statistics[].offsides, [].players[].statistics[].passes.key, [].players[].statistics[].penalty.commited, [].players[].statistics[].penalty.saved, [].players[].statistics[].penalty.won, [].players[].statistics[].shots.on, [].players[].statistics[].shots.total, [].players[].statistics[].tackles.blocks, [].players[].statistics[].tackles.interceptions, [].players[].statistics[].tackles.total
- `/predictions` — [].h2h[].fixture.status.extra, [].h2h[].score.extratime.away, [].h2h[].score.extratime.home, [].h2h[].score.penalty.away, [].h2h[].score.penalty.home, [].h2h[].teams.away.winner, [].h2h[].teams.home.winner, [].predictions.goals.home, [].predictions.under_over, [].predictions.winner.comment, [].teams.away.league.biggest.loses.away, [].teams.away.league.biggest.loses.home, [].teams.away.league.biggest.wins.away, [].teams.away.league.cards.red.0-15.percentage, [].teams.away.league.cards.red.0-15.total, [].teams.away.league.cards.red.106-120.percentage, [].teams.away.league.cards.red.106-120.total, [].teams.away.league.cards.red.16-30.percentage, [].teams.away.league.cards.red.16-30.total, [].teams.away.league.cards.red.31-45.percentage, [].teams.away.league.cards.red.31-45.total, [].teams.away.league.cards.red.46-60.percentage, [].teams.away.league.cards.red.46-60.total, [].teams.away.league.cards.red.61-75.percentage, [].teams.away.league.cards.red.61-75.total, [].teams.away.league.cards.red.76-90.percentage, [].teams.away.league.cards.red.76-90.total, [].teams.away.league.cards.red.91-105.percentage, [].teams.away.league.cards.red.91-105.total, [].teams.away.league.cards.yellow.0-15.percentage, [].teams.away.league.cards.yellow.0-15.total, [].teams.away.league.cards.yellow.106-120.percentage, [].teams.away.league.cards.yellow.106-120.total, [].teams.away.league.cards.yellow.16-30.percentage, [].teams.away.league.cards.yellow.16-30.total, [].teams.away.league.cards.yellow.46-60.percentage, [].teams.away.league.cards.yellow.46-60.total, [].teams.away.league.cards.yellow.61-75.percentage, [].teams.away.league.cards.yellow.61-75.total, [].teams.away.league.cards.yellow.76-90.percentage, [].teams.away.league.cards.yellow.76-90.total, [].teams.away.league.cards.yellow.91-105.percentage, [].teams.away.league.cards.yellow.91-105.total, [].teams.away.league.goals.against.minute.0-15.percentage, [].teams.away.league.goals.against.minute.0-15.total, [].teams.away.league.goals.against.minute.106-120.percentage, [].teams.away.league.goals.against.minute.106-120.total, [].teams.away.league.goals.against.minute.16-30.percentage, [].teams.away.league.goals.against.minute.16-30.total, [].teams.away.league.goals.against.minute.31-45.percentage, [].teams.away.league.goals.against.minute.31-45.total, [].teams.away.league.goals.against.minute.46-60.percentage, [].teams.away.league.goals.against.minute.46-60.total, [].teams.away.league.goals.against.minute.61-75.percentage, [].teams.away.league.goals.against.minute.61-75.total, [].teams.away.league.goals.against.minute.76-90.percentage, [].teams.away.league.goals.against.minute.76-90.total, [].teams.away.league.goals.against.minute.91-105.percentage, [].teams.away.league.goals.against.minute.91-105.total, [].teams.away.league.goals.for.minute.106-120.percentage, [].teams.away.league.goals.for.minute.106-120.total, [].teams.away.league.goals.for.minute.31-45.percentage, [].teams.away.league.goals.for.minute.31-45.total, [].teams.away.league.goals.for.minute.61-75.percentage, [].teams.away.league.goals.for.minute.61-75.total, [].teams.away.league.goals.for.minute.76-90.percentage, [].teams.away.league.goals.for.minute.76-90.total, [].teams.away.league.goals.for.minute.91-105.percentage, [].teams.away.league.goals.for.minute.91-105.total, [].teams.home.league.biggest.loses.home, [].teams.home.league.biggest.wins.away, [].teams.home.league.biggest.wins.home, [].teams.home.league.cards.red.0-15.percentage, [].teams.home.league.cards.red.0-15.total, [].teams.home.league.cards.red.106-120.percentage, [].teams.home.league.cards.red.106-120.total, [].teams.home.league.cards.red.16-30.percentage, [].teams.home.league.cards.red.16-30.total, [].teams.home.league.cards.red.46-60.percentage, [].teams.home.league.cards.red.46-60.total, [].teams.home.league.cards.red.61-75.percentage, [].teams.home.league.cards.red.61-75.total, [].teams.home.league.cards.red.76-90.percentage, [].teams.home.league.cards.red.76-90.total, [].teams.home.league.cards.red.91-105.percentage, [].teams.home.league.cards.red.91-105.total, [].teams.home.league.cards.yellow.106-120.percentage, [].teams.home.league.cards.yellow.106-120.total, [].teams.home.league.cards.yellow.16-30.percentage, [].teams.home.league.cards.yellow.16-30.total, [].teams.home.league.cards.yellow.46-60.percentage, [].teams.home.league.cards.yellow.46-60.total, [].teams.home.league.cards.yellow.61-75.percentage, [].teams.home.league.cards.yellow.61-75.total, [].teams.home.league.cards.yellow.76-90.percentage, [].teams.home.league.cards.yellow.76-90.total, [].teams.home.league.goals.against.minute.0-15.percentage, [].teams.home.league.goals.against.minute.0-15.total, [].teams.home.league.goals.against.minute.106-120.percentage, [].teams.home.league.goals.against.minute.106-120.total, [].teams.home.league.goals.against.minute.46-60.percentage, [].teams.home.league.goals.against.minute.46-60.total, [].teams.home.league.goals.against.minute.61-75.percentage, [].teams.home.league.goals.against.minute.61-75.total, [].teams.home.league.goals.against.minute.76-90.percentage, [].teams.home.league.goals.against.minute.76-90.total, [].teams.home.league.goals.against.minute.91-105.percentage, [].teams.home.league.goals.against.minute.91-105.total, [].teams.home.league.goals.for.minute.106-120.percentage, [].teams.home.league.goals.for.minute.106-120.total, [].teams.home.league.goals.for.minute.16-30.percentage, [].teams.home.league.goals.for.minute.16-30.total, [].teams.home.league.goals.for.minute.31-45.percentage, [].teams.home.league.goals.for.minute.31-45.total, [].teams.home.league.goals.for.minute.46-60.percentage, [].teams.home.league.goals.for.minute.46-60.total, [].teams.home.league.goals.for.minute.61-75.percentage, [].teams.home.league.goals.for.minute.61-75.total, [].teams.home.league.goals.for.minute.76-90.percentage, [].teams.home.league.goals.for.minute.76-90.total, [].teams.home.league.goals.for.minute.91-105.percentage, [].teams.home.league.goals.for.minute.91-105.total
- `/fixtures/headtohead` — [].fixture.status.extra, [].fixture.venue.id, [].league.flag, [].score.extratime.away, [].score.extratime.home, [].score.penalty.away, [].score.penalty.home, [].teams.away.winner, [].teams.home.winner
- `/players` — [].statistics[].dribbles.attempts, [].statistics[].dribbles.past, [].statistics[].dribbles.success, [].statistics[].duels.total, [].statistics[].duels.won, [].statistics[].fouls.committed, [].statistics[].fouls.drawn, [].statistics[].games.minutes, [].statistics[].games.rating, [].statistics[].goals.saves, [].statistics[].passes.accuracy, [].statistics[].passes.key, [].statistics[].passes.total, [].statistics[].penalty.commited, [].statistics[].penalty.saved, [].statistics[].penalty.won, [].statistics[].shots.on, [].statistics[].shots.total, [].statistics[].tackles.blocks, [].statistics[].tackles.interceptions, [].statistics[].tackles.total
- `/players` — [].statistics[].cards.yellowred, [].statistics[].dribbles.attempts, [].statistics[].dribbles.past, [].statistics[].dribbles.success, [].statistics[].duels.total, [].statistics[].duels.won, [].statistics[].fouls.committed, [].statistics[].fouls.drawn, [].statistics[].games.number, [].statistics[].games.rating, [].statistics[].goals.assists, [].statistics[].goals.conceded, [].statistics[].goals.saves, [].statistics[].passes.accuracy, [].statistics[].passes.key, [].statistics[].passes.total, [].statistics[].penalty.commited, [].statistics[].penalty.missed, [].statistics[].penalty.saved, [].statistics[].penalty.scored, [].statistics[].penalty.won, [].statistics[].shots.on, [].statistics[].shots.total, [].statistics[].substitutes.bench, [].statistics[].substitutes.out, [].statistics[].tackles.blocks, [].statistics[].tackles.interceptions, [].statistics[].tackles.total
- `/players` — [].statistics[].cards.yellowred, [].statistics[].dribbles.attempts, [].statistics[].dribbles.past, [].statistics[].dribbles.success, [].statistics[].duels.total, [].statistics[].duels.won, [].statistics[].fouls.committed, [].statistics[].fouls.drawn, [].statistics[].games.number, [].statistics[].games.rating, [].statistics[].goals.assists, [].statistics[].goals.conceded, [].statistics[].goals.saves, [].statistics[].passes.accuracy, [].statistics[].passes.key, [].statistics[].passes.total, [].statistics[].penalty.commited, [].statistics[].penalty.missed, [].statistics[].penalty.saved, [].statistics[].penalty.scored, [].statistics[].penalty.won, [].statistics[].shots.on, [].statistics[].shots.total, [].statistics[].substitutes.bench, [].statistics[].substitutes.out, [].statistics[].tackles.blocks, [].statistics[].tackles.interceptions, [].statistics[].tackles.total
- `/standings` — [].league.standings[][].description, [].league.standings[][].status
- `/fixtures` — [].fixture.referee, [].fixture.status.extra, [].fixture.venue.city, [].fixture.venue.name, [].score.extratime.away, [].score.extratime.home, [].score.penalty.away, [].score.penalty.home
- `/players/topscorers` — [].statistics[].dribbles.past, [].statistics[].fouls.committed, [].statistics[].fouls.drawn, [].statistics[].goals.saves, [].statistics[].passes.key, [].statistics[].penalty.commited, [].statistics[].penalty.saved, [].statistics[].penalty.won, [].statistics[].tackles.blocks, [].statistics[].tackles.interceptions, [].statistics[].tackles.total
- `/players/topassists` — [].statistics[].dribbles.attempts, [].statistics[].dribbles.past, [].statistics[].dribbles.success, [].statistics[].fouls.drawn, [].statistics[].goals.saves, [].statistics[].penalty.commited, [].statistics[].penalty.saved, [].statistics[].penalty.won, [].statistics[].shots.on, [].statistics[].tackles.blocks, [].statistics[].tackles.interceptions, [].statistics[].tackles.total
- `/players/topyellowcards` — [].player.birth.place, [].statistics[].dribbles.attempts, [].statistics[].dribbles.past, [].statistics[].dribbles.success, [].statistics[].fouls.drawn, [].statistics[].goals.saves, [].statistics[].passes.key, [].statistics[].penalty.commited, [].statistics[].penalty.saved, [].statistics[].penalty.won, [].statistics[].shots.on, [].statistics[].shots.total, [].statistics[].tackles.blocks, [].statistics[].tackles.interceptions
- `/players/topredcards` — [].player.birth.place, [].statistics[].dribbles.attempts, [].statistics[].dribbles.past, [].statistics[].dribbles.success, [].statistics[].fouls.drawn, [].statistics[].goals.saves, [].statistics[].passes.key, [].statistics[].penalty.commited, [].statistics[].penalty.saved, [].statistics[].penalty.won, [].statistics[].shots.on, [].statistics[].shots.total, [].statistics[].tackles.blocks, [].statistics[].tackles.interceptions
