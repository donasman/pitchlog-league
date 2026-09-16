# PitchLog 배포 — EC2 (백엔드) + Vercel (프론트)

> 판: `infra/ec2-deploy` (2026-09-15) · `docs/NEXT_STEPS.md` 1장 4번 · 14장
> 근거 결정: 백엔드 EC2 t3.small · systemd · Docker 안 씀 · Vercel `/api/*` rewrite 로 same-origin

## 준비물

| 항목 | 상태 | 값·비고 |
|---|---|---|
| EC2 인스턴스 | ✅ | t3.small · Ubuntu 24.04 · ap-northeast-2 |
| 탄력적 IP | ✅ | **3.36.159.128** |
| SSH 사용자 | ✅ | `ubuntu` (키쌍 등록됨) |
| 보안 그룹 | ✅ | 22(내 IP) · 3000(0.0.0.0/0) |
| Supabase | ✅ | `pitchlog-league-dev` (서울) |
| Vercel 계정 | ✅ | GitHub 연동 |
| DATABASE_URL | 채워야 함 | Supabase Session Pooler 5432 · `sslmode=require` |
| GEMINI_API_KEY | 채워야 함 | AI Studio |
| API_FOOTBALL_KEY | 채워야 함 | rapidapi (서버는 조회만이면 비워도 됨) |

## 첫 배포 (1회)

### 1. `infra/ec2/` 폴더 전체를 서버에 복사

```bash
scp -r infra/ec2 ubuntu@3.36.159.128:~/
```

bootstrap.sh 가 옆의 `backend.env.example` 과 `pitchlog-backend.service` 를 읽어서 자리를 잡는다. 파일 하나만 보내면 안 된다.

### 2. bootstrap 실행 (약 3~5분)

```bash
ssh ubuntu@3.36.159.128
sudo bash ec2/bootstrap.sh
```

설치되는 것:
- Node.js 22 (NodeSource)
- **postgresql-client 17 (PGDG 저장소)** — Ubuntu 24.04 apt 기본은 16 인데 Supabase 는 pg_dump 17 을 요구
- git · swapfile 2GB · pitchlog 시스템 사용자
- `/etc/pitchlog/backend.env` (템플릿 · 0600)
- systemd 유닛 `pitchlog-backend` (enable · 아직 안 뜸)
- sudoers (`ubuntu` 가 재시작·상태·로그만 비밀번호 없이)

### 3. 환경변수 채우기

```bash
sudoedit /etc/pitchlog/backend.env
```

필수: `DATABASE_URL` · `GEMINI_API_KEY` · `API_FOOTBALL_KEY`. 나머지는 기본값. `GEMINI_MODEL=gemini-3.5-flash-lite` 확인 (RPD 500).

### 4. 저장소 clone

```bash
cd /opt/pitchlog
git clone https://github.com/donasman/pitchlog-league.git .
```

`/opt/pitchlog` 는 bootstrap 이 `ubuntu:ubuntu` 로 만들어놨다. clone 후 소유권 그대로 둔다 — systemd 는 `pitchlog` 로 돌지만 파일은 읽기만 하면 되고, 배포는 `ubuntu` 가 한다.

### 5. 첫 배포

```bash
bash /opt/pitchlog/infra/ec2/deploy.sh
```

`main` 기준. `npm ci` → `prisma generate` → `nest build` → systemd 재시작 → health 30초 대기.

### 6. 확인

```bash
curl -i http://localhost:3000/health
sudo systemctl status pitchlog-backend
```

`{ "status": "ok", "db": true, "asOf": "..." }` 나와야 정상.

## Vercel (프론트)

1. Vercel Dashboard → **Import Project** → 저장소 선택
2. **Root Directory**: `frontend`
3. **Environment Variables**:
   - `VITE_USE_MOCK=false`
   - `VITE_API_BASE_URL` 은 **비워 둔다** (same-origin · `services/http.js:15` 이 빈 값이면 `/api/...` 상대경로로 fetch)
4. **Production Branch**: `dev` — 저장소 기본 브랜치가 `dev` 이므로 Vercel Settings → Git → Production Branch 를 `dev` 로 (main 은 뒤처져 있어 `vercel.json` 이 없다)
5. **SPA fallback rewrite 필수** — `vercel.json` 에 `/((?!api/|assets/).*)` → `/index.html` 규칙이 있어야 딥링크(주소창 직접 진입·새로고침·북마크) 가 404 안 뜬다. `/api/` 규칙 뒤 순서 유지. `/assets/` 는 Vite 빌드 정적 자산이라 명시 제외 (Vercel filesystem 매치가 rewrite 앞선다지만 안전 보장 위해 · root 정적 favicon 등은 filesystem 우선 매치에 의존).
6. 배포 후 확인:
   - Vercel URL 접속 → 홈에서 순위표 로딩되면 성공
   - 로딩되면 `vercel.json` 의 rewrite (`/api/:path*` → `http://3.36.159.128:3000/api/:path*`) 가 동작 중
   - **딥링크 검증**: (a) `/matches/<id>` 직접 진입 200 (b) `/api/health` 는 백엔드 응답 (c) 존재하지 않는 경로 `/없는경로` 는 앱 자체 404 화면 (Vercel 404 아님)

## 재배포

```bash
ssh ubuntu@3.36.159.128
bash /opt/pitchlog/infra/ec2/deploy.sh          # 최신 main
bash /opt/pitchlog/infra/ec2/deploy.sh dev      # dev 브랜치
bash /opt/pitchlog/infra/ec2/deploy.sh v1-...   # 태그
```

이전 dist 는 자동으로 `dist.prev` 로 보존된다. health 실패 시 스크립트가 롤백 명령을 출력한다.

## 롤백

```bash
cd /opt/pitchlog/backend
rm -rf dist && mv dist.prev dist
sudo systemctl restart pitchlog-backend
curl -sf http://localhost:3000/health
```

## 트러블슈팅

### `prisma generate` 실패: `PrismaConfigEnvError: Cannot resolve environment variable: DATABASE_URL`

첫 실 배포 (2026-09-15) 에서 나옴. 원인: `backend/prisma.config.ts` 가 로딩 시 `DATABASE_URL` 을 요구하는데, `deploy.sh` 는 `ubuntu` 로 돌아 `/etc/pitchlog/backend.env` (0600 · `pitchlog` 소유) 를 읽지 못한다. `prisma generate` 는 DB 에 접속하지 않으므로 실 값이 필요 없다.

수정: `deploy.sh` 가 `prisma generate` 앞에 placeholder `DATABASE_URL` 을 인라인으로 세팅 (`fix/deploy-prisma-generate-env` 판). **한 번만 돌린다** — `deploy.sh` 는 pull 로 자기 자신이 바뀌면 자동 재실행된다 (`fix/deploy-self-update` 판).

### 직접 URL 진입 시 `404: NOT_FOUND` (클릭 이동은 정상)

증상 (2026-09-16 실측 · Chrome · 재현 2/2): `https://pitchlog-league.vercel.app/matches/1552754` 를 주소창에 직접 열면 Vercel `404: NOT_FOUND`. 홈 → 경기 → 카드 클릭으로 같은 URL 에 도달하면 정상. 새로고침·링크 공유·북마크 전부 404.

원인: `frontend/vercel.json` 에 `/api/:path*` rewrite 만 있고 나머지 경로를 `index.html` 로 보내는 SPA fallback 이 없음. Vercel 은 정적 파일이 없으면 그대로 404.

수정 (`fix/vercel-spa-fallback` 판): rewrites 에 `{ "source": "/((?!api/|assets/).*)", "destination": "/index.html" }` 규칙 추가 · `/api/` 규칙 뒤 순서. `/assets/` 는 Vite 빌드 정적 자산이라 명시 제외.

### 어시스턴트가 무슨 질문에도 같은 답 (Vercel 엣지 캐시)

증상: 두 번째 이후 질문의 응답이 첫 답과 동일. 브라우저 devtools 응답 헤더에 `x-vercel-cache: HIT` · 응답 ~19ms · 같은 ETag.

원인: `CacheHeaderInterceptor` 가 HTTP 메서드를 안 가려 POST `/api/assistant` 응답에도 `Cache-Control: public, max-age=60` 이 붙음. Vercel 엣지가 정직하게 60초 캐시 → 같은 URL 로 오는 후속 POST 에 첫 답 재사용.

수정: 인터셉터가 GET 이외 메서드에 `Cache-Control: no-store` 를 명시 (`fix/cache-header-post` 판). Vercel 엣지가 no-store 를 보고 캐시하지 않음. **한 번만 돌린다** — `deploy.sh` 는 pull 로 자기 자신이 바뀌면 자동 재실행된다 (`fix/deploy-self-update` 판).

### 첫 실 배포 결함이 다시 나오면

첫 실 배포 (2026-09-15) 에서 잡힌 결함 2건이 이 판(`fix/deploy-prisma-generate-env`)으로 정정됨:
1. 위 `prisma generate` 실패
2. `dist.prev` 없는 첫 배포에서 실패 시 trap 이 성립하지 않는 "mv dist.prev dist" 롤백 문구를 찍음 → 이제 존재 여부를 조건 분기.

**한 번만 돌린다** — `deploy.sh` 는 pull 로 자기 자신이 바뀌면 자동 재실행된다 (`fix/deploy-self-update` 판).

### bootstrap: `Package 'awscli' has no installation candidate`

증상 (2026-09-15 실측): `sudo bash bootstrap.sh` 실행 시 `▶ AWS CLI` 단계에서 `E: Package 'awscli' has no installation candidate` 로 중단. 뒤의 백업 디렉터리·systemd 유닛 설치까지 함께 실행되지 않는다.

원인: Ubuntu 23.10+ apt 저장소에서 `awscli` 패키지가 제거됨. 초판 bootstrap 이 apt 기본 v1 을 기대했으나 24.04 에는 없다.

수정 (`infra/bootstrap-awscli-v2` 판): AWS CLI 블록을 공식 v2 zip 설치로 교체 (`awscli-exe-linux-x86_64.zip` → `./aws/install`). 멱등 — `command -v aws` 있으면 버전만 출력하고 건너뜀. 재실행하면 뒤의 백업 디렉터리·유닛 설치까지 이어진다.

이미 수동으로 AWS CLI v2 를 깐 상태라면 bootstrap 재실행에서 그 aws 를 감지하고 건너뜀.

### deploy.sh 가 세 번 돌아야 새 코드가 반영됐다면 (자기 자신 갱신 결함)

증상 (2026-09-15 실측): `deploy.sh` 를 실행했는데 이전 판의 결함(예: prisma 에러) 이 계속 재현. 두 번째 실행에서도 옛 trap 문구 · 옛 41행. 세 번째 실행에서야 새 코드가 돌았음.

원인: bash 는 실행 중 열어둔 파일(옛 inode)을 계속 읽고 `git pull` 은 새 inode 로 파일을 교체한다. `deploy.sh` 자기 자신이 pull 로 바뀌어도 이번 실행은 옛 코드로 끝까지 돈다.

수정 (`fix/deploy-self-update` 판): 인자 파싱에 `--no-pull` 재진입 플래그 추가. pull 후 HEAD 가 바뀌었으면 `exec bash "$0" --no-pull "$REF"` 로 프로세스를 새 파일로 갈아 재실행. `--no-pull` 이면 최신화 단계를 건너뛰어 무한 재실행 방지.

이후 배포는 그대로 `bash /opt/pitchlog/infra/ec2/deploy.sh` — 자기 자신이 바뀌면 로그에 "▶ deploy.sh 갱신됨 → 새 버전으로 재실행" 이 한 줄 뜨고 새 코드로 이어진다.

## 백업 자동화 (S3)

`infra/backup-s3` 판 (2026-09-15) — 매일 KST 04:00 (UTC 19:00) 에 `pitchlog-backup.timer` 가 발동해 `backup-to-s3.sh` → `backup.mjs` (로컬 `pg_dump 17`) → `aws s3 cp` 로 `s3://<BUCKET>/dumps/pitchlog-YYYYMMDD-HHMM.dump` 업로드. 로컬 사본은 `/var/backups/pitchlog` 에 backup.mjs 보관 정책(최근 8 + 월별 12) 그대로. S3 는 버킷 수명 주기 30일.

### 준비 (사용자 몫 · 이 판 밖)

- 버킷 생성 · 리전 `ap-northeast-2` · 수명 주기 30일
- EC2 인스턴스 IAM 역할에 정책 부착 — `s3:PutObject` · `s3:ListBucket` · `s3:GetObject` (버킷 자체와 `arn:aws:s3:::<BUCKET>/dumps/*`)
- 인스턴스에 역할 attach
- `sudoedit /etc/pitchlog/backend.env` → `BACKUP_S3_BUCKET=<실 버킷>` 채움

### 확인

```bash
# 역할 확인 (없으면 curl 실패)
curl -s http://169.254.169.254/latest/meta-data/iam/security-credentials/

# 타이머 확인 — 다음 실행 시각·최근 실행
systemctl list-timers pitchlog-backup*

# 수동 1회 실행 (첫 성공 확인)
sudo systemctl start pitchlog-backup
sudo journalctl -u pitchlog-backup -n 30

# S3 확인
aws s3 ls s3://<BUCKET>/dumps/ | tail -3
```

### 복원 리허설 (PC · Docker 필요)

EC2 엔 Docker 를 깔지 않는다. 리허설은 PC 에서:

```bash
aws s3 cp s3://<BUCKET>/dumps/<최신 파일명> .
cd backend
npm run backup:verify -- <경로>
```

행 수 일치 출력을 `docs/AGENT_RUNS.md` 판 행에 남긴다.

**확장**: 덤프는 `pg_dump -n public` 라 `CREATE EXTENSION` 이 포함되지 않는다 (`backup.mjs` 결정 · 무건드). 복원 리허설은 `pg_restore` 를 세 섹션으로 분할해 **pre-data (스키마·테이블) 복원 뒤 · post-data (인덱스·제약) 앞** 에 확장을 만든다 — 현재 `pg_trgm` 하나 (`restore-check.mjs` 의 `REQUIRED_EXTENSIONS` 상수). **새 확장을 스키마에 도입하면 이 상수를 갱신해야 리허설이 통과한다.** `BACKUP_RESTORE_EXTENSIONS` env 로 쉼표 구분 오버라이드 가능.

**정적 검사 한계**: `node --check` 는 문법만 검사한다 · 정의되지 않은 식별자(no-undef) 는 잡지 못한다. `restore-check.mjs` 같은 스크립트의 실패 경로(pg_restore 오류 처리 등)는 사람이 3회 루프에서 재현해야 검증된다. `backend/` 에 eslint 도입은 별도 판 (현재 `oxlint` 는 `src/ test/` 만 대상 · `scripts/` 밖).

### 리허설 실패: `FATAL: the database system is starting up`

증상 (2026-09-16 실측 · Windows Docker Desktop · postgres:17): `npm run backup:verify -- <경로>` 1단계 "준비됨" 직후 2단계에서 `psql: error: connection to server on socket ... FATAL: the database system is starting up` → docker 종료 코드 2 → 실패.

원인: 공식 postgres 이미지는 첫 기동 시 initdb 후 임시 서버(localhost-only) 를 내리고 본 서버를 재기동한다. 초판 준비 판정(`pg_isready` 1회 성공)이 임시 서버 단계에서도 통과해 재기동 사이에 걸림.

수정 (`fix/restore-check-ready-race` 판): 준비 판정을 `docker exec psql -Atc 'select 1'` **연속 2회 성공** (1초 간격 · 최대 60초) 으로 교체. 임시 서버 → 본 서버 재기동 사이 흔들림을 잡는다.

### 리허설 실패: `operator class "public.gin_trgm_ops" does not exist`

증상 (2026-09-16 실측 · #74 머지 후): 1·2단계 통과 후 3단계 `pg_restore` 실패 —
```
ERROR: operator class "public.gin_trgm_ops" does not exist for access method "gin"
Command was: CREATE INDEX competitions_name_trgm_idx ON public.competitions USING gin (name public.gin_trgm_ops);
```

원인: `backup.mjs` 는 `pg_dump -n public` 이라 `CREATE EXTENSION` 이 덤프에 포함되지 않음. 복원 대상 pitchlog_verify 에 `pg_trgm` 이 없어 trgm 인덱스 생성이 실패.

수정 (`fix/restore-check-sections` 판): 3단계 `pg_restore` 를 `--section=pre-data` → `CREATE EXTENSION IF NOT EXISTS pg_trgm SCHEMA public` → `--section=data` → `--section=post-data` 로 분할. pre-data 가 `CREATE SCHEMA public` 을 만들고 · 그 뒤 확장이 생기고 · 마지막 post-data 인덱스가 `public.gin_trgm_ops` 를 참조. 새 확장 추가 시 `REQUIRED_EXTENSIONS` 상수 갱신.

### 리허설 실패: `schema "public" already exists`

증상 (2026-09-16 실측 · #75 머지 후): 2단계 "확장 생성: pg_trgm" 통과 후 3단계 `pg_restore` 실패 — `Command was: CREATE SCHEMA public;`.

원인: 덤프 안에 `CREATE SCHEMA public` 이 포함돼 있어 스크립트가 미리 `CREATE SCHEMA IF NOT EXISTS public` 을 만들면 `pg_restore --exit-on-error` 가 already exists 로 실패. #75 판이 두 경로 중 IF NOT EXISTS 를 택했으나 실측이 CREATE SCHEMA 포함 사실을 확정.

수정 (`fix/restore-check-sections` 판): 2단계에서 `CREATE SCHEMA` · 확장 생성 호출을 제거. 3단계 `pg_restore` 를 pre-data → 확장 → data → post-data 3분할 — public 은 pg_restore pre-data 가 만든다.

### 유닛 문법 검증 (서버에서)

```bash
sudo systemd-analyze verify /etc/systemd/system/pitchlog-backup.service
sudo systemd-analyze verify /etc/systemd/system/pitchlog-backup.timer
```

### 이 판이 하지 않은 것 (별도 판)

- **리허설 자동화** — EC2 네이티브 `postgresql-17` + 주간 타이머 · `restore-check.mjs` 에 로컬 러너 추가. 4-b 워커 뒤 별도 판 (`docs/NEXT_STEPS.md` 4장 예약).
- **실패 알림** — journald 감시·통지는 4-b 스케줄러 판에서 (지금은 실패도 journald 에만 남음).
- **S3 버전 관리** — 스코프 밖.

## 백필 워커 (4-b-1)

`MatchDetailsBackfillService` 를 `@Cron` 트리거로 반복 호출해 백필-2 나머지 4시즌을 무인 실행한다. 종료 사유 3분류 (`cap_reached`/`no_targets`/`error`) 로 상태 갱신 · 겹침 방지 · 커서 재개.

### 켜기 (재시작이 곧 스위치)

```bash
sudoedit /etc/pitchlog/backend.env
# SCHEDULER_ENABLED=true
# BACKFILL_WORKER_ENABLED=true
sudo systemctl restart pitchlog-backend
sudo journalctl -u pitchlog-backend -f
# 부팅 로그: "scheduler: enabled · jobs=[QuotaSnapshotJob, BackfillWorkerJob]"
# 각 트리거: "backfill-worker cap_reached · processed=..."
```

### 상태 확인

```bash
curl -s http://localhost:3000/health | jq .scheduler
```

`scheduler.jobs.backfillWorker.lastOutcome` 가 `cap_reached` / `no_targets` / `error` 중 하나로 갱신됨. `running=true` 면 진행 중.

### 끄기

```bash
sudoedit /etc/pitchlog/backend.env
# SCHEDULER_ENABLED=false   (마스터 · 모든 잡 중지)
# 또는 BACKFILL_WORKER_ENABLED=false (백필만 중지 · quota-snapshot 은 유지)
sudo systemctl restart pitchlog-backend
```

### env (5개)

- `SCHEDULER_ENABLED` (true/false · 기본 false) — 마스터. false 면 어떤 잡도 등록되지 않는다 (부팅 로그 "scheduler: disabled").
- `BACKFILL_WORKER_ENABLED` (true/false · 기본 false) — 백필 잡 개별.
- `BACKFILL_WORKER_CRON` (기본 `5 * * * *` · 매시 5분) — 5 필드 cron. 유효성은 부팅 시 `CronJob` 생성자가 검사 (잘못된 값이면 부팅 실패).
- `BACKFILL_WORKER_LIMIT` (정수 · 기본 200) — 1회 실행당 경기 수 상한 (4콜/경기 · 200 = 800콜).
- `BACKFILL_WORKER_SEASONS` (쉼표 구분 · 기본 빈 값) — 순회할 시즌 목록. 빈 값이면 현재 시즌만 순회 (초판 동작). 각 항목은 `SEASON_YEARS` (2022~2026) 안 · 중복·빈 항목 금지 · 부팅 시 거부.

### 백필-2 켜기 (나머지 4시즌 무인)

**현재 시즌은 이미 CONFIRMED (#46) 이라 빈 값이면 매 트리거 `no_targets`.** 백필-2 를 켜려면 시즌 목록을 넣는다:

```bash
sudoedit /etc/pitchlog/backend.env
# BACKFILL_WORKER_SEASONS=2025,2024,2023,2022
sudo systemctl restart pitchlog-backend
sudo journalctl -u pitchlog-backend -f
# 다음 트리거 로그 예: "backfill-worker cap_reached · 2025: processed=143 failed=0 · total=143"
curl -s http://localhost:3000/health | jq .scheduler.jobs.backfillWorker.currentSeason
```

**완료 판정**: 모든 시즌이 `no_targets` 이고 `total=0` 이면 로그 `all seasons done` 한 줄이 뜨고 `lastOutcome=no_targets` 로 수렴. 이후 재시작 없이 이 상태가 지속되면 백필-2 완료.

**대상 범위**: 워커는 `screenCompetitionWhere` (displayOrder ≤ 100) 만 순회 — **리그 5개 + UCL 만. 국내 컵 6개 (displayOrder 110~) 는 워커 순회에서 제외** (컵 경기의 `detail_eligible` 규칙 자체는 L2 가 세팅하지만 워커가 그 대회시즌을 SELECT 하지 않음). 컵 백필 여부는 별도 결정 사항.

### 안전장치

- **API_FOOTBALL_KEY 없음** — `SCHEDULER_ENABLED=true` 여도 잡 등록 안 됨 (부팅 경고 · 부팅 성공).
- **겹침 방지** — 이전 실행 중이면 다음 트리거 skip (in-memory 플래그 · 재시작 시 초기화).
- **에러 재시도** — `error` 는 다음 트리거에서 재시도 · 커서 (`backfill_jobs.cursor_match_id`) 가 재개 보장.
- **DAILY_CAP** — 워커가 매 경기 앞에서 `/status` 로 확인 · 5,700 초과 시 자연 중단 (`cap_reached`).
- **`/status` 스냅숏** — `SCHEDULER_ENABLED=true` 면 매일 UTC 23:50 자동 (개별 스위치 없음).

## 실측 체크리스트 (첫 배포 후)

- [ ] **(a) 백엔드 직결**: `curl -i http://3.36.159.128:3000/health` — 200 · `db:true`
- [ ] **(b) Vercel 프록시**: Vercel URL 홈 접속 → 리그 순위표 로드
- [ ] **(c) 어시스턴트 왕복**: "음바페 통산 도움" — 응답 도착 (도구 호출 5~6회 · ~10초 이상 걸릴 수 있음). **Vercel 프록시 응답 상한을 실측한다** — 무료 서버리스 함수는 응답 상한이 짧아 어시스턴트가 초과하면 504 로 잘림. 초과 시 (i) `MAX_TOOL_EXECUTIONS` 축소 (ii) 유료 티어 (iii) rewrite 대신 CORS 로 브라우저 직결 중 판단
- [ ] **(d) rate limit 기기별**: 한 IP 로 어시스턴트 11회 빠르게 → 11번째 429. **다른 IP 로 접속 시 별개 카운트** (trust proxy 가 X-Forwarded-For 를 각 사용자로 반영)

## 알려진 한계

### X-Forwarded-For 위조 우회 (감수)

`backend/src/main.ts` 의 `app.set('trust proxy', 1)` 은 프록시 첫 홉의 X-Forwarded-For 를 그대로 신뢰한다.

- **정상 경로 (Vercel 도메인)**: 안전. Vercel 이 클라이언트 IP 로 X-Forwarded-For 를 설정한다.
- **직결 (EC2:3000)**: 보안 그룹이 3000 을 0.0.0.0/0 으로 열어놨으므로 누구나 `curl -H "X-Forwarded-For: 1.2.3.4"` 로 임의 IP 를 넣어 어시스턴트 rate limit 을 우회할 수 있다.

**현 구성에서 감수한다.** 위조로 얻는 것은 어시스턴트 10회/분·IP 밖 호출 능력이 전부고, 백엔드는 조회 API 뿐이라 손실 크지 않음.

**4-a-2 후속 판** 에서 둘 중 택일:
1. Vercel 프록시가 공유 비밀 헤더 (`X-Proxy-Secret`) 를 추가 → 백엔드가 검사, 없으면 429 상수화 or 403
2. 보안 그룹에서 3000 을 Vercel egress 대역으로 제한 (Vercel 에서 공개 대역 미공지 — 실사 필요)

### Swagger 노출 (EC2 직결 시)

`backend/src/main.ts:18` — `SwaggerModule.setup('docs', app, ...)` 이 `NODE_ENV` 분기 없이 항상 켠다.

**실 경로** (SwaggerModule 은 global prefix `/api` 를 무시하므로 `/api/docs` 가 아님):
- UI: `http://3.36.159.128:3000/docs`
- 스펙: `http://3.36.159.128:3000/docs/openapi.json`

**Vercel rewrite** 는 `/api/:path*` 만 프록시하므로 **Vercel 도메인 (`<앱>.vercel.app`) 에서는 노출되지 않는다.** EC2:3000 직결자에게만 보인다.

12대회 조회 API 스펙이라 노출이 큰 문제는 아니지만 명시. prod 에서 끄고 싶으면 별도 판 (`main.ts` 에 `if (process.env.NODE_ENV !== 'production')` 로 SwaggerModule.setup 을 감쌈).

### 이 판이 하지 않은 것

- **GitHub Actions 자동 배포** — 4-a-2 후속 판
- **백업 자동화 · S3 이전 · IAM 역할** — `docs/NEXT_STEPS.md` 4장 **4-c** 후속 판
- **스케줄러 · 워커 (백필-2 무인)** — 4-b
- **Caddy · 도메인 · 80/443 · CloudFront** — 필요 시 별도
- **Dockerfile** — Docker 안 씀 결정
- **프론트 코드 변경** — `vercel.json` 만
