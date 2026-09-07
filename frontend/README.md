# PitchLog 프론트엔드

React + Vite + **JavaScript** (TypeScript 없음). 기술 결정과 개발 기준은 `../docs/FRONTEND_GUIDE.md`,
화면 요구사항은 `../docs/PRD.md`, 다음 작업은 `../docs/NEXT_STEPS.md` 11장.

## 실행

```bash
npm install
npm run dev              # http://localhost:5173 · 기본은 Mock
```

실 API 로 붙이려면 `.env.local`:

```
VITE_USE_MOCK=false
VITE_API_BASE_URL=http://localhost:3000
```

백엔드 `.env` 에는 `CORS_ORIGIN=http://localhost:5173`. `.env.example` 에 설명이 있다.

## 검증

```bash
npm run verify           # validate:data → check:i18n → lint → build
```

커밋 전에 통과해야 한다. CI `frontend-verify` 가 같은 것을 돈다.
`check:i18n` 은 하드코딩 한국어를 막고, lint 는 무음 `catch {}` 를 막는다.
로직 단위 테스트(vitest)는 실 API 연결 PR 에서 들어온다 (`FRONTEND_GUIDE` 10장).

## 구조

```
src/
  pages/        라우트 화면 12개 (routes/index.jsx)
  components/   ui 부품 · 화면별 조립
  services/     api.js(전환 스위치) · mock.js · live.js · normalize.js · http.js
  mocks/        생성된 Mock 데이터 — 직접 고치지 않는다 (scripts/genMock*.mjs)
  utils/        dateFormat · matchStatus · standingsZone · matchSort · localization
  i18n/         ko / en 리소스
public/logos/   팀·대회 로고 (backend `npm run ingest -- logos` 가 채운다)
```

## 지금 상태 (2026-09-07)

- 화면 12개 전부 Mock 으로 동작한다
- 실 API: 대회·팀. 나머지는 `live.js` 가 `NotImplementedError` 로 드러낸다 — 빈 목록으로 위장하지 않는다
- ⚠ Mock 은 **고정 시계**(`2026-11-23`)로 만들어졌다. 실 API 연결 시 `services/clock.js` 로 모은다 (`docs/PLAN_REVIEW.md` 2-1)
