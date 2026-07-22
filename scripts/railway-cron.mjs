#!/usr/bin/env node
/**
 * Railway cron runner — call Sheetomatic cron API routes, then exit.
 *
 * Usage (Railway Cron service start command):
 *   node scripts/railway-cron.mjs leads-sync
 *   node scripts/railway-cron.mjs task-reminders
 *
 * Required env:
 *   APP_BASE_URL  — public origin, e.g. https://sheetomatic.com
 *   CRON_SECRET   — same secret as the web service
 */

const job = process.argv[2];
const jobs = new Set([
  "task-reminders",
  "due-date-alerts",
  "fms-step-reminders",
  "ims-reorder-alerts",
  "checklist-pc",
  "task-due-digest",
  "leads-sync",
]);

if (!job || !jobs.has(job)) {
  console.error(
    `Usage: node scripts/railway-cron.mjs <${[...jobs].join("|")}>`,
  );
  process.exit(1);
}

const base = (process.env.APP_BASE_URL || process.env.NEXTAUTH_URL || "").replace(
  /\/$/,
  "",
);
const secret = process.env.CRON_SECRET;

if (!base) {
  console.error("APP_BASE_URL (or NEXTAUTH_URL) is required");
  process.exit(1);
}
if (!secret) {
  console.error("CRON_SECRET is required");
  process.exit(1);
}

const url = `${base}/api/cron/${job}`;
const started = Date.now();

const res = await fetch(url, {
  method: "GET",
  headers: { Authorization: `Bearer ${secret}` },
});

const body = await res.text();
const ms = Date.now() - started;
console.log(`[railway-cron] ${job} → ${res.status} (${ms}ms)`);
if (body) console.log(body.slice(0, 2000));

if (!res.ok) process.exit(1);
process.exit(0);
