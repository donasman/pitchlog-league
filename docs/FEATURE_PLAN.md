# PitchLog — 기능 현황 및 확장 계획

> 최종 갱신: 2026-08-23
> 현재 백엔드 기준: 2026-09-02 NestJS + TypeScript 통합 구조. 아래 v1 클래스·Step 이름은 과거 구현 근거이며 v2 구현 이름이 아님.

> **현재 프론트엔드 기준:** 2026-09-01 React + Vite + JavaScript로 변경됨.
> 이 문서의 Next.js·SSR 관련 항목은 당시 검토 기록이며, 구현에는
> [`FRONTEND_GUIDE.md`](./FRONTEND_GUIDE.md)를 우선 적용함.

---

## 1. 완료된 기능

2026 월드컵 대상 기능은 배당(Odds)을 제외하고 전부 구현·수집 완료했다.

| 기능 | 백엔드 | 프론트 | 비고 |
|---|---|---|---|
| 참가국 · 스쿼드 | `FetchCountriesStep` `FetchSquadsStep` `SyncFinalSquadStep` | `/squads`, `/squads/[country]` | 48개국 |
| 선수 상세 · 시즌 통계 | `FetchPlayerStatsStep` | `/players/[slug]` | 1,248명 |
| 경기 · 결과 | `FetchMatchesStep` | `/matches`, `/matches/[fixtureId]` | 104경기 |
| 선발 라인업 · 포메이션 | `BackfillLineupsStep` | `PitchFormation` | 5,323건 |
| 조 순위 | `FetchStandingsStep` | `/standings` | 12개 조 |
| 부상 · 출전정지 | `FetchInjuriesStep` | `/injuries` | |
| 경고 · 퇴장 순위 | (기존 통계 재활용) | `/stats/top-cards` | |
| 감독 정보 | `FetchCoachesStep` | 스쿼드 페이지 | |
| 경기별 선수 평점 | `FetchPlayerRatingsStep` | 경기 상세 | |
| 경기 예측 | `FetchPredictionsStep` | 경기 상세 (NS 경기만) | 대회 종료로 표시 안 됨 |
| 맞대결 히스토리 | `FetchH2HStep` | 경기 상세 | |
| 월드컵 시즌 통계 | `FetchWorldCupPlayerStatsStep` | 통계 페이지 | 1,498명 |
| 어드민 (JWT) | `AdminAuth*` `AdminMatch*` | `/admin/*` | 정적 배포본에서는 미동작 |
| 우승 하이라이트 · 결과 티커 | — | `HomeResultsSection` `ResultsTicker` | 2026-08 추가 |

---

## 2. 미구현 — 배당 (Odds)

`schema.sql` 에 `fixture_odds` 테이블만 존재하고 엔티티·배치·API·UI 는 없다.

**보류 사유**
- 도박 관련 콘텐츠는 Google AdSense 정책상 민감 카테고리
- API-Football 의 프리매치 배당은 **최근 7일치만** 제공하므로 종료된 대회에는 수집 자체가 불가

대회가 끝난 지금 시점에서는 되살릴 실익이 없다. 유럽 리그(v2)에서 진행 중인 시즌을
다룰 때 재검토한다.

---

## 3. v2 — 26-27 유럽 리그 확장

2026 월드컵 아카이브가 완결되어, 다음 목표는 연중 운영되는 클럽 축구 서비스다.
26-27 시즌이 막 시작해 1라운드부터 데이터를 쌓을 수 있는 타이밍이다.

### 3-1. 그대로 재사용하는 것

v1 기능 요구사항은 재사용하되 Java 배치 Step 코드는 이식하지 않는다. NestJS의 수집 모듈,
Scheduler, 필요 시 BullMQ Worker로 기능을 다시 구현한다.

```java
@Value("${api-football.wc-league-id:1}")   // 1 → 39(EPL) 로 바꾸면 그대로 돈다
@Value("${api-football.season:2026}")
```

- 모든 `Fetch*Step` — 월드컵 전용 로직이 없다
- 엔티티: `Player` `PlayerSeasonStats` `Match` `MatchLineupEntry` `PlayerInjury` `Coach` `H2HRecord`
- 프론트: `PitchFormation` `RadarStatsChart` `StatsRankingPage` 순위표 경기상세
- `MatchSchedulerService` 의 IDLE/LINEUP/LIVE 3단계 동적 스케줄러
  — 월드컵은 한 달이라 거의 못 썼지만 리그는 10개월 내내 매주 경기가 있다

### 3-2. 바꿔야 하는 것

| # | 작업 | 규모 |
|---|---|---|
| 1 | **`Country` → `Team`** — code/flagUrl/groupName 은 국가대표 개념. 클럽은 엠블럼·소속 리그·홈구장이 필요하다. `SquadEntry`·`Player` 의 country 참조가 전부 영향받는다 | 큼 |
| 2 | **단일 리그 → 다중 리그** — 현재 `wc-league-id` 가 단일 Integer. `League` 엔티티 + `Match`/`GroupStanding`/`PlayerSeasonStats` 에 league_id FK | 중 |
| 3 | **조별리그 개념 제거** — `GroupStanding` 의 Group A~L 과 `enrichWithThirdPlace` 3위 추론 로직 삭제. 오히려 단순해진다 | 작음 |
| 4 | **정적 export 포기** — 매주 경기가 바뀌므로 빌드 스냅샷으로는 불가능. `@cloudflare/next-on-pages`(Edge SSR) 또는 Vercel | 큼 |
| 5 | **상시 백엔드 확보** — Railway Hobby 등 | 운영 |

### 3-3. 규모 감각

| | 팀 | 경기 | 기간 |
|---|---|---|---|
| 2026 월드컵 | 48 | 104 | 1개월 |
| EPL 단독 | 20 | 380 | 10개월 |
| 5대 리그 | 98 | 1,826 | 10개월 |

### 3-4. API 호출 예산 (Pro 7,500/일)

| 항목 | 방식 | 일일 추정 |
|---|---|---|
| 라이브 스코어 | `/fixtures?live=all` 1콜로 전 리그 커버, 경기 시간대만 폴링 | ~300 |
| 조/리그 순위 | 리그당 10분 주기 (매치데이만) | ~700 |
| 라인업 | 경기당 1콜 | ~40 / 라운드 |
| 선수 통계 | 페이지네이션, 주 1회 | ~400 / 주 |
| 부상 | 리그당 1일 1회 | ~5 |

윈도잉(경기 시간대에만 폴링)은 `MatchSchedulerService` 에 이미 구현돼 있다.
5대 리그도 Pro 한도 안에서 커버된다.

### 3-5. 권장 진행 순서

1. **EPL 단독(league=39)으로 v1** — 20팀/380경기면 `Team` 모델과 SSR 전환을 검증하기 충분하고 API 예산도 여유롭다
2. 검증 후 `League` 엔티티를 얹어 리그 추가
3. 5대 리그 + UCL 확장

### 3-6. 비용

| 항목 | 월 비용 |
|---|---|
| API-Football Pro | $19 |
| 백엔드 호스팅 | ~$5 |
| Cloudflare Pages | $0 |
| **합계** | **~$24 (지속)** |

현재 WC 아카이브는 평시 $0 이므로, v2 는 성격이 다른 결정이라는 점을 유의한다.

---

## 4. 기술 부채

| 항목 | 내용 |
|---|---|
| Node 버전 | 로컬 20.11.1. wrangler 최신판이 22 를 요구해 `npx wrangler@3` 로 우회 중 |
| Next.js | 14.2.5 — 보안 권고 있음. 업그레이드 필요 |
| `pitchlog_dump.sql` | 2026-05 시점의 낡은 덤프. 저장소에서 제거 검토 |
| `install.cmd` | Claude Code 설치 스크립트로 프로젝트와 무관. 제거 검토 |
| 어드민 비밀번호 | 기본값 `admin/admin1234!` 그대로. 백엔드를 공개 배포한다면 반드시 변경 |
