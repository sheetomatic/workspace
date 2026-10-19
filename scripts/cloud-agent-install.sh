#!/usr/bin/env bash
# Idempotent Cloud Agent install: Node deps, local Postgres, migrate, seed.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"
# shellcheck disable=SC1091
. "$ROOT/scripts/cloud-agent-lib.sh"

export DEBIAN_FRONTEND=noninteractive
if ! command -v psql >/dev/null 2>&1 || ! command -v pg_isready >/dev/null 2>&1; then
  sudo apt-get update
  sudo apt-get install -y postgresql postgresql-contrib
fi

npm ci

start_postgres
ensure_local_database
ensure_env_file
load_env

npx prisma migrate deploy
npx prisma db seed

stop_postgres
echo "Cloud Agent install complete."
