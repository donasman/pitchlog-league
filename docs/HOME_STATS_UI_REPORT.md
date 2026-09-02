# PitchLog 홈·통계·순위 UI 개선 보고서

> 작성일: 2026-11-23  
> 작업 범위: frontend 디렉터리 (docs 수정 포함)

---

## 1. 수정한 파일

| 파일 | 변경 내용 |
|---|---|
| `src/utils/standingsZone.js` | `ZONE_BORDER_CLASS` 수정, `ZONE_BG_CLASS` · `ZONE_STICKY_BG` 추가 |
| `src/components/ui/StandingsTable.jsx` | 구역 border·bg·sticky bg 적용, 범례 색상 수정 |
| `src/pages/HomePage.jsx` | QUICKLINKS 제거, 사이드바 통합 선택기, i18n 적용 |
| `src/pages/StatsPage.jsx` | 신규 생성 |
| `src/routes/index.jsx` | `/stats` 라우트 등록, `StatsPage` lazy import |
| `src/components/layout/AppHeader.jsx` | 통계 메뉴 `disabled: true` 제거 |
| `src/services/api.js` | `fetchHomeData` 확장, `fetchCompetitionStats` 추가 |
| `src/locales/ko.json` | 신규 키 추가 (stats.*, home.sideStandingsTitle 등) |
| `src/locales/en.json` | 동일 키 영어 번역 추가 |
| `docs/NEXT_STEPS.md` | 갱신 |
| `docs/FRONTEND_GUIDE.md` | 갱신 |

---

## 2. 홈 바로가기 제거 결과

`QUICKLINKS` 상수 및 `⑤ 사이트 바로가기` 섹션 전체를 삭제했음.

제거된 Lucide 아이콘 imports:  
`Trophy`, `List`, `BarChart2`, `Users`, `Calendar`

`ChevronRight` 는 `SH` 컴포넌트에서 계속 사용하므로 유지.

주요 경로는 Header 내비 또는 기존 화면 내 링크로 접근 가능:
- 경기: Header "경기" 메뉴 → `/matches`
- 순위: Header "순위" 메뉴 → `/standings`
- 팀·선수: 순위표 팀 링크, 경기 카드 팀 배지
- UCL 녹아웃: 홈 사이드바 "UCL 녹아웃 진출" 링크 유지

---

## 3. 홈 대회 선택 방식

### 변경 전
- 사이드바 상단: EPL·LaLiga·BL·SA 4개 리그 칩 → 순위만 변경
- 사이드바 하단: "득점 순위 (전체 대회 합산)" 고정

### 변경 후
- 사이드바 상단: **공통 대회 선택기** (EPL·LaLiga·BL·SA·L1·UCL 6개)
- 선택 시 **리그 순위**와 **득점 순위**가 함께 변경
- 기본값: EPL
- 순위 섹션 제목: `[대회명] 순위` (예: `EPL 순위`, `UCL 순위`)
- 득점 섹션 제목: `[대회명] 득점 순위` (예: `EPL 득점 순위`)
- UCL 선택 시 `isUCL=true` 플래그가 StandingsTable에 전달됨

### 요약 스트립 변경
- 변경 전: `전체 득점 1위` — 전체 대회 합산 1위 (Haaland)
- 변경 후: `EPL 득점 1위` — EPL 득점 순위 1위 (COMPETITION_SCORERS['premier-league'][0])
- 전체 대회 합산 수치를 공식 순위처럼 노출하지 않음

---

## 4. 대회별 득점 데이터 연결 방식

### api.js 변경

**`fetchHomeData`**:  
`competitionScorers` 맵 추가 (6개 대회 slug → COMPETITION_SCORERS 배열):
```js
const COMP_SLUGS = ['premier-league','la-liga','bundesliga','serie-a','ligue-1','champions-league']
competitionScorers[slug] = getCompetitionScorers(slug)
```
`topScorersAll` 는 홈에서 더 이상 필요 없으므로 제거.

**`fetchCompetitionStats(slug)` 신규**:  
StatsPage 전용. `comp`, `topScorers`, `topAssisters` 반환.  
백엔드 연결 시 `GET /api/stats?competition=` 으로 교체.

### 데이터 흐름
```
fetchHomeData() → { competitionScorers }
  ↓ (사이드바에서 sidebarComp 변경)
competitionScorers[sidebarComp].slice(0, 5) → StatsRanking
```

---

## 5. 통계 페이지 URL과 구성

**URL**: `/stats?competition={slug}`  
**지원 slug**: `premier-league`, `la-liga`, `bundesliga`, `serie-a`, `ligue-1`, `champions-league`  
**잘못된 slug**: `premier-league`(기본값)로 폴백

### 페이지 구성
1. 페이지 제목 "통계" / "Stats" + 시즌
2. 대회 선택 탭 (Link 기반 — URL 유지, 새로고침 후 선택 대회 복원)
3. 대회 허브 링크 (대회명 + ChevronRight)
4. 2열 그리드 (데스크톱): 득점 순위 | 도움 순위
5. 1열 (모바일): 순서대로 표시
6. EmptyState (데이터 없을 때), ErrorState, LoadingSkeleton 완비

### Header 활성화
AppHeader의 NAV 배열에서 `disabled: true` 제거 → NavLink로 정상 렌더링.  
Header "통계" 메뉴 클릭 시 `/stats?competition=premier-league`(기본)로 이동.

---

## 6. 순위 구역별 색상 표현

### 변경 전 문제
`ZONE_BORDER_CLASS`에 `border-{color}` 사용 → 행의 `border-b border-border/50`이 같은 `border-color` 속성으로 덮어써짐 → 하단선이 구역 색상으로 물드는 시각적 오류.

### 변경 후 구조

| 구역 | 왼쪽 표시선 | 행 배경 | sticky 셀 배경 |
|---|---|---|---|
| UCL 직행 / CL | `border-l-blue-500` | `bg-blue-500/4` | `bg-blue-50 dark:bg-[#0f172a]` |
| UCL 플레이오프 | `border-l-yellow-500` | `bg-yellow-500/4` | `bg-yellow-50 dark:bg-[#0f172a]` |
| UCL 탈락 | `border-l-gray-500` | `bg-gray-500/4` | `bg-gray-50 dark:bg-[#0f172a]` |
| UEL | `border-l-orange-500` | `bg-orange-500/4` | `bg-orange-50 dark:bg-[#0f172a]` |
| UECL | `border-l-green-600` | `bg-green-600/4` | `bg-green-50 dark:bg-[#0f172a]` |
| 강등 | `border-l-red-600` | `bg-red-600/4` | `bg-red-50 dark:bg-[#0f172a]` |
| 없음 | `border-l-transparent` | — | `bg-card` |

- `border-l-{color}`: 왼쪽 border에만 색상 적용 (하단선 `border-border/50` 불변)
- 행 배경 `[0.04]` (4%): 숫자 가독성에 방해되지 않는 수준
- sticky 셀: 가로 스크롤 시 뒤 콘텐츠를 가리는 불투명 배경
- hover 시 `hover:bg-accent/50` 적용 (구역 bg 일시 대체, transition-colors)
- 범례 도트 색상 수정: 탈락 `bg-gray-500` (전 `bg-gray-600`) → 행 표시선과 일치

---

## 7. 브라우저 검수 환경

보고서 최초 작성 시점에는 브라우저 실행이 불가해 코드 검토로만 검증했음.
이후 아래 환경에서 실제 렌더링 검수를 완료했음.

- Chromium (Playwright) + `vite dev`
- 뷰포트: 1440×900 / 390×844 (deviceScaleFactor 2)
- 테마: `localStorage['pitchlog-theme']` = light / dark
- 언어: `localStorage['pitchlog-lang']` = ko / en

---

## 8. 검수 결과 — 완료 항목

### 8.1 dark 테마 `ZONE_STICKY_BG` 색상 대조 → 색상은 일치

| 항목 | 측정값 (dark) |
|---|---|
| 카드 배경 `--card: 222 47% 11%` | `rgb(15, 23, 41)` |
| `ZONE_STICKY_BG` 의 `#0f172a` | `rgb(15, 23, 42)` |

B 채널 1/255 차이로 육안 구분 불가. **하드코딩 hex 자체는 카드 배경과 일치함.**

### 8.2 UCL 범례 표시 → 정상

홈 사이드바에서 UCL 칩 선택 시:

- `isUCL=true` 전달 → 범례가 `16강 직행` · `플레이오프` · `탈락` 3개로 교체됨
- 섹션 제목이 `UCL 순위` · `UCL 득점 순위`로 변경됨
- 득점 순위 데이터가 UCL 기준으로 교체됨 (Haaland 5골)

`/standings?competition=champions-league` 도 동일하게 동작.

### 8.3 모바일 390px 사이드바 칩 → 줄바꿈 없음

| 칩 | left | width |
|---|---|---|
| EPL | 16 | 45 |
| LaLiga | 67 | 58 |
| BL | 131 | 37 |
| SA | 174 | 38 |
| L1 | 218 | 35 |
| UCL | 259 | 46 |

6개 모두 동일 행(1줄)에 배치됨. 우측 끝 305px < 컨테이너 358px.
**줄바꿈이 발생하지 않으므로 검수 대상이 아님.**

### 8.4 통계 페이지 선수명 truncate → 잘림 없음

390px에서 `StatsRanking` 의 선수명·팀명 컨테이너 폭 210~219px.
한국어·영어 전 항목에서 `scrollWidth === clientWidth` — **truncate 발동 0건.**

---

## 9. 검수로 새로 발견한 문제

### 9.1 sticky 열과 행 배경의 색 불일치 (양 테마)

`ZONE_STICKY_BG` 는 카드 배경과 일치하지만, **행 배경(`ZONE_BG_CLASS`)에는 구역 틴트가 얹혀 있어**
sticky 열(순위·팀)과 나머지 열 사이에 세로 경계선이 그대로 노출됨.

| 테마 | sticky 셀 | 행 합성색 | 결과 |
|---|---|---|---|
| dark | `rgb(15, 23, 42)` | `rgb(22, 34, 58)` (`blue-400/[0.08]` over card) | sticky가 더 어두움 |
| light | `#eff6ff` (`blue-50`) | `≈#f8fafd` (`blue-500/[0.04]` over white) | sticky가 더 진함 |

- 방향만 반대일 뿐 **양 테마 모두 경계가 보임**
- `standingsZone.js` 의 "구역 색조를 유지하는 반불투명 배경" 주석과 실제 동작이 다름
- 수정 방향: 구역별로 `카드색 + 틴트`를 미리 합성한 **불투명 hex**를 `ZONE_STICKY_BG` 에 지정

부수 효과: sticky 셀 배경이 불투명이라 행의 `hover:bg-accent/50` 이 순위·팀 열에 적용되지 않음.

### 9.2 홈 사이드바 순위표에서 승점 열이 잘림

`StandingsTable` 의 `minWidth: 480px` 와 사이드바 폭 340px 충돌.
UCL 선택 시 팀명이 길어 `승점` 열이 카드 밖으로 밀려남.
가로 스크롤은 가능하나 안내 문구 `standings.scrollHint` 가 `sm:hidden` 이라 데스크톱에서 표시되지 않음.
**순위표에서 승점이 보이지 않는 상태.**

### 9.3 `ZONE_LABELS` 는 죽은 코드

`standingsZone.js` 의 `ZONE_LABELS` 는 한국어 하드코딩이지만,
`StandingsTable` 은 이를 사용하지 않고 `ZONE_LABEL_KEY` → `t()` 경로를 사용함.
i18n 위험은 없으나 미사용 상수이므로 제거 대상.

---

## 10. i18n 실측 결과

### 10.1 번역 키는 이미 완비되어 있음

| 항목 | 결과 |
|---|---|
| `ko.json` 키 수 | 192 |
| `en.json` 키 수 | 192 |
| en 누락 | 0건 |
| ko 누락 | 0건 |

**번역을 추가할 필요는 거의 없음. 페이지가 기존 키를 호출하지 않는 것이 문제.**
예: `home.eplFirstLabel`, `home.liveCount`, `home.goalsUnit`, `home.todayFiltered`,
`home.noTodayFiltered`, `home.aggregateScore`, `knockout.tbd`, `match.tabs.*`,
`competition.tabs.*` 모두 존재하지만 미사용 상태.

### 10.2 전역 누출원 2곳 (우선 수정 대상)

| 파일 | 문제 | 영향 범위 | 대체 키 |
|---|---|---|---|
| `src/utils/matchStatus.js` | `STATUS_LABELS` · `STATUS_DESCRIPTIONS` 한국어 하드코딩 맵. `MatchStatusBadge` 가 사용 | **모든 경기 카드** — `예정`/`확정`/`재검증 중` 전역 노출 | `match.scheduled`, `match.confirmed`, `match.recheck`, `match.statusDesc_*` |
| `src/utils/dateFormat.js` | `toLocaleTimeString('ko-KR')` · `toLocaleDateString('ko-KR')` 고정 | 전 페이지 — `오후 09:00`, `11월 24일 (화)`, `Updated: 11월 11일 오전 08:15 KST` | locale 인자화 필요 (키 없음) |

이 2개 파일만 고쳐도 전 페이지 누출의 상당 부분이 해소됨.

### 10.3 페이지별 영어 전환 시 한국어 노출 (실측)

| 페이지 | 노출 문자열 |
|---|---|
| `HomePage.jsx` | `10경기`, `EPL 1위`, `14골`, `합산`, `미정`, `오늘의 경기 — 선택 대회 (n개)`, `선택 대회의 오늘 경기 없음` |
| `MatchPage.jsx` | 탭 `개요`/`라인업`/`H2H`, `주요 이벤트`, `맞대결 기록`, `홈 승`/`무승부`/`원정 승`, `교체 선수`, `1차전`/`2차전`, `경기 예측` 외 (총 22곳) |
| `PlayerPage.jsx` | `공격수` 등 포지션, `만 n세`, `시즌 통계`, `출전`/`득점`/`도움`/`경고`/`퇴장`, 표 헤더 전체, `확정`/`집계 전` |
| `StandingsPage.jsx` | `대회 허브`, `리그 페이즈 진행 중`, `상위 8팀 16강 직행 · 9~24위 플레이오프 · 25위 이하 탈락`, `UCL 리그 페이즈 순위`, `순위 데이터 없음` |
| `MatchesPage.jsx` | `경기 일정 · 결과`, 필터 `전체`/`예정`/`종료`/`재검증 중`, `진행 중 (`, `종료·결과 (` |
| `CompetitionPage.jsx` | 탭 `일정`/`순위`/`통계`, `주요 경기`, `참가 팀`, `리그 페이즈 진행 중`, `녹아웃 대진` |
| `UCLKnockoutPage.jsx` | `녹아웃 대진`, `16강`/`8강`/`4강`/`결승`, `진행 중`, `진출 확정`, `대진 미정`, `합산: 1차전(홈) + 2차전(원정)` |
| `TeamPage.jsx` | `창단`, `감독:`, `EPL 순위`, `n승점`, `최근 5경기 폼`, `최근 결과`, `선수단 요약`, `n명` |
| `TeamFixturesPage.jsx` | `— 전체 일정`, `2026-27 시즌 · 국내 리그 + UCL 포함`, `진행 중`, `결과` |
| `NotFoundPage.jsx` | 전체 3줄 |
| `StatsPage.jsx` | **0건 — 유일하게 완전 i18n 적용됨** |

`aria-label` 하드코딩(`ThemeToggle`, `LoadingSkeleton`, `FilterBar` 등)도 동일하게 남아 있음.

---

## 11. 남은 작업 / 완료 현황

> 2026-09-02 갱신: 회귀 2건 + 잔여 i18n 11곳 + Mock stage 다국어화 처리 완료

### 11.1 직전 보고서(9.x) 항목 처리 결과

| 항목 | 내용 | 상태 |
|---|---|---|
| 9.1 sticky 색 불일치 | `ZONE_STICKY_BG` 합성 hex 적용 | ✅ 해결 완료 |
| 9.2 사이드바 승점 잘림 | compact 모드 minWidth 조정으로 해소 | ✅ 해결 완료 |
| 9.3 `ZONE_LABELS` 미사용 상수 | 제거 대상 확인 | ✅ 기기록 |

### 11.2 이번 작업에서 발견·수정한 회귀 2건

| 번호 | 파일 | 문제 | 수정 |
|---|---|---|---|
| R-1 | `StandingsTable.jsx` | `!compact` 시에도 `max-w-[80px] sm:max-w-[110px]` 적용 → 1440px에서 팀명 잘림 | `!compact` 분기 추가 → `max-w-[130px] sm:max-w-[200px]` |
| R-2 | `MatchStatusBadge.jsx` · `ko.json` | `minuteSuffix="분"` 탓에 ko 배지가 3줄로 접힘 | `ko.json` minuteSuffix `'`로 통일, 배지 span에 `whitespace-nowrap` 추가 |

### 11.3 이번 작업에서 처리한 i18n 11곳

| 파일 | 항목 | 결과 |
|---|---|---|
| `HomePage.jsx` | `${todayFiltered.length}경기` | `t('home.liveCount', {count})` |
| `HomePage.jsx` | `${eplTopScorer.value}골` | `${value} ${t('home.goalsUnit')}` |
| `HomePage.jsx` | 오늘의 경기 제목 하드코딩 | `t('home.todayFiltered', {count})` |
| `MatchCard.jsx` | `합산:` | `t('match.aggregate')` |
| `CompetitionChips.jsx` | `전체 대회 N` / `All (N)` | `t('competition.allCompetitionsChip', {count})` — 새 키 추가 |
| `FormBadge.jsx` | `'승'/'무'/'패'` 하드코딩 | `labelKey` 상수 + `t(labelKey)` |
| `UnifiedMatchList.jsx` | `toKSTTime(m.date)` locale 누락 | `toKSTTime(m.date, locale)` |

### 11.4 Mock stage 다국어화 ([C] 항목)

`standings.js` 의 stage 필드를 `{ label, status }` 구조로 분리.  
`StandingsPage.jsx` 에서 `standings.stageOngoing` / `standings.stageCompleted` 키로 조합.  
신규 키 `standings.stageOngoing` · `standings.stageCompleted` 를 ko · en 양쪽에 추가.  
`validateMockData.js` 는 entries만 검사하므로 회귀 없음.

### 11.5 이후 남은 작업

| 순위 | 작업 | 근거 |
|---|---|---|
| 1 | `matchStatus.js` i18n 처리 | `STATUS_LABELS` 한국어 하드코딩 맵 — 모든 경기 카드 영향 |
| 2 | `MatchPage.jsx` 나머지 i18n (22곳) | 탭·이벤트·예측 등 |
| 3 | `TeamPage.jsx` · `PlayerPage.jsx` i18n | 창단·감독·포지션 등 |
| 4 | `CompetitionPage.jsx` · `UCLKnockoutPage.jsx` i18n | 탭·라운드 이름 등 |
| 5 | `ZONE_LABELS` 제거 | 미사용 상수 (9.3) |

---

## 12. 검사 결과

| 검사 | 결과 |
|---|---|
| `npm run validate:data` | ✅ 오류 0건, 경고 0건 |
| `npm run lint` | ✅ 오류 0건, 경고 0건 |
| `npm run build` | ✅ 성공 |
| 브라우저 렌더링 검수 | 수동 검수 항목은 D절에 기록 (개발 서버 필요) |

---

*프로젝트: pitchlog-league*
