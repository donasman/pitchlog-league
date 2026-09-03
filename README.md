# PitchLog

유럽 5대 리그와 UEFA Champions League의 경기·팀·선수 데이터를 수집하고, 실시간 경기 정보와
검증 가능한 통계 조회를 제공하는 축구 데이터 서비스입니다.

- 첫 구현: EPL 2026–27 시즌
- 최종 범위: EPL, 라리가, 분데스리가, 세리에 A, 리그 1, UCL
- 프론트엔드: React + Vite + JavaScript + Tailwind CSS + shadcn/ui
- 백엔드: NestJS + TypeScript + PostgreSQL + Prisma
- 실시간: NestJS WebSocket Gateway + Socket.io → 브라우저
- AI 챗봇: LLM은 조회 도구 선택과 설명만 담당하며 숫자·순위·비교·진출 판정은 백엔드가 확정

## 설계 원칙

AI는 데이터베이스나 외부 축구 API에 직접 접근하지 않습니다. 정해진 조회 도구를 통해 결정적
결정적 조회 기능의 결과만 사용하고, 답변에는 데이터 기준 시각과 근거를 함께 제공합니다. 실시간
데이터는 경기 상태와 임시 값 여부를 표시하며 경기 종료 후 공식 통계로 다시 확정합니다.

## 저장소 구조

```
backend/    NestJS + TypeScript + Prisma (API·수집·실시간·AI 도구)
frontend/   React + Vite + Tailwind + shadcn/ui
infra/      docker-compose 및 배포 설정
docs/       기획·설계 문서
```

## 문서 및 발표 자료

- [문서 목록](./docs/README.md)
- [프론트엔드 기술 결정 및 개발 기준](./docs/FRONTEND_GUIDE.md)
- [프론트엔드 CLI 작업 요청문](./docs/FRONTEND_CLI_PROMPT.md)
- [상세 설계](./docs/V2_DESIGN.md)
- [백엔드 기술 결정](./docs/ADR-001-NODE-BACKEND.md)
- [백엔드 개발 기준](./docs/BACKEND_GUIDE.md)
- [슬라이드별 변경 요약](./output/PitchLog_슬라이드별_변경요약.md)
- [발표 자료 보관 안내](./archive/README.md)

최신 로컬 발표본은 `output/PitchLog_1차_기획설계_발표_v5.pptx`이며, 배포 시 GitHub Release로 관리합니다.
