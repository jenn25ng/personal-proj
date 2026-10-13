#!/bin/sh
# PostgreSQL 전체를 pg_dump 로 받아 gzip 으로 저장하고 오래된 파일을 지운다.
# 환경변수: DATABASE_URL (필수), BACKUP_DIR (기본 /backups), BACKUP_KEEP_DAYS (기본 30)
# docker compose 의 backup 서비스가 BACKUP_INTERVAL_HOURS 마다 이 스크립트를 돌린다. 단독으로 cron 에 걸어도 된다.
set -eu
: "${DATABASE_URL:?DATABASE_URL 이 필요해요}"
DIR="${BACKUP_DIR:-/backups}"
KEEP="${BACKUP_KEEP_DAYS:-30}"
mkdir -p "$DIR"
STAMP="$(date -u +%Y-%m-%dT%H-%M-%SZ)"
FILE="$DIR/think-first-$STAMP.sql.gz"
pg_dump --no-owner --no-privileges "$DATABASE_URL" | gzip > "$FILE"
echo "백업 저장: $FILE ($(du -h "$FILE" | cut -f1))"
find "$DIR" -name 'think-first-*.sql.gz' -mtime "+$KEEP" -print -delete | sed 's/^/삭제(보관 기간 지남): /'
