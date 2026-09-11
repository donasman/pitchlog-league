# PitchLog

유럽 5대 리그와 UEFA Champions League의 경기·팀·선수 데이터를 수집하고, 실시간 경기 정보와
검증 가능한 통계 조회를 제공하는 축구 데이터 서비스입니다.

- 범위: **12대회 × 최근 5시즌** — 5대 리그 + UCL + 국내 컵 6개 (2026-09-04 확정)
- 현재 (2026-09-10 실측):
  - 추적 대회 17 · **화면 6대회 참가팀 155** (EPL 20 · 라리가 20 · 분데스 18 · 세리에 A 20 · 리그 1 18 · UCL 81) · **예선·하부 포함 전체 팀 1,888** — 두 숫자가 다른 이유는 155 는 "화면에 노출되는 6대회 참가팀"만 세고 1,888 은 UCL·컵 예선까지 전부 세기 때문
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
infra/      배포 설정 (docker-compose 는 예정)
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
