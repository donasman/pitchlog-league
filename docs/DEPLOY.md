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
4. 배포 후 확인:
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
