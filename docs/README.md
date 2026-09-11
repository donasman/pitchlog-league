# PitchLog 문서 목록

현재 구현과 다음 개발 단계의 근거 문서를 한곳에 모아 관리함.

기록 문서의 "없다 · 미구현 · 0건" 표현은 그 날짜 기준이다.
현재 상태는 [NEXT_STEPS.md](./NEXT_STEPS.md) 1장과 [../CLAUDE.md](../CLAUDE.md) 를 본다.

**상태 열 뜻**
- **현재 기준** — 지금 사실. 어긋나면 고친다.
- **기록(YYYY-MM-DD)** — 그 시점 관측·결정. 내용을 사후 수정하지 않는다.
- **생성** — 스크립트가 덮어쓴다. 손으로 고치지 않는다.

| 문서 | 용도 | 상태 |
| --- | --- | --- |
| [AGENT_RUNS.md](./AGENT_RUNS.md) | 파이프라인 판별 실측 기록 · 매 판 갱신 · **새 세션이 먼저 읽을 것** | 기록(누적 · 최신 행이 현재) |
| [NEXT_STEPS.md](./NEXT_STEPS.md) | 현재 검사 결과와 다음 작업 순서 | **현재 기준** (실행 체크리스트) |
| [PRD.md](./PRD.md) | 화면 요구사항 — 디자인 작업의 입력 | **현재 기준** |
| [FRONTEND_GUIDE.md](./FRONTEND_GUIDE.md) | React·Vite·JavaScript 기술 결정과 화면 개발 기준 | **현재 기준** |
| [BACKEND_GUIDE.md](./BACKEND_GUIDE.md) | NestJS·Prisma·Socket.io 백엔드 개발 기준 | **현재 기준** |
| [AGENT_WORKFLOW.md](./AGENT_WORKFLOW.md) | 에이전트 역할 분리 · 환각 규칙 · 지시문 형식 | **현재 기준** |
| [FRONTEND_CLI_PROMPT.md](./FRONTEND_CLI_PROMPT.md) | CLI에 전달할 프론트엔드 작업 요청문 | **현재 기준** (실행용) |
| [AUDIT_PROMPT.md](./AUDIT_PROMPT.md) | 구현 감사 프롬프트 — 다른 세션용 | **현재 기준** |
| [design-briefs/](./design-briefs/) | Claude Design 입력용 PRD 분해 (01~08) | **현재 기준** |
| [ADR-001-NODE-BACKEND.md](./ADR-001-NODE-BACKEND.md) | NestJS 통합 백엔드 기술 결정 | **현재 기준** (확정 결정) |
| [INGESTION_STRATEGY.md](./INGESTION_STRATEGY.md) | 수집 범위·콜 예산·백필 실행·실시간 윈도우 | **현재 기준** (V2_DESIGN 3장 대체) |
| [SCHEMA_DESIGN.md](./SCHEMA_DESIGN.md) | 테이블 정의와 설계 검토 7종 — 외래키 없는 설계 포함 | **현재 기준** (V2_DESIGN 1장 구체화) |
| [DATA_RULES.md](./DATA_RULES.md) | 데이터 판단·결정 — null 처리, 소스 규칙, 컵 라운드 정책 | **현재 기준** |
| [BACKEND_FEATURES.md](./BACKEND_FEATURES.md) | 백엔드 기능 목록 — 데이터 계층별 분류와 Phase 배치 | **현재 기준** |
| [V2_DESIGN.md](./V2_DESIGN.md) | 유럽 클럽축구 시스템 상세 설계 및 구현 로드맵 | **현재 기준** (1장→SCHEMA_DESIGN · 3장→INGESTION_STRATEGY 로 대체됨 · 8장 로드맵은 유효) |
| [IMPLEMENTATION_PLAN.md](./IMPLEMENTATION_PLAN.md) | 화면 구현 8단계 — Claude Code 인수인계 | 기록(2026-09-01~) |
| [BACKEND_DESIGN_REVIEW.md](./BACKEND_DESIGN_REVIEW.md) | 백엔드 설계 재검토 — 착수 전 결정 사항 | 기록(2026-09-03) |
| [PLAN_REVIEW.md](./PLAN_REVIEW.md) | 기획안 대 현실 중간 점검 — 어긋난 곳 · 순서 변경 근거 · 결정 | 기록(2026-09-07) |
| [V2_DESIGN_REVIEW.md](./V2_DESIGN_REVIEW.md) | 설계 위험요소 및 보완사항 검토 | 기록 |
| [RETROSPECTIVE.md](./RETROSPECTIVE.md) | v1 개발 이력 분석 및 재발 방지책 | 기록 |
| [FEATURE_PLAN.md](./FEATURE_PLAN.md) | 기능 현황과 확장 계획 | 기록 |
| [CUP_TIER_CHECK.md](./CUP_TIER_CHECK.md) | 컵 컷오프 기준 검증 (`probe-cup-tiers.mjs`, 100콜) | 기록(2026-09-04) |
| [IA_HOME_RESTRUCTURE.md](./IA_HOME_RESTRUCTURE.md) | 홈 / 경기 탭 재구성 검토 | 기록(2026-09-03) |
| [FRONTEND_I18N_REPORT.md](./FRONTEND_I18N_REPORT.md) | 프론트엔드 다국어·화면 검수 보고서 | 기록 |
| [HOME_STATS_UI_REPORT.md](./HOME_STATS_UI_REPORT.md) | 홈·통계·순위 UI 개선 보고서 | 기록 |
| [API_INVENTORY.md](./API_INVENTORY.md) | 내 키로 가져올 수 있는 데이터 전량 | 생성 — `scripts/probe-*.mjs` 가 덮어씀 |
| [API_FIELDS_FULL.md](./API_FIELDS_FULL.md) | 엔드포인트별 전체 필드 | 생성 — `scripts/probe-*.mjs` 가 덮어씀 |
| [CUPS_INVENTORY.md](./CUPS_INVENTORY.md) | 컵 대회 ID·커버리지·라운드별 데이터 | 생성 — `scripts/probe-*.mjs` 가 덮어씀 |

발표 자료(`output/`·`.pptx`)는 **저장소에 포함하지 않음** — 로컬과 GitHub Release 로 관리함 (2026-09-07).
이전 발표본 안내는 `archive/README.md` 참조.

`API_INVENTORY.md` · `API_FIELDS_FULL.md` · `CUPS_INVENTORY.md` 와 `api-*.json` 은
`scripts/probe-*.mjs` 가 덮어쓰는 **생성 문서**다. 손으로 고치지 않는다.
사람이 내린 판단은 `DATA_RULES.md` 에 쓴다.

프론트엔드 관련 내용이 다른 문서와 충돌할 경우 2026-09-01에 확정한
`FRONTEND_GUIDE.md`를 우선 적용함.
