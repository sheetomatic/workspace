/** Generate the scoped release allowlist and source-integrity guards. */
import { readFileSync, writeFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
const sha = bytes => createHash("sha256").update(bytes).digest("hex");
const changed = execFileSync("git", ["diff", "--name-only", "031c376"], { encoding: "utf8" }).trim().split("\n");
const added = execFileSync("git", ["ls-files", "--others", "--exclude-standard"], { encoding: "utf8" }).trim().split("\n");
const paths = [...new Set([...changed, ...added])].filter(p => (p.startsWith("src/") && !p.endsWith(".integration.test.ts")) || p === "prisma/schema.prisma");
paths.push("scripts/shop.mjs", "scripts/template-migrate.mjs", "prisma/migrations/20261020060000_template_checkout/migration.sql", "prisma/migrations/20261020120000_template_hosted_checkout/migration.sql");
const manifest = paths.sort().map(path => {
 let before;
 try { before = sha(execFileSync("git", ["show", `031c376:${path}`], { stdio: ["ignore", "pipe", "ignore"] })); } catch { /* New file. */ }
 return { path, sha256: sha(readFileSync(path)), ...(before ? { before } : {}) };
});
writeFileSync("scripts/hosted-release-files.json", JSON.stringify(manifest, null, 2) + "\n");
console.log(`Generated ${manifest.length} reviewed files.`);
