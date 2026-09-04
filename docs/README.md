# PitchLog 문서 목록

현재 구현과 다음 개발 단계의 근거 문서를 한곳에 모아 관리함.

| 문서 | 용도 | 상태 |
| --- | --- | --- |
| [PRD.md](./PRD.md) | 화면 요구사항 — 디자인 작업의 입력 | **현재 기준 문서** |
| [FRONTEND_GUIDE.md](./FRONTEND_GUIDE.md) | React·Vite·JavaScript 기술 결정과 화면 개발 기준 | **현재 기준 문서** |
| [BACKEND_GUIDE.md](./BACKEND_GUIDE.md) | NestJS·Prisma·Socket.io 백엔드 개발 기준 | **현재 기준 문서** |
| [FRONTEND_CLI_PROMPT.md](./FRONTEND_CLI_PROMPT.md) | CLI에 전달할 프론트엔드 작업 요청문 | 실행용 |
| [NEXT_STEPS.md](./NEXT_STEPS.md) | 현재 검사 결과와 다음 작업 순서 | **실행 체크리스트** |
| [IMPLEMENTATION_PLAN.md](./IMPLEMENTATION_PLAN.md) | 화면 구현 8단계 — Claude Code 인수인계 | **실행 체크리스트** |
| [ADR-001-NODE-BACKEND.md](./ADR-001-NODE-BACKEND.md) | NestJS 통합 백엔드 기술 결정 | **확정 결정** |
| [BACKEND_DESIGN_REVIEW.md](./BACKEND_DESIGN_REVIEW.md) | 백엔드 설계 재검토 — 착수 전 결정 사항 | **실행 체크리스트** |
| [BACKEND_FEATURES.md](./BACKEND_FEATURES.md) | 백엔드 기능 목록 — 데이터 계층별 분류와 Phase 배치 | **실행 체크리스트** |
| [DATA_RULES.md](./DATA_RULES.md) | 데이터 판단·결정 — null 처리, 소스 규칙, 컵 라운드 정책 | **현재 기준 문서** |
| [API_INVENTORY.md](./API_INVENTORY.md) | 내 키로 가져올 수 있는 데이터 전량 (생성) | 실측 — 스크립트가 덮어씀 |
| [API_FIELDS_FULL.md](./API_FIELDS_FULL.md) | 엔드포인트별 전체 필드 (생성) | 실측 — 스크립트가 덮어씀 |
| [CUPS_INVENTORY.md](./CUPS_INVENTORY.md) | 컵 대회 ID·커버리지·라운드별 데이터 (생성) | 실측 — 스크립트가 덮어씀 |
| [V2_DESIGN.md](./V2_DESIGN.md) | 유럽 클럽축구 시스템 상세 설계 및 구현 로드맵 | 기준 문서 |
| [V2_DESIGN_REVIEW.md](./V2_DESIGN_REVIEW.md) | 설계 위험요소 및 보완사항 검토 | 참고 문서 |
| [FEATURE_PLAN.md](./FEATURE_PLAN.md) | 기능 현황과 확장 계획 | 참고 문서 |
| [RETROSPECTIVE.md](./RETROSPECTIVE.md) | v1 개발 이력 분석 및 재발 방지책 | 참고 문서 |

발표 자료는 프로젝트 루트의 `output`에 현재본만 두며, 이전본은 `archive/presentations`에 보관함.

`API_INVENTORY.md` · `API_FIELDS_FULL.md` · `CUPS_INVENTORY.md` 와 `api-*.json` 은
`scripts/probe-*.mjs` 가 덮어쓰는 **생성 문서**다. 손으로 고치지 않는다.
사람이 내린 판단은 `DATA_RULES.md` 에 쓴다.

프론트엔드 관련 내용이 다른 문서와 충돌할 경우 2026-09-01에 확정한
`FRONTEND_GUIDE.md`를 우선 적용함.
