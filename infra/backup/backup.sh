#!/bin/sh
set -eu

run_backup() {
  stamp=$(date +%Y-%m-%d_%H%M)
  file="/tmp/ecclesia_${stamp}.dump"
  pg_dump --format=custom --no-owner --file="$file"
  rclone copyto "$file" "${BACKUP_TARGET}/ecclesia_${stamp}.dump"
  rm -f "$file"
  rclone delete --min-age "${BACKUP_KEEP_DAYS}d" "$BACKUP_TARGET"
  echo "$(date -Iseconds) backup ecclesia_${stamp}.dump uploaded"
}

seconds_until() {
  now=$(date +%s)
  next=$(date -d "$(date +%Y-%m-%d) $1" +%s)
  [ "$next" -le "$now" ] && next=$((next + 86400))
  echo $((next - now))
}

if [ "${1:-}" != "--schedule" ]; then
  run_backup
  exit 0
fi

while true; do
  sleep "$(seconds_until "$BACKUP_AT")"
  run_backup || echo "$(date -Iseconds) backup failed" >&2
done
