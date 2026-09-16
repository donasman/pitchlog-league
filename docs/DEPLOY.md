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
5. 배포 후 확인:
   - Vercel URL 접속 → 홈에서 순위표 로딩되면 성공
   - 로딩되면 `vercel.json` 의 rewrite (`/api/:path*` → `http://3.36.159.128:3000/api/:path*`) 가 동작 중

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

### 유닛 문법 검증 (서버에서)

```bash
sudo systemd-analyze verify /etc/systemd/system/pitchlog-backup.service
sudo systemd-analyze verify /etc/systemd/system/pitchlog-backup.timer
```

### 이 판이 하지 않은 것 (별도 판)

- **리허설 자동화** — EC2 네이티브 `postgresql-17` + 주간 타이머 · `restore-check.mjs` 에 로컬 러너 추가. 4-b 워커 뒤 별도 판 (`docs/NEXT_STEPS.md` 4장 예약).
- **실패 알림** — journald 감시·통지는 4-b 스케줄러 판에서 (지금은 실패도 journald 에만 남음).
- **S3 버전 관리** — 스코프 밖.

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
