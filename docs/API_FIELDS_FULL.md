# API-Football — 엔드포인트별 전체 필드

> 생성: 2026-09-04 · `scripts/probe-api-inventory.mjs` v2
> 응답에서 실제로 관측된 키 경로 전량. `[]`는 배열, `:뒤`는 값 타입.
> 배열은 요소 8개까지 병합해 훑었으므로, 드물게 나타나는 필드는 빠질 수 있다.

## `/status`

구독 플랜·일 한도·만료일·잔여 콜 · 0건 · 키 11개

```
account.email:string
account.firstname:string
account.lastname:string
account:object
requests.current:number
requests.limit_day:number
requests:object
subscription.active:boolean
subscription.end:string
subscription.plan:string
subscription:object
```

## `/timezone`

지원 타임존 · 427건 · 키 0개

```
```

## `/countries`

국가 목록 · 171건 · 키 3개

```
[].code:string
[].flag:string
[].name:string
```

## `/leagues?id=39&season=2026`

대회 정보 + 커버리지 플래그 · 1건 · 키 28개

```
[].country.code:string
[].country.flag:string
[].country.name:string
[].country:object
[].league.id:number
[].league.logo:string
[].league.name:string
[].league.type:string
[].league:object
[].seasons:array
[].seasons[].coverage.fixtures.events:boolean
[].seasons[].coverage.fixtures.lineups:boolean
[].seasons[].coverage.fixtures.statistics_fixtures:boolean
[].seasons[].coverage.fixtures.statistics_players:boolean
[].seasons[].coverage.fixtures:object
[].seasons[].coverage.injuries:boolean
[].seasons[].coverage.odds:boolean
[].seasons[].coverage.players:boolean
[].seasons[].coverage.predictions:boolean
[].seasons[].coverage.standings:boolean
[].seasons[].coverage.top_assists:boolean
[].seasons[].coverage.top_cards:boolean
[].seasons[].coverage.top_scorers:boolean
[].seasons[].coverage:object
[].seasons[].current:boolean
[].seasons[].end:string
[].seasons[].start:string
[].seasons[].year:number
```

## `/leagues/seasons`

제공 시즌 연도 · 20건 · 키 0개

```
```

## `/standings?league=39&season=2026`

순위표 — 사이트 핵심 · 1건 · 키 44개

```
[].league.country:string
[].league.flag:string
[].league.id:number
[].league.logo:string
[].league.name:string
[].league.season:number
[].league.standings:array
[].league.standings[][].all.draw:number
[].league.standings[][].all.goals.against:number
[].league.standings[][].all.goals.for:number
[].league.standings[][].all.goals:object
[].league.standings[][].all.lose:number
[].league.standings[][].all.played:number
[].league.standings[][].all.win:number
[].league.standings[][].all:object
[].league.standings[][].away.draw:number
[].league.standings[][].away.goals.against:number
[].league.standings[][].away.goals.for:number
[].league.standings[][].away.goals:object
[].league.standings[][].away.lose:number
[].league.standings[][].away.played:number
[].league.standings[][].away.win:number
[].league.standings[][].away:object
[].league.standings[][].description:string
[].league.standings[][].form:string
[].league.standings[][].goalsDiff:number
[].league.standings[][].group:string
[].league.standings[][].home.draw:number
[].league.standings[][].home.goals.against:number
[].league.standings[][].home.goals.for:number
[].league.standings[][].home.goals:object
[].league.standings[][].home.lose:number
[].league.standings[][].home.played:number
[].league.standings[][].home.win:number
[].league.standings[][].home:object
[].league.standings[][].points:number
[].league.standings[][].rank:number
[].league.standings[][].status:string
[].league.standings[][].team.id:number
[].league.standings[][].team.logo:string
[].league.standings[][].team.name:string
[].league.standings[][].team:object
[].league.standings[][].update:string
[].league:object
```

**null 로 온 필드:** `[].league.standings[][].description`

## `/fixtures/rounds?league=39&season=2026`

라운드 목록 · 38건 · 키 0개

```
```

## `/teams?league=39&season=2026`

팀 목록 + 로고 + 경기장 · 20건 · 키 16개

```
[].team.code:string
[].team.country:string
[].team.founded:number
[].team.id:number
[].team.logo:string
[].team.name:string
[].team.national:boolean
[].team:object
[].venue.address:string
[].venue.capacity:number
[].venue.city:string
[].venue.id:number
[].venue.image:string
[].venue.name:string
[].venue.surface:string
[].venue:object
```

## `/teams/statistics?league=39&season=2026&team=33`

팀 시즌 통계 — 팀 상세 · 11건 · 키 218개

```
biggest.goals.against.away:number
biggest.goals.against.home:number
biggest.goals.against:object
biggest.goals.for.away:number
biggest.goals.for.home:number
biggest.goals.for:object
biggest.goals:object
biggest.loses.away:string
biggest.loses.home:null
biggest.loses:object
biggest.streak.draws:number
biggest.streak.loses:number
biggest.streak.wins:number
biggest.streak:object
biggest.wins.away:null
biggest.wins.home:string
biggest.wins:object
biggest:object
cards.red.0-15.percentage:null
cards.red.0-15.total:null
cards.red.0-15:object
cards.red.106-120.percentage:null
cards.red.106-120.total:null
cards.red.106-120:object
cards.red.16-30.percentage:null
cards.red.16-30.total:null
cards.red.16-30:object
cards.red.31-45.percentage:null
cards.red.31-45.total:null
cards.red.31-45:object
cards.red.46-60.percentage:null
cards.red.46-60.total:null
cards.red.46-60:object
cards.red.61-75.percentage:null
cards.red.61-75.total:null
cards.red.61-75:object
cards.red.76-90.percentage:null
cards.red.76-90.total:null
cards.red.76-90:object
cards.red.91-105.percentage:null
cards.red.91-105.total:null
cards.red.91-105:object
cards.red:object
cards.yellow.0-15.percentage:null
cards.yellow.0-15.total:null
cards.yellow.0-15:object
cards.yellow.106-120.percentage:null
cards.yellow.106-120.total:null
cards.yellow.106-120:object
cards.yellow.16-30.percentage:null
cards.yellow.16-30.total:null
cards.yellow.16-30:object
cards.yellow.31-45.percentage:string
cards.yellow.31-45.total:number
cards.yellow.31-45:object
cards.yellow.46-60.percentage:null
cards.yellow.46-60.total:null
cards.yellow.46-60:object
cards.yellow.61-75.percentage:null
cards.yellow.61-75.total:null
cards.yellow.61-75:object
cards.yellow.76-90.percentage:null
cards.yellow.76-90.total:null
cards.yellow.76-90:object
cards.yellow.91-105.percentage:string
cards.yellow.91-105.total:number
cards.yellow.91-105:object
cards.yellow:object
cards:object
clean_sheet.away:number
clean_sheet.home:number
clean_sheet.total:number
clean_sheet:object
failed_to_score.away:number
failed_to_score.home:number
failed_to_score.total:number
failed_to_score:object
fixtures.draws.away:number
fixtures.draws.home:number
fixtures.draws.total:number
fixtures.draws:object
fixtures.loses.away:number
fixtures.loses.home:number
fixtures.loses.total:number
fixtures.loses:object
fixtures.played.away:number
fixtures.played.home:number
fixtures.played.total:number
fixtures.played:object
fixtures.wins.away:number
fixtures.wins.home:number
fixtures.wins.total:number
fixtures.wins:object
fixtures:object
form:string
goals.against.average.away:string
goals.against.average.home:string
goals.against.average.total:string
goals.against.average:object
goals.against.minute.0-15.percentage:null
goals.against.minute.0-15.total:null
goals.against.minute.0-15:object
goals.against.minute.106-120.percentage:null
goals.against.minute.106-120.total:null
goals.against.minute.106-120:object
goals.against.minute.16-30.percentage:string
goals.against.minute.16-30.total:number
goals.against.minute.16-30:object
goals.against.minute.31-45.percentage:string
goals.against.minute.31-45.total:number
goals.against.minute.31-45:object
goals.against.minute.46-60.percentage:string
goals.against.minute.46-60.total:number
goals.against.minute.46-60:object
goals.against.minute.61-75.percentage:null
goals.against.minute.61-75.total:null
goals.against.minute.61-75:object
goals.against.minute.76-90.percentage:string
goals.against.minute.76-90.total:number
goals.against.minute.76-90:object
goals.against.minute.91-105.percentage:null
goals.against.minute.91-105.total:null
goals.against.minute.91-105:object
goals.against.minute:object
goals.against.total.away:number
goals.against.total.home:number
goals.against.total.total:number
goals.against.total:object
goals.against.under_over.0.5.over:number
goals.against.under_over.0.5.under:number
goals.against.under_over.0.5:object
goals.against.under_over.1.5.over:number
goals.against.under_over.1.5.under:number
goals.against.under_over.1.5:object
goals.against.under_over.2.5.over:number
goals.against.under_over.2.5.under:number
goals.against.under_over.2.5:object
goals.against.under_over.3.5.over:number
goals.against.under_over.3.5.under:number
goals.against.under_over.3.5:object
goals.against.under_over.4.5.over:number
goals.against.under_over.4.5.under:number
goals.against.under_over.4.5:object
goals.against.under_over:object
goals.against:object
goals.for.average.away:string
goals.for.average.home:string
goals.for.average.total:string
goals.for.average:object
goals.for.minute.0-15.percentage:null
goals.for.minute.0-15.total:null
goals.for.minute.0-15:object
goals.for.minute.106-120.percentage:null
goals.for.minute.106-120.total:null
goals.for.minute.106-120:object
goals.for.minute.16-30.percentage:null
goals.for.minute.16-30.total:null
goals.for.minute.16-30:object
goals.for.minute.31-45.percentage:string
goals.for.minute.31-45.total:number
goals.for.minute.31-45:object
goals.for.minute.46-60.percentage:null
goals.for.minute.46-60.total:null
goals.for.minute.46-60:object
goals.for.minute.61-75.percentage:string
goals.for.minute.61-75.total:number
goals.for.minute.61-75:object
goals.for.minute.76-90.percentage:string
goals.for.minute.76-90.total:number
goals.for.minute.76-90:object
goals.for.minute.91-105.percentage:null
goals.for.minute.91-105.total:null
goals.for.minute.91-105:object
goals.for.minute:object
goals.for.total.away:number
goals.for.total.home:number
goals.for.total.total:number
goals.for.total:object
goals.for.under_over.0.5.over:number
goals.for.under_over.0.5.under:number
goals.for.under_over.0.5:object
goals.for.under_over.1.5.over:number
goals.for.under_over.1.5.under:number
goals.for.under_over.1.5:object
goals.for.under_over.2.5.over:number
goals.for.under_over.2.5.under:number
goals.for.under_over.2.5:object
goals.for.under_over.3.5.over:number
goals.for.under_over.3.5.under:number
goals.for.under_over.3.5:object
goals.for.under_over.4.5.over:number
goals.for.under_over.4.5.under:number
goals.for.under_over.4.5:object
goals.for.under_over:object
goals.for:object
goals:object
league.country:string
league.flag:string
league.id:number
league.logo:string
league.name:string
league.season:number
league:object
lineups:array
lineups[].formation:string
lineups[].played:number
penalty.missed.percentage:string
penalty.missed.total:number
penalty.missed:object
penalty.scored.percentage:string
penalty.scored.total:number
penalty.scored:object
penalty.total:number
penalty:object
team.id:number
team.logo:string
team.name:string
team:object
```

**null 로 온 필드:** `biggest.loses.home`, `biggest.wins.away`, `cards.red.0-15.percentage`, `cards.red.0-15.total`, `cards.red.106-120.percentage`, `cards.red.106-120.total`, `cards.red.16-30.percentage`, `cards.red.16-30.total`, `cards.red.31-45.percentage`, `cards.red.31-45.total`, `cards.red.46-60.percentage`, `cards.red.46-60.total`, `cards.red.61-75.percentage`, `cards.red.61-75.total`, `cards.red.76-90.percentage`, `cards.red.76-90.total`, `cards.red.91-105.percentage`, `cards.red.91-105.total`, `cards.yellow.0-15.percentage`, `cards.yellow.0-15.total`, `cards.yellow.106-120.percentage`, `cards.yellow.106-120.total`, `cards.yellow.16-30.percentage`, `cards.yellow.16-30.total`, `cards.yellow.46-60.percentage`, `cards.yellow.46-60.total`, `cards.yellow.61-75.percentage`, `cards.yellow.61-75.total`, `cards.yellow.76-90.percentage`, `cards.yellow.76-90.total`, `goals.against.minute.0-15.percentage`, `goals.against.minute.0-15.total`, `goals.against.minute.106-120.percentage`, `goals.against.minute.106-120.total`, `goals.against.minute.61-75.percentage`, `goals.against.minute.61-75.total`, `goals.against.minute.91-105.percentage`, `goals.against.minute.91-105.total`, `goals.for.minute.0-15.percentage`, `goals.for.minute.0-15.total`, `goals.for.minute.106-120.percentage`, `goals.for.minute.106-120.total`, `goals.for.minute.16-30.percentage`, `goals.for.minute.16-30.total`, `goals.for.minute.46-60.percentage`, `goals.for.minute.46-60.total`, `goals.for.minute.91-105.percentage`, `goals.for.minute.91-105.total`

## `/teams/seasons?team=33`

해당 팀 제공 시즌 · 17건 · 키 0개

```
```

## `/teams/countries`

팀 보유 국가 · 234건 · 키 3개

```
[].code:string
[].flag:string
[].name:string
```

**null 로 온 필드:** `[].code`, `[].flag`

## `/venues?country=England`

경기장 상세 · 896건 · 키 8개

```
[].address:string
[].capacity:number
[].city:string
[].country:string
[].id:number
[].image:string
[].name:string
[].surface:string
```

## `/coachs?team=33`

감독 + 경력 · 2건 · 키 24개

```
[].age:number
[].birth.country:string
[].birth.date:string
[].birth.place:string
[].birth:object
[].career:array
[].career[].end:string
[].career[].start:string
[].career[].team.id:number
[].career[].team.logo:string
[].career[].team.name:string
[].career[].team:object
[].firstname:string
[].height:null
[].id:number
[].lastname:string
[].name:string
[].nationality:string
[].photo:string
[].team.id:number
[].team.logo:string
[].team.name:string
[].team:object
[].weight:null
```

**null 로 온 필드:** `[].age`, `[].birth.country`, `[].birth.date`, `[].birth.place`, `[].career[].end`, `[].firstname`, `[].height`, `[].lastname`, `[].nationality`, `[].weight`

## `/transfers?team=33`

이적 이력 — 임대 구분용 · 278건 · 키 16개

```
[].player.id:number
[].player.name:string
[].player:object
[].transfers:array
[].transfers[].date:string
[].transfers[].teams.in.id:number
[].transfers[].teams.in.logo:string
[].transfers[].teams.in.name:string
[].transfers[].teams.in:object
[].transfers[].teams.out.id:number
[].transfers[].teams.out.logo:string
[].transfers[].teams.out.name:string
[].transfers[].teams.out:object
[].transfers[].teams:object
[].transfers[].type:string
[].update:string
```

**유형 값:**

- `[].transfers[].type` (5종) — Free · Loan · N/A · € 250K · € 3M

## `/fixtures?league=39&season=2026&last=1`

경기 목록 · 1건 · 키 54개

```
[].fixture.date:string
[].fixture.id:number
[].fixture.periods.first:number
[].fixture.periods.second:number
[].fixture.periods:object
[].fixture.referee:string
[].fixture.status.elapsed:number
[].fixture.status.extra:number
[].fixture.status.long:string
[].fixture.status.short:string
[].fixture.status:object
[].fixture.timestamp:number
[].fixture.timezone:string
[].fixture.venue.city:string
[].fixture.venue.id:number
[].fixture.venue.name:string
[].fixture.venue:object
[].fixture:object
[].goals.away:number
[].goals.home:number
[].goals:object
[].league.country:string
[].league.flag:string
[].league.id:number
[].league.logo:string
[].league.name:string
[].league.round:string
[].league.season:number
[].league.standings:boolean
[].league:object
[].score.extratime.away:null
[].score.extratime.home:null
[].score.extratime:object
[].score.fulltime.away:number
[].score.fulltime.home:number
[].score.fulltime:object
[].score.halftime.away:number
[].score.halftime.home:number
[].score.halftime:object
[].score.penalty.away:null
[].score.penalty.home:null
[].score.penalty:object
[].score:object
[].teams.away.id:number
[].teams.away.logo:string
[].teams.away.name:string
[].teams.away.winner:boolean
[].teams.away:object
[].teams.home.id:number
[].teams.home.logo:string
[].teams.home.name:string
[].teams.home.winner:boolean
[].teams.home:object
[].teams:object
```

**null 로 온 필드:** `[].score.extratime.away`, `[].score.extratime.home`, `[].score.penalty.away`, `[].score.penalty.home`

## `/fixtures?date=2026-09-04`

날짜 기준 조회 — 홈 "오늘의 경기" · 451건 · 키 54개

```
[].fixture.date:string
[].fixture.id:number
[].fixture.periods.first:number
[].fixture.periods.second:number
[].fixture.periods:object
[].fixture.referee:string
[].fixture.status.elapsed:number
[].fixture.status.extra:number
[].fixture.status.long:string
[].fixture.status.short:string
[].fixture.status:object
[].fixture.timestamp:number
[].fixture.timezone:string
[].fixture.venue.city:string
[].fixture.venue.id:number
[].fixture.venue.name:string
[].fixture.venue:object
[].fixture:object
[].goals.away:number
[].goals.home:number
[].goals:object
[].league.country:string
[].league.flag:string
[].league.id:number
[].league.logo:string
[].league.name:string
[].league.round:string
[].league.season:number
[].league.standings:boolean
[].league:object
[].score.extratime.away:null
[].score.extratime.home:null
[].score.extratime:object
[].score.fulltime.away:number
[].score.fulltime.home:number
[].score.fulltime:object
[].score.halftime.away:number
[].score.halftime.home:number
[].score.halftime:object
[].score.penalty.away:null
[].score.penalty.home:null
[].score.penalty:object
[].score:object
[].teams.away.id:number
[].teams.away.logo:string
[].teams.away.name:string
[].teams.away.winner:boolean
[].teams.away:object
[].teams.home.id:number
[].teams.home.logo:string
[].teams.home.name:string
[].teams.home.winner:boolean
[].teams.home:object
[].teams:object
```

**null 로 온 필드:** `[].fixture.periods.first`, `[].fixture.periods.second`, `[].fixture.referee`, `[].fixture.status.elapsed`, `[].fixture.status.extra`, `[].fixture.venue.city`, `[].fixture.venue.id`, `[].fixture.venue.name`, `[].goals.away`, `[].goals.home`, `[].league.flag`, `[].score.extratime.away`, `[].score.extratime.home`, `[].score.fulltime.away`, `[].score.fulltime.home`, `[].score.halftime.away`, `[].score.halftime.home`, `[].score.penalty.away`, `[].score.penalty.home`, `[].teams.away.winner`, `[].teams.home.winner`

## `/fixtures?team=33&season=2026&last=5`

팀 최근 경기 — 팀 상세 폼 · 5건 · 키 54개

```
[].fixture.date:string
[].fixture.id:number
[].fixture.periods.first:number
[].fixture.periods.second:number
[].fixture.periods:object
[].fixture.referee:string
[].fixture.status.elapsed:number
[].fixture.status.extra:number
[].fixture.status.long:string
[].fixture.status.short:string
[].fixture.status:object
[].fixture.timestamp:number
[].fixture.timezone:string
[].fixture.venue.city:string
[].fixture.venue.id:number
[].fixture.venue.name:string
[].fixture.venue:object
[].fixture:object
[].goals.away:number
[].goals.home:number
[].goals:object
[].league.country:string
[].league.flag:string
[].league.id:number
[].league.logo:string
[].league.name:string
[].league.round:string
[].league.season:number
[].league.standings:boolean
[].league:object
[].score.extratime.away:null
[].score.extratime.home:null
[].score.extratime:object
[].score.fulltime.away:number
[].score.fulltime.home:number
[].score.fulltime:object
[].score.halftime.away:number
[].score.halftime.home:number
[].score.halftime:object
[].score.penalty.away:number
[].score.penalty.home:number
[].score.penalty:object
[].score:object
[].teams.away.id:number
[].teams.away.logo:string
[].teams.away.name:string
[].teams.away.winner:boolean
[].teams.away:object
[].teams.home.id:number
[].teams.home.logo:string
[].teams.home.name:string
[].teams.home.winner:boolean
[].teams.home:object
[].teams:object
```

**null 로 온 필드:** `[].fixture.referee`, `[].fixture.status.extra`, `[].fixture.venue.city`, `[].fixture.venue.id`, `[].league.flag`, `[].score.extratime.away`, `[].score.extratime.home`, `[].score.penalty.away`, `[].score.penalty.home`, `[].teams.away.winner`, `[].teams.home.winner`

## `/fixtures/statistics?fixture=1557377`

팀 경기 통계 (xG 포함) · 2건 · 키 7개

```
[].statistics:array
[].statistics[].type:string
[].statistics[].value:number
[].team.id:number
[].team.logo:string
[].team.name:string
[].team:object
```

**유형 값:**

- `[].statistics[].type` (18종) — Ball Possession · Blocked Shots · Corner Kicks · Fouls · Goalkeeper Saves · Offsides · Passes % · Passes accurate · Red Cards · Shots insidebox · Shots off Goal · Shots on Goal · Shots outsidebox · Total Shots · Total passes · Yellow Cards · expected_goals · goals_prevented

## `/fixtures/events?fixture=1557377`

득점·카드·교체 — 타임라인 · 16건 · 키 16개

```
[].assist.id:number
[].assist.name:string
[].assist:object
[].comments:string
[].detail:string
[].player.id:number
[].player.name:string
[].player:object
[].team.id:number
[].team.logo:string
[].team.name:string
[].team:object
[].time.elapsed:number
[].time.extra:null
[].time:object
[].type:string
```

**유형 값:**

- `[].type` (4종) — Card · Goal · Var · subst

**null 로 온 필드:** `[].assist.id`, `[].assist.name`, `[].comments`, `[].player.id`, `[].player.name`, `[].time.extra`

## `/fixtures/lineups?fixture=1557377`

라인업·포메이션·벤치 · 2건 · 키 32개

```
[].coach.id:number
[].coach.name:string
[].coach.photo:string
[].coach:object
[].formation:string
[].startXI:array
[].startXI[].player.grid:string
[].startXI[].player.id:number
[].startXI[].player.name:string
[].startXI[].player.number:number
[].startXI[].player.pos:string
[].startXI[].player:object
[].substitutes:array
[].substitutes[].player.grid:null
[].substitutes[].player.id:number
[].substitutes[].player.name:string
[].substitutes[].player.number:number
[].substitutes[].player.pos:string
[].substitutes[].player:object
[].team.colors.goalkeeper.border:string
[].team.colors.goalkeeper.number:string
[].team.colors.goalkeeper.primary:string
[].team.colors.goalkeeper:object
[].team.colors.player.border:string
[].team.colors.player.number:string
[].team.colors.player.primary:string
[].team.colors.player:object
[].team.colors:object
[].team.id:number
[].team.logo:string
[].team.name:string
[].team:object
```

**null 로 온 필드:** `[].substitutes[].player.grid`

## `/fixtures/players?fixture=1557377`

선수별 경기 통계 · 2건 · 키 54개

```
[].players:array
[].players[].player.id:number
[].players[].player.name:string
[].players[].player.photo:string
[].players[].player:object
[].players[].statistics:array
[].players[].statistics[].cards.red:number
[].players[].statistics[].cards.yellow:number
[].players[].statistics[].cards:object
[].players[].statistics[].dribbles.attempts:number
[].players[].statistics[].dribbles.past:number
[].players[].statistics[].dribbles.success:number
[].players[].statistics[].dribbles:object
[].players[].statistics[].duels.total:number
[].players[].statistics[].duels.won:number
[].players[].statistics[].duels:object
[].players[].statistics[].fouls.committed:number
[].players[].statistics[].fouls.drawn:number
[].players[].statistics[].fouls:object
[].players[].statistics[].games.captain:boolean
[].players[].statistics[].games.minutes:number
[].players[].statistics[].games.number:number
[].players[].statistics[].games.position:string
[].players[].statistics[].games.rating:string
[].players[].statistics[].games.substitute:boolean
[].players[].statistics[].games:object
[].players[].statistics[].goals.assists:number
[].players[].statistics[].goals.conceded:number
[].players[].statistics[].goals.saves:number
[].players[].statistics[].goals.total:number
[].players[].statistics[].goals:object
[].players[].statistics[].offsides:number
[].players[].statistics[].passes.accuracy:string
[].players[].statistics[].passes.key:number
[].players[].statistics[].passes.total:number
[].players[].statistics[].passes:object
[].players[].statistics[].penalty.commited:null
[].players[].statistics[].penalty.missed:number
[].players[].statistics[].penalty.saved:number
[].players[].statistics[].penalty.scored:number
[].players[].statistics[].penalty.won:null
[].players[].statistics[].penalty:object
[].players[].statistics[].shots.on:number
[].players[].statistics[].shots.total:number
[].players[].statistics[].shots:object
[].players[].statistics[].tackles.blocks:number
[].players[].statistics[].tackles.interceptions:number
[].players[].statistics[].tackles.total:number
[].players[].statistics[].tackles:object
[].team.id:number
[].team.logo:string
[].team.name:string
[].team.update:string
[].team:object
```

**null 로 온 필드:** `[].players[].statistics[].dribbles.attempts`, `[].players[].statistics[].dribbles.past`, `[].players[].statistics[].dribbles.success`, `[].players[].statistics[].duels.total`, `[].players[].statistics[].duels.won`, `[].players[].statistics[].fouls.committed`, `[].players[].statistics[].fouls.drawn`, `[].players[].statistics[].goals.saves`, `[].players[].statistics[].goals.total`, `[].players[].statistics[].offsides`, `[].players[].statistics[].passes.key`, `[].players[].statistics[].penalty.commited`, `[].players[].statistics[].penalty.saved`, `[].players[].statistics[].penalty.won`, `[].players[].statistics[].shots.on`, `[].players[].statistics[].shots.total`, `[].players[].statistics[].tackles.blocks`, `[].players[].statistics[].tackles.interceptions`, `[].players[].statistics[].tackles.total`

## `/predictions?fixture=1557377`

승부 예측·확률 · 1건 · 키 548개

```
[].comparison.att.away:string
[].comparison.att.home:string
[].comparison.att:object
[].comparison.def.away:string
[].comparison.def.home:string
[].comparison.def:object
[].comparison.form.away:string
[].comparison.form.home:string
[].comparison.form:object
[].comparison.goals.away:string
[].comparison.goals.home:string
[].comparison.goals:object
[].comparison.h2h.away:string
[].comparison.h2h.home:string
[].comparison.h2h:object
[].comparison.poisson_distribution.away:string
[].comparison.poisson_distribution.home:string
[].comparison.poisson_distribution:object
[].comparison.total.away:string
[].comparison.total.home:string
[].comparison.total:object
[].comparison:object
[].h2h:array
[].h2h[].fixture.date:string
[].h2h[].fixture.id:number
[].h2h[].fixture.periods.first:number
[].h2h[].fixture.periods.second:number
[].h2h[].fixture.periods:object
[].h2h[].fixture.referee:string
[].h2h[].fixture.status.elapsed:number
[].h2h[].fixture.status.extra:number
[].h2h[].fixture.status.long:string
[].h2h[].fixture.status.short:string
[].h2h[].fixture.status:object
[].h2h[].fixture.timestamp:number
[].h2h[].fixture.timezone:string
[].h2h[].fixture.venue.city:string
[].h2h[].fixture.venue.id:number
[].h2h[].fixture.venue.name:string
[].h2h[].fixture.venue:object
[].h2h[].fixture:object
[].h2h[].goals.away:number
[].h2h[].goals.home:number
[].h2h[].goals:object
[].h2h[].league.country:string
[].h2h[].league.flag:string
[].h2h[].league.id:number
[].h2h[].league.logo:string
[].h2h[].league.name:string
[].h2h[].league.round:string
[].h2h[].league.season:number
[].h2h[].league.standings:boolean
[].h2h[].league:object
[].h2h[].score.extratime.away:null
[].h2h[].score.extratime.home:null
[].h2h[].score.extratime:object
[].h2h[].score.fulltime.away:number
[].h2h[].score.fulltime.home:number
[].h2h[].score.fulltime:object
[].h2h[].score.halftime.away:number
[].h2h[].score.halftime.home:number
[].h2h[].score.halftime:object
[].h2h[].score.penalty.away:null
[].h2h[].score.penalty.home:null
[].h2h[].score.penalty:object
[].h2h[].score:object
[].h2h[].teams.away.id:number
[].h2h[].teams.away.logo:string
[].h2h[].teams.away.name:string
[].h2h[].teams.away.winner:boolean
[].h2h[].teams.away:object
[].h2h[].teams.home.id:number
[].h2h[].teams.home.logo:string
[].h2h[].teams.home.name:string
[].h2h[].teams.home.winner:boolean
[].h2h[].teams.home:object
[].h2h[].teams:object
[].league.country:string
[].league.flag:string
[].league.id:number
[].league.logo:string
[].league.name:string
[].league.season:number
[].league:object
[].predictions.advice:string
[].predictions.goals.away:string
[].predictions.goals.home:null
[].predictions.goals:object
[].predictions.percent.away:string
[].predictions.percent.draw:string
[].predictions.percent.home:string
[].predictions.percent:object
[].predictions.under_over:null
[].predictions.win_or_draw:boolean
[].predictions.winner.comment:null
[].predictions.winner.id:number
[].predictions.winner.name:string
[].predictions.winner:object
[].predictions:object
[].teams.away.id:number
[].teams.away.last_5.att:string
[].teams.away.last_5.def:string
[].teams.away.last_5.form:string
[].teams.away.last_5.goals.against.average:string
[].teams.away.last_5.goals.against.total:number
[].teams.away.last_5.goals.against:object
[].teams.away.last_5.goals.for.average:string
[].teams.away.last_5.goals.for.total:number
[].teams.away.last_5.goals.for:object
[].teams.away.last_5.goals:object
[].teams.away.last_5.played:number
[].teams.away.last_5:object
[].teams.away.league.biggest.goals.against.away:number
[].teams.away.league.biggest.goals.against.home:number
[].teams.away.league.biggest.goals.against:object
[].teams.away.league.biggest.goals.for.away:number
[].teams.away.league.biggest.goals.for.home:number
[].teams.away.league.biggest.goals.for:object
[].teams.away.league.biggest.goals:object
[].teams.away.league.biggest.loses.away:null
[].teams.away.league.biggest.loses.home:null
[].teams.away.league.biggest.loses:object
[].teams.away.league.biggest.streak.draws:number
[].teams.away.league.biggest.streak.loses:number
[].teams.away.league.biggest.streak.wins:number
[].teams.away.league.biggest.streak:object
[].teams.away.league.biggest.wins.away:null
[].teams.away.league.biggest.wins.home:string
[].teams.away.league.biggest.wins:object
[].teams.away.league.biggest:object
[].teams.away.league.cards.red.0-15.percentage:null
[].teams.away.league.cards.red.0-15.total:null
[].teams.away.league.cards.red.0-15:object
[].teams.away.league.cards.red.106-120.percentage:null
[].teams.away.league.cards.red.106-120.total:null
[].teams.away.league.cards.red.106-120:object
[].teams.away.league.cards.red.16-30.percentage:null
[].teams.away.league.cards.red.16-30.total:null
[].teams.away.league.cards.red.16-30:object
[].teams.away.league.cards.red.31-45.percentage:null
[].teams.away.league.cards.red.31-45.total:null
[].teams.away.league.cards.red.31-45:object
[].teams.away.league.cards.red.46-60.percentage:null
[].teams.away.league.cards.red.46-60.total:null
[].teams.away.league.cards.red.46-60:object
[].teams.away.league.cards.red.61-75.percentage:null
[].teams.away.league.cards.red.61-75.total:null
[].teams.away.league.cards.red.61-75:object
[].teams.away.league.cards.red.76-90.percentage:null
[].teams.away.league.cards.red.76-90.total:null
[].teams.away.league.cards.red.76-90:object
[].teams.away.league.cards.red.91-105.percentage:null
[].teams.away.league.cards.red.91-105.total:null
[].teams.away.league.cards.red.91-105:object
[].teams.away.league.cards.red:object
[].teams.away.league.cards.yellow.0-15.percentage:null
[].teams.away.league.cards.yellow.0-15.total:null
[].teams.away.league.cards.yellow.0-15:object
[].teams.away.league.cards.yellow.106-120.percentage:null
[].teams.away.league.cards.yellow.106-120.total:null
[].teams.away.league.cards.yellow.106-120:object
[].teams.away.league.cards.yellow.16-30.percentage:null
[].teams.away.league.cards.yellow.16-30.total:null
[].teams.away.league.cards.yellow.16-30:object
[].teams.away.league.cards.yellow.31-45.percentage:string
[].teams.away.league.cards.yellow.31-45.total:number
[].teams.away.league.cards.yellow.31-45:object
[].teams.away.league.cards.yellow.46-60.percentage:null
[].teams.away.league.cards.yellow.46-60.total:null
[].teams.away.league.cards.yellow.46-60:object
[].teams.away.league.cards.yellow.61-75.percentage:null
[].teams.away.league.cards.yellow.61-75.total:null
[].teams.away.league.cards.yellow.61-75:object
[].teams.away.league.cards.yellow.76-90.percentage:null
[].teams.away.league.cards.yellow.76-90.total:null
[].teams.away.league.cards.yellow.76-90:object
[].teams.away.league.cards.yellow.91-105.percentage:null
[].teams.away.league.cards.yellow.91-105.total:null
[].teams.away.league.cards.yellow.91-105:object
[].teams.away.league.cards.yellow:object
[].teams.away.league.cards:object
[].teams.away.league.clean_sheet.away:number
[].teams.away.league.clean_sheet.home:number
[].teams.away.league.clean_sheet.total:number
[].teams.away.league.clean_sheet:object
[].teams.away.league.failed_to_score.away:number
[].teams.away.league.failed_to_score.home:number
[].teams.away.league.failed_to_score.total:number
[].teams.away.league.failed_to_score:object
[].teams.away.league.fixtures.draws.away:number
[].teams.away.league.fixtures.draws.home:number
[].teams.away.league.fixtures.draws.total:number
[].teams.away.league.fixtures.draws:object
[].teams.away.league.fixtures.loses.away:number
[].teams.away.league.fixtures.loses.home:number
[].teams.away.league.fixtures.loses.total:number
[].teams.away.league.fixtures.loses:object
[].teams.away.league.fixtures.played.away:number
[].teams.away.league.fixtures.played.home:number
[].teams.away.league.fixtures.played.total:number
[].teams.away.league.fixtures.played:object
[].teams.away.league.fixtures.wins.away:number
[].teams.away.league.fixtures.wins.home:number
[].teams.away.league.fixtures.wins.total:number
[].teams.away.league.fixtures.wins:object
[].teams.away.league.fixtures:object
[].teams.away.league.form:string
[].teams.away.league.goals.against.average.away:string
[].teams.away.league.goals.against.average.home:string
[].teams.away.league.goals.against.average.total:string
[].teams.away.league.goals.against.average:object
[].teams.away.league.goals.against.minute.0-15.percentage:null
[].teams.away.league.goals.against.minute.0-15.total:null
[].teams.away.league.goals.against.minute.0-15:object
[].teams.away.league.goals.against.minute.106-120.percentage:null
[].teams.away.league.goals.against.minute.106-120.total:null
[].teams.away.league.goals.against.minute.106-120:object
[].teams.away.league.goals.against.minute.16-30.percentage:null
[].teams.away.league.goals.against.minute.16-30.total:null
[].teams.away.league.goals.against.minute.16-30:object
[].teams.away.league.goals.against.minute.31-45.percentage:null
[].teams.away.league.goals.against.minute.31-45.total:null
[].teams.away.league.goals.against.minute.31-45:object
[].teams.away.league.goals.against.minute.46-60.percentage:null
[].teams.away.league.goals.against.minute.46-60.total:null
[].teams.away.league.goals.against.minute.46-60:object
[].teams.away.league.goals.against.minute.61-75.percentage:null
[].teams.away.league.goals.against.minute.61-75.total:null
[].teams.away.league.goals.against.minute.61-75:object
[].teams.away.league.goals.against.minute.76-90.percentage:null
[].teams.away.league.goals.against.minute.76-90.total:null
[].teams.away.league.goals.against.minute.76-90:object
[].teams.away.league.goals.against.minute.91-105.percentage:null
[].teams.away.league.goals.against.minute.91-105.total:null
[].teams.away.league.goals.against.minute.91-105:object
[].teams.away.league.goals.against.minute:object
[].teams.away.league.goals.against.total.away:number
[].teams.away.league.goals.against.total.home:number
[].teams.away.league.goals.against.total.total:number
[].teams.away.league.goals.against.total:object
[].teams.away.league.goals.against.under_over.0.5.over:number
[].teams.away.league.goals.against.under_over.0.5.under:number
[].teams.away.league.goals.against.under_over.0.5:object
[].teams.away.league.goals.against.under_over.1.5.over:number
[].teams.away.league.goals.against.under_over.1.5.under:number
[].teams.away.league.goals.against.under_over.1.5:object
[].teams.away.league.goals.against.under_over.2.5.over:number
[].teams.away.league.goals.against.under_over.2.5.under:number
[].teams.away.league.goals.against.under_over.2.5:object
[].teams.away.league.goals.against.under_over.3.5.over:number
[].teams.away.league.goals.against.under_over.3.5.under:number
[].teams.away.league.goals.against.under_over.3.5:object
[].teams.away.league.goals.against.under_over.4.5.over:number
[].teams.away.league.goals.against.under_over.4.5.under:number
[].teams.away.league.goals.against.under_over.4.5:object
[].teams.away.league.goals.against.under_over:object
[].teams.away.league.goals.against:object
[].teams.away.league.goals.for.average.away:string
[].teams.away.league.goals.for.average.home:string
[].teams.away.league.goals.for.average.total:string
[].teams.away.league.goals.for.average:object
[].teams.away.league.goals.for.minute.0-15.percentage:string
[].teams.away.league.goals.for.minute.0-15.total:number
[].teams.away.league.goals.for.minute.0-15:object
[].teams.away.league.goals.for.minute.106-120.percentage:null
[].teams.away.league.goals.for.minute.106-120.total:null
[].teams.away.league.goals.for.minute.106-120:object
[].teams.away.league.goals.for.minute.16-30.percentage:string
[].teams.away.league.goals.for.minute.16-30.total:number
[].teams.away.league.goals.for.minute.16-30:object
[].teams.away.league.goals.for.minute.31-45.percentage:null
[].teams.away.league.goals.for.minute.31-45.total:null
[].teams.away.league.goals.for.minute.31-45:object
[].teams.away.league.goals.for.minute.46-60.percentage:string
[].teams.away.league.goals.for.minute.46-60.total:number
[].teams.away.league.goals.for.minute.46-60:object
[].teams.away.league.goals.for.minute.61-75.percentage:null
[].teams.away.league.goals.for.minute.61-75.total:null
[].teams.away.league.goals.for.minute.61-75:object
[].teams.away.league.goals.for.minute.76-90.percentage:null
[].teams.away.league.goals.for.minute.76-90.total:null
[].teams.away.league.goals.for.minute.76-90:object
[].teams.away.league.goals.for.minute.91-105.percentage:null
[].teams.away.league.goals.for.minute.91-105.total:null
[].teams.away.league.goals.for.minute.91-105:object
[].teams.away.league.goals.for.minute:object
[].teams.away.league.goals.for.total.away:number
[].teams.away.league.goals.for.total.home:number
[].teams.away.league.goals.for.total.total:number
[].teams.away.league.goals.for.total:object
[].teams.away.league.goals.for.under_over.0.5.over:number
[].teams.away.league.goals.for.under_over.0.5.under:number
[].teams.away.league.goals.for.under_over.0.5:object
[].teams.away.league.goals.for.under_over.1.5.over:number
[].teams.away.league.goals.for.under_over.1.5.under:number
[].teams.away.league.goals.for.under_over.1.5:object
[].teams.away.league.goals.for.under_over.2.5.over:number
[].teams.away.league.goals.for.under_over.2.5.under:number
[].teams.away.league.goals.for.under_over.2.5:object
[].teams.away.league.goals.for.under_over.3.5.over:number
[].teams.away.league.goals.for.under_over.3.5.under:number
[].teams.away.league.goals.for.under_over.3.5:object
[].teams.away.league.goals.for.under_over.4.5.over:number
[].teams.away.league.goals.for.under_over.4.5.under:number
[].teams.away.league.goals.for.under_over.4.5:object
[].teams.away.league.goals.for.under_over:object
[].teams.away.league.goals.for:object
[].teams.away.league.goals:object
[].teams.away.league.lineups:array
[].teams.away.league.lineups[].formation:string
[].teams.away.league.lineups[].played:number
[].teams.away.league.penalty.missed.percentage:string
[].teams.away.league.penalty.missed.total:number
[].teams.away.league.penalty.missed:object
[].teams.away.league.penalty.scored.percentage:string
[].teams.away.league.penalty.scored.total:number
[].teams.away.league.penalty.scored:object
[].teams.away.league.penalty.total:number
[].teams.away.league.penalty:object
[].teams.away.league:object
[].teams.away.logo:string
[].teams.away.name:string
[].teams.away:object
[].teams.home.id:number
[].teams.home.last_5.att:string
[].teams.home.last_5.def:string
[].teams.home.last_5.form:string
[].teams.home.last_5.goals.against.average:string
[].teams.home.last_5.goals.against.total:number
[].teams.home.last_5.goals.against:object
[].teams.home.last_5.goals.for.average:string
[].teams.home.last_5.goals.for.total:number
[].teams.home.last_5.goals.for:object
[].teams.home.last_5.goals:object
[].teams.home.last_5.played:number
[].teams.home.last_5:object
[].teams.home.league.biggest.goals.against.away:number
[].teams.home.league.biggest.goals.against.home:number
[].teams.home.league.biggest.goals.against:object
[].teams.home.league.biggest.goals.for.away:number
[].teams.home.league.biggest.goals.for.home:number
[].teams.home.league.biggest.goals.for:object
[].teams.home.league.biggest.goals:object
[].teams.home.league.biggest.loses.away:string
[].teams.home.league.biggest.loses.home:null
[].teams.home.league.biggest.loses:object
[].teams.home.league.biggest.streak.draws:number
[].teams.home.league.biggest.streak.loses:number
[].teams.home.league.biggest.streak.wins:number
[].teams.home.league.biggest.streak:object
[].teams.home.league.biggest.wins.away:null
[].teams.home.league.biggest.wins.home:null
[].teams.home.league.biggest.wins:object
[].teams.home.league.biggest:object
[].teams.home.league.cards.red.0-15.percentage:null
[].teams.home.league.cards.red.0-15.total:null
[].teams.home.league.cards.red.0-15:object
[].teams.home.league.cards.red.106-120.percentage:null
[].teams.home.league.cards.red.106-120.total:null
[].teams.home.league.cards.red.106-120:object
[].teams.home.league.cards.red.16-30.percentage:null
[].teams.home.league.cards.red.16-30.total:null
[].teams.home.league.cards.red.16-30:object
[].teams.home.league.cards.red.31-45.percentage:string
[].teams.home.league.cards.red.31-45.total:number
[].teams.home.league.cards.red.31-45:object
[].teams.home.league.cards.red.46-60.percentage:null
[].teams.home.league.cards.red.46-60.total:null
[].teams.home.league.cards.red.46-60:object
[].teams.home.league.cards.red.61-75.percentage:null
[].teams.home.league.cards.red.61-75.total:null
[].teams.home.league.cards.red.61-75:object
[].teams.home.league.cards.red.76-90.percentage:null
[].teams.home.league.cards.red.76-90.total:null
[].teams.home.league.cards.red.76-90:object
[].teams.home.league.cards.red.91-105.percentage:null
[].teams.home.league.cards.red.91-105.total:null
[].teams.home.league.cards.red.91-105:object
[].teams.home.league.cards.red:object
[].teams.home.league.cards.yellow.0-15.percentage:string
[].teams.home.league.cards.yellow.0-15.total:number
[].teams.home.league.cards.yellow.0-15:object
[].teams.home.league.cards.yellow.106-120.percentage:null
[].teams.home.league.cards.yellow.106-120.total:null
[].teams.home.league.cards.yellow.106-120:object
[].teams.home.league.cards.yellow.16-30.percentage:null
[].teams.home.league.cards.yellow.16-30.total:null
[].teams.home.league.cards.yellow.16-30:object
[].teams.home.league.cards.yellow.31-45.percentage:string
[].teams.home.league.cards.yellow.31-45.total:number
[].teams.home.league.cards.yellow.31-45:object
[].teams.home.league.cards.yellow.46-60.percentage:null
[].teams.home.league.cards.yellow.46-60.total:null
[].teams.home.league.cards.yellow.46-60:object
[].teams.home.league.cards.yellow.61-75.percentage:null
[].teams.home.league.cards.yellow.61-75.total:null
[].teams.home.league.cards.yellow.61-75:object
[].teams.home.league.cards.yellow.76-90.percentage:null
[].teams.home.league.cards.yellow.76-90.total:null
[].teams.home.league.cards.yellow.76-90:object
[].teams.home.league.cards.yellow.91-105.percentage:string
[].teams.home.league.cards.yellow.91-105.total:number
[].teams.home.league.cards.yellow.91-105:object
[].teams.home.league.cards.yellow:object
[].teams.home.league.cards:object
[].teams.home.league.clean_sheet.away:number
[].teams.home.league.clean_sheet.home:number
[].teams.home.league.clean_sheet.total:number
[].teams.home.league.clean_sheet:object
[].teams.home.league.failed_to_score.away:number
[].teams.home.league.failed_to_score.home:number
[].teams.home.league.failed_to_score.total:number
[].teams.home.league.failed_to_score:object
[].teams.home.league.fixtures.draws.away:number
[].teams.home.league.fixtures.draws.home:number
[].teams.home.league.fixtures.draws.total:number
[].teams.home.league.fixtures.draws:object
[].teams.home.league.fixtures.loses.away:number
[].teams.home.league.fixtures.loses.home:number
[].teams.home.league.fixtures.loses.total:number
[].teams.home.league.fixtures.loses:object
[].teams.home.league.fixtures.played.away:number
[].teams.home.league.fixtures.played.home:number
[].teams.home.league.fixtures.played.total:number
[].teams.home.league.fixtures.played:object
[].teams.home.league.fixtures.wins.away:number
[].teams.home.league.fixtures.wins.home:number
[].teams.home.league.fixtures.wins.total:number
[].teams.home.league.fixtures.wins:object
[].teams.home.league.fixtures:object
[].teams.home.league.form:string
[].teams.home.league.goals.against.average.away:string
[].teams.home.league.goals.against.average.home:string
[].teams.home.league.goals.against.average.total:string
[].teams.home.league.goals.against.average:object
[].teams.home.league.goals.against.minute.0-15.percentage:null
[].teams.home.league.goals.against.minute.0-15.total:null
[].teams.home.league.goals.against.minute.0-15:object
[].teams.home.league.goals.against.minute.106-120.percentage:null
[].teams.home.league.goals.against.minute.106-120.total:null
[].teams.home.league.goals.against.minute.106-120:object
[].teams.home.league.goals.against.minute.16-30.percentage:string
[].teams.home.league.goals.against.minute.16-30.total:number
[].teams.home.league.goals.against.minute.16-30:object
[].teams.home.league.goals.against.minute.31-45.percentage:string
[].teams.home.league.goals.against.minute.31-45.total:number
[].teams.home.league.goals.against.minute.31-45:object
[].teams.home.league.goals.against.minute.46-60.percentage:null
[].teams.home.league.goals.against.minute.46-60.total:null
[].teams.home.league.goals.against.minute.46-60:object
[].teams.home.league.goals.against.minute.61-75.percentage:null
[].teams.home.league.goals.against.minute.61-75.total:null
[].teams.home.league.goals.against.minute.61-75:object
[].teams.home.league.goals.against.minute.76-90.percentage:null
[].teams.home.league.goals.against.minute.76-90.total:null
[].teams.home.league.goals.against.minute.76-90:object
[].teams.home.league.goals.against.minute.91-105.percentage:null
[].teams.home.league.goals.against.minute.91-105.total:null
[].teams.home.league.goals.against.minute.91-105:object
[].teams.home.league.goals.against.minute:object
[].teams.home.league.goals.against.total.away:number
[].teams.home.league.goals.against.total.home:number
[].teams.home.league.goals.against.total.total:number
[].teams.home.league.goals.against.total:object
[].teams.home.league.goals.against.under_over.0.5.over:number
[].teams.home.league.goals.against.under_over.0.5.under:number
[].teams.home.league.goals.against.under_over.0.5:object
[].teams.home.league.goals.against.under_over.1.5.over:number
[].teams.home.league.goals.against.under_over.1.5.under:number
[].teams.home.league.goals.against.under_over.1.5:object
[].teams.home.league.goals.against.under_over.2.5.over:number
[].teams.home.league.goals.against.under_over.2.5.under:number
[].teams.home.league.goals.against.under_over.2.5:object
[].teams.home.league.goals.against.under_over.3.5.over:number
[].teams.home.league.goals.against.under_over.3.5.under:number
[].teams.home.league.goals.against.under_over.3.5:object
[].teams.home.league.goals.against.under_over.4.5.over:number
[].teams.home.league.goals.against.under_over.4.5.under:number
[].teams.home.league.goals.against.under_over.4.5:object
[].teams.home.league.goals.against.under_over:object
[].teams.home.league.goals.against:object
[].teams.home.league.goals.for.average.away:string
[].teams.home.league.goals.for.average.home:string
[].teams.home.league.goals.for.average.total:string
[].teams.home.league.goals.for.average:object
[].teams.home.league.goals.for.minute.0-15.percentage:string
[].teams.home.league.goals.for.minute.0-15.total:number
[].teams.home.league.goals.for.minute.0-15:object
[].teams.home.league.goals.for.minute.106-120.percentage:null
[].teams.home.league.goals.for.minute.106-120.total:null
[].teams.home.league.goals.for.minute.106-120:object
[].teams.home.league.goals.for.minute.16-30.percentage:null
[].teams.home.league.goals.for.minute.16-30.total:null
[].teams.home.league.goals.for.minute.16-30:object
[].teams.home.league.goals.for.minute.31-45.percentage:null
[].teams.home.league.goals.for.minute.31-45.total:null
[].teams.home.league.goals.for.minute.31-45:object
[].teams.home.league.goals.for.minute.46-60.percentage:null
[].teams.home.league.goals.for.minute.46-60.total:null
[].teams.home.league.goals.for.minute.46-60:object
[].teams.home.league.goals.for.minute.61-75.percentage:null
[].teams.home.league.goals.for.minute.61-75.total:null
[].teams.home.league.goals.for.minute.61-75:object
[].teams.home.league.goals.for.minute.76-90.percentage:null
[].teams.home.league.goals.for.minute.76-90.total:null
[].teams.home.league.goals.for.minute.76-90:object
[].teams.home.league.goals.for.minute.91-105.percentage:null
[].teams.home.league.goals.for.minute.91-105.total:null
[].teams.home.league.goals.for.minute.91-105:object
[].teams.home.league.goals.for.minute:object
[].teams.home.league.goals.for.total.away:number
[].teams.home.league.goals.for.total.home:number
[].teams.home.league.goals.for.total.total:number
[].teams.home.league.goals.for.total:object
[].teams.home.league.goals.for.under_over.0.5.over:number
[].teams.home.league.goals.for.under_over.0.5.under:number
[].teams.home.league.goals.for.under_over.0.5:object
[].teams.home.league.goals.for.under_over.1.5.over:number
[].teams.home.league.goals.for.under_over.1.5.under:number
[].teams.home.league.goals.for.under_over.1.5:object
[].teams.home.league.goals.for.under_over.2.5.over:number
[].teams.home.league.goals.for.under_over.2.5.under:number
[].teams.home.league.goals.for.under_over.2.5:object
[].teams.home.league.goals.for.under_over.3.5.over:number
[].teams.home.league.goals.for.under_over.3.5.under:number
[].teams.home.league.goals.for.under_over.3.5:object
[].teams.home.league.goals.for.under_over.4.5.over:number
[].teams.home.league.goals.for.under_over.4.5.under:number
[].teams.home.league.goals.for.under_over.4.5:object
[].teams.home.league.goals.for.under_over:object
[].teams.home.league.goals.for:object
[].teams.home.league.goals:object
[].teams.home.league.lineups:array
[].teams.home.league.lineups[].formation:string
[].teams.home.league.lineups[].played:number
[].teams.home.league.penalty.missed.percentage:string
[].teams.home.league.penalty.missed.total:number
[].teams.home.league.penalty.missed:object
[].teams.home.league.penalty.scored.percentage:string
[].teams.home.league.penalty.scored.total:number
[].teams.home.league.penalty.scored:object
[].teams.home.league.penalty.total:number
[].teams.home.league.penalty:object
[].teams.home.league:object
[].teams.home.logo:string
[].teams.home.name:string
[].teams.home:object
[].teams:object
```

**null 로 온 필드:** `[].h2h[].fixture.status.extra`, `[].h2h[].score.extratime.away`, `[].h2h[].score.extratime.home`, `[].h2h[].score.penalty.away`, `[].h2h[].score.penalty.home`, `[].h2h[].teams.away.winner`, `[].h2h[].teams.home.winner`, `[].predictions.goals.home`, `[].predictions.under_over`, `[].predictions.winner.comment`, `[].teams.away.league.biggest.loses.away`, `[].teams.away.league.biggest.loses.home`, `[].teams.away.league.biggest.wins.away`, `[].teams.away.league.cards.red.0-15.percentage`, `[].teams.away.league.cards.red.0-15.total`, `[].teams.away.league.cards.red.106-120.percentage`, `[].teams.away.league.cards.red.106-120.total`, `[].teams.away.league.cards.red.16-30.percentage`, `[].teams.away.league.cards.red.16-30.total`, `[].teams.away.league.cards.red.31-45.percentage`, `[].teams.away.league.cards.red.31-45.total`, `[].teams.away.league.cards.red.46-60.percentage`, `[].teams.away.league.cards.red.46-60.total`, `[].teams.away.league.cards.red.61-75.percentage`, `[].teams.away.league.cards.red.61-75.total`, `[].teams.away.league.cards.red.76-90.percentage`, `[].teams.away.league.cards.red.76-90.total`, `[].teams.away.league.cards.red.91-105.percentage`, `[].teams.away.league.cards.red.91-105.total`, `[].teams.away.league.cards.yellow.0-15.percentage`, `[].teams.away.league.cards.yellow.0-15.total`, `[].teams.away.league.cards.yellow.106-120.percentage`, `[].teams.away.league.cards.yellow.106-120.total`, `[].teams.away.league.cards.yellow.16-30.percentage`, `[].teams.away.league.cards.yellow.16-30.total`, `[].teams.away.league.cards.yellow.46-60.percentage`, `[].teams.away.league.cards.yellow.46-60.total`, `[].teams.away.league.cards.yellow.61-75.percentage`, `[].teams.away.league.cards.yellow.61-75.total`, `[].teams.away.league.cards.yellow.76-90.percentage`, `[].teams.away.league.cards.yellow.76-90.total`, `[].teams.away.league.cards.yellow.91-105.percentage`, `[].teams.away.league.cards.yellow.91-105.total`, `[].teams.away.league.goals.against.minute.0-15.percentage`, `[].teams.away.league.goals.against.minute.0-15.total`, `[].teams.away.league.goals.against.minute.106-120.percentage`, `[].teams.away.league.goals.against.minute.106-120.total`, `[].teams.away.league.goals.against.minute.16-30.percentage`, `[].teams.away.league.goals.against.minute.16-30.total`, `[].teams.away.league.goals.against.minute.31-45.percentage`, `[].teams.away.league.goals.against.minute.31-45.total`, `[].teams.away.league.goals.against.minute.46-60.percentage`, `[].teams.away.league.goals.against.minute.46-60.total`, `[].teams.away.league.goals.against.minute.61-75.percentage`, `[].teams.away.league.goals.against.minute.61-75.total`, `[].teams.away.league.goals.against.minute.76-90.percentage`, `[].teams.away.league.goals.against.minute.76-90.total`, `[].teams.away.league.goals.against.minute.91-105.percentage`, `[].teams.away.league.goals.against.minute.91-105.total`, `[].teams.away.league.goals.for.minute.106-120.percentage`, `[].teams.away.league.goals.for.minute.106-120.total`, `[].teams.away.league.goals.for.minute.31-45.percentage`, `[].teams.away.league.goals.for.minute.31-45.total`, `[].teams.away.league.goals.for.minute.61-75.percentage`, `[].teams.away.league.goals.for.minute.61-75.total`, `[].teams.away.league.goals.for.minute.76-90.percentage`, `[].teams.away.league.goals.for.minute.76-90.total`, `[].teams.away.league.goals.for.minute.91-105.percentage`, `[].teams.away.league.goals.for.minute.91-105.total`, `[].teams.home.league.biggest.loses.home`, `[].teams.home.league.biggest.wins.away`, `[].teams.home.league.biggest.wins.home`, `[].teams.home.league.cards.red.0-15.percentage`, `[].teams.home.league.cards.red.0-15.total`, `[].teams.home.league.cards.red.106-120.percentage`, `[].teams.home.league.cards.red.106-120.total`, `[].teams.home.league.cards.red.16-30.percentage`, `[].teams.home.league.cards.red.16-30.total`, `[].teams.home.league.cards.red.46-60.percentage`, `[].teams.home.league.cards.red.46-60.total`, `[].teams.home.league.cards.red.61-75.percentage`, `[].teams.home.league.cards.red.61-75.total`, `[].teams.home.league.cards.red.76-90.percentage`, `[].teams.home.league.cards.red.76-90.total`, `[].teams.home.league.cards.red.91-105.percentage`, `[].teams.home.league.cards.red.91-105.total`, `[].teams.home.league.cards.yellow.106-120.percentage`, `[].teams.home.league.cards.yellow.106-120.total`, `[].teams.home.league.cards.yellow.16-30.percentage`, `[].teams.home.league.cards.yellow.16-30.total`, `[].teams.home.league.cards.yellow.46-60.percentage`, `[].teams.home.league.cards.yellow.46-60.total`, `[].teams.home.league.cards.yellow.61-75.percentage`, `[].teams.home.league.cards.yellow.61-75.total`, `[].teams.home.league.cards.yellow.76-90.percentage`, `[].teams.home.league.cards.yellow.76-90.total`, `[].teams.home.league.goals.against.minute.0-15.percentage`, `[].teams.home.league.goals.against.minute.0-15.total`, `[].teams.home.league.goals.against.minute.106-120.percentage`, `[].teams.home.league.goals.against.minute.106-120.total`, `[].teams.home.league.goals.against.minute.46-60.percentage`, `[].teams.home.league.goals.against.minute.46-60.total`, `[].teams.home.league.goals.against.minute.61-75.percentage`, `[].teams.home.league.goals.against.minute.61-75.total`, `[].teams.home.league.goals.against.minute.76-90.percentage`, `[].teams.home.league.goals.against.minute.76-90.total`, `[].teams.home.league.goals.against.minute.91-105.percentage`, `[].teams.home.league.goals.against.minute.91-105.total`, `[].teams.home.league.goals.for.minute.106-120.percentage`, `[].teams.home.league.goals.for.minute.106-120.total`, `[].teams.home.league.goals.for.minute.16-30.percentage`, `[].teams.home.league.goals.for.minute.16-30.total`, `[].teams.home.league.goals.for.minute.31-45.percentage`, `[].teams.home.league.goals.for.minute.31-45.total`, `[].teams.home.league.goals.for.minute.46-60.percentage`, `[].teams.home.league.goals.for.minute.46-60.total`, `[].teams.home.league.goals.for.minute.61-75.percentage`, `[].teams.home.league.goals.for.minute.61-75.total`, `[].teams.home.league.goals.for.minute.76-90.percentage`, `[].teams.home.league.goals.for.minute.76-90.total`, `[].teams.home.league.goals.for.minute.91-105.percentage`, `[].teams.home.league.goals.for.minute.91-105.total`

## `/injuries?fixture=1557377`

경기별 결장자 · 18건 · 키 22개

```
[].fixture.date:string
[].fixture.id:number
[].fixture.timestamp:number
[].fixture.timezone:string
[].fixture:object
[].league.country:string
[].league.flag:string
[].league.id:number
[].league.logo:string
[].league.name:string
[].league.season:number
[].league:object
[].player.id:number
[].player.name:string
[].player.photo:string
[].player.reason:string
[].player.type:string
[].player:object
[].team.id:number
[].team.logo:string
[].team.name:string
[].team:object
```

## `/fixtures/headtohead?h2h=33-40&last=5`

맞대결 기록 · 5건 · 키 54개

```
[].fixture.date:string
[].fixture.id:number
[].fixture.periods.first:number
[].fixture.periods.second:number
[].fixture.periods:object
[].fixture.referee:string
[].fixture.status.elapsed:number
[].fixture.status.extra:number
[].fixture.status.long:string
[].fixture.status.short:string
[].fixture.status:object
[].fixture.timestamp:number
[].fixture.timezone:string
[].fixture.venue.city:string
[].fixture.venue.id:number
[].fixture.venue.name:string
[].fixture.venue:object
[].fixture:object
[].goals.away:number
[].goals.home:number
[].goals:object
[].league.country:string
[].league.flag:string
[].league.id:number
[].league.logo:string
[].league.name:string
[].league.round:string
[].league.season:number
[].league.standings:boolean
[].league:object
[].score.extratime.away:null
[].score.extratime.home:null
[].score.extratime:object
[].score.fulltime.away:number
[].score.fulltime.home:number
[].score.fulltime:object
[].score.halftime.away:number
[].score.halftime.home:number
[].score.halftime:object
[].score.penalty.away:null
[].score.penalty.home:null
[].score.penalty:object
[].score:object
[].teams.away.id:number
[].teams.away.logo:string
[].teams.away.name:string
[].teams.away.winner:boolean
[].teams.away:object
[].teams.home.id:number
[].teams.home.logo:string
[].teams.home.name:string
[].teams.home.winner:boolean
[].teams.home:object
[].teams:object
```

**null 로 온 필드:** `[].fixture.status.extra`, `[].fixture.venue.id`, `[].league.flag`, `[].score.extratime.away`, `[].score.extratime.home`, `[].score.penalty.away`, `[].score.penalty.home`, `[].teams.away.winner`, `[].teams.home.winner`

## `/players?league=39&season=2026&page=1`

선수 시즌 통계 (페이지네이션) · 20건 · 키 75개

```
[].player.age:number
[].player.birth.country:string
[].player.birth.date:string
[].player.birth.place:string
[].player.birth:object
[].player.firstname:string
[].player.height:string
[].player.id:number
[].player.injured:boolean
[].player.lastname:string
[].player.name:string
[].player.nationality:string
[].player.photo:string
[].player.weight:string
[].player:object
[].statistics:array
[].statistics[].cards.red:number
[].statistics[].cards.yellow:number
[].statistics[].cards.yellowred:number
[].statistics[].cards:object
[].statistics[].dribbles.attempts:number
[].statistics[].dribbles.past:null
[].statistics[].dribbles.success:number
[].statistics[].dribbles:object
[].statistics[].duels.total:number
[].statistics[].duels.won:number
[].statistics[].duels:object
[].statistics[].fouls.committed:number
[].statistics[].fouls.drawn:number
[].statistics[].fouls:object
[].statistics[].games.appearences:number
[].statistics[].games.captain:boolean
[].statistics[].games.lineups:number
[].statistics[].games.minutes:number
[].statistics[].games.number:number
[].statistics[].games.position:string
[].statistics[].games.rating:string
[].statistics[].games:object
[].statistics[].goals.assists:number
[].statistics[].goals.conceded:number
[].statistics[].goals.saves:number
[].statistics[].goals.total:number
[].statistics[].goals:object
[].statistics[].league.country:string
[].statistics[].league.flag:string
[].statistics[].league.id:number
[].statistics[].league.logo:string
[].statistics[].league.name:string
[].statistics[].league.season:number
[].statistics[].league:object
[].statistics[].passes.accuracy:number
[].statistics[].passes.key:number
[].statistics[].passes.total:number
[].statistics[].passes:object
[].statistics[].penalty.commited:number
[].statistics[].penalty.missed:number
[].statistics[].penalty.saved:number
[].statistics[].penalty.scored:number
[].statistics[].penalty.won:null
[].statistics[].penalty:object
[].statistics[].shots.on:number
[].statistics[].shots.total:number
[].statistics[].shots:object
[].statistics[].substitutes.bench:number
[].statistics[].substitutes.in:number
[].statistics[].substitutes.out:number
[].statistics[].substitutes:object
[].statistics[].tackles.blocks:number
[].statistics[].tackles.interceptions:number
[].statistics[].tackles.total:number
[].statistics[].tackles:object
[].statistics[].team.id:number
[].statistics[].team.logo:string
[].statistics[].team.name:string
[].statistics[].team:object
```

**null 로 온 필드:** `[].statistics[].dribbles.attempts`, `[].statistics[].dribbles.past`, `[].statistics[].dribbles.success`, `[].statistics[].duels.total`, `[].statistics[].duels.won`, `[].statistics[].fouls.committed`, `[].statistics[].fouls.drawn`, `[].statistics[].games.minutes`, `[].statistics[].games.rating`, `[].statistics[].goals.saves`, `[].statistics[].passes.accuracy`, `[].statistics[].passes.key`, `[].statistics[].passes.total`, `[].statistics[].penalty.commited`, `[].statistics[].penalty.saved`, `[].statistics[].penalty.won`, `[].statistics[].shots.on`, `[].statistics[].shots.total`, `[].statistics[].tackles.blocks`, `[].statistics[].tackles.interceptions`, `[].statistics[].tackles.total`

## `/players/squads?team=33`

스쿼드 스냅샷 — diff 대상 · 1건 · 키 11개

```
[].players:array
[].players[].age:number
[].players[].id:number
[].players[].name:string
[].players[].number:number
[].players[].photo:string
[].players[].position:string
[].team.id:number
[].team.logo:string
[].team.name:string
[].team:object
```

## `/players/seasons`

선수 통계 제공 시즌 · 46건 · 키 0개

```
```

## `/players/profiles?player=131`

선수 프로필 · 1건 · 키 16개

```
[].player.age:number
[].player.birth.country:string
[].player.birth.date:string
[].player.birth.place:string
[].player.birth:object
[].player.firstname:string
[].player.height:string
[].player.id:number
[].player.lastname:string
[].player.name:string
[].player.nationality:string
[].player.number:number
[].player.photo:string
[].player.position:string
[].player.weight:string
[].player:object
```

## `/players/teams?player=131`

선수 소속팀 이력 · 11건 · 키 5개

```
[].seasons:array
[].team.id:number
[].team.logo:string
[].team.name:string
[].team:object
```

## `/trophies?player=131`

선수 수상 이력 · 22건 · 키 4개

```
[].country:string
[].league:string
[].place:string
[].season:string
```

## `/sidelined?player=131`

선수 결장 이력 · 3건 · 키 3개

```
[].end:string
[].start:string
[].type:string
```

**유형 값:**

- `[].type` (2종) — Ankle Injury · Knock

## `/transfers?player=131`

선수 이적 이력 · 1건 · 키 16개

```
[].player.id:number
[].player.name:string
[].player:object
[].transfers:array
[].transfers[].date:string
[].transfers[].teams.in.id:number
[].transfers[].teams.in.logo:string
[].transfers[].teams.in.name:string
[].transfers[].teams.in:object
[].transfers[].teams.out.id:number
[].transfers[].teams.out.logo:string
[].transfers[].teams.out.name:string
[].transfers[].teams.out:object
[].transfers[].teams:object
[].transfers[].type:string
[].update:string
```

**유형 값:**

- `[].transfers[].type` (4종) — Loan · N/A · € 400K · € 6.7M

## `/injuries?league=39&season=2026`

부상자 명단 · 415건 · 키 22개

```
[].fixture.date:string
[].fixture.id:number
[].fixture.timestamp:number
[].fixture.timezone:string
[].fixture:object
[].league.country:string
[].league.flag:string
[].league.id:number
[].league.logo:string
[].league.name:string
[].league.season:number
[].league:object
[].player.id:number
[].player.name:string
[].player.photo:string
[].player.reason:string
[].player.type:string
[].player:object
[].team.id:number
[].team.logo:string
[].team.name:string
[].team:object
```

## `/trophies?coach=1993`

감독 수상 이력 · 16건 · 키 4개

```
[].country:string
[].league:string
[].place:string
[].season:string
```

## `/players/seasons?player=131`

이 선수의 통계 보유 시즌 전량 · 11건 · 키 0개

```
```

## `/players/teams?player=131`

전 소속팀 목록 + 팀별 시즌 · 11건 · 키 5개

```
[].seasons:array
[].team.id:number
[].team.logo:string
[].team.name:string
[].team:object
```

## `/players?league=39&season=2020&page=1`

6년 전 선수 통계 — 실제로 오는가 · 20건 · 키 75개

```
[].player.age:number
[].player.birth.country:string
[].player.birth.date:string
[].player.birth.place:string
[].player.birth:object
[].player.firstname:string
[].player.height:string
[].player.id:number
[].player.injured:boolean
[].player.lastname:string
[].player.name:string
[].player.nationality:string
[].player.photo:string
[].player.weight:string
[].player:object
[].statistics:array
[].statistics[].cards.red:number
[].statistics[].cards.yellow:number
[].statistics[].cards.yellowred:number
[].statistics[].cards:object
[].statistics[].dribbles.attempts:number
[].statistics[].dribbles.past:null
[].statistics[].dribbles.success:number
[].statistics[].dribbles:object
[].statistics[].duels.total:number
[].statistics[].duels.won:number
[].statistics[].duels:object
[].statistics[].fouls.committed:number
[].statistics[].fouls.drawn:number
[].statistics[].fouls:object
[].statistics[].games.appearences:number
[].statistics[].games.captain:boolean
[].statistics[].games.lineups:number
[].statistics[].games.minutes:number
[].statistics[].games.number:null
[].statistics[].games.position:string
[].statistics[].games.rating:string
[].statistics[].games:object
[].statistics[].goals.assists:number
[].statistics[].goals.conceded:number
[].statistics[].goals.saves:null
[].statistics[].goals.total:number
[].statistics[].goals:object
[].statistics[].league.country:string
[].statistics[].league.flag:string
[].statistics[].league.id:number
[].statistics[].league.logo:string
[].statistics[].league.name:string
[].statistics[].league.season:number
[].statistics[].league:object
[].statistics[].passes.accuracy:number
[].statistics[].passes.key:number
[].statistics[].passes.total:number
[].statistics[].passes:object
[].statistics[].penalty.commited:null
[].statistics[].penalty.missed:number
[].statistics[].penalty.saved:null
[].statistics[].penalty.scored:number
[].statistics[].penalty.won:null
[].statistics[].penalty:object
[].statistics[].shots.on:number
[].statistics[].shots.total:number
[].statistics[].shots:object
[].statistics[].substitutes.bench:number
[].statistics[].substitutes.in:number
[].statistics[].substitutes.out:number
[].statistics[].substitutes:object
[].statistics[].tackles.blocks:number
[].statistics[].tackles.interceptions:number
[].statistics[].tackles.total:number
[].statistics[].tackles:object
[].statistics[].team.id:number
[].statistics[].team.logo:string
[].statistics[].team.name:string
[].statistics[].team:object
```

**null 로 온 필드:** `[].statistics[].cards.yellowred`, `[].statistics[].dribbles.attempts`, `[].statistics[].dribbles.past`, `[].statistics[].dribbles.success`, `[].statistics[].duels.total`, `[].statistics[].duels.won`, `[].statistics[].fouls.committed`, `[].statistics[].fouls.drawn`, `[].statistics[].games.number`, `[].statistics[].games.rating`, `[].statistics[].goals.assists`, `[].statistics[].goals.conceded`, `[].statistics[].goals.saves`, `[].statistics[].passes.accuracy`, `[].statistics[].passes.key`, `[].statistics[].passes.total`, `[].statistics[].penalty.commited`, `[].statistics[].penalty.missed`, `[].statistics[].penalty.saved`, `[].statistics[].penalty.scored`, `[].statistics[].penalty.won`, `[].statistics[].shots.on`, `[].statistics[].shots.total`, `[].statistics[].substitutes.bench`, `[].statistics[].substitutes.out`, `[].statistics[].tackles.blocks`, `[].statistics[].tackles.interceptions`, `[].statistics[].tackles.total`

## `/players?league=39&season=2015&page=1`

11년 전 선수 통계 · 20건 · 키 75개

```
[].player.age:number
[].player.birth.country:string
[].player.birth.date:string
[].player.birth.place:string
[].player.birth:object
[].player.firstname:string
[].player.height:string
[].player.id:number
[].player.injured:boolean
[].player.lastname:string
[].player.name:string
[].player.nationality:string
[].player.photo:string
[].player.weight:string
[].player:object
[].statistics:array
[].statistics[].cards.red:number
[].statistics[].cards.yellow:number
[].statistics[].cards.yellowred:number
[].statistics[].cards:object
[].statistics[].dribbles.attempts:number
[].statistics[].dribbles.past:null
[].statistics[].dribbles.success:number
[].statistics[].dribbles:object
[].statistics[].duels.total:number
[].statistics[].duels.won:number
[].statistics[].duels:object
[].statistics[].fouls.committed:number
[].statistics[].fouls.drawn:number
[].statistics[].fouls:object
[].statistics[].games.appearences:number
[].statistics[].games.captain:boolean
[].statistics[].games.lineups:number
[].statistics[].games.minutes:number
[].statistics[].games.number:null
[].statistics[].games.position:string
[].statistics[].games.rating:string
[].statistics[].games:object
[].statistics[].goals.assists:number
[].statistics[].goals.conceded:number
[].statistics[].goals.saves:null
[].statistics[].goals.total:number
[].statistics[].goals:object
[].statistics[].league.country:string
[].statistics[].league.flag:string
[].statistics[].league.id:number
[].statistics[].league.logo:string
[].statistics[].league.name:string
[].statistics[].league.season:number
[].statistics[].league:object
[].statistics[].passes.accuracy:number
[].statistics[].passes.key:number
[].statistics[].passes.total:number
[].statistics[].passes:object
[].statistics[].penalty.commited:null
[].statistics[].penalty.missed:number
[].statistics[].penalty.saved:null
[].statistics[].penalty.scored:number
[].statistics[].penalty.won:null
[].statistics[].penalty:object
[].statistics[].shots.on:number
[].statistics[].shots.total:number
[].statistics[].shots:object
[].statistics[].substitutes.bench:number
[].statistics[].substitutes.in:number
[].statistics[].substitutes.out:number
[].statistics[].substitutes:object
[].statistics[].tackles.blocks:number
[].statistics[].tackles.interceptions:number
[].statistics[].tackles.total:number
[].statistics[].tackles:object
[].statistics[].team.id:number
[].statistics[].team.logo:string
[].statistics[].team.name:string
[].statistics[].team:object
```

**null 로 온 필드:** `[].statistics[].cards.yellowred`, `[].statistics[].dribbles.attempts`, `[].statistics[].dribbles.past`, `[].statistics[].dribbles.success`, `[].statistics[].duels.total`, `[].statistics[].duels.won`, `[].statistics[].fouls.committed`, `[].statistics[].fouls.drawn`, `[].statistics[].games.number`, `[].statistics[].games.rating`, `[].statistics[].goals.assists`, `[].statistics[].goals.conceded`, `[].statistics[].goals.saves`, `[].statistics[].passes.accuracy`, `[].statistics[].passes.key`, `[].statistics[].passes.total`, `[].statistics[].penalty.commited`, `[].statistics[].penalty.missed`, `[].statistics[].penalty.saved`, `[].statistics[].penalty.scored`, `[].statistics[].penalty.won`, `[].statistics[].shots.on`, `[].statistics[].shots.total`, `[].statistics[].substitutes.bench`, `[].statistics[].substitutes.out`, `[].statistics[].tackles.blocks`, `[].statistics[].tackles.interceptions`, `[].statistics[].tackles.total`

## `/standings?league=39&season=2010`

16년 전 순위표 · 1건 · 키 44개

```
[].league.country:string
[].league.flag:string
[].league.id:number
[].league.logo:string
[].league.name:string
[].league.season:number
[].league.standings:array
[].league.standings[][].all.draw:number
[].league.standings[][].all.goals.against:number
[].league.standings[][].all.goals.for:number
[].league.standings[][].all.goals:object
[].league.standings[][].all.lose:number
[].league.standings[][].all.played:number
[].league.standings[][].all.win:number
[].league.standings[][].all:object
[].league.standings[][].away.draw:number
[].league.standings[][].away.goals.against:number
[].league.standings[][].away.goals.for:number
[].league.standings[][].away.goals:object
[].league.standings[][].away.lose:number
[].league.standings[][].away.played:number
[].league.standings[][].away.win:number
[].league.standings[][].away:object
[].league.standings[][].description:string
[].league.standings[][].form:string
[].league.standings[][].goalsDiff:number
[].league.standings[][].group:string
[].league.standings[][].home.draw:number
[].league.standings[][].home.goals.against:number
[].league.standings[][].home.goals.for:number
[].league.standings[][].home.goals:object
[].league.standings[][].home.lose:number
[].league.standings[][].home.played:number
[].league.standings[][].home.win:number
[].league.standings[][].home:object
[].league.standings[][].points:number
[].league.standings[][].rank:number
[].league.standings[][].status:null
[].league.standings[][].team.id:number
[].league.standings[][].team.logo:string
[].league.standings[][].team.name:string
[].league.standings[][].team:object
[].league.standings[][].update:string
[].league:object
```

**null 로 온 필드:** `[].league.standings[][].description`, `[].league.standings[][].status`

## `/fixtures?league=39&season=2010&last=1`

16년 전 경기 · 1건 · 키 54개

```
[].fixture.date:string
[].fixture.id:number
[].fixture.periods.first:number
[].fixture.periods.second:number
[].fixture.periods:object
[].fixture.referee:null
[].fixture.status.elapsed:number
[].fixture.status.extra:null
[].fixture.status.long:string
[].fixture.status.short:string
[].fixture.status:object
[].fixture.timestamp:number
[].fixture.timezone:string
[].fixture.venue.city:null
[].fixture.venue.id:number
[].fixture.venue.name:null
[].fixture.venue:object
[].fixture:object
[].goals.away:number
[].goals.home:number
[].goals:object
[].league.country:string
[].league.flag:string
[].league.id:number
[].league.logo:string
[].league.name:string
[].league.round:string
[].league.season:number
[].league.standings:boolean
[].league:object
[].score.extratime.away:null
[].score.extratime.home:null
[].score.extratime:object
[].score.fulltime.away:number
[].score.fulltime.home:number
[].score.fulltime:object
[].score.halftime.away:number
[].score.halftime.home:number
[].score.halftime:object
[].score.penalty.away:null
[].score.penalty.home:null
[].score.penalty:object
[].score:object
[].teams.away.id:number
[].teams.away.logo:string
[].teams.away.name:string
[].teams.away.winner:boolean
[].teams.away:object
[].teams.home.id:number
[].teams.home.logo:string
[].teams.home.name:string
[].teams.home.winner:boolean
[].teams.home:object
[].teams:object
```

**null 로 온 필드:** `[].fixture.referee`, `[].fixture.status.extra`, `[].fixture.venue.city`, `[].fixture.venue.name`, `[].score.extratime.away`, `[].score.extratime.home`, `[].score.penalty.away`, `[].score.penalty.home`

## `/players/topscorers?league=39&season=2026`

득점 — 대회당 1콜 · 20건 · 키 75개

```
[].player.age:number
[].player.birth.country:string
[].player.birth.date:string
[].player.birth.place:string
[].player.birth:object
[].player.firstname:string
[].player.height:string
[].player.id:number
[].player.injured:boolean
[].player.lastname:string
[].player.name:string
[].player.nationality:string
[].player.photo:string
[].player.weight:string
[].player:object
[].statistics:array
[].statistics[].cards.red:number
[].statistics[].cards.yellow:number
[].statistics[].cards.yellowred:number
[].statistics[].cards:object
[].statistics[].dribbles.attempts:number
[].statistics[].dribbles.past:null
[].statistics[].dribbles.success:number
[].statistics[].dribbles:object
[].statistics[].duels.total:number
[].statistics[].duels.won:number
[].statistics[].duels:object
[].statistics[].fouls.committed:number
[].statistics[].fouls.drawn:number
[].statistics[].fouls:object
[].statistics[].games.appearences:number
[].statistics[].games.captain:boolean
[].statistics[].games.lineups:number
[].statistics[].games.minutes:number
[].statistics[].games.number:number
[].statistics[].games.position:string
[].statistics[].games.rating:string
[].statistics[].games:object
[].statistics[].goals.assists:number
[].statistics[].goals.conceded:number
[].statistics[].goals.saves:null
[].statistics[].goals.total:number
[].statistics[].goals:object
[].statistics[].league.country:string
[].statistics[].league.flag:string
[].statistics[].league.id:number
[].statistics[].league.logo:string
[].statistics[].league.name:string
[].statistics[].league.season:number
[].statistics[].league:object
[].statistics[].passes.accuracy:number
[].statistics[].passes.key:number
[].statistics[].passes.total:number
[].statistics[].passes:object
[].statistics[].penalty.commited:null
[].statistics[].penalty.missed:number
[].statistics[].penalty.saved:null
[].statistics[].penalty.scored:number
[].statistics[].penalty.won:null
[].statistics[].penalty:object
[].statistics[].shots.on:number
[].statistics[].shots.total:number
[].statistics[].shots:object
[].statistics[].substitutes.bench:number
[].statistics[].substitutes.in:number
[].statistics[].substitutes.out:number
[].statistics[].substitutes:object
[].statistics[].tackles.blocks:number
[].statistics[].tackles.interceptions:number
[].statistics[].tackles.total:number
[].statistics[].tackles:object
[].statistics[].team.id:number
[].statistics[].team.logo:string
[].statistics[].team.name:string
[].statistics[].team:object
```

**null 로 온 필드:** `[].statistics[].dribbles.past`, `[].statistics[].fouls.committed`, `[].statistics[].fouls.drawn`, `[].statistics[].goals.saves`, `[].statistics[].passes.key`, `[].statistics[].penalty.commited`, `[].statistics[].penalty.saved`, `[].statistics[].penalty.won`, `[].statistics[].tackles.blocks`, `[].statistics[].tackles.interceptions`, `[].statistics[].tackles.total`

## `/players/topassists?league=39&season=2026`

도움 · 20건 · 키 75개

```
[].player.age:number
[].player.birth.country:string
[].player.birth.date:string
[].player.birth.place:string
[].player.birth:object
[].player.firstname:string
[].player.height:string
[].player.id:number
[].player.injured:boolean
[].player.lastname:string
[].player.name:string
[].player.nationality:string
[].player.photo:string
[].player.weight:string
[].player:object
[].statistics:array
[].statistics[].cards.red:number
[].statistics[].cards.yellow:number
[].statistics[].cards.yellowred:number
[].statistics[].cards:object
[].statistics[].dribbles.attempts:number
[].statistics[].dribbles.past:null
[].statistics[].dribbles.success:number
[].statistics[].dribbles:object
[].statistics[].duels.total:number
[].statistics[].duels.won:number
[].statistics[].duels:object
[].statistics[].fouls.committed:number
[].statistics[].fouls.drawn:number
[].statistics[].fouls:object
[].statistics[].games.appearences:number
[].statistics[].games.captain:boolean
[].statistics[].games.lineups:number
[].statistics[].games.minutes:number
[].statistics[].games.number:number
[].statistics[].games.position:string
[].statistics[].games.rating:string
[].statistics[].games:object
[].statistics[].goals.assists:number
[].statistics[].goals.conceded:number
[].statistics[].goals.saves:null
[].statistics[].goals.total:number
[].statistics[].goals:object
[].statistics[].league.country:string
[].statistics[].league.flag:string
[].statistics[].league.id:number
[].statistics[].league.logo:string
[].statistics[].league.name:string
[].statistics[].league.season:number
[].statistics[].league:object
[].statistics[].passes.accuracy:number
[].statistics[].passes.key:number
[].statistics[].passes.total:number
[].statistics[].passes:object
[].statistics[].penalty.commited:null
[].statistics[].penalty.missed:number
[].statistics[].penalty.saved:null
[].statistics[].penalty.scored:number
[].statistics[].penalty.won:null
[].statistics[].penalty:object
[].statistics[].shots.on:number
[].statistics[].shots.total:number
[].statistics[].shots:object
[].statistics[].substitutes.bench:number
[].statistics[].substitutes.in:number
[].statistics[].substitutes.out:number
[].statistics[].substitutes:object
[].statistics[].tackles.blocks:number
[].statistics[].tackles.interceptions:number
[].statistics[].tackles.total:number
[].statistics[].tackles:object
[].statistics[].team.id:number
[].statistics[].team.logo:string
[].statistics[].team.name:string
[].statistics[].team:object
```

**null 로 온 필드:** `[].statistics[].dribbles.attempts`, `[].statistics[].dribbles.past`, `[].statistics[].dribbles.success`, `[].statistics[].fouls.drawn`, `[].statistics[].goals.saves`, `[].statistics[].penalty.commited`, `[].statistics[].penalty.saved`, `[].statistics[].penalty.won`, `[].statistics[].shots.on`, `[].statistics[].tackles.blocks`, `[].statistics[].tackles.interceptions`, `[].statistics[].tackles.total`

## `/players/topyellowcards?league=39&season=2026`

경고 · 20건 · 키 75개

```
[].player.age:number
[].player.birth.country:string
[].player.birth.date:string
[].player.birth.place:string
[].player.birth:object
[].player.firstname:string
[].player.height:string
[].player.id:number
[].player.injured:boolean
[].player.lastname:string
[].player.name:string
[].player.nationality:string
[].player.photo:string
[].player.weight:string
[].player:object
[].statistics:array
[].statistics[].cards.red:number
[].statistics[].cards.yellow:number
[].statistics[].cards.yellowred:number
[].statistics[].cards:object
[].statistics[].dribbles.attempts:number
[].statistics[].dribbles.past:null
[].statistics[].dribbles.success:number
[].statistics[].dribbles:object
[].statistics[].duels.total:number
[].statistics[].duels.won:number
[].statistics[].duels:object
[].statistics[].fouls.committed:number
[].statistics[].fouls.drawn:number
[].statistics[].fouls:object
[].statistics[].games.appearences:number
[].statistics[].games.captain:boolean
[].statistics[].games.lineups:number
[].statistics[].games.minutes:number
[].statistics[].games.number:number
[].statistics[].games.position:string
[].statistics[].games.rating:string
[].statistics[].games:object
[].statistics[].goals.assists:number
[].statistics[].goals.conceded:number
[].statistics[].goals.saves:null
[].statistics[].goals.total:number
[].statistics[].goals:object
[].statistics[].league.country:string
[].statistics[].league.flag:string
[].statistics[].league.id:number
[].statistics[].league.logo:string
[].statistics[].league.name:string
[].statistics[].league.season:number
[].statistics[].league:object
[].statistics[].passes.accuracy:number
[].statistics[].passes.key:number
[].statistics[].passes.total:number
[].statistics[].passes:object
[].statistics[].penalty.commited:null
[].statistics[].penalty.missed:number
[].statistics[].penalty.saved:null
[].statistics[].penalty.scored:number
[].statistics[].penalty.won:null
[].statistics[].penalty:object
[].statistics[].shots.on:number
[].statistics[].shots.total:number
[].statistics[].shots:object
[].statistics[].substitutes.bench:number
[].statistics[].substitutes.in:number
[].statistics[].substitutes.out:number
[].statistics[].substitutes:object
[].statistics[].tackles.blocks:number
[].statistics[].tackles.interceptions:number
[].statistics[].tackles.total:number
[].statistics[].tackles:object
[].statistics[].team.id:number
[].statistics[].team.logo:string
[].statistics[].team.name:string
[].statistics[].team:object
```

**null 로 온 필드:** `[].player.birth.place`, `[].statistics[].dribbles.attempts`, `[].statistics[].dribbles.past`, `[].statistics[].dribbles.success`, `[].statistics[].fouls.drawn`, `[].statistics[].goals.saves`, `[].statistics[].passes.key`, `[].statistics[].penalty.commited`, `[].statistics[].penalty.saved`, `[].statistics[].penalty.won`, `[].statistics[].shots.on`, `[].statistics[].shots.total`, `[].statistics[].tackles.blocks`, `[].statistics[].tackles.interceptions`

## `/players/topredcards?league=39&season=2026`

퇴장 · 20건 · 키 75개

```
[].player.age:number
[].player.birth.country:string
[].player.birth.date:string
[].player.birth.place:string
[].player.birth:object
[].player.firstname:string
[].player.height:string
[].player.id:number
[].player.injured:boolean
[].player.lastname:string
[].player.name:string
[].player.nationality:string
[].player.photo:string
[].player.weight:string
[].player:object
[].statistics:array
[].statistics[].cards.red:number
[].statistics[].cards.yellow:number
[].statistics[].cards.yellowred:number
[].statistics[].cards:object
[].statistics[].dribbles.attempts:number
[].statistics[].dribbles.past:null
[].statistics[].dribbles.success:number
[].statistics[].dribbles:object
[].statistics[].duels.total:number
[].statistics[].duels.won:number
[].statistics[].duels:object
[].statistics[].fouls.committed:number
[].statistics[].fouls.drawn:number
[].statistics[].fouls:object
[].statistics[].games.appearences:number
[].statistics[].games.captain:boolean
[].statistics[].games.lineups:number
[].statistics[].games.minutes:number
[].statistics[].games.number:number
[].statistics[].games.position:string
[].statistics[].games.rating:string
[].statistics[].games:object
[].statistics[].goals.assists:number
[].statistics[].goals.conceded:number
[].statistics[].goals.saves:null
[].statistics[].goals.total:number
[].statistics[].goals:object
[].statistics[].league.country:string
[].statistics[].league.flag:string
[].statistics[].league.id:number
[].statistics[].league.logo:string
[].statistics[].league.name:string
[].statistics[].league.season:number
[].statistics[].league:object
[].statistics[].passes.accuracy:number
[].statistics[].passes.key:number
[].statistics[].passes.total:number
[].statistics[].passes:object
[].statistics[].penalty.commited:null
[].statistics[].penalty.missed:number
[].statistics[].penalty.saved:null
[].statistics[].penalty.scored:number
[].statistics[].penalty.won:null
[].statistics[].penalty:object
[].statistics[].shots.on:number
[].statistics[].shots.total:number
[].statistics[].shots:object
[].statistics[].substitutes.bench:number
[].statistics[].substitutes.in:number
[].statistics[].substitutes.out:number
[].statistics[].substitutes:object
[].statistics[].tackles.blocks:number
[].statistics[].tackles.interceptions:number
[].statistics[].tackles.total:number
[].statistics[].tackles:object
[].statistics[].team.id:number
[].statistics[].team.logo:string
[].statistics[].team.name:string
[].statistics[].team:object
```

**null 로 온 필드:** `[].player.birth.place`, `[].statistics[].dribbles.attempts`, `[].statistics[].dribbles.past`, `[].statistics[].dribbles.success`, `[].statistics[].fouls.drawn`, `[].statistics[].goals.saves`, `[].statistics[].passes.key`, `[].statistics[].penalty.commited`, `[].statistics[].penalty.saved`, `[].statistics[].penalty.won`, `[].statistics[].shots.on`, `[].statistics[].shots.total`, `[].statistics[].tackles.blocks`, `[].statistics[].tackles.interceptions`

## `/odds/bookmakers`

북메이커 · 33건 · 키 2개

```
[].id:number
[].name:string
```

## `/odds/bets`

베팅 종류 · 338건 · 키 2개

```
[].id:number
[].name:string
```

## `/odds?league=39&season=2026&page=1`

사전 배당 · 10건 · 키 22개

```
[].bookmakers:array
[].bookmakers[].bets:array
[].bookmakers[].bets[].id:number
[].bookmakers[].bets[].name:string
[].bookmakers[].bets[].values:array
[].bookmakers[].bets[].values[].odd:string
[].bookmakers[].bets[].values[].value:string
[].bookmakers[].id:number
[].bookmakers[].name:string
[].fixture.date:string
[].fixture.id:number
[].fixture.timestamp:number
[].fixture.timezone:string
[].fixture:object
[].league.country:string
[].league.flag:string
[].league.id:number
[].league.logo:string
[].league.name:string
[].league.season:number
[].league:object
[].update:string
```

## `/odds/mapping`

배당 제공 경기 매핑 · 100건 · 키 8개

```
[].fixture.date:string
[].fixture.id:number
[].fixture.timestamp:number
[].fixture:object
[].league.id:number
[].league.season:number
[].league:object
[].update:string
```

## `/odds/live/bets`

실시간 베팅 종류 · 266건 · 키 2개

```
[].id:number
[].name:string
```
