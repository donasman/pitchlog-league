#!/usr/bin/env bash
# PitchLog 백업 → S3 업로드 (pitchlog-backup.service 가 부른다).
#
# 흐름:
#   1. backend/scripts/backup.mjs 실행 (BACKUP_DIR=/var/backups/pitchlog 에 pitchlog-*.dump)
#   2. 종료 0 이면 그 dir 에서 가장 최근 파일을 `aws s3 cp` 로 업로드
#   3. `aws s3 ls s3://<BUCKET>/dumps/ | tail -3` 로 최근 3개 노출 (journald)
#
# 환경변수 (systemd EnvironmentFile=/etc/pitchlog/backend.env):
#   DATABASE_URL      — Supabase Session Pooler
#   BACKUP_S3_BUCKET  — 업로드 대상 버킷 (하드코딩 금지)
# 유닛 Environment= 로 고정:
#   BACKUP_DIR=/var/backups/pitchlog
#   AWS_DEFAULT_REGION=ap-northeast-2
#
# S3 자격증명: 인스턴스 IAM 역할 (키 파일 없음).
set -euo pipefail

if [[ -z "${BACKUP_S3_BUCKET:-}" ]]; then
  echo "✗ BACKUP_S3_BUCKET 이 비어 있다 — sudoedit /etc/pitchlog/backend.env"
  exit 1
fi

BACKEND_DIR="/opt/pitchlog/backend"
BACKUP_DIR="${BACKUP_DIR:-/var/backups/pitchlog}"

echo "▶ pg_dump → $BACKUP_DIR"
cd "$BACKEND_DIR"
node scripts/backup.mjs

# 가장 최근 덤프 — backup.mjs 는 pitchlog-YYYYMMDD-HHMM.dump 스탬프라 이름 정렬로 최신 판별
LATEST="$(ls -1t "$BACKUP_DIR"/pitchlog-*.dump 2>/dev/null | head -1 || true)"
if [[ -z "$LATEST" ]]; then
  echo "✗ 덤프 파일을 찾지 못했다 — backup.mjs 출력 확인"
  exit 1
fi

echo "▶ 업로드 → s3://$BACKUP_S3_BUCKET/dumps/$(basename "$LATEST")"
aws s3 cp --only-show-errors "$LATEST" "s3://$BACKUP_S3_BUCKET/dumps/"

echo "▶ 최근 S3 덤프 3개"
aws s3 ls "s3://$BACKUP_S3_BUCKET/dumps/" | tail -3

echo "✓ 백업+업로드 완료"
