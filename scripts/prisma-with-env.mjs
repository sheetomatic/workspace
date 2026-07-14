#!/usr/bin/env node
/**
 * Ensure Prisma schema env vars exist before running CLI commands.
 * Preview/install often has DATABASE_URL but no DIRECT_URL (Neon unpooled).
 * `prisma generate` only needs the vars present — not a live DB.
 */
import { spawnSync } from "node:child_process";

const PLACEHOLDER =
  "postgresql://prisma:prisma@127.0.0.1:5432/prisma?schema=public";

function trimEnv(name) {
  const value = process.env[name];
  return typeof value === "string" && value.trim() ? value.trim() : "";
}

const args = process.argv.slice(2);
if (args.length === 0) {
  console.error("Usage: node scripts/prisma-with-env.mjs <prisma-args...>");
  process.exit(1);
}

const command = args[0];
const isGenerate = command === "generate";
const isMigrateDeploy =
  command === "migrate" && args[1] === "deploy";

let databaseUrl = trimEnv("DATABASE_URL");
let directUrl = trimEnv("DIRECT_URL");

if (!databaseUrl && isGenerate) {
  databaseUrl = PLACEHOLDER;
}
if (!directUrl) {
  directUrl = databaseUrl || PLACEHOLDER;
}
if (!databaseUrl) {
  databaseUrl = directUrl;
}

if (isMigrateDeploy && (!trimEnv("DATABASE_URL") || databaseUrl === PLACEHOLDER)) {
  console.warn(
    "[prisma-with-env] Skipping migrate deploy — DATABASE_URL is not set for this environment.",
  );
  process.exit(0);
}

const env = {
  ...process.env,
  DATABASE_URL: databaseUrl,
  DIRECT_URL: directUrl,
};

const result = spawnSync("npx", ["prisma", ...args], {
  stdio: "inherit",
  env,
  shell: process.platform === "win32",
});

process.exit(result.status ?? 1);
