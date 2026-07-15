#!/usr/bin/env bash
# Deploy / update Sheetomatic on a Hostinger VPS from a git checkout.
# Run on the VPS as a user in the docker group:
#   cd /opt/sheetomatic && ./deploy/hostinger/deploy.sh

set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$ROOT"

if [[ ! -f .env ]]; then
  echo "Missing $ROOT/.env — copy from .env.example and fill production values."
  exit 1
fi

echo "[deploy] Pulling latest…"
git fetch origin
git checkout main
git pull origin main

echo "[deploy] Building and starting containers…"
docker compose -f docker-compose.prod.yml --env-file .env up -d --build --remove-orphans

echo "[deploy] Waiting for health…"
for i in $(seq 1 30); do
  if curl -fsS "http://127.0.0.1:3000/api/health" >/dev/null 2>&1; then
    echo "[deploy] Healthy."
    docker compose -f docker-compose.prod.yml ps
    exit 0
  fi
  sleep 2
done

echo "[deploy] Health check failed — recent app logs:"
docker compose -f docker-compose.prod.yml logs --tail=80 app
exit 1
