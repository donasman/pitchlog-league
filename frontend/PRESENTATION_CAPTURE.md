# PitchLog 발표 캡처 화면 확정 (PPT 7~11장)

> 기준 시점: 2026-11-23 (Mock Data 고정 기준일)
> 브라우저: 확대 100%, 개발 도구 닫힘, 다크 테마 기준
> 공통: `npm run dev` 실행 후 기본 주소 http://localhost:5173 에서 확인

---

## 슬라이드 7 — 홈 (전체 대회)

| 항목         | 내용 |
|---|---|
| **URL**      | `http://localhost:5173/` |
| **권장 크기** | 1440×900 (데스크톱 전체) |
| **테마**     | 다크 |
| **대회/시즌** | 전체 대회 (필터 없음) |

**강조 영역**
- CompetitionChips: EPL·LaLiga·BL·SA·L1·UCL 6개 칩 모두 보임
- SummaryStrip: LIVE 중·오늘 경기·EPL 1위·전체 득점 1위
- LiveHeroCard: Man City vs Arsenal (EPL LIVE, 67') + 부 카드 El Clásico / UCL Bayern vs PSG
- 오늘의 경기: EPL·La Liga·Bundesliga·Serie A·Ligue 1 LIVE 5경기 + 예정 경기 혼합

**캡처 전 확인 사항**
- LIVE 경기 6개가 상단에 표시되는지 확인
- 특정 리그로 치우치지 않고 다국 경기가 고르게 보이는지 확인
- 사이드바 순위: EPL 선택 시 상위 5팀 표시
- 사이드바 득점 순위: Haaland(19)→Kane(16)→Lewandowski(15) 순서 (다국적 선수)

---

## 슬라이드 7 보조 — 홈 (La Liga 필터)

| 항목         | 내용 |
|---|---|
| **URL**      | `http://localhost:5173/?competitions=la-liga` |
| **권장 크기** | 1440×900 |
| **테마**     | 다크 |

**강조 영역**
- LiveHeroCard: Real Madrid vs Barcelona (Jornada 13 LIVE, 41')
- 오늘의 경기: El Clásico + Atlético vs Villarreal (La Liga 경기만 표시)
- 순위 사이드바: Real Madrid(32pts) 선두 확인

---

## 슬라이드 8 — 대회 상세 · 순위

### 8A — EPL 대회 허브

| 항목         | 내용 |
|---|---|
| **URL**      | `http://localhost:5173/competitions/premier-league` |
| **권장 크기** | 1440×900 |
| **탭**       | 순위 탭 선택 |

**강조 영역**: 20팀 전체 순위표, 구역 색상(UCL·UEL·UECL·강등) 확인

### 8B — UCL 대회 허브

| 항목         | 내용 |
|---|---|
| **URL**      | `http://localhost:5173/competitions/champions-league` |
| **권장 크기** | 1440×900 |
| **탭**       | 순위 탭 선택 |

**강조 영역**: UCL 리그 페이즈 12팀 순위, 구역(직행·플레이오프·탈락) 색상

### 8C — EPL 순위 전용 페이지

| 항목         | 내용 |
|---|---|
| **URL**      | `http://localhost:5173/standings?competition=premier-league` |
| **권장 크기** | 1440×900 |

### 8D — La Liga 순위 (참고용)

| 항목         | 내용 |
|---|---|
| **URL**      | `http://localhost:5173/standings?competition=la-liga` |

---

## 슬라이드 9 — 팀 상세 · 전체 일정

### 권장 팀: Real Madrid (`real-madrid`)

국내 리그(La Liga)와 UCL에 동시 참가, 다양한 경기 이력

| 항목         | 내용 |
|---|---|
| **URL (팀 상세)** | `http://localhost:5173/teams/real-madrid` |
| **URL (전체 일정)** | `http://localhost:5173/teams/real-madrid/fixtures` |
| **권장 크기** | 1440×900 |
| **테마**     | 다크 |

**강조 영역 (팀 상세)**
- 팀 정보: Santiago Bernabéu, 81,044석, Carlo Ancelotti 감독
- 참가 대회: La Liga + Champions League 필터 칩 모두 동작 확인
- 경기 이력: m009(LIVE El Clásico), m031(확정 vs Athletic), m032(recheck vs Villarreal), m005/m006(UCL R16)

**강조 영역 (전체 일정)**
- 대회 필터: La Liga / UCL 전환 시 경기 목록이 각각 필터링되는지 확인
- 총 경기: La Liga 3경기 + UCL 2경기 = 5경기

### 보조 팀: Bayern Munich

| 항목         | 내용 |
|---|---|
| **URL (팀 상세)** | `http://localhost:5173/teams/bayern-munich` |

경기: m010(UCL LIVE), m011(BL LIVE), m018(BL scheduled), m029(UCL confirmed), m033(BL confirmed) = 5경기

---

## 슬라이드 10 — 선수 상세

### 권장 선수: Erling Haaland (`erling-haaland`)

전체 대회 합산 통계(EPL+UCL) 확인 가능

| 항목         | 내용 |
|---|---|
| **URL**      | `http://localhost:5173/players/erling-haaland` |
| **권장 크기** | 1440×900 |
| **테마**     | 다크 |

**강조 영역**
- 기본 정보: Norwegian / FWD / #9 / Man City
- 시즌 통계: EPL 14골 3도움 / UCL 5골 1도움
- 합산: 19골 4도움

### 보조 선수 A: Robert Lewandowski (La Liga)

| 항목         | 내용 |
|---|---|
| **URL**      | `http://localhost:5173/players/robert-lewandowski` |

통계: La Liga 11골 4도움 / UCL 4골 2도움 = 합산 15골 6도움

### 보조 선수 B: Harry Kane (Bundesliga)

| 항목         | 내용 |
|---|---|
| **URL**      | `http://localhost:5173/players/harry-kane` |

통계: Bundesliga 11골 5도움 / UCL 5골 3도움 = 합산 16골 8도움

### 보조 선수 C: Victor Osimhen (Serie A)

| 항목         | 내용 |
|---|---|
| **URL**      | `http://localhost:5173/players/victor-osimhen` |

통계: Serie A 10골 2도움 (단일 대회)

---

## 슬라이드 11 — 경기 상세 · UCL 녹아웃

### 11A — EPL LIVE 경기 상세

| 항목         | 내용 |
|---|---|
| **URL**      | `http://localhost:5173/matches/m001` |
| **권장 크기** | 1440×900 |
| **테마**     | 다크 |

**강조 영역**
- LIVE 뱃지 + 경기 시간 (67')
- 스코어: 2-1 (Man City vs Arsenal)
- 이벤트 타임라인: Haaland 12', Saka 35'(옐로우카드 포함), Haaland 62'
- 라인업: 4-3-3 포메이션
- Head-to-Head 이력

### 11B — UCL R16 경기 상세 (1차전 확정)

| 항목         | 내용 |
|---|---|
| **URL**      | `http://localhost:5173/matches/m005` |

강조: UCL 라운드 표기 "Round of 16" / 합산 스코어 2-1

### 11C — UCL 녹아웃 대진표

| 항목         | 내용 |
|---|---|
| **URL**      | `http://localhost:5173/competitions/champions-league/knockout` |
| **권장 크기** | 1440×900 |
| **테마**     | 다크 |

**강조 영역**
- 16강: Man City(확정), Arsenal(확정), Bayern(확정), Barcelona(확정), Inter vs Atlético(진행중)
- 8강 미정(TBD) 대진 칸
- 4강·결승 TBD 표시

### 11D — recheck 상태 경기 (참고)

| 항목         | 내용 |
|---|---|
| **URL**      | `http://localhost:5173/matches/m004` |

강조: Stamford Bridge Chelsea 1-1 Newcastle, 재검증 뱃지

---

## 모바일 캡처 추가 URL (390×844)

| 화면 | URL | 확인 포인트 |
|---|---|---|
| 홈 모바일 | `/` | LIVE 카드 텍스트 겹침 없음, 카드 세로 넘침 없음 |
| EPL 순위 모바일 | `/standings?competition=premier-league` | 순위·팀·경·득실·승점 핵심 열 보임 / 가로 스크롤 안내 표시 |
| UCL 순위 모바일 | `/standings?competition=champions-league` | 구역 색상 유지 |
| 경기 상세 모바일 | `/matches/m001` | LIVE 스코어 중앙 정렬, 팀명 말줄임 |

---

## 캡처 체크리스트

- [ ] `npm run dev` 실행 및 `http://localhost:5173` 접속 확인
- [ ] 브라우저 확대 100% 설정
- [ ] 개발 도구(DevTools) 닫힘 확인
- [ ] 다크 테마 선택 (ThemeToggle에서 전환)
- [ ] 페이지 로딩 완료 후(스피너 사라진 후) 캡처
- [ ] 스크롤바가 콘텐츠를 가리지 않는지 확인
- [ ] 임시 캡처 파일은 `.gitignore`에 추가 후 저장
- [ ] 1440×900 크기에서 가로 스크롤 넘침 없음 확인
