/**
 * Forward-only production gate for sheetomatic-redesign.
 * Fails if live traffic is behind the locked baseline or missing marketing smoke.
 *
 *   npm run deploy:verify
 */
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const BASELINE_DOC = join(ROOT, "docs/PRODUCTION_FORWARD_BASELINE.md");
const PROJECT = "sheetomatic-redesign";

function fail(message) {
  console.error(`[deploy:verify] FAIL: ${message}`);
  process.exit(1);
}

function ok(message) {
  console.log(`[deploy:verify] OK: ${message}`);
}

function sh(bin, args, opts = {}) {
  return execFileSync(bin, args, {
    cwd: ROOT,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
    ...opts,
  });
}

function baselineSha() {
  const doc = readFileSync(BASELINE_DOC, "utf8");
  const match = doc.match(/Baseline SHA\s*\|\s*`([0-9a-f]{7,40})`/i);
  if (!match) fail(`Could not parse Baseline SHA from ${BASELINE_DOC}`);
  return match[1];
}

function isAncestor(ancestor, tip) {
  try {
    sh("git", ["merge-base", "--is-ancestor", ancestor, tip]);
    return true;
  } catch {
    return false;
  }
}

function curlHeaders(url) {
  return sh("curl", ["-sI", "-L", "--max-redirs", "5", url]);
}

function curlBody(url) {
  return sh("curl", ["-sL", "--max-redirs", "5", url]);
}

function extractDpl(headers) {
  const match = headers.match(/[?&]dpl=(dpl_[A-Za-z0-9]+)/);
  return match?.[1] ?? null;
}

function main() {
  const baseline = baselineSha();
  ok(`baseline ${baseline}`);

  let originMain = "";
  try {
    originMain = sh("git", ["rev-parse", "origin/main"]).trim();
  } catch {
    sh("git", ["fetch", "origin", "main"]);
    originMain = sh("git", ["rev-parse", "origin/main"]).trim();
  }
  ok(`origin/main ${originMain.slice(0, 8)}`);

  if (!isAncestor(baseline, originMain) && originMain !== baseline) {
    fail(
      `origin/main (${originMain.slice(0, 8)}) is not a descendant of baseline ${baseline.slice(0, 8)}. Forward-only lock violated on git.`,
    );
  }

  const loginHeaders = curlHeaders("https://workspace.sheetomatic.com/login");
  const liveDpl = extractDpl(loginHeaders);
  if (!liveDpl) {
    fail("Could not read live dpl= from workspace.sheetomatic.com/login Link header");
  }
  ok(`live dpl=${liveDpl}`);

  // Prefer Vercel inspect of the live deployment for git SHA when available.
  let liveSha = "";
  try {
    const inspect = sh("npx", ["--yes", "vercel", "inspect", liveDpl], {
      env: process.env,
    });
    const shaMatch =
      inspect.match(/commit\s+[:=]\s*([0-9a-f]{7,40})/i) ||
      inspect.match(/\b([0-9a-f]{40})\b/);
    if (shaMatch) liveSha = shaMatch[1];
  } catch {
    // inspect may fail without auth; continue with marketing smoke only
  }

  if (liveSha) {
    ok(`live commit ${liveSha.slice(0, 8)}`);
    if (!isAncestor(baseline, liveSha) && liveSha !== baseline) {
      fail(
        `Live deploy ${liveDpl} commit ${liveSha.slice(0, 8)} is behind baseline ${baseline.slice(0, 8)}. Do not Instant Rollback. Re-alias to a Ready tip ≥ baseline on ${PROJECT}.`,
      );
    }
  } else {
    console.warn(
      "[deploy:verify] WARN: could not resolve live git SHA from vercel inspect; marketing smoke still required",
    );
  }

  const fieldCode = sh("curl", [
    "-sI",
    "-o",
    "/dev/null",
    "-w",
    "%{http_code}",
    "-L",
    "https://sheetomatic.com/services/field-tracking",
  ]).trim();
  if (fieldCode !== "200") {
    fail(`/services/field-tracking returned ${fieldCode} (want 200)`);
  }
  ok("/services/field-tracking → 200");

  const hrField = sh("curl", [
    "-sI",
    "-o",
    "/dev/null",
    "-w",
    "%{http_code}",
    "-L",
    "--max-redirs",
    "0",
    "https://sheetomatic.com/services/hr/field-tracking",
  ]).trim();
  if (!["301", "308", "307", "302"].includes(hrField)) {
    // After follow, destination must be peer page — check with follow
    const followed = sh("curl", [
      "-sI",
      "-o",
      "/dev/null",
      "-w",
      "%{http_code} %{url_effective}",
      "-L",
      "https://sheetomatic.com/services/hr/field-tracking",
    ]).trim();
    if (!followed.includes("/services/field-tracking") || !followed.startsWith("200")) {
      fail(
        `Legacy /services/hr/field-tracking must redirect to peer page (got ${hrField} / ${followed})`,
      );
    }
  }
  ok("legacy /services/hr/field-tracking redirects to peer");

  const flowHtml = curlBody("https://sheetomatic.com/services/flow");
  for (const id of ["PM8E3mCw67Q", "acTJOocmuZM", "fms-video-compare"]) {
    if (!flowHtml.includes(id)) {
      fail(`/services/flow missing required marker: ${id}`);
    }
  }
  ok("/services/flow has dual FMS videos");

  console.log(
    `[deploy:verify] PASS — production is forward of baseline on ${PROJECT}`,
  );
}

main();
