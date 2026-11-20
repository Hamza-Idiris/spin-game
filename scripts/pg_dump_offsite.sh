#!/usr/bin/env bash
# OPTIONAL true pg_dump (physical-fidelity SQL dump incl. auth schema if you wish) stored OUTSIDE Supabase.
# Run from a trusted machine / CI cron. Needs: pg_dump, and DATABASE_URL (Supabase > Project Settings > Database > Connection string).
set -euo pipefail
: "${DATABASE_URL:?}" "${OUT_DIR:=./offsite-backups}"
mkdir -p "$OUT_DIR"
F="$OUT_DIR/spin-$(date -u +%Y%m%dT%H%M%SZ).sql.gz"
pg_dump "$DATABASE_URL" --no-owner --schema=public --schema=auth --data-only --column-inserts | gzip -9 > "$F"
sha256sum "$F" > "$F.sha256"
echo "Wrote $F (copy it to S3 / Backblaze / another cloud; encrypt with: age or gpg)"
