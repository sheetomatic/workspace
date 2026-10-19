/** Preserve the current deployment source and apply the reviewed Courses update. */
import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import { spawnSync } from "node:child_process";

if (JSON.parse(await readFile("package.json", "utf8")).name !== "sheetomatic") {
  throw new Error("Wrong deployment project");
}

async function reviewedFile(commit, path, hash, destination) {
  const response = await fetch(`https://raw.githubusercontent.com/sheetomatic/workspace/${commit}/${path}`, {
    redirect: "error", signal: AbortSignal.timeout(30_000),
  });
  if (!response.ok) throw new Error(`Unable to fetch reviewed ${path}`);
  const bytes = Buffer.from(await response.arrayBuffer());
  if (createHash("sha256").update(bytes).digest("hex") !== hash) {
    throw new Error(`Checksum mismatch: ${path}`);
  }
  await writeFile(destination, bytes);
}

function run(command, args) {
  const result = spawnSync(command, args, { stdio: "inherit" });
  if (result.status !== 0) throw new Error(`Release step failed: ${command} ${args.join(" ")}`);
}

await reviewedFile("a967bd7bf1a42d66ee60d5d95326457130a17071", "scripts/build-client-module-access.mjs",
  "e38f343b08824d2d5c6b5da782f8b03fa581320cac7d217dadfd7ed4cef81668", "/tmp/preserve-client-access.mjs");
await reviewedFile("127d802d1f14ebc6ffdccdc8dde073eb89f5d23e", "scripts/courses-polish.patch",
  "c4ea74b92ce255abed60fe7bcc22c399d2a0dacf46c3ce5cca20eca397638aa6", "/tmp/courses-polish.patch");

// Earlier releases patched source during the build. Retain those changes first.
// --prepare-only does not execute the already-applied client access migration.
run(process.execPath, ["/tmp/preserve-client-access.mjs", "--prepare-only"]);
run("git", ["apply", "--check", "--ignore-whitespace", "/tmp/courses-polish.patch"]);
run("git", ["apply", "--ignore-whitespace", "--whitespace=nowarn", "/tmp/courses-polish.patch"]);
console.log("Applied reviewed Courses copy and expandable layout; preserved pricing and client access.");

if (!process.argv.includes("--prepare-only")) {
  run("npm", ["run", "db:generate"]);
  run("npx", ["next", "build"]);
}
