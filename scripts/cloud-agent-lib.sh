#!/usr/bin/env bash
# Shared helpers for Cloud Agent install and start. Local Postgres only.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

postgres_version() {
  ls /usr/lib/postgresql 2>/dev/null | sort -V | tail -n1 || true
}

start_postgres() {
  if pg_isready -q; then
    return 0
  fi
  if command -v service >/dev/null 2>&1; then
    sudo service postgresql start || true
  fi
  if ! pg_isready -q; then
    local ver
    ver="$(postgres_version)"
    if [ -n "$ver" ]; then
      sudo pg_ctlcluster "$ver" main start || true
    fi
  fi
  local _i
  for _i in $(seq 1 40); do
    if pg_isready -q; then
      return 0
    fi
    sleep 1
  done
  echo "PostgreSQL did not become ready." >&2
  exit 1
}

stop_postgres() {
  if ! pg_isready -q; then
    return 0
  fi
  sudo -u postgres psql -d postgres -c "CHECKPOINT;" >/dev/null || true
  if command -v service >/dev/null 2>&1; then
    sudo service postgresql stop || true
  fi
  if pg_isready -q; then
    local ver
    ver="$(postgres_version)"
    if [ -n "$ver" ]; then
      sudo pg_ctlcluster "$ver" main stop || true
    fi
  fi
}

ensure_local_database() {
  sudo -u postgres psql -v ON_ERROR_STOP=1 -d postgres <<'SQL'
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'sheetomatic') THEN
    CREATE ROLE sheetomatic LOGIN PASSWORD 'sheetomatic' SUPERUSER;
  ELSE
    ALTER ROLE sheetomatic WITH LOGIN PASSWORD 'sheetomatic' SUPERUSER;
  END IF;
END
$$;
SELECT 'CREATE DATABASE sheetomatic OWNER sheetomatic'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'sheetomatic')\gexec
SQL
  sudo -u postgres psql -v ON_ERROR_STOP=1 -d sheetomatic -c "ALTER SCHEMA public OWNER TO sheetomatic;"
  sudo -u postgres psql -v ON_ERROR_STOP=1 -d sheetomatic -c "GRANT ALL ON SCHEMA public TO sheetomatic;"
}

ensure_env_file() {
  if [ -f .env ]; then
    return 0
  fi
  local auth_secret
  auth_secret="$(openssl rand -base64 32 | tr -d '\n')"
  cat > .env <<EOF
DATABASE_URL="postgresql://sheetomatic:sheetomatic@127.0.0.1:5432/sheetomatic"
DIRECT_URL="postgresql://sheetomatic:sheetomatic@127.0.0.1:5432/sheetomatic"
AUTH_SECRET="${auth_secret}"
CRON_SECRET="$(openssl rand -base64 32 | tr -d '\n')"
NEXTAUTH_URL="http://localhost:3000"
NEXT_PUBLIC_SITE_URL="http://localhost:3000"
NEXT_PUBLIC_ROOT_DOMAIN="sheetomatic.com"
EOF
  chmod 600 .env
}

load_env() {
  if [ ! -f .env ]; then
    echo "Missing .env. Run scripts/cloud-agent-install.sh first." >&2
    exit 1
  fi
  set -a
  # shellcheck disable=SC1091
  . ./.env
  set +a
}

demo_user_present() {
  local found
  found="$(psql "$DATABASE_URL" -tAc "SELECT 1 FROM \"User\" WHERE email = 'owner@acme.demo' LIMIT 1" 2>/dev/null || true)"
  printf '%s' "$found" | grep -q 1
}
