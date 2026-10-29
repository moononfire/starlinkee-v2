#!/usr/bin/env bash
# Runs the Playwright e2e suite against the LOCAL Supabase (supabase start), never the
# remote project from .env.local. Uses its own port so it can't reuse a dev server that
# points at the remote DB.
set -euo pipefail
cd "$(dirname "$0")/.."

eval "$(supabase status -o env | grep -E '^(API_URL|SERVICE_ROLE_KEY|ANON_KEY)=')"

export NEXT_PUBLIC_SUPABASE_URL="$API_URL"
export NEXT_PUBLIC_SUPABASE_ANON_KEY="$ANON_KEY"
export SUPABASE_SERVICE_ROLE_KEY="$SERVICE_ROLE_KEY"
export E2E_PORT="${E2E_PORT:-3100}"
export NEXT_DIST_DIR=".next-e2e"

exec npx playwright test "$@"
