# ADR-001 — Node.js 통합 백엔드

> 상태: 확정  
> 결정일: 2026-09-02

## 결정

PitchLog 백엔드는 **NestJS + TypeScript 기반 모듈형 모놀리스**로 구현한다.

- 데이터베이스: PostgreSQL
- ORM·마이그레이션: Prisma
- 일반 API: NestJS REST Controller
- 실시간: NestJS WebSocket Gateway + Socket.io
- 단기 스케줄: `@nestjs/schedule`
- 대량·재시작 가능 작업: Redis + BullMQ Worker(필요 시 도입)
- 입력 검증: DTO + ValidationPipe
- API 명세: OpenAPI/Swagger
- 테스트: Jest + Supertest

초기에는 REST API, 외부 축구 API 수집, 경기일 스케줄러, Socket.io를 하나의 백엔드
애플리케이션에서 운영한다. 수집량이나 접속량이 커지면 같은 저장소와 도메인 모듈을 공유하면서
API, Worker, Realtime Gateway를 독립 프로세스로 분리한다.

## 이유

- 현재 백엔드 구현물이 없어 전환 비용이 낮다.
- React 프론트엔드와 TypeScript 생태계를 공유할 수 있다.
- PitchLog 작업은 외부 API·DB·WebSocket·AI 호출 중심의 I/O 작업이다.
- Spring Boot와 별도 Node 게이트웨이 두 서버를 운영하는 복잡도를 줄일 수 있다.
- 초기 단순성과 향후 프로세스 분리를 동시에 확보할 수 있다.

## 유지하는 원칙

- 외부 API 응답과 내부 도메인 모델을 분리한다.
- 경기·통계 갱신은 멱등성을 보장한다.
- 대량 수집은 진행 상태와 재시작 지점을 기록한다.
- 실시간 메시지가 유실되어도 REST 풀 싱크로 복구한다.
- AI는 DB에 직접 접근하지 않고 결정적 조회 기능만 호출한다.

## 폐기한 안

Spring Boot가 데이터와 REST를 담당하고 별도 Node.js 서버가 Socket.io만 담당하는 폴리글랏
구조는 폐기한다. 이 결정은 이전 프로젝트 회고 기록을 변경하지 않는다.
