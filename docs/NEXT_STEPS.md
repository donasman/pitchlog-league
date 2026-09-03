# PitchLog 다음 작업 순서

> 갱신: 2026-09-03 (전체 페이지 i18n 완료 확인 · 문서 정합성 정리)  
> 기준: 다국어 인프라(i18next) + Mock Data 균형화 + 홈/통계 UI 개선 + 브라우저 실측 회귀 수정

## 1. 현재 확인된 상태

- [x] `npm run validate:data` 통과 — 오류 0건, 경고 0건
- [x] `npm run lint` 통과 — 오류 0건
- [x] `npm run build` 성공
- [x] 5대 리그 + UCL Mock Data 균형화 (각 리그 LIVE·예정·확정·recheck + 8행 순위)
- [x] `TOP_SCORERS_ALL` 정렬 수정 (Son 9골 → 5위, 다국적 선수 포함)
- [x] UCL R16 집계 점수 수정 (leg2Score home/away 방향 수정)
- [x] 스테이지 표기 통일 (`MW 13` → `Matchweek 13`)
- [x] 모바일 순위표 sticky 열 + 가로 스크롤 안내
- [x] 모바일 LIVE 카드 메타 정보 줄바꿈 처리
- [x] UCL 탈락 구역 범례 색상 통일 (`bg-gray-600`)
- [x] `scripts/validateMockData.js` + `npm run validate:data` 추가
- [x] i18next + react-i18next 설치
- [x] `src/i18n/index.js` 초기화 (localStorage 언어 감지)
- [x] `src/locales/ko.json`, `src/locales/en.json` 번역 리소스
- [x] `src/i18n/entityNames.js` 팀·선수·대회 한국어 이름 테이블
- [x] `src/utils/localization.js` `getLocalizedName`, `getLocalizedShortName`
- [x] `LanguageToggle` Header에 통합 (데스크톱 + 모바일 메뉴)
- [x] `AppHeader`, `StandingsTable`, `MatchCard`, `StatsRanking`, `LiveHeroCard`, `CompetitionChips`, `DataTimestamp`, `ErrorState`, `EmptyState`, `AppLayout` i18n 적용
- [x] 홈 바로가기 섹션(QUICKLINKS) 제거
- [x] 홈 사이드바 통합 대회 선택기 (6개 대회 → 순위+득점 동시 전환)
- [x] 홈 요약 "EPL 득점 1위" (전체 합산 제거)
- [x] 순위표 구역 색상: `border-l-{color}` + `ZONE_BG_CLASS` + `ZONE_STICKY_BG`
- [x] `/stats` 페이지 생성 및 라우트 등록
- [x] Header 통계 메뉴 활성화
- [x] `fetchCompetitionStats` API 함수 추가
- [x] 브라우저 실측 회귀 수정 — 팀명 잘림(StandingsTable) · LIVE 배지 줄바꿈(MatchStatusBadge)
- [x] HomePage i18n 3곳 (`liveCount`, `goalsUnit`, `todayFiltered`)
- [x] MatchCard `합산:` → `t('match.aggregate')`
- [x] CompetitionChips 전체 대회 칩 i18n (`allCompetitionsChip` 신규 키)
- [x] FormBadge `승/무/패` → `standings.won/drawn/lost`
- [x] UnifiedMatchList `toKSTTime` locale 인자 추가
- [x] Mock standings `stage` → `{ label, status }` 구조화 + StandingsPage 조합 로직

## 2. 즉시 해야 할 수동 검수

`npm run dev` 실행 후 다음 URL에서 확인:

```
/                                  — 홈 언어 전환, 오늘 경기 수/득점 단위 영어 전환
/standings?competition=premier-league — 1440px에서 팀명(뉴캐슬 유나이티드 등) 잘림 없음
/standings?competition=champions-league — UCL stage "League Phase — Matchday 4 ongoing"
/matches                           — LIVE 배지 1줄 유지 (en/ko 모두)
/teams/manchester-city             — 팀 상세 다국어
/players/erling-haaland            — 선수 상세 다국어
/competitions/champions-league/knockout — UCL 녹아웃 팀명
```

확인 항목:
- 언어 전환 즉시 반영
- 새로고침 후 선택 언어 유지
- 번역 키·`undefined`·빈 이름 없음
- 가로 넘침 없음 (1440×900, 390×844)

## 3. 남은 i18n 작업

**한국어 하드코딩은 해소됨.** `npm run check:i18n` 1번 항목(한국어 문자 검출)이
오류 0건으로 통과한다. 이전에 이 표에 있던 8개 파일(`MatchPage`, `CompetitionPage`,
`TeamPage`, `PlayerPage`, `UCLKnockoutPage`, `MatchesPage`, `matchStatus.js`,
`LoadingSkeleton`)은 모두 화이트리스트 대상이 아니며 검사를 통과한다.

남은 것은 경고 57건이다. 빌드를 막지는 않지만 정리 대상이다.

| 구분 | 건수 | 내용 |
|---|---|---|
| 미사용 키 (죽은 키) | 51 | `header.comingSoon`, `match.statusDesc_*` 9개, `standings.legend.*` 4개, `knockout.*` 9개, `player.*`, `team.*`, `home.quickLinks`(제거된 섹션의 잔여 키) 등 |
| `entityNames` 누락 | 6 | `boniface`, `balogun`, `benganda`, `calhanoglu`, `harit`, `maruull` — 영어 이름만 노출됨 |

미사용 키는 실제로 죽은 키인지 아직 붙이지 않은 화면의 키인지 구분해야 한다.
`match.statusDesc_*`와 `standings.legend.*`는 후자일 가능성이 높으므로 삭제 전에 확인한다.

## 4. 발표 캡처 (다음 순서)

발표용 URL은 `frontend/PRESENTATION_CAPTURE.md` 참조.

캡처 전 확인:
- `npm run dev` 실행
- 다크 테마 선택
- 브라우저 확대 100%
- 개발 도구 닫힘
- 원하는 언어 선택 후 캡처

## 5. 백엔드 착수 시 이름 매칭 작업

1. `api_team_id`, `api_player_id`, `api_competition_id`를 내부 식별 기준으로 확정
2. API 원본 이름을 변경 없이 저장
3. Team·Player·Competition Localization 테이블 추가
4. 한국어 이름, 짧은 이름, 검색 별칭 저장
5. `요청 언어 → 영어 → API 원본` fallback 구현
6. API DTO에 `displayName`, `shortDisplayName`, `originalName` 제공
7. 한국어·영어 검색 별칭 정규화
8. 신규 선수·미번역 항목 확인 관리 절차
9. 백엔드 연결 후 `src/i18n/entityNames.js` 제거하고 API `displayName` 사용

## 6. 권장 전체 진행 순서

```text
수동 브라우저 검수 (개발 서버)
→ 남은 페이지 i18n 적용
→ 발표 캡처 확정
→ NestJS + TypeScript 백엔드 골격
→ PostgreSQL·Prisma 연결과 대회·팀·선수 모델
→ API-Football 공통 클라이언트와 EPL 스쿼드 수집
→ NestJS REST API 구현
→ Localization 테이블과 API 계약
→ 실제 API 연결
→ entityNames.js 제거 + API displayName 사용
→ 검색 별칭과 미번역 관리
→ 경기·순위·선수 통계 수집
→ NestJS Socket.io Gateway 연결
→ 필요 시 Redis·BullMQ Worker 추가
```
