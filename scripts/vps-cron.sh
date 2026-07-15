#!/usr/bin/env bash
# Hostinger VPS cron runner — replaces Vercel cron from vercel.json
# Usage (crontab):
#   */15 * * * * /opt/sheetomatic/scripts/vps-cron.sh leads-sync >> /var/log/sheetomatic-cron.log 2>&1
#
# Requires env file with CRON_SECRET and APP_BASE_URL (https://sheetomatic.com).

set -euo pipefail

JOB="${1:-}"
if [[ -z "$JOB" ]]; then
  echo "Usage: $0 <cron-job-name>"
  echo "Jobs: task-reminders | due-date-alerts | fms-step-reminders | ims-reorder-alerts | checklist-pc | task-due-digest | leads-sync"
  exit 1
fi

ENV_FILE="${SHEETOMATIC_ENV_FILE:-/opt/sheetomatic/.env}"
if [[ -f "$ENV_FILE" ]]; then
  # shellcheck disable=SC1090
  set -a
  # shellcheck disable=SC1090
  source "$ENV_FILE"
  set +a
fi

BASE_URL="${APP_BASE_URL:-${NEXTAUTH_URL:-http://127.0.0.1:3000}}"
BASE_URL="${BASE_URL%/}"
SECRET="${CRON_SECRET:-}"

if [[ -z "$SECRET" ]]; then
  echo "CRON_SECRET is required"
  exit 1
fi

case "$JOB" in
  task-reminders) PATH_SUFFIX="/api/cron/task-reminders" ;;
  due-date-alerts) PATH_SUFFIX="/api/cron/due-date-alerts" ;;
  fms-step-reminders) PATH_SUFFIX="/api/cron/fms-step-reminders" ;;
  ims-reorder-alerts) PATH_SUFFIX="/api/cron/ims-reorder-alerts" ;;
  checklist-pc) PATH_SUFFIX="/api/cron/checklist-pc" ;;
  task-due-digest) PATH_SUFFIX="/api/cron/task-due-digest" ;;
  leads-sync) PATH_SUFFIX="/api/cron/leads-sync" ;;
  *)
    echo "Unknown job: $JOB"
    exit 1
    ;;
esac

URL="${BASE_URL}${PATH_SUFFIX}"
echo "[$(date -Is)] GET $URL"
curl -fsS -X GET \
  -H "Authorization: Bearer ${SECRET}" \
  -H "Accept: application/json" \
  --max-time 300 \
  "$URL"
echo
