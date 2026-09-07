# 로고 정적 파일

`backend` 에서 받아 96×96 webp 로 줄여 둔 팀·대회 로고다.

```bash
cd backend
npm run ingest -- logos          # 없는 것만 받는다
npm run ingest -- logos --force  # 전부 다시 받는다
```

API-Football media URL 을 프론트에서 직접 걸면 안 된다 — 원본이 1개당 90KB 이고
media 호스트가 동시 연결을 조여서, 팀 목록 한 화면(96개)이 11초가 지나도 전부
로딩 미완료였다(09-07 실측). 실패가 아니라 "영원히 로딩 중" 이라 `<img onError>`
폴백조차 걸리지 않는다.

파일이 없는 팀은 404 가 즉시 나므로 `TeamBadge` 가 이니셜로 폴백한다.
백필로 팀이 늘면 CLI 를 다시 돌린다.
