# 화면 구현 계획 — Claude Code 인수인계

> 작성: 2026-09-03 · 설계·디자인·Mock 데이터가 모두 준비된 시점
> 이 문서는 **Claude Code CLI에서 실행**하는 것을 전제로 한다.

---

## 왜 Claude Code에서 하는가

UI 구현은 화면을 보면서 고쳐야 한다. Cowork 원격 세션에서는
`npm run dev`를 띄워놓고 볼 수 없고(셸 호출마다 새 프로세스), 파일이 크면
원격 셸을 여러 번 왕복해야 한다.

Claude Code는 로컬에서 개발 서버를 띄우고 **Playwright로 스크린샷을 찍어
시안과 대조**할 수 있다. `playwright`가 이미 `devDependencies`에 있다.

원격 세션이 나은 일은 따로 있다 — 설계 판단, 문서 교차 참조, 조사,
검토·감사, 그리고 스크립트로 생성하는 작업.

---

## 시작 전 확인

```bash
cd C:\Dev\pitchlog-league
git pull origin dev
cd frontend && npm ci && npm run verify
```

`verify`가 통과해야 시작한다. 검사 13종 · 데이터 오류 0건이 기준선이다.

---

## 준비된 것

| 자료 | 위치 |
|---|---|
| 디자인 토큰 + 컴포넌트 CSS | `design/pitchlog-tokens.css` |
| 시안 JSX 14개 · HTML 11개 | `design/exports/pitchlog-league/` |
| 단계별 디자인 브리프 | `docs/design-briefs/01~08` |
| 화면 요구사항 | `docs/PRD.md` |
| Mock 데이터 | `frontend/src/mocks/` (11파일, 17,580줄) |
| 자동 검사 | `npm run verify` — 데이터 13종 + i18n 8종 + lint + build |

**Mock 생성 파일은 직접 수정하지 않는다.** `frontend/scripts/genMock*.mjs`를 고치고 다시 실행한다.

---

## ⚠ 전 단계 공통 규칙

### 1. 파랑의 두 가지 의미 — 형태로 분리 (PRD 9-2)

| 역할 | 허용 | 금지 |
|---|---|---|
| 브랜드 파랑 | 채운 배경 + 흰 글자, 밑줄 텍스트 | 좌측 표시선, 배경 틴트 |
| 구역 파랑 (UCL 직행) | 좌측 2px 표시선 + 4% 틴트 + 범례 | 채운 배경, 링크 색 |

**순위표 안에서 팀 이름을 브랜드 색으로 칠하지 않는다.**
**활성 필터 칩은 틴트가 아니라 채운다.**

### 2. 화면 상태 4종을 각각 만든다

로딩 · 오류 · 빈 결과 · 정상. **오류를 빈 데이터로 바꾸지 않는다.**
무음 `catch {}`가 새로 들어오면 lint가 막는다.

### 3. null 처리 (DATA_RULES 3장)

Mock이 실제 API 동작을 반영해 `redCards`를 0 대신 `null`로 준다.

- `null → 0`: 카드 · 오프사이드 · 슈팅 · 파울 · 태클 · 듀얼 · 드리블 · 페널티
- `null` 유지: **rating · expectedGoals · goalsPrevented** — 0과 다르다.
  평점을 0으로 바꾸면 랭킹에서 출전 안 한 선수가 최하위로 끼어든다

### 4. 접근성

본문 4.5:1 · 큰 텍스트 3:1 · 컨트롤 경계 3:1 · `:focus-visible` 2px+2px ·
터치 타깃 44px · `prefers-reduced-motion` · 상태를 색상 단독으로 구분하지 않는다.

토큰 값을 바꾸면 다시 측정한다. **눈으로는 미달이 보이지 않는다.**

### 5. 각 단계 완료 시

```bash
npm run verify        # 통과해야 다음 단계로
git commit            # 단계 하나 = 커밋 하나
```

---

# 단계별 구현

브리프 번호와 1:1로 맞췄다. **순서를 지킨다** — 앞 단계가 뒤 단계의 부품을 만든다.

## 1단계 · 토큰 + 공통 컴포넌트 ★ 가장 중요

여기서 만든 부품이 5개 이상 화면에서 반복된다. 대충 넘어가면 전부 다시 손댄다.

**할 일**
- `design/pitchlog-tokens.css`를 `frontend/src/styles/`로 편입
- Tailwind `--primary`가 현재 **초록**이다 → 브랜드 블루로 교체 (미결정 #2 해소)
- 부품 교체: `TeamBadge` · `MatchCard` · `StandingsTable` 행 · `MatchStatusBadge`(8종) ·
  `FilterBar` 칩 · 버튼 · `LoadingSkeleton` · `FormBadge` · `EmptyState` · `ErrorState`
- 참고: `design/exports/pitchlog-league/parts-2.jsx` · `pitchlog.css`

**완료 조건**
- 부품 시트 페이지(`/dev/parts` 같은 임시 라우트)에서 전 상태 확인
- 긴 팀명(`브라이턴 앤 호브 알비온`, `Borussia Mönchengladbach`)이 **390px에서 안 깨진다**
- 배지 8종이 한 줄을 유지한다

---

## 2단계 · 경기 탭 `/matches`

시안 완성도가 가장 높다. 부품이 잘 만들어졌는지 검증하는 자리이기도 하다.

**할 일**
- `MatchesPage` 교체 — 좌측 필터 · 중앙 목록 · 우측 컨텍스트 3열
- 날짜 헤더 · LIVE 히어로 · 대회별 그룹 · 주간 보기
- 참고: `matches-tab.jsx`

**데이터** `matches.js` · `matchStats.js` · `standings.js`

**완료 조건** 필터 조합이 URL에 보존된다 · 모바일에서 3열이 무너지지 않는다

---

## 3단계 · 홈 `/` ★ 신규

**경기 탭의 요약이 아니다.** 제품 앞장이다 (`IA_HOME_RESTRUCTURE.md`).

**할 일**
- 히어로 — 헤드라인 + 라이브 펄스(`LIVE_PULSE`, 얇은 스코어 줄. **경기 카드 금지**)
- 6개 대회 그리드 (`COMPETITION_OVERVIEW`)
- 차별점 3개 — 실제 배지·구역 막대·한영 칩을 쓴다. 아이콘 아님
- 바로 가기 3열 — 미리보기 **3행만**
- 탭에 홈을 추가하지 않는다. **로고 클릭**으로 온다

**데이터** `overview.js`

**완료 조건**
- 스크롤 없이 서비스가 뭔지 + 지금 살아있는지 보인다
- **진행 중 경기 0건 상태**를 그렸다 (`NEXT_KICKOFF`로 대체)
- 경기 탭 스크린샷과 나란히 놓았을 때 **같은 화면으로 안 보인다** ← 진짜 시험

---

## 4단계 · 순위 `/standings`

정보 밀도 최고. 모바일이 최대 난제다.

**할 일**
- 11열 순위표 · 구역 표시(좌측 2px + 4% 틴트 + **패턴** + 범례)
- 국내 리그와 UCL을 **같은 컴포넌트**로. 구역 규칙만 바꿔 끼운다
- 모바일: 순위·팀 열 **sticky + 불투명 배경**, 나머지 가로 스크롤, 스크롤 가능 안내

**데이터** `standings.js` · `teamStats.js`

**완료 조건** 390px에서 안 깨진다 · **색을 빼고 봐도 구역이 구분된다**

---

## 5단계 · 경기 상세 `/matches/:id`

**할 일**
- 상단 스코어보드 · 탭(라인업 · 통계 · H2H · 타임라인)
- **통계 탭에 xG**를 넣는다 — `expectedGoals` · `goalsPrevented`.
  "슈팅 7개, xG 0.33"이 나란히 보이면 "많이 쐈지만 좋은 기회는 아니었다"가 읽힌다
- 라인업 포메이션 — 세로(모바일)/가로(데스크톱) 두 배치
- **라인업 미공개 상태** — 31경기가 라인업이 없다. 반드시 처리
- `재검증 중`일 때 "이 숫자는 아직 확정 아님" 명시

**데이터** `matchStats.js` · `lineups.js` (`getLineup` · `getTopRated`)

**완료 조건** `종료` / `재검증 중` / `확정` 세 상태가 서로 다르게 읽힌다

---

## 6단계 · 나머지 화면

앞 단계 부품으로 조립한다. **새 부품이 필요하면 1단계로 돌아간다.**

| 화면 | 핵심 | 데이터 |
|---|---|---|
| 대회 허브 `/competitions/:slug` | 리그와 UCL이 같은 레이아웃에 다른 섹션 | `standings` · `matches` |
| UCL 녹아웃 | 데스크톱 열 배치 / 모바일 세로 아코디언 — **다른 레이아웃** | `UCL_KNOCKOUT_TIES` |
| 통계 `/stats` | 전체 합산 시 **대회별 분해** (12골 = EPL 9 + UCL 3) | `players.js` |
| 팀 상세 `/teams/:slug` | 홈·원정 성적, 클린시트, **포메이션별 출전** | `teamStats.js` |
| 팀 일정 `/teams/:slug/fixtures` | **대회 필터 필수**, "오늘" 위치 표시 | `matches.js` |
| 선수 상세 `/players/:slug` | 대회별 분리 + 전체 합산 토글 | `players.js` |
| 대회 목록 · 팀 목록 · 404 | 단순 | — |

---

## 7단계 · 알림 (전역 레이어)

**할 일**
- 토스트 4종 — 골 · 킥오프 · 종료 · **기록 확정**.
  확정 알림이 이 서비스만의 것이다. 골 알림과 구분한다
- 헤더 벨 + 안 읽은 개수. **배지는 브랜드 파랑** (빨강이면 LIVE·오류와 겹친다)
- 알림 패널 (내용 있음 / 비어 있음)
- **2단계 권한 요청** — 우리 카드로 먼저 묻고, 동의했을 때만 브라우저 창.
  `permission` 세 상태(default · granted · denied)를 모두 그린다
- 설정 화면 — "이 브라우저에서만 적용됩니다" 명시

**데이터** `notifications.js`

---

## 8단계 · AI 어시스턴트 패널 (전역)

**말풍선만 있는 챗봇으로 그리면 실패한다.**

**할 일**
- 전역 패널 (데스크톱 우측 슬라이드 / 모바일 바텀시트). 전용 화면 아님
- 빈 상태 — 예시 질문 4개 (`SUGGESTED_QUESTIONS`)
- 답변마다 **근거 카드 · 데이터 기준 시각 · 신뢰도 표기**
- 숫자는 문장이 아니라 **데이터 카드**로. 기존 컴포넌트를 그대로 쓴다
- 샘플 4건이 각각 다른 상태다 — `confirmed` · `live` · **`recheck`** · `unanswerable`

**데이터** `assistant.js`

**완료 조건** 답변의 숫자가 **조회된 것**임이 화면에서 읽힌다.
지어낸 것처럼 보이면 실패다.

---

# Claude Code 지시문

각 단계를 시작할 때 아래를 그대로 붙여넣는다.

```
docs/IMPLEMENTATION_PLAN.md 의 N단계를 구현해줘.

시작 전에 읽을 것:
- docs/IMPLEMENTATION_PLAN.md 의 "전 단계 공통 규칙"
- docs/design-briefs/0N-*.md
- design/pitchlog-tokens.css
- design/exports/pitchlog-league/ 의 해당 시안 JSX

규칙:
- Mock 파일(src/mocks/*.js)은 직접 수정하지 않는다.
  필요하면 scripts/genMock*.mjs 를 고치고 다시 실행한다.
- 오류를 빈 데이터로 바꾸지 않는다. 화면 상태 4종을 각각 만든다.
- 순위표 안에서 팀 이름을 브랜드 색으로 칠하지 않는다 (PRD 9-2).
- rating·expectedGoals 의 null 을 0으로 바꾸지 않는다.

끝나면:
- npm run verify 통과 확인
- npm run dev 로 띄우고 Playwright 로 1440×900 과 390×844 스크린샷을 찍어
  design/exports 의 시안과 대조
- 단계 하나 = 커밋 하나
```

---

# 진행 체크

- [ ] 1단계 토큰 + 공통 컴포넌트
- [ ] 2단계 경기 탭
- [ ] 3단계 홈 (신규)
- [ ] 4단계 순위
- [ ] 5단계 경기 상세
- [ ] 6단계 나머지 화면
- [ ] 7단계 알림
- [ ] 8단계 AI 패널

각 단계 후 `npm run verify` 통과가 다음 단계의 조건이다.

---

# 이 세션(Cowork)으로 돌아올 일

구현 중에 아래가 필요하면 여기서 하는 게 낫다.

- **Mock 데이터 추가·수정** — 생성기 기반이라 시각 확인이 필요 없다
- **접근성 대비 재측정** — 토큰을 바꿨을 때
- **설계 판단** — 화면 구조를 바꿔야 할 때, 문서 교차 참조가 필요할 때
- **조사** — API 재확인, 외부 자료
- **구현 검토** — 규칙 위반 감사(9-2 형태 분리, 무음 catch, 대비)
