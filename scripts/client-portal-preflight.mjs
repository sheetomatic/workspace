#!/usr/bin/env node
/**
 * Dedicated-portal go-live gate. Prints names only — never secret values.
 * Exit 1 if the vault or the target Vercel project is missing required keys.
 *
 *   node scripts/client-portal-preflight.mjs --project anmol-traders --slug anmol-traders
 */

import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

function arg(name, fallback = "") {
  const i = process.argv.indexOf(name);
  if (i === -1 || !process.argv[i + 1]) return fallback;
  return process.argv[i + 1];
}

const project = arg("--project");
const slug = arg("--slug", project);
const workspace = resolve(import.meta.dirname, "..");
const vaultPath = resolve(workspace, ".env.shared.local");

const SHARED_REQUIRED = ["OPENAI_API_KEY", "DATABASE_URL", "DIRECT_URL"];
const SHARED_OPTIONAL = ["RESEND_API_KEY", "CRON_SECRET"];
const PROJECT_REQUIRED = [
  "OPENAI_API_KEY",
  "DATABASE_URL",
  "DIRECT_URL",
  "AUTH_SECRET",
  "AUTH_URL",
  "NEXTAUTH_URL",
  "NEXT_PUBLIC_SITE_URL",
  "NEXT_PUBLIC_ROOT_DOMAIN",
  "NEXT_PUBLIC_STANDALONE_ORGANIZATION_SLUG",
];

if (!project) {
  console.error("Usage: node scripts/client-portal-preflight.mjs --project <vercel-project> --slug <org-slug>");
  process.exit(1);
}

function parseEnvFile(path) {
  const out = {};
  if (!existsSync(path)) return out;
  for (const line of readFileSync(path, "utf8").split(/\r?\n/)) {
    const s = line.trim();
    if (!s || s.startsWith("#") || !s.includes("=")) continue;
    const eq = s.indexOf("=");
    const key = s.slice(0, eq).trim();
    let val = s.slice(eq + 1).trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    out[key] = val;
  }
  return out;
}

function present(map, key) {
  return Boolean(String(map[key] ?? "").trim());
}

const missing = [];
const notes = [];

const vault = parseEnvFile(vaultPath);
if (!existsSync(vaultPath)) {
  missing.push("vault:.env.shared.local (create from .env.shared.example)");
} else {
  for (const key of SHARED_REQUIRED) {
    if (!present(vault, key)) missing.push(`vault:${key}`);
  }
  for (const key of SHARED_OPTIONAL) {
    if (!present(vault, key)) notes.push(`vault optional empty: ${key}`);
  }
}

let envLs = "";
try {
  envLs = execFileSync("npx", ["vercel", "env", "ls", "--project", project], {
    cwd: workspace,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });
} catch (error) {
  missing.push(`vercel: cannot list env for project ${project}`);
  notes.push(String(error.stderr || error.message || error).slice(0, 240));
}

const listed = new Set();
for (const line of envLs.split(/\r?\n/)) {
  const name = line.trim().split(/\s+/)[0];
  if (name && /^[A-Z][A-Z0-9_]+$/.test(name)) listed.add(name);
}

if (envLs) {
  for (const key of PROJECT_REQUIRED) {
    if (!listed.has(key)) missing.push(`vercel:${key}`);
  }
}

if (listed.size && !listed.has("WHATSAPP_PROVIDER") && !listed.has("REDLAVA_API_KEY")) {
  notes.push("WhatsApp keys not listed — required only if the sale includes Official API");
}

console.log(`Preflight  project=${project}  slug=${slug}`);
console.log(`Vault      ${existsSync(vaultPath) ? "found" : "MISSING"}  (${vaultPath})`);
console.log(`Vercel     listed ${listed.size} names`);
if (notes.length) {
  for (const n of notes) console.log(`Note       ${n}`);
}

if (missing.length) {
  console.error("FAIL  missing:");
  for (const m of missing) console.error(`  - ${m}`);
  console.error("Do not deploy. Fill the vault and/or Vercel Production, then re-run.");
  console.error("Deploy author must be training@sheetomatic.in (command env only — no git config).");
  process.exit(1);
}

console.log("PASS  shared vault + required Vercel names are present.");
console.log("Next  npm run build in the client repo, then vercel deploy --prod with training@sheetomatic.in");
process.exit(0);
