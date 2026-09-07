# infra — 로컬 실행 및 배포 설정

전체 스택을 한 번에 기동하기 위한 설정을 모아둔다.

- `docker-compose.yml` — PostgreSQL, backend, frontend **(예정 — 아직 없음)**
  (Redis 는 다중 인스턴스 도입 시에만. 5개년 백필도 Redis 없이 돈다 — 2026-09-07)
- 배포 대상: **Railway**(백엔드 컨테이너 1개) + **Cloudflare Pages**(프론트, SPA fallback) + Supabase. `docs/NEXT_STEPS.md` 1장 4번
- 배포 스크립트 및 환경별 설정

## 상태

미착수.
