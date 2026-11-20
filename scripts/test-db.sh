#!/usr/bin/env bash
# Runs the database tests against a SCRATCH PostgreSQL database (never your production project!).
# Usage: DATABASE_URL=postgres://user:pass@localhost:5432/spin_scratch ./scripts/test-db.sh
# The stub file fakes Supabase's auth/storage schemas and roles so migrations 0001-0003 can run on plain Postgres.
set -euo pipefail
: "${DATABASE_URL:?Set DATABASE_URL to an empty scratch database}"
cd "$(dirname "$0")/../supabase"
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -q -f tests/00_supabase_stub.sql
for m in migrations/0001_schema.sql migrations/0002_security_and_functions.sql migrations/0003_default_settings.sql; do psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -q -f "$m"; done
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -q -f tests/db_functions.test.sql
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -q -f tests/rls.test.sql
echo "DB tests finished: check the PASS notices above and the counts."
