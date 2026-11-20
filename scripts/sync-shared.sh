#!/usr/bin/env bash
# Keeps the browser copy of the randomization engine identical to the server copy.
set -euo pipefail
cd "$(dirname "$0")/.."
cp supabase/functions/_shared/engine.ts frontend/src/lib/shared/engine.ts
echo "engine.ts synced"
