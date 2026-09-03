# React + Vite 프론트엔드 작업 요청문

아래 내용을 CLI 작업 도구에 그대로 전달함.

---

PitchLog의 프론트엔드 화면을 React + Vite + JavaScript로 구성해 줘.

작업 전에 `README.md`, `docs/README.md`, `docs/FRONTEND_GUIDE.md`,
`docs/V2_DESIGN.md` 6장, `output/PitchLog_슬라이드별_변경요약.md`를 읽고 현재 요구사항을
요약해 줘. 프론트엔드 관련 내용이 충돌하면 `docs/FRONTEND_GUIDE.md`를 우선 적용해.

## 작업 경계

- 작업 범위는 `frontend` 디렉터리로 제한해.
- `docs`, `design`, `output`, `archive`, `README.md`, `CLAUDE.md`는 수정·삭제·이동하지 마.
- 백엔드, 데이터베이스, Redis, Socket.io 서버, 인증, AI 실제 연동은 구현하지 마.
- 기존 코드가 있다면 먼저 목록을 확인하고 사용자 작성 코드를 덮어쓰지 마.
- 삭제나 대규모 교체가 필요하면 대상과 이유를 먼저 보고하고 진행을 멈춰.

## 기술 기준

- React
- Vite
- JavaScript ES Modules
- `.js`, `.jsx`만 사용
- React Router DOM
- Node.js 22
- Tailwind CSS
- shadcn/ui JavaScript 컴포넌트
- Lucide React
- ESLint

TypeScript, `.ts`, `.tsx`, `tsconfig.json`, Next.js, App Router, `next/link`, `next/image`는
사용하지 마. React Server Components는 JavaScript로도 작성할 수 있지만 현재 Vite SPA 구조와
맞지 않으므로 사용하지 마. 패키지는 필요한 것만 최소한으로 추가해.

Tailwind CSS는 Vite 플러그인 방식으로 구성해. shadcn/ui는 JavaScript 모드로 사용하고
`components.json`에 `tsx: false`, `rsc: false`를 설정해. 경로 별칭은 `tsconfig.json`이 아닌
`jsconfig.json`과 `vite.config.js`에 같은 값으로 설정해. 추가되는 shadcn/ui 파일은 전부
`.jsx`여야 하며 TypeScript 문법이 남아 있으면 JavaScript로 수정해.

## 권장 구조

```text
frontend/
├── public/
├── src/
│   ├── assets/
│   ├── components/
│   ├── layouts/
│   ├── pages/
│   ├── routes/
│   ├── services/
│   ├── mocks/
│   ├── utils/
│   ├── styles/
│   ├── App.jsx
│   └── main.jsx
├── .env.example
├── components.json
├── index.html
├── jsconfig.json
├── package.json
└── vite.config.js
```

## 디자인 방향

- 유럽 클럽축구 데이터를 빠르게 탐색하는 스포츠 데이터 서비스
- 딥 네이비 배경과 그린 포인트 컬러
- 정보 밀도는 높지만 제목·수치·상태·필터의 위계가 명확한 구성
- 과도한 그라데이션, 유리 효과, 장식성 애니메이션 금지
- 고품질 생성 이미지 사용 금지
- 팀 로고가 없으면 이니셜 기반 배지 사용
- 1440×900 발표 캡처 화면 우선, 모바일 반응형 지원

## 공통 화면 구조

- PitchLog 워드마크
- 홈, 대회, 경기, 팀, 순위, 통계 메뉴
- 대회 및 시즌 선택
- 검색
- 경기 상태 배지
- 데이터 기준 시각
- 모바일 내비게이션
- AI 메뉴는 `Phase 5` 또는 `준비 중`으로만 표시

필터 상태는 URL 검색 파라미터에 보존해. 상세 주소 새로고침을 위한 SPA fallback이 필요하다는
점을 배포 안내에 기록해.

## 우선 구현 라우트

- `/`: 주요 경기, LIVE 경기, 현재 라운드, 순위 Top 5, 득점 Top 5
- `/competitions/:slug`: 대회 허브, 주요 경기, 순위, 통계, 참가 팀
- `/standings`: 국내 리그 및 UCL 형식에 맞는 순위 구역
- `/teams/:slug`: 팀 정보, 현재 순위, 최근 폼, 다음 경기, 스쿼드
- `/teams/:slug/fixtures`: 국내 리그와 UCL을 구분하는 전체 일정
- `/players/:slug`: 선수 정보와 대회별·전체 합산 통계
- `/matches/:fixtureId`: 스코어, 상태, 이벤트, 라인업, H2H, 예측
- `/competitions/champions-league/knockout`: UCL 합산 점수와 진출 팀
- `*`: NotFoundPage

## 데이터와 상태

- 현재는 `src/mocks`의 고정 Mock Data만 사용해.
- 페이지 파일 안에 같은 데이터를 중복 작성하지 마.
- 향후 API 연결 함수는 `src/services`에 분리해.
- LIVE, 종료, 재검증, 확정 상태를 구분해.
- 로딩, 오류, 데이터 없음, 필터 결과 없음 상태를 각각 구현해.
- 오류를 빈 배열로 바꾸어 정상 화면처럼 숨기지 마.
- 발표 화면이 랜덤 값이나 현재 시각에 따라 달라지지 않게 해.

## JavaScript 품질 보완

- 복잡한 props와 데이터 변환 함수에 JSDoc을 작성해.
- Hook 규칙과 미사용 변수 검사를 ESLint에 적용해.
- `undefined`, `null`, 빈 배열, 누락 필드를 안전하게 처리해.
- 경기 상태와 KST·UTC 변환 로직을 페이지에서 분리해.
- 이미지 크기를 지정하고 lazy loading과 로딩 실패 대체 UI를 적용해.
- 페이지 단위로 `React.lazy`를 적용해.

## 공통 컴포넌트

- AppHeader
- AppLayout
- CompetitionSelector
- SeasonSelector
- MatchCard
- MatchStatusBadge
- StandingsTable
- StatsRanking
- TeamBadge
- PlayerAvatar
- FormBadge
- DataTimestamp
- FilterBar
- LoadingSkeleton
- ErrorState
- EmptyState
- NotFoundPage
- ErrorBoundary

## 완료 조건

- `npm run lint` 성공
- `npm run build` 성공
- `npm run preview`에서 주요 경로 확인
- `frontend/src`와 프로젝트 설정에 `.ts`, `.tsx`, `tsconfig.json` 파일 없음 (`node_modules` 제외)
- shadcn/ui 설정의 `tsx: false`, `rsc: false` 확인
- 생성된 UI 컴포넌트에 TypeScript 문법이 남아 있지 않음
- 브라우저 콘솔 오류 없음
- 데스크톱과 모바일 레이아웃 확인
- 긴 팀명과 선수명에서도 레이아웃 유지
- 색상 외에도 텍스트로 상태와 순위 구역 구분
- 작성한 파일 목록과 실행 방법 보고
- 발표 캡처용 URL 목록 보고
- Mock Data 범위와 추후 API 연결 지점 보고
- SEO, 백엔드, 인증, 실시간 통신은 미구현 상태라고 명확히 보고

먼저 현재 `frontend` 상태를 확인하고 작업 계획과 예상 파일 구조를 제시한 뒤 구현을 시작해.

---
