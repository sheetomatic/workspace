/**
 * Force customer domains onto the newest Ready Production deployment
 * of sheetomatic-redesign. Prevents Instant Rollback / stray alias moves
 * from serving an old build.
 *
 *   npm run deploy:pin
 *   npm run deploy:lock   # pin + verify
 */
import { execFileSync } from "node:child_process";

const PROJECT = "sheetomatic-redesign";
const SCOPE = "sheetomatic";
const DOMAINS = [
  "sheetomatic.com",
  "www.sheetomatic.com",
  "app.sheetomatic.com",
  "workspace.sheetomatic.com",
  "ai.sheetomatic.com",
  "learn.sheetomatic.com",
];

function run(bin, args) {
  try {
    return execFileSync(bin, args, {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    });
  } catch (error) {
    return `${error.stdout ?? ""}\n${error.stderr ?? ""}`;
  }
}

function pickTipUrl() {
  const jsonRaw = run("npx", [
    "--yes",
    "vercel",
    "ls",
    PROJECT,
    "--scope",
    SCOPE,
    "--json",
  ]);
  try {
    const start = jsonRaw.indexOf("[");
    const end = jsonRaw.lastIndexOf("]");
    if (start >= 0 && end > start) {
      const rows = JSON.parse(jsonRaw.slice(start, end + 1));
      for (const row of rows) {
        const state = String(row.readyState || row.state || "");
        const target = String(row.target || "");
        const url = String(row.url || "");
        if (state !== "READY") continue;
        if (target !== "production") continue;
        const host = url.replace(/^https?:\/\//, "");
        if (/^sheetomatic-redesign-[a-z0-9]+-sheetomatic\.vercel\.app$/.test(host)) {
          return host;
        }
      }
    }
  } catch {
    // fall through
  }

  // Text fallback: vercel prints table on stderr; newest first.
  const text = run("npx", ["--yes", "vercel", "ls", PROJECT, "--scope", SCOPE]);
  for (const line of text.split("\n")) {
    if (!line.includes("Production")) continue;
    if (!line.includes("Ready")) continue;
    if (line.includes("Canceled") || line.includes("Error") || line.includes("Blocked")) {
      continue;
    }
    const m = line.match(
      /https:\/\/(sheetomatic-redesign-[a-z0-9]+-sheetomatic\.vercel\.app)/,
    );
    if (m) return m[1];
  }
  return "";
}

function main() {
  const url = pickTipUrl();
  if (!url) {
    console.error("[deploy:pin] No Ready Production deployment found");
    process.exit(1);
  }

  console.log(`[deploy:pin] tip Ready Production -> ${url}`);
  for (const domain of DOMAINS) {
    console.log(`[deploy:pin] alias ${domain}`);
    const out = run("npx", [
      "--yes",
      "vercel",
      "alias",
      "set",
      url,
      domain,
      "--scope",
      SCOPE,
    ]);
    process.stdout.write(out);
  }
  console.log("[deploy:pin] DONE");
}

main();
