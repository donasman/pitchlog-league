# backend — PitchLog Core API

NestJS 기반 핵심 서비스. 외부 축구 API 수집, REST API, 실시간 Gateway, AI 조회 도구를
하나의 모듈형 모놀리스에서 운영한다.

- 스택: NestJS + TypeScript, PostgreSQL + Prisma, Socket.io, Jest + Supertest
- 실시간 이벤트는 DB commit 성공 후 이 애플리케이션의 Gateway가 직접 발행한다
- 숫자·순위·비교·진출 판정은 전부 이 계층에서 확정한다

기술 결정 근거는 [ADR-001](../docs/ADR-001-NODE-BACKEND.md), 상세 개발 기준은
[BACKEND_GUIDE.md](../docs/BACKEND_GUIDE.md)를 따른다.

## 상태

미착수. 착수 시 이 문서에 실행 방법과 모듈 구조를 채운다.
