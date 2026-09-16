#!/usr/bin/env bash
# PitchLog EC2 초기 설정 — Ubuntu 24.04 · root 로 1회 · 멱등
#
# 실행:
#   scp -r infra/ec2 ubuntu@<EIP>:~/
#   ssh ubuntu@<EIP>
#   sudo bash ec2/bootstrap.sh
#
# 두 번 돌려도 같은 상태로 수렴한다. 그 이후 절차는 docs/DEPLOY.md.
set -euo pipefail

if [[ $EUID -ne 0 ]]; then
  echo "root 로 실행한다: sudo bash bootstrap.sh"
  exit 1
fi

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "▶ apt 업데이트"
export DEBIAN_FRONTEND=noninteractive
apt-get update -qq
apt-get -yqq upgrade

echo "▶ 기본 도구"
apt-get install -yqq git curl ca-certificates gnupg lsb-release

echo "▶ Node.js 22 (NodeSource)"
if ! command -v node >/dev/null 2>&1 || ! node -v | grep -q "^v22\."; then
  curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
  apt-get install -yqq nodejs
fi
node -v

# Ubuntu 24.04 apt 기본은 postgresql-client 16. Supabase 는 pg_dump 17 이상 요구.
# backup.mjs:48 DEFAULT_PG_IMAGE='postgres:17' 와 정합 (로컬 pg_dump 발견 시 Docker 대신 씀).
echo "▶ PostgreSQL 클라이언트 17 (PGDG)"
if ! command -v pg_dump >/dev/null 2>&1 || ! pg_dump --version | grep -qE "PostgreSQL\) 1[7-9]"; then
  install -d /etc/apt/keyrings
  curl -fsSL https://www.postgresql.org/media/keys/ACCC4CF8.asc \
    | gpg --dearmor -o /etc/apt/keyrings/pgdg.gpg
  chmod a+r /etc/apt/keyrings/pgdg.gpg
  echo "deb [signed-by=/etc/apt/keyrings/pgdg.gpg] http://apt.postgresql.org/pub/repos/apt $(lsb_release -cs)-pgdg main" \
    > /etc/apt/sources.list.d/pgdg.list
  apt-get update -qq
  apt-get install -yqq postgresql-client-17
fi
pg_dump --version

echo "▶ swapfile 2GB (nest build · sharp 여유)"
if [[ ! -f /swapfile ]]; then
  fallocate -l 2G /swapfile
  chmod 600 /swapfile
  mkswap /swapfile
  swapon /swapfile
  grep -q "^/swapfile" /etc/fstab || echo "/swapfile none swap sw 0 0" >> /etc/fstab
fi
swapon --show

echo "▶ AWS CLI (apt 기본 v1 — s3 cp/ls · IAM 역할 인증 지원 · 이 판 스코프 충분)"
if ! command -v aws >/dev/null 2>&1; then
  apt-get install -yqq awscli
fi
aws --version

echo "▶ 실행 사용자 pitchlog (systemd User · nologin)"
if ! id -u pitchlog >/dev/null 2>&1; then
  useradd --system --shell /usr/sbin/nologin --home-dir /opt/pitchlog pitchlog
fi

echo "▶ 앱 디렉터리 /opt/pitchlog (ubuntu 가 clone · 이후 chown 그대로)"
install -d -o ubuntu -g ubuntu /opt/pitchlog

echo "▶ 백업 디렉터리 /var/backups/pitchlog (pitchlog:pitchlog 0750 · backup.mjs 가 여기 쓴다)"
install -d -o pitchlog -g pitchlog -m 0750 /var/backups/pitchlog

echo "▶ 환경변수 파일 /etc/pitchlog/backend.env (0600 · 템플릿 복사)"
install -d -m 0755 /etc/pitchlog
if [[ ! -f /etc/pitchlog/backend.env ]]; then
  install -m 0600 -o pitchlog -g pitchlog \
    "$SCRIPT_DIR/backend.env.example" /etc/pitchlog/backend.env
  echo "  → sudoedit /etc/pitchlog/backend.env 로 채운 뒤 서비스를 재시작한다 (sudo systemctl restart pitchlog-backend)"
fi

echo "▶ systemd 유닛 (매번 갱신 · backend + backup service·timer)"
install -m 0644 "$SCRIPT_DIR/pitchlog-backend.service" /etc/systemd/system/pitchlog-backend.service
install -m 0644 "$SCRIPT_DIR/pitchlog-backup.service" /etc/systemd/system/pitchlog-backup.service
install -m 0644 "$SCRIPT_DIR/pitchlog-backup.timer" /etc/systemd/system/pitchlog-backup.timer
systemctl daemon-reload
systemctl enable pitchlog-backend
# 백업 타이머는 enable --now — 다음 KST 04:00 부터 자동. Persistent=true 라 꺼졌던 시각도 재실행.
systemctl enable --now pitchlog-backup.timer

echo "▶ deploy.sh · 백업 수동 실행을 위한 sudoers (ubuntu 가 비밀번호 없이)"
cat > /etc/sudoers.d/pitchlog-deploy <<'SUDOERS'
ubuntu ALL=(root) NOPASSWD: /usr/bin/systemctl restart pitchlog-backend
ubuntu ALL=(root) NOPASSWD: /usr/bin/systemctl status pitchlog-backend
ubuntu ALL=(root) NOPASSWD: /usr/bin/journalctl -u pitchlog-backend *
ubuntu ALL=(root) NOPASSWD: /usr/bin/systemctl start pitchlog-backup
ubuntu ALL=(root) NOPASSWD: /usr/bin/journalctl -u pitchlog-backup *
SUDOERS
chmod 0440 /etc/sudoers.d/pitchlog-deploy
visudo -c -f /etc/sudoers.d/pitchlog-deploy

cat <<'EOF'

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
다음 순서 (docs/DEPLOY.md):

  1) 환경변수 채우기
       sudoedit /etc/pitchlog/backend.env
     필수: DATABASE_URL · GEMINI_API_KEY · API_FOOTBALL_KEY

  2) 저장소 clone (ubuntu 로)
       cd /opt/pitchlog
       git clone https://github.com/donasman/pitchlog-league.git .

  3) 첫 배포
       bash /opt/pitchlog/infra/ec2/deploy.sh

  4) 확인
       curl -sf http://localhost:3000/health
       sudo systemctl status pitchlog-backend

  5) 백업 자동화 (S3 · 매일 KST 04:00)
     - sudoedit /etc/pitchlog/backend.env 에 BACKUP_S3_BUCKET=<실 버킷> 채우기
     - EC2 인스턴스 IAM 역할이 s3:PutObject / s3:ListBucket / s3:GetObject 가능해야 한다
     - 타이머 확인:  systemctl list-timers pitchlog-backup*
     - 수동 1회:    sudo systemctl start pitchlog-backup && sudo journalctl -u pitchlog-backup -n 30
     - 첫 성공 후 PC 에서 복원 리허설:
         aws s3 cp s3://<BUCKET>/dumps/<최신> .
         cd backend && npm run backup:verify -- <경로>
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
EOF
