# backend — PitchLog Core API

Spring Boot 기반 핵심 서비스. 경기·팀·선수 데이터 수집(Spring Batch 5)과
결정적 QueryService 를 통한 통계 조회 API 를 담당한다.

- 스택: Spring Boot, Spring Batch 5, QueryDSL, PostgreSQL
- 실시간 갱신은 Redis Pub/Sub 으로 `realtime/` 에 발행한다
- 숫자·순위·비교·진출 판정은 전부 이 계층에서 확정한다

## 상태

미착수. 착수 시 이 문서에 실행 방법과 모듈 구조를 채운다.
