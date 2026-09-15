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

echo "▶ 실행 사용자 pitchlog (systemd User · nologin)"
if ! id -u pitchlog >/dev/null 2>&1; then
  useradd --system --shell /usr/sbin/nologin --home-dir /opt/pitchlog pitchlog
fi

echo "▶ 앱 디렉터리 /opt/pitchlog (ubuntu 가 clone · 이후 chown 그대로)"
install -d -o ubuntu -g ubuntu /opt/pitchlog

echo "▶ 환경변수 파일 /etc/pitchlog/backend.env (0600 · 템플릿 복사)"
install -d -m 0755 /etc/pitchlog
if [[ ! -f /etc/pitchlog/backend.env ]]; then
  install -m 0600 -o pitchlog -g pitchlog \
    "$SCRIPT_DIR/backend.env.example" /etc/pitchlog/backend.env
  echo "  → sudoedit /etc/pitchlog/backend.env 로 채운 뒤 서비스를 재시작한다 (sudo systemctl restart pitchlog-backend)"
fi

echo "▶ systemd 유닛 (매번 갱신)"
install -m 0644 "$SCRIPT_DIR/pitchlog-backend.service" /etc/systemd/system/pitchlog-backend.service
systemctl daemon-reload
systemctl enable pitchlog-backend

echo "▶ deploy.sh 를 위한 sudoers (ubuntu 가 서비스 재시작·상태·로그 조회를 비밀번호 없이)"
cat > /etc/sudoers.d/pitchlog-deploy <<'SUDOERS'
ubuntu ALL=(root) NOPASSWD: /usr/bin/systemctl restart pitchlog-backend
ubuntu ALL=(root) NOPASSWD: /usr/bin/systemctl status pitchlog-backend
ubuntu ALL=(root) NOPASSWD: /usr/bin/journalctl -u pitchlog-backend *
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
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
EOF
