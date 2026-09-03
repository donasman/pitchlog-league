# PitchLog 백엔드 개발 기준

> 확정: 2026-09-02  
> 기술 결정: `ADR-001-NODE-BACKEND.md`

## 기술 구성

- Node.js 22
- NestJS + TypeScript strict mode
- PostgreSQL + Prisma
- REST API + OpenAPI/Swagger
- NestJS WebSocket Gateway + Socket.io
- Jest + Supertest
- Redis + BullMQ는 대량 작업 또는 다중 인스턴스 확장 시 도입

## 모듈 경계

```text
backend/src
├── competition/ season/ team/ player/ squad/
├── match/ standing/ statistics/
├── ingestion/api-football/
├── ingestion/schedule/
├── ingestion/jobs/
├── realtime/
├── ai/
└── common/
```

- Controller, Scheduler, Worker, Gateway는 도메인 규칙을 복제하지 않는다.
- 외부 API 응답 DTO와 내부 응답 DTO를 분리한다.
- 모든 입력은 ValidationPipe를 통과한다.
- Prisma schema와 migration을 DB 구조의 단일 기준으로 사용한다.
- 외부 API ID에는 unique constraint를 두고 upsert를 멱등하게 구현한다.
- 여러 데이터를 함께 확정할 때 Prisma transaction을 사용한다.

## 작업 실행

- 다음 주기에 다시 실행해도 되는 짧은 작업은 NestJS Scheduler를 사용한다.
- 수백 건 처리, 진행률, 실패 지점 재개가 필요하면 BullMQ Job으로 승격한다.
- 스케줄러와 Worker의 중복 실행을 막는 lock·job key를 둔다.
- API 호출 제한, timeout, 제한된 retry와 exponential backoff를 공통 HTTP client에 적용한다.

## 실시간

- DB commit 성공 후에만 Socket.io 이벤트를 발행한다.
- 이벤트에는 `fixtureId`, `competitionId`, `updatedAt`, `version`을 포함한다.
- 브라우저는 중복·역순 version을 무시한다.
- 최초 연결과 재연결은 REST 풀 싱크 후 room을 구독한다.
- 단일 인스턴스에서는 Redis를 사용하지 않는다. 다중 Gateway 확장 시 Redis adapter를 추가한다.

## AI

- LLM은 DB·외부 API에 직접 접근하지 않는다.
- 집계·비교·순위·진출 판정은 결정적 application 계층이 수행한다.
- 도구 인자와 결과, 데이터 기준 시각을 기록하고 UI에 근거로 제공한다.

## 환경변수

`.env`, `.env.local`, 비밀 키 파일은 커밋하지 않는다. 애플리케이션 시작 시 환경변수 schema를
검증하고 필수 값이 없으면 즉시 실패한다.

필수 후보:

- `DATABASE_URL`
- `API_FOOTBALL_KEY`
- `JWT_SECRET`(관리 기능 도입 시)
- `REDIS_URL`(BullMQ 또는 다중 인스턴스 도입 시)
- `LLM_API_KEY`(Phase 5)
