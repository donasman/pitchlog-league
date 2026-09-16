#!/usr/bin/env bash
# PitchLog 배포 — EC2 안에서 ubuntu 로 실행
#
# 사용:
#   bash /opt/pitchlog/infra/ec2/deploy.sh          # main
#   bash /opt/pitchlog/infra/ec2/deploy.sh <ref>    # 특정 브랜치·태그
#
# npm ci 는 --omit=dev 금지 — nest build 가 devDependencies (@nestjs/cli) 를 쓴다.
# 실패 시 롤백 명령을 출력한다. dist.prev 는 이전 성공본.
set -euo pipefail

# `--no-pull` 은 자기 재실행 재진입 플래그 — 인자 파싱에서 먼저 소진하고 REF 로 넘어간다.
# 사용:
#   bash deploy.sh                # main pull · HEAD 바뀌면 자기 재실행
#   bash deploy.sh dev            # dev pull · HEAD 바뀌면 자기 재실행
#   bash deploy.sh --no-pull      # 내부용 — 재실행판이 최신화 블록을 건너뛰어 무한 재실행 방지
NO_PULL=false
if [[ "${1:-}" == "--no-pull" ]]; then
  NO_PULL=true
  shift
fi
REF="${1:-main}"
REPO_DIR="/opt/pitchlog"
BACKEND_DIR="$REPO_DIR/backend"

if [[ ! -d "$REPO_DIR/.git" ]]; then
  echo "✗ $REPO_DIR 에 저장소가 없다. 먼저 clone 한다:"
  echo "  cd $REPO_DIR && git clone https://github.com/donasman/pitchlog-league.git ."
  exit 1
fi

# 어느 단계 실패(git·npm·prisma·build·restart)든 롤백 안내가 찍히게.
# health 실패 경로는 아래에서 `trap - ERR` 로 무효화한다 (자체 안내가 있어 중복 방지).
# dist.prev 없는 첫 배포에서 성립하지 않는 "mv dist.prev dist" 안내가 나오는 결함 정정 (2026-09-15 실측).
trap 'if [[ -d "$BACKEND_DIR/dist.prev" ]]; then echo "✗ 실패 — 롤백: cd $BACKEND_DIR && rm -rf dist && mv dist.prev dist && sudo systemctl restart pitchlog-backend"; else echo "✗ 실패 — 첫 배포 · 롤백 대상 없음 (dist.prev 없음)"; fi' ERR

# cd 는 두 갈래 공유 — --no-pull 재실행판이 cwd 에 의존하지 않게.
cd "$REPO_DIR"

# bash 는 실행 중 열어둔 파일(옛 inode)을 계속 읽고 git 은 새 inode 로 파일을 교체한다.
# pull 로 deploy.sh 자기 자신이 바뀌면 이번 실행은 옛 코드로 끝까지 도는 결함(2026-09-15 EC2 실측 · 3회 실행 필요).
# HEAD 가 바뀌었으면 `exec bash "$0" --no-pull "$REF"` 로 프로세스를 새 파일로 갈아 재실행.
if [[ "$NO_PULL" == "true" ]]; then
  echo "▶ 저장소 최신화 건너뜀 (--no-pull · 자기 재실행 중)"
  echo "  → $(git rev-parse --short HEAD) — $(git log -1 --pretty=%s)"
else
  echo "▶ 저장소 최신화 ($REF)"
  HEAD_BEFORE="$(git rev-parse HEAD)"
  git fetch --prune origin
  git checkout "$REF"
  git pull --ff-only origin "$REF"
  HEAD_AFTER="$(git rev-parse HEAD)"
  echo "  → $(git rev-parse --short HEAD) — $(git log -1 --pretty=%s)"
  if [[ "$HEAD_BEFORE" != "$HEAD_AFTER" ]]; then
    echo "▶ deploy.sh 갱신됨 → 새 버전으로 재실행"
    exec bash "$0" --no-pull "$REF"
  fi
fi

cd "$BACKEND_DIR"


# 이전 dist 를 보존 — 빌드 실패 시 기존 dist 도 살아있게 (mv 아니라 cp -a).
# npm ci · prisma generate · nest build 가 죽어도 기존 서비스는 계속 돈다.
if [[ -d dist ]]; then
  rm -rf dist.prev
  cp -a dist dist.prev
fi

echo "▶ npm ci (devDeps 포함 · nest build 가 필요)"
npm ci

echo "▶ prisma generate"
# prisma.config.ts 가 로딩 시 DATABASE_URL 을 요구하지만 generate 자체는 DB 접속을 안 한다.
# deploy.sh 는 ubuntu 로 돌아 /etc/pitchlog/backend.env (0600 · pitchlog) 를 못 읽으므로 placeholder 를 인라인으로 세팅.
# 실 DATABASE_URL 이 이미 환경에 있으면 그대로 씀 (${VAR:-default} · 우측은 무해).
DATABASE_URL="${DATABASE_URL:-postgresql://placeholder:placeholder@localhost:5432/placeholder}" npx prisma generate

echo "▶ nest build"
npm run build

echo "▶ 서비스 재시작"
sudo systemctl restart pitchlog-backend

# 이 아래는 자체 안내가 있으므로 trap 무효화 (중복 방지)
trap - ERR

# health 대기 — 실 라우트는 /health (main.ts:20 `setGlobalPrefix('api', { exclude: ['health'] })`)
echo "▶ health 대기 (최대 30초)"
for i in $(seq 1 30); do
  if curl -sf http://localhost:3000/health > /dev/null 2>&1; then
    echo "✓ health OK (${i}초)"
    curl -s http://localhost:3000/health
    echo
    exit 0
  fi
  sleep 1
done

echo
echo "✗ health 실패 — 로그와 롤백 명령:"
echo "────── journalctl -u pitchlog-backend -n 50 ──────"
sudo journalctl -u pitchlog-backend -n 50 --no-pager || true
echo "──────────────────────────────────────────────────"
echo
echo "롤백 (이전 성공본으로):"
echo "  cd $BACKEND_DIR && rm -rf dist && mv dist.prev dist && sudo systemctl restart pitchlog-backend"
echo "  curl -sf http://localhost:3000/health"
exit 1
