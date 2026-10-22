#!/usr/bin/env bash
# Boot local Postgres and the Next.js dev server. Safe to run more than once.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"
# shellcheck disable=SC1091
. "$ROOT/scripts/cloud-agent-lib.sh"

if ! command -v pg_isready >/dev/null 2>&1; then
  echo "PostgreSQL is not installed. scripts/cloud-agent-install.sh did not complete." >&2
  exit 1
fi

start_postgres
ensure_local_database
ensure_env_file
load_env

npx prisma migrate deploy
install_server_only_stub
if ! demo_user_present; then
  npx prisma db seed
fi

exec npm run dev -- --hostname 0.0.0.0 --port 3000
