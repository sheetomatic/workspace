#!/bin/sh
set -eu

# Cron services: set RAILWAY_CRON_JOB=leads-sync (etc.) and a Cron Schedule in Railway.
# Those containers must exit after the HTTP call — do not start Next.js.
if [ -n "${RAILWAY_CRON_JOB:-}" ]; then
  echo "[sheetomatic] Cron job: ${RAILWAY_CRON_JOB}"
  exec node scripts/railway-cron.mjs "${RAILWAY_CRON_JOB}"
fi

echo "[sheetomatic] Running prisma migrate deploy..."
if [ -x ./node_modules/.bin/prisma ]; then
  ./node_modules/.bin/prisma migrate deploy
elif [ -f ./node_modules/prisma/build/index.js ]; then
  node ./node_modules/prisma/build/index.js migrate deploy
else
  echo "[sheetomatic] ERROR: prisma CLI not found in image" >&2
  exit 1
fi

echo "[sheetomatic] Starting Next.js on ${HOSTNAME:-0.0.0.0}:${PORT:-3000}"
exec node server.js
