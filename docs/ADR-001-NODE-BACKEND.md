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

## 데이터베이스 — PostgreSQL 선택 이유

> 2026-09-04 추가. 원래 ADR에는 "데이터베이스: PostgreSQL" 한 줄만 있었다.
> 실제 경위는 v1(Spring + PostgreSQL) 승계이며, 아래는 v2 설계가 PostgreSQL에 기대는 지점이다.

- **partial unique index** — `UNIQUE(player_id, season_year) WHERE left_at IS NULL`(현재 소속은
  시즌당 하나), `UNIQUE(competition_id) WHERE is_current`(대회당 현재 시즌은 하나).
  V2_DESIGN 1-3, 설계 검토 A-1·A-3. MySQL에는 없는 기능이라 MySQL은 처음부터 제외.
- **`INSERT … ON CONFLICT` 멱등 upsert** — 백필과 이적창 diff가 같은 row를 동시에 건드리는
  시나리오의 안전장치. V2_DESIGN 5-4, 설계 검토 B-2.
- **Prisma 지원이 가장 성숙** — enum·Json·migration을 제약 없이 쓴다. 이 설계는
  `displayState`·`transfer_type`·`win_reason` 등 enum을 여럿 쓴다.
- **테스트도 같은 PostgreSQL** — v1의 H2(`MODE=PostgreSQL`) 괴리(V2_DESIGN 5-1) 재발 방지.
- **프로세스 분리 계획과 호환** — 위 결정대로 API·Worker·Gateway를 독립 프로세스(머신)로
  나눠도 DB는 그대로다.

### 검토한 대안 — SQLite

**가능하지만 제외.** 워크로드는 SQLite로 충분하다 — 단일 writer(Scheduler 10초 소량 upsert),
시즌당 경기별 선수 통계 ~6만 row, WAL 모드면 재빌드 fetch(reader)가 writer를 막지 않는다.
partial index(3.8+)와 `ON CONFLICT`(3.24+)도 지원한다. 그래도 제외한 이유:

1. 프로세스가 **머신 단위로** 갈라지면 파일을 공유할 수 없다 → 분리 계획과 충돌. 그때
   마이그레이션하면 "전환 비용이 낮을 때 결정한다"는 이 ADR의 논리와 어긋난다.
2. Prisma의 SQLite 지원은 enum이 없고(문자열 + 애플리케이션 검증으로 대체) Json이 제한적이며,
   마이그레이션이 컬럼 변경마다 테이블을 재생성한다.
3. "개발·테스트는 SQLite, 운영은 PostgreSQL" 절충은 회고 5-1의 실수를 이름만 바꿔 반복한다.
   쓰려면 전 환경 SQLite여야 한다.

**재검토 조건** — 아래가 전부 참이면 SQLite로 바꿀 만하다.

- 백엔드를 VPS 한 대에서 상시 운영하기로 확정 (프로세스 분리는 같은 머신 안에서만)
- 관리형 DB 비용·운영을 0으로 만드는 것이 우선 (백업은 Litestream 파일 복제)
- enum 포기와 전 환경 SQLite 통일을 받아들임

**비용이 이유라면 DB를 바꾸지 않는다.** NestJS와 같은 VPS에 Docker PostgreSQL을 띄운다
(`infra/docker-compose.yml`). Supabase 무료 티어는 7일 비활성 시 정지, Neon은 컴퓨트 시간
제한이 있어 10초 스케줄러가 상시 도는 이 서비스와는 궁합이 애매하다.

## 폐기한 안

Spring Boot가 데이터와 REST를 담당하고 별도 Node.js 서버가 Socket.io만 담당하는 폴리글랏
구조는 폐기한다. 이 결정은 이전 프로젝트 회고 기록을 변경하지 않는다.

SQLite는 검토 후 제외했다 — 위 "검토한 대안" 참조. 단일 머신 한정이면 가능하나 프로세스 분리 계획과
Prisma enum 제약 때문이다.
