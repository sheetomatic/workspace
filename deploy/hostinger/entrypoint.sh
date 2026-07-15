#!/bin/sh
set -eu

echo "[sheetomatic] Running prisma migrate deploy..."
if [ -x ./node_modules/.bin/prisma ]; then
  ./node_modules/.bin/prisma migrate deploy
elif [ -x ./node_modules/prisma/build/index.js ]; then
  node ./node_modules/prisma/build/index.js migrate deploy
else
  echo "[sheetomatic] ERROR: prisma CLI not found in image" >&2
  exit 1
fi

echo "[sheetomatic] Starting Next.js on ${HOSTNAME:-0.0.0.0}:${PORT:-3000}"
exec node server.js
