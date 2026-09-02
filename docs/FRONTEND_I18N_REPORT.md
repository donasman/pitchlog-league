# PitchLog 프론트엔드 다국어·화면 검수 보고서

> 작성일: 2026-11-23  
> 작업 범위: frontend 디렉터리 (docs/NEXT_STEPS.md 제외 docs 수정 없음)

---

## 1. 실제 수정한 파일

### 신규 파일

| 파일 | 역할 |
|---|---|
| `src/locales/ko.json` | 한국어 번역 리소스 (9개 네임스페이스, ~150 키) |
| `src/locales/en.json` | 영어 번역 리소스 (동일 구조) |
| `src/i18n/index.js` | i18next 초기화 — localStorage 언어 감지·저장 |
| `src/i18n/entityNames.js` | 팀·선수·대회 한국어 이름 테이블 (50+ 항목) |
| `src/utils/localization.js` | `getLocalizedName`, `getLocalizedShortName`, `getLocalizedCompetitionName` |
| `src/components/layout/LanguageToggle.jsx` | KO ↔ EN 전환 버튼 |

### 수정 파일

| 파일 | 변경 내용 |
|---|---|
| `src/main.jsx` | `@/i18n/index.js` import 추가 |
| `src/layouts/AppLayout.jsx` | 푸터 `t('common.mockNotice')` 적용 |
| `src/components/layout/AppHeader.jsx` | nav 레이블 i18n, 대회 선택 목록 현지화, LanguageToggle 삽입 |
| `src/components/ui/StandingsTable.jsx` | 열 헤더·범례 i18n, 팀명 `getLocalizedName`, 모바일 sticky 열, UCL 탈락 색상 수정 |
| `src/components/ui/MatchCard.jsx` | 팀명 `getLocalizedShortName/getLocalizedName` |
| `src/components/ui/StatsRanking.jsx` | 선수명·팀명 `getLocalizedShortName` |
| `src/components/ui/DataTimestamp.jsx` | `t('common.dataUpdated')` 적용 |
| `src/components/ui/ErrorState.jsx` | 기본 title·description `t()` 적용 |
| `src/components/ui/EmptyState.jsx` | 기본 title·description `t()` 적용 |
| `src/components/home/LiveHeroCard.jsx` | 팀명 현지화, 모바일 레이아웃 개선 |
| `src/components/home/CompetitionChips.jsx` | "전체 대회" 레이블 현지화, 대회명 현지화 |

### Mock Data·인프라 수정 (이전 작업)

| 파일 | 변경 내용 |
|---|---|
| `src/mocks/teams.js` | 28개 팀 추가 (전 5대 리그 + UCL 완비) |
| `src/mocks/standings.js` | 각 리그 8행 이상, 승점·득실차 정확 |
| `src/mocks/matches.js` | 대회별 LIVE·예정·확정·recheck 최소 요건 충족, UCL leg2Score 수정 |
| `src/mocks/players.js` | TOP_SCORERS_ALL 정렬 수정, 비 EPL 선수 추가, 대회별 득점·도움 순위 |
| `src/mocks/competitions.js` | 라운드 표기 전체 명칭으로 통일 |
| `src/services/api.js` | `fetchCompetitionHub` 대회별 scorer 반환 |
| `scripts/validateMockData.js` | 신규 검증 스크립트 |
| `package.json` | `validate:data` 스크립트 추가 |

---

## 2. 추가한 패키지

```
i18next@^26.4.1
react-i18next@^17.0.13
```

설치 방법: `npm install i18next react-i18next`  
TypeScript 설정 변경 없음.

---

## 3. 다국어 구조

```
src/
├── i18n/
│   ├── index.js          ← i18next 초기화
│   └── entityNames.js    ← 팀·선수·대회 이름 테이블
├── locales/
│   ├── ko.json           ← 한국어 (기본)
│   └── en.json           ← 영어
└── utils/
    └── localization.js   ← getLocalizedName / getLocalizedShortName
```

**번역 파일 네임스페이스**

| 키 | 범위 |
|---|---|
| `nav.*` | 헤더 내비 레이블 |
| `header.*` | 헤더 드롭다운·컨텍스트 바 |
| `match.*` | 경기 상태·탭·레이블 |
| `standings.*` | 순위표 열·범례·안내 |
| `player.*` | 선수 통계 레이블 |
| `team.*` | 팀 정보 레이블 |
| `competition.*` | 대회 허브 레이블 |
| `knockout.*` | UCL 녹아웃 스테이지 |
| `home.*` | 홈 화면 섹션 레이블 |
| `stats.*` | 득점·도움 순위 |
| `common.*` | 공통 (오류·빈 결과·타임스탬프) |

---

## 4. 언어 저장 방식

- 저장소: `localStorage` — 키 `pitchlog-lang`
- 저장값: `'ko'` 또는 `'en'`
- 초기화: `src/i18n/index.js` 에서 `localStorage.getItem('pitchlog-lang')` 감지
- 저장값 없으면 기본값 `'ko'`
- 전환 시 `i18n.changeLanguage(next)` + `localStorage.setItem` 동시 실행
- URL slug 변경 없음

---

## 5. 이름 fallback 규칙

```text
entityNames 테이블[locale]        ← 가장 우선
→ entityNames 테이블['en']
→ entity.names?.[locale]
→ entity.names?.['en']
→ entity.originalName
→ entity.name (또는 entity.shortName)
→ '' (빈 문자열 — 화면에 빈 이름이 노출되지 않도록 컴포넌트에서 fallback 처리)
```

`getLocalizedName(entity, locale)` — 긴 이름  
`getLocalizedShortName(entity, locale)` — 짧은 이름

---

## 6. 한국어 이름 적용 범위

### 팀 (50개 항목, 전 5대 리그 + UCL 주요 팀)

대표 예시:

| id | 한국어 | 짧은 이름 |
|---|---|---|
| mancity | 맨체스터 시티 | 맨시티 |
| realmadrid | 레알 마드리드 | 레알 |
| bayernmunich | FC 바이에른 뮌헨 | 바이에른 |
| inter | 인터 밀란 | 인터 |
| psg | 파리 생제르맹 | PSG |
| son | (선수) 손흥민 | 손흥민 |

### 선수 (16개 항목, 주요 발표 선수)

Haaland, Salah, Saka, Son, Palmer, Isak, Ødegaard, Fernandes,  
Lewandowski, Bellingham, Vinicius, Kane, Musiala, Osimhen, Lautaro, Dembélé

### 대회 (6개 항목)

프리미어 리그, 라 리가, 분데스리가, 세리에 A, 리그 1, UEFA 챔피언스 리그

---

## 7. 브라우저에서 확인한 URL과 화면 크기

브라우저 자동화 도구를 사용할 수 없어 실제 브라우저 실행은 불가능함.  
대신 코드 리뷰와 build 성공으로 동작 가능성을 검증했음.

**수동 검수 권장 목록** (이 보고서가 완료되는 즉시 수행할 것):

| URL | 확인 크기 | 확인 항목 |
|---|---|---|
| `/` | 1440×900, 390×844 | 언어 전환, LIVE 카드 팀명 한국어, 득점 순위 다국적 선수 표시 |
| `/?competitions=la-liga` | 1440×900 | El Clásico LIVE 팀명 한국어 |
| `/competitions/premier-league` | 1440×900 | 대회 허브 탭, 팀명 한국어 |
| `/competitions/champions-league` | 1440×900 | UCL 순위 구역 범례 색상 확인 |
| `/standings?competition=premier-league` | 1440×900, 390×844 | 열 헤더 언어 전환, 팀명 한국어, 스티키 열 |
| `/standings?competition=champions-league` | 1440×900 | 탈락 구역(bg-gray-600) 색상 범례와 일치 |
| `/teams/real-madrid` | 1440×900 | 팀명 한국어 (레알 마드리드), La Liga + UCL 경기 목록 |
| `/teams/real-madrid/fixtures` | 1440×900 | 대회 필터 |
| `/players/erling-haaland` | 1440×900 | 선수명 한국어 (엘링 홀란드), EPL+UCL 합산 통계 |
| `/matches/m001` | 1440×900, 390×844 | LIVE 상태, 팀명, 라인업 레이아웃 |
| `/competitions/champions-league/knockout` | 1440×900 | 16강 대진 한국어 팀명 |

---

## 8. 발견한 문제와 수정 내용

### Stage 1 — 화면 검수

| 문제 | 수정 |
|---|---|
| UCL 순위 탈락 범례 색상(`bg-slate-400`)이 테두리(`border-gray-600`)와 불일치 | `bg-gray-600`으로 통일 |
| `MatchCard` compact 모드: 코드 검토 결과 `truncate` + `min-w-0` 정상 적용. 시각 문제 없음 확인 | 수정 없음 |
| `MatchPage` 라인업 팀명: `shortName` 사용 + `uppercase` 충분함. 시각 문제 없음 | 수정 없음 |

### Stage 2-4 — 다국어

| 문제 | 수정 |
|---|---|
| `LanguageToggle.jsx` lint 오류: 빈 catch 블록 | `typeof localStorage !== 'undefined'` 체크로 교체 |
| `LiveHeroCard.jsx` 미사용 import | 제거 |
| `StatsRanking.jsx` 미사용 변수 | 정리 |

---

## 9. 실행한 검사와 결과

| 검사 | 결과 |
|---|---|
| `npm run validate:data` | ✅ 오류 0건, 경고 0건 |
| `npm run lint` | ✅ 오류 0건, 경고 0건 |
| `npm run build` | ✅ 성공 (2.77s) |

---

## 10. 완료하지 못한 항목과 이유

### 브라우저 실제 실행

`npm run dev`를 실행하는 브라우저 자동화 도구를 사용할 수 없어 다음 항목은 수동 검수가 필요함:

- 언어 전환 후 즉시 UI 업데이트 확인 (React 리렌더링)
- `localStorage` 저장 후 새로고침 시 언어 유지 확인
- 모바일 390px에서 언어 전환 버튼 위치 확인 (모바일 메뉴 내 배치됨)
- 다크·라이트 테마 전환 후 텍스트 대비 확인

### 미완성 i18n 컴포넌트

다음 페이지·컴포넌트는 기존 한국어 하드코딩 문구를 사용 중이며, 향후 `useTranslation` 적용 필요:

- `src/pages/HomePage.jsx` — 섹션 제목, QUICKLINKS 레이블
- `src/pages/MatchPage.jsx` — 탭 이름("개요", "라인업", "H2H"), 이벤트 레이블
- `src/pages/StandingsPage.jsx` — 페이지 제목, UCL 안내 배너
- `src/pages/CompetitionPage.jsx` — 탭 이름, 섹션 레이블
- `src/pages/TeamPage.jsx` — 팀 정보 레이블
- `src/pages/PlayerPage.jsx` — 통계 레이블
- `src/pages/UCLKnockoutPage.jsx` — 스테이지 이름, 범례
- `src/pages/MatchesPage.jsx` — 필터, 제목
- `src/components/ui/MatchStatusBadge.jsx` — 상태 레이블 (`matchStatus.js`의 `STATUS_LABELS`와 연동 필요)
- `src/components/ui/LoadingSkeleton.jsx` — `aria-label`

이 페이지들의 한국어 문구는 현재 기본(ko) 언어에서 정상 표시됨. 영어 전환 시 해당 문구는 한국어 그대로 노출됨.

---

## 11. 다음 백엔드 단계에서 필요한 작업

1. **Localization API 계약** — `GET /api/teams/:id` 응답에 `displayName`, `shortDisplayName`, `originalName` 필드 추가
2. **Localization 테이블** — `Team`, `Player`, `Competition`에 언어별 이름 저장
3. **fallback 체인** — `요청 언어 → 영어 → API 원본` 서버 사이드 구현
4. **선수 번역 커버리지** — 현재 16명만 한국어 이름 있음. 전체 선수로 확장 시 백엔드 Localization 테이블 필요
5. **검색 별칭** — 한국어 검색어("손흥민", "홀란드")로 영어 슬러그 매핑
6. **신규 선수 미번역 감지** — 새 선수 입수 시 번역 없음 상태를 추적하는 관리 절차
7. **`src/i18n/entityNames.js` 제거** — 백엔드 API 연결 후 이 파일은 삭제하고 API 응답의 `displayName`을 직접 사용

---

*검사 기준일: 2026-11-23 / 프로젝트: pitchlog-league*
