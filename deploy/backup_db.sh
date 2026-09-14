#!/usr/bin/env bash
# Nightly Postgres backup for the knit database. Modeled on fantasy-football's
# deploy/backup_db.sh, which already runs on this VPS.
#
# Installed as a cron job owned by the postgres user (peer auth, no password). See
# deploy/BOOTSTRAP.md §8.
#
#   # /etc/cron.d/knit-backup
#   45 4 * * *  postgres  /usr/local/bin/knit-backup.sh >> /var/log/knit-backup.log 2>&1
#
# What's worth saving: members, posts, comments, reactions, talks, and invites. None of
# it can be rebuilt. The verses table can (npm run db:migrate), but it's in the dump
# too, which keeps a restore to one command.
#
# DB, BACKUP_DIR, and KEEP_DAYS can be overridden to test the script elsewhere, e.g.:
#   DB="$DATABASE_URL" BACKUP_DIR=/tmp/knit-backups bash deploy/backup_db.sh

set -euo pipefail

DB=${DB:-knit}
BACKUP_DIR=${BACKUP_DIR:-/var/backups/knit}
KEEP_DAYS=${KEEP_DAYS:-14}
# The verses table alone is megabytes; a dump this small means the wrong or an empty database.
MIN_BYTES=100000

mkdir -p "$BACKUP_DIR"
# Run from cron as postgres, the starting cwd may be /root, which postgres can't read, and
# GNU find then fails in the prune step. Same fix as fantasy-football's script.
cd "$BACKUP_DIR"
STAMP=$(date +%Y%m%d-%H%M%S)
OUT="$BACKUP_DIR/knit-${STAMP}.sql.gz"

# Plain SQL, gzipped. Restore with:
#   gunzip -c FILE.sql.gz | sudo -u postgres psql knit
# Written to .partial and renamed only once it checks out, so a failed run never leaves a
# file that looks like a good backup.
PARTIAL="$OUT.partial"
trap 'rm -f "$PARTIAL"' EXIT
pg_dump --no-owner --no-privileges --dbname="$DB" | gzip > "$PARTIAL"

SIZE=$(stat -c %s "$PARTIAL")
if [ "$SIZE" -lt "$MIN_BYTES" ]; then
	echo "!! backup is only ${SIZE} bytes; the dump may have failed" >&2
	exit 1
fi
mv "$PARTIAL" "$OUT"

find "$BACKUP_DIR" -name "knit-*.sql.gz" -mtime +"$KEEP_DAYS" -delete

echo "backup ok: $OUT (${SIZE} bytes); pruned dumps older than ${KEEP_DAYS}d"
