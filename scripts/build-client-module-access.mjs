/** Patch the current deployment snapshot; preserve its newer unrelated source. */
import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import { spawnSync } from "node:child_process";

const revision = "e70d52962377f5d4fbf1266a54342aa6ee617738";
const migration = "prisma/migrations/20261019120000_explicit_client_access/migration.sql";
if (JSON.parse(await readFile("package.json", "utf8")).name !== "sheetomatic") {
  throw new Error("Wrong deployment project");
}

async function reviewedFile(commit, path, hash, destination) {
  const response = await fetch(`https://raw.githubusercontent.com/sheetomatic/workspace/${commit}/${path}`, {
    redirect: "error", signal: AbortSignal.timeout(30_000),
  });
  if (!response.ok) throw new Error(`Unable to fetch reviewed ${path}`);
  const bytes = Buffer.from(await response.arrayBuffer());
  if (createHash("sha256").update(bytes).digest("hex") !== hash) throw new Error(`Checksum mismatch: ${path}`);
  await writeFile(destination, bytes);
}

function run(command, args) {
  const result = spawnSync(command, args, { stdio: "inherit" });
  if (result.status !== 0) throw new Error(`Release step failed: ${command} ${args.join(" ")}`);
}

await reviewedFile("918caedfdfd55b284d4fe487a2d4f1d0fa0c6f73", "scripts/apply-business-pricing.mjs",
  "da94de296bc300df6900c54ce70d591b66a4ecf35f329c8ffe024c1c6c08339f", "/tmp/preserve-marketing.mjs");
await reviewedFile(revision, "scripts/client-module-access.patch",
  "c4da41239f1445c69b37916edcfc5a5dd182e4c77da92f5369607e227b250b87", "/tmp/client-module-access.patch");
run(process.execPath, ["/tmp/preserve-marketing.mjs"]);
run("git", ["apply", "--check", "--ignore-whitespace", "/tmp/client-module-access.patch"]);
run("git", ["apply", "--ignore-whitespace", "--whitespace=nowarn", "/tmp/client-module-access.patch"]);
console.log("Applied reviewed client access patch; retained the current source, pricing, and Courses.");

if (!process.argv.includes("--prepare-only")) {
  run("npm", ["run", "db:generate"]);
  run("npx", ["next", "build"]);
  if (process.argv.includes("--production")) {
    if (process.env.VERCEL_ENV !== "production") throw new Error("Production environment required for the additive migration");
    // Run only this idempotent additive migration, after the build succeeds.
    // No existing client, invoice, price, or membership rows are changed.
    run(process.execPath, ["scripts/prisma-with-env.mjs", "db", "execute", "--file", migration, "--schema", "prisma/schema.prisma"]);
    console.log("Applied client access enum values and nullable Suite access column.");
  }
}
