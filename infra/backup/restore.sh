#!/bin/sh
set -eu

name="${1:-}"
if [ -z "$name" ]; then
  name=$(rclone lsf "$BACKUP_TARGET" | sort | tail -n 1)
fi
target="${2:-$PGDATABASE}"
rclone copyto "${BACKUP_TARGET}/${name}" /tmp/restore.dump
pg_restore --clean --if-exists --no-owner --dbname="$target" /tmp/restore.dump
rm -f /tmp/restore.dump
echo "restored ${name} into ${target}"
