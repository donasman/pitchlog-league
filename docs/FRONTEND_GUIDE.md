# PitchLog 프론트엔드 기술 결정 및 개발 기준

> 확정일: 2026-09-01  
> 상태: 현재 적용 기준

## 1. 기술 결정

프론트엔드는 **React + Vite + JavaScript**로 개발함.

- React
- Vite
- JavaScript ES Modules (`.js`, `.jsx`)
- React Router DOM
- Tailwind CSS
- shadcn/ui JavaScript 컴포넌트
- Lucide React
- **i18next + react-i18next** (다국어 지원 — ko/en)
- Node.js 22

TypeScript는 사용하지 않음. 개발자가 직접 이해하고 수정할 수 있는 구성을 우선함.
새 파일을 `.ts` 또는 `.tsx`로 만들지 않으며 `tsconfig.json`, TypeScript 전용 타입 선언,
`tsc` 검사를 프로젝트 필수 조건으로 두지 않음.

Tailwind CSS와 shadcn/ui는 TypeScript 전용 기술이 아니므로 사용함. shadcn/ui는
`components.json`에서 `tsx: false`, `rsc: false`로 설정하여 `.jsx` 컴포넌트를 생성함.
경로 별칭이 필요하면 `tsconfig.json` 대신 `jsconfig.json`을 사용함.

React Server Components도 언어 자체는 JavaScript로 작성할 수 있으나, 현재 구조는
Vite SPA와 NestJS API를 분리하는 방식이므로 사용하지 않음. 이는 TypeScript 미사용과
무관한 아키텍처 결정임.

## 2. 현재 프론트엔드 상태

2026-11-23 기준 `frontend`는 **React + Vite + JavaScript**로 구현되어 있으며 주요 화면과
Mock Data가 연결된 상태임.

**다국어 지원**: i18next + react-i18next로 한국어(기본)·영어 전환 구현 완료.  
Header에 언어 전환 버튼 포함. 선택 언어는 `localStorage`('pitchlog-lang')에 저장.  
팀·선수·대회 이름은 `src/i18n/entityNames.js` 테이블과 `src/utils/localization.js`의
`getLocalizedName`, `getLocalizedShortName` 함수로 현지화됨.  
번역이 없으면 영어 이름으로 자동 폴백. URL slug는 언어 전환과 무관하게 유지됨.

**완료된 추가 작업**:
- 홈 바로가기(QUICKLINKS) 제거
- 홈 사이드바 통합 대회 선택기 (6개 대회 → 순위·득점 동시 전환)
- 순위표 구역 색상 수정 (`border-l-{color}` + 연한 행 배경)
- `/stats` 통계 페이지 생성 및 라우트 등록, Header 메뉴 활성화
- `fetchCompetitionStats()` API 함수 추가

**남은 작업**: 일부 페이지(`MatchPage`, `StandingsPage` 등)의 한국어 하드코딩
문구가 아직 `useTranslation`으로 교체되지 않음. 영어 전환 시 해당 문구는 한국어 그대로 표시됨.
상세 목록은 `docs/NEXT_STEPS.md` 3절 참조.

**남은 화면 검수**: 브라우저 실제 실행이 필요한 항목은 `docs/NEXT_STEPS.md` 2절 참조.

현재 품질 검사 결과는 다음과 같음.

- `npm run validate:data`: 오류 0건, 경고 0건
- `npm run lint`: 오류 0건, 경고 0건
- `npm run build`: 성공

남은 화면 검수는 실제 브라우저에서 진행함.

- `/matches/m001` 라인업의 긴 팀 이름 표시
- UCL 순위표 탈락 구역 색상과 범례 표시
- 모바일 390px `MatchCard` compact 모드 팀 이름 말줄임

기존 Next.js 시안을 참고해야 한다면 화면 구성과 디자인만 참고하고 다음 요소는 이관하지 않음.

- Next.js 및 `next.config.*`
- App Router의 `app` 디렉터리 규칙
- `next/link`, `next/image`, 서버 컴포넌트
- TypeScript 설정과 `.ts`, `.tsx` 소스
- Next.js 전용 빌드·배포 설정

과거 Next.js + TypeScript 시안은 화면 구성 참고용으로만 사용하며 최종 구현 기준으로 되돌리지 않음.

## 3. 권장 디렉터리 구조

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

`components.json`의 핵심 설정은 다음과 같음.

```json
{
  "rsc": false,
  "tsx": false
}
```

## 4. 화면과 라우팅 기준

라우팅은 React Router DOM을 사용함. 상세 화면의 URL 구조는 기존 설계를 유지함.

- `/`
- `/competitions`
- `/competitions/:slug`
- `/competitions/:slug/knockout`
- `/teams`
- `/teams/:slug`
- `/teams/:slug/fixtures`
- `/standings`
- `/matches`
- `/matches/:fixtureId`
- `/players/:slug`
- `/stats`
- `/injuries`

대회·시즌·팀 필터는 URL 검색 파라미터에 보존함. 새로고침하거나 URL을 공유해도 같은
화면 상태가 복원되어야 함.

## 5. 데이터 처리 기준

화면 설계 단계에서는 `src/mocks`의 Mock Data를 사용함. 페이지 컴포넌트 안에 데이터를
중복 작성하지 않음. 백엔드 연결 후에는 `src/services`에서 API 호출을 관리함.

- 로딩, 오류, 빈 결과를 서로 다른 화면 상태로 표시함
- 오류를 빈 배열로 바꾸어 정상 화면처럼 숨기지 않음
- 경기 상태는 예정, LIVE, 종료, 재검증, 확정으로 구분함
- API 키와 비밀번호는 프론트엔드 환경변수에 저장하지 않음
- `VITE_` 접두사 환경변수는 브라우저에 공개된다는 전제로 사용함

## 6. 빌드와 품질 기준

기본 명령은 다음과 같이 구성함.

```text
npm run dev
npm run lint
npm run build
npm run preview
npm run verify   ← 커밋 전 전체 점검 (validate:data + check:i18n + lint + build)
```

- 커밋 전 `npm run verify` 를 실행해 검사 4종을 일괄 확인함
- ESLint 오류가 없어야 함
- `vite build`가 성공해야 함
- 브라우저 콘솔 오류가 없어야 함
- 1440px 발표 화면과 모바일 화면을 모두 확인함
- 컴포넌트의 props 구조가 복잡해지면 JSDoc으로 데이터 형태를 설명함
- 핵심 상태 로직은 Vitest 도입을 우선 검토함

## 7. 배포 및 SEO 영향

Vite 기반 React SPA는 Next.js처럼 SSR, 정적 경로 생성, 메타데이터 및 사이트맵 생성을
기본 제공하지 않음. 따라서 현재 단계에서는 화면 구현과 사용자 흐름 검증을 우선함.

공개 서비스 배포 전에 다음 중 하나를 별도로 결정해야 함.

1. 주요 팀·선수·경기 페이지 프리렌더링
2. 별도 사이트맵 생성 작업 추가
3. 백엔드 또는 Edge 계층에서 메타데이터 제공
4. 검색 유입이 핵심이 되는 시점에 SSR 지원 프레임워크 재검토

SEO 대응이 확정되기 전에는 Vite SPA만으로 검색 노출 요구사항이 완료됐다고 판단하지 않음.

## 8. Next.js 전용 기능 대체표

| Next.js 기능 | React + Vite 적용 방식 |
| --- | --- |
| App Router 파일 기반 라우팅 | React Router DOM에서 라우트 직접 정의 |
| `layout`, `loading`, `error`, `not-found` 파일 규칙 | Layout·Loading·Error·NotFound 컴포넌트 직접 구성 |
| Server Components·Server Actions | TypeScript 여부와 무관하게 현재 Vite SPA에서는 사용하지 않고 NestJS API로 분리 |
| API Routes·Route Handlers | NestJS Controller에서 제공 |
| SSR·ISR·PPR | 초기에는 CSR. 검색 노출 전에 프리렌더링 또는 SSR 재검토 |
| `generateMetadata` | React Helmet 또는 프리렌더링 단계에서 메타데이터 구성 |
| `sitemap.js`·`robots.js` | 정적 파일 또는 별도 생성 스크립트 사용 |
| `next/image` | 이미지 크기 명시, lazy loading, WebP·SVG, CDN 최적화 |
| Next.js fetch cache·revalidate | 브라우저 캐시 또는 별도 데이터 요청 계층에서 관리 |
| `next/link` 프리페치 | React Router `Link`와 페이지 lazy loading 사용 |
| Next.js Middleware 인증 | NestJS Passport·JWT Guard에서 인증·인가 수행 |

React의 Hooks, 컴포넌트, 상태 관리, REST API, Socket.io, 차트, 반응형 UI는 그대로 사용할 수 있음.

## 9. SPA 라우팅 보완

React Router의 상세 주소를 직접 열거나 새로고침해도 404가 발생하지 않도록 배포 서버에서
모든 사용자 경로를 `/index.html`로 보내는 SPA fallback을 설정함.

- `/api`와 정적 파일 경로는 fallback 대상에서 제외함
- 존재하지 않는 애플리케이션 경로는 React의 `NotFoundPage`에서 처리함
- 페이지 이동 시 스크롤 위치를 복원함
- 대회·시즌·팀 필터는 URL 검색 파라미터에 유지함
- 페이지 단위로 `React.lazy`를 적용함

## 10. JavaScript 안정성 보완

TypeScript의 정적 타입 검사를 사용하지 않는 대신 다음 기준을 적용함.

- API 응답 형태와 변환 로직을 `src/services`에 집중함
- 페이지 내부에 데이터 구조를 반복 정의하지 않음
- 복잡한 props와 함수에 JSDoc을 작성함
- ESLint의 미사용 변수, Hook 규칙, 접근성 관련 검사를 활성화함
- `undefined`, `null`, 빈 배열, 누락 필드를 구분함
- 외부 API 응답은 화면에 전달하기 전에 검증·정규화함
- 경기 상태, 시간 변환, 순위 구역, UCL 합산 점수는 단위 테스트 대상으로 둠

Tailwind CSS 클래스와 shadcn/ui 컴포넌트는 `.jsx`에서 사용함. shadcn/ui가 생성한 파일에
TypeScript 타입, `interface`, `type` 선언, `as const` 등 JavaScript에서 실행되지 않는 문법이
섞이지 않았는지 추가 후 확인함.

## 11. 발표 화면과 Mock Data 기준

발표 캡처가 실행 시각이나 랜덤 값에 따라 달라지지 않도록 고정된 시나리오를 사용함.

- 홈: LIVE 경기 1개와 오늘의 주요 경기
- 순위: UCL·유로파·강등 구역이 모두 보이는 데이터
- 팀 상세: 국내 리그와 UCL에 동시 참가하는 팀
- 선수 상세: 대회별 기록과 전체 합산 기록
- 경기 상세: LIVE 또는 종료 후 재검증 상태
- UCL 녹아웃: 1·2차전 합산 점수와 진출 팀

공통 상태 컴포넌트로 `LoadingSkeleton`, `ErrorState`, `EmptyState`, `NotFoundPage`,
`ErrorBoundary`, `MatchStatusBadge`, `DataTimestamp`를 둠.

## 12. 이미지·성능·운영 보완

- 이미지 너비와 높이를 지정하여 레이아웃 이동을 줄임
- 화면 밖 이미지는 `loading="lazy"`로 불러옴
- 로고 로딩 실패 시 팀 이니셜 배지를 표시함
- WebP 또는 SVG를 우선 사용함
- 선수·경기 목록은 페이지네이션 또는 구간 로딩을 사용함
- 차트·포메이션처럼 큰 컴포넌트는 지연 로딩함
- Vite 개발 서버는 운영에 사용하지 않고 `dist` 결과물만 배포함
- `package-lock.json`을 유지하고 CI에서는 `npm ci`를 사용함

## 13. 한국어·영어 지원 방향

한국어·영어 지원은 **UI 문구 번역**과 **축구 고유명사 매칭**을 분리해서 구현함.

### 13-1. 프론트엔드에서 지금 준비할 범위

- 메뉴, 버튼, 상태, 안내 문구는 언어별 리소스 파일로 분리함
- 사용 언어는 `ko`와 `en`을 지원하며 브라우저 저장소에 선택값을 보존함
- 화면 컴포넌트에서 `team.name`, `player.name`, `entry.teamName`을 직접 출력하지 않음
- `getLocalizedName(entity, locale)` 또는 동일 역할의 공통 표시 함수를 사용함
- Mock Data에는 `names.ko`, `names.en`, `shortNames.ko`, `shortNames.en` 구조를 일부 적용함
- 한국어 이름이 없으면 영어 이름, 영어 이름도 없으면 외부 API 원본 이름을 표시함
- 언어에 따라 URL slug를 변경하지 않음
- 한국어와 영어의 글자 길이가 다르므로 데스크톱과 390px 화면을 모두 검수함

UI 문구가 많아지는 시점에는 JavaScript에서 사용 가능한 `i18next`와 `react-i18next` 도입을
우선 검토함. TypeScript를 사용하지 않아도 적용 가능함.

### 13-2. 백엔드에서 완성할 범위

- 팀·선수·대회는 영어 이름 문자열이 아니라 API 제공자의 고유 ID로 연결함
- 원본 이름과 언어별 표시 이름을 분리 저장함
- 한국어 검색을 위한 별칭과 띄어쓰기 변형을 관리함
- 신규 선수처럼 한국어 이름이 없는 데이터는 영어 원본으로 fallback함
- 자동 음역만으로 한국어 선수 이름을 생성하지 않으며 주요 선수부터 검수된 이름을 적용함
- API 요청 언어와 fallback 규칙을 모든 조회 API에 동일하게 적용함
- 이름 변경과 이적이 발생해도 내부 ID와 URL slug는 유지함

권장 백엔드 모델은 다음과 같음.

```text
Team
- id
- api_team_id
- original_name
- slug

TeamLocalization
- team_id
- locale
- name
- short_name
- search_aliases
```

`PlayerLocalization`, `CompetitionLocalization`도 같은 원칙으로 구성함. API 응답은 화면이
저장 구조를 알 필요가 없도록 `displayName`, `shortDisplayName`, `originalName` 형태로 정규화함.

### 13-3. 적용 시점

화면 작업이 모두 끝난 뒤 한 번에 다국어를 붙이지 않음. 현재 프론트엔드 단계에서 언어 선택,
UI 문구 분리, 공통 이름 표시 함수를 먼저 적용함. 전체 팀·선수 이름 매칭과 검색 별칭 관리는
NestJS 백엔드와 데이터 수집 구조를 구현할 때 완성함.

## 14. 전환 완료 기준

- [ ] JavaScript React 템플릿으로 생성됨
- [ ] 애플리케이션 소스에 `.ts`, `.tsx`, `tsconfig.json`, Next.js 설정이 없음
- [ ] Tailwind CSS가 Vite 플러그인으로 구성됨
- [ ] shadcn/ui가 `tsx: false`, `rsc: false`로 구성됨
- [ ] 경로 별칭은 `jsconfig.json`과 `vite.config.js`에서 일치함
- [ ] React Router 라우트와 404 페이지가 구성됨
- [ ] 새로고침 시 상세 주소가 정상적으로 열림
- [ ] Mock Data와 API 서비스 계층이 분리됨
- [ ] 로딩·오류·빈 결과가 구분됨
- [ ] `npm run lint`가 성공함
- [ ] `npm run build`가 성공함
- [ ] `npm run preview`에서 주요 화면을 확인함
- [ ] 1440px 발표 화면과 모바일 화면이 깨지지 않음
- [ ] SEO 미확정 항목을 완료 기능으로 표시하지 않음
- [ ] UI 문구가 언어별 리소스로 분리됨
- [ ] 팀·선수·대회 이름이 공통 표시 함수를 통함
- [ ] 한국어 이름이 없을 때 영어 원본이 표시됨
- [ ] 한국어·영어 각각 1440px와 390px 화면 검수를 완료함
