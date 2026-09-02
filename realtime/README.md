# realtime — PitchLog Realtime Gateway

Node.js + Socket.io 실시간 전달 계층. `backend/` 가 Redis Pub/Sub 으로 발행한
경기 이벤트를 구독해 브라우저로 push 한다.

- 스택: Node.js, Socket.io, Redis
- 상태 값과 임시 값 여부를 함께 전달하며, 경기 종료 후 공식 통계로 재확정된다
- 비즈니스 판정 로직을 두지 않는다 (전달 전용)

## 상태

미착수. 착수 시 이 문서에 실행 방법과 이벤트 스펙을 채운다.
