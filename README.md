# PitchLog

유럽 5대 리그와 UEFA Champions League의 경기·팀·선수 데이터를 수집하고, 실시간 경기 정보와
검증 가능한 통계 조회를 제공하는 축구 데이터 서비스입니다.

- 범위: ~~12대회~~ → **19대회** × 최근 5시즌 — 리그5 + UCL + 국내 컵 6 + 슈퍼컵 5 + 유로파(id 3) + 컨퍼런스(id 848) (2026-09-17 확장 · feat/scope-expansion). 화면 노출은 여전히 리그5+UCL 6개 (4층 범위 분리 · `backend/src/ingestion/screen-scope.ts`)
- 현재 (2026-09-17 실측):
  - **추적 대회 19** · 대회시즌 93 (Coupe de France·Supercoppa Italiana 2026 미제공) · **팀 2,110** (그중 경기 보유 1,089 · 종전 1,888)
  - **총 경기 13,724** · detail_eligible 13,710 · 상세 백필 진행 중 (잔여 약 5.4일 · `docs/AGENT_RUNS.md`)
  - **DB 79MB** (Supabase 무료 500MB · 완성 시 약 262MB 추정) · 로고 파일 913 (팀 758 · 대회 13 신규 09-17)
  - **전체 선수 13,608** (과거 4시즌 백필 진행분 · 09-07 시점 4,863 에서 늘어남) · 수집 창 안 경기 1,930 (그중 종료 175) · `localized_names` 90 (한국어 표기 시드)
  - 다음 순서는 [docs/NEXT_STEPS.md](./docs/NEXT_STEPS.md) 1장
- 프론트엔드: React + Vite + JavaScript + Tailwind CSS + shadcn/ui
- 백엔드: NestJS + TypeScript + PostgreSQL + Prisma
- 실시간: NestJS WebSocket Gateway + Socket.io → 브라우저
- AI 챗봇: LLM은 조회 도구 선택과 설명만 담당하며 숫자·순위·비교·진출 판정은 백엔드가 확정

## 설계 원칙

AI는 데이터베이스나 외부 축구 API에 직접 접근하지 않습니다. 정해진 조회 도구를 통해
결정적 조회 기능의 결과만 사용하고, 답변에는 데이터 기준 시각과 근거를 함께 제공합니다. 실시간
데이터는 경기 상태와 임시 값 여부를 표시하며 경기 종료 후 공식 통계로 다시 확정합니다.

## 저장소 구조

```
backend/    NestJS + TypeScript + Prisma (API·수집·실시간·AI 도구)
frontend/   React + Vite + Tailwind + shadcn/ui
design/     Web Foundation 토큰·다크 테마
infra/      배포 설정 — EC2 bootstrap·systemd·deploy 스크립트 (Vercel 은 frontend/vercel.json)
docs/       기획·설계 문서
scripts/    API 실측 조사 스크립트
.github/    CI (frontend-verify · backend-verify)
```

## 실행

```bash
cd backend  && npm install && npm run start:dev   # http://localhost:3000 · /docs
cd frontend && npm install && npm run dev         # http://localhost:5173
```

프론트는 기본이 Mock 이다. 실 API 로 붙이려면 `frontend/.env.local` 에
`VITE_USE_MOCK=false` · `VITE_API_BASE_URL=http://localhost:3000`,
백엔드 `.env` 에 `CORS_ORIGIN=http://localhost:5173`.
자세한 것은 [backend/README.md](./backend/README.md).

## 문서 및 발표 자료

- [문서 목록](./docs/README.md)
- [화면 요구사항 (PRD)](./docs/PRD.md)
- [프론트엔드 기술 결정 및 개발 기준](./docs/FRONTEND_GUIDE.md)
- [프론트엔드 CLI 작업 요청문](./docs/FRONTEND_CLI_PROMPT.md)
- [상세 설계](./docs/V2_DESIGN.md)
- [백엔드 기술 결정](./docs/ADR-001-NODE-BACKEND.md)
- [백엔드 개발 기준](./docs/BACKEND_GUIDE.md)
- [발표 자료 보관 안내](./archive/README.md)

발표본(`.pptx`)은 저장소에 포함하지 않습니다. 로컬에서 관리하며 배포 시 GitHub Release로 올립니다.
