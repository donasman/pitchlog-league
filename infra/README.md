# infra — 로컬 실행 및 배포 설정

전체 스택을 한 번에 기동하기 위한 설정을 모아둔다.

- 배포 대상 (09-15 결정): **AWS EC2**(백엔드 · t3.small · ap-northeast-2 · systemd · Docker 안 씀) + **Vercel**(프론트 · `/api/*` rewrite 로 EC2 프록시 · same-origin) + Supabase. `docs/NEXT_STEPS.md` 1장 4번 · 14장
  (이전 안 Railway + Cloudflare Pages 는 폐기. Redis 는 다중 인스턴스 도입 시에만 — 5개년 백필도 Redis 없이 돈다, 2026-09-07)
- `ec2/` — bootstrap.sh(Ubuntu 24.04 1회 설정) · pitchlog-backend.service · deploy.sh · backend.env.example · 절차는 `docs/DEPLOY.md` **(4-a 판에서 생성)**
- `docker-compose.yml` 은 만들지 않는다 — 로컬은 `npm run start:dev` + Supabase 로 충분

## 상태

🚧 4-a 배포 준비 판 진행 중 (2026-09-15).
