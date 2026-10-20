/** Build the existing production snapshot with only the reviewed pricing fix. */
import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import { spawnSync } from "node:child_process";

const revision = "66306d6ff0b29d00c414c8f35b0692ee9fdfb074";
const sha256 = (bytes) => createHash("sha256").update(bytes).digest("hex");
const files = [
  {
    path: "src/components/marketing/business-systems-pricing.css",
    before: "a846fabfb2a29b7c7399d6cf2b49c4711cf7dcf24ed3693dd75c460c9412b5c5",
    after: "1744c4e99d011490bababc9e9df4b8b7eb435aab022412d59fa0508a7b1a094a",
  },
  {
    path: "src/components/marketing/em-ready-pricing.tsx",
    before: "97e3edb9fb6bb4e02eebb9d4b1f615e094e6ad01da72383fe20804a821df5860",
    after: "b5ddf5f4a880184479829a0a1d6e67621002d70def0e0f1f77000b0e8692d091",
  },
  {
    path: "src/lib/content/business-systems-pricing.ts",
    before: "0ef6cf688133159862d85e9b196cf732f653cc5bd83e8cb4c3a7707014d31133",
    after: "576e57c989acf04cd5b53560d06decf617be9157399d5dd2b1bcae9d302c69ca",
  },
];

async function reviewedFile(commit, path, hash) {
  const response = await fetch(`https://raw.githubusercontent.com/sheetomatic/workspace/${commit}/${path}`, {
    redirect: "error", signal: AbortSignal.timeout(30_000),
  });
  if (!response.ok) throw new Error(`Unable to fetch reviewed ${path}`);
  const bytes = Buffer.from(await response.arrayBuffer());
  if (sha256(bytes) !== hash) throw new Error(`Checksum mismatch: ${path}`);
  return bytes;
}

function run(command, args) {
  const result = spawnSync(command, args, { stdio: "inherit" });
  if (result.status !== 0) throw new Error(`Release step failed: ${command} ${args.join(" ")}`);
}

if (JSON.parse(await readFile("package.json", "utf8")).name !== "sheetomatic") {
  throw new Error("Wrong deployment project");
}

// Reconstruct the exact preparation chain used by the current production build.
// --prepare-only skips both its build and its already-applied client migration.
await writeFile("/tmp/preserve-courses.mjs", await reviewedFile(
  "b8ac1954fecf5434318de4ebb4ec7c269992bee9", "scripts/build-courses-polish.mjs",
  "a0d32a4c05cb304afb1a7dabce9ca85dffa6123b7ee0e9b58d5bfa2a2420221b",
));
run(process.execPath, ["/tmp/preserve-courses.mjs", "--prepare-only"]);

// Fail closed if any target changed since the reviewed pricing release.
const replacements = await Promise.all(files.map(async (file) => {
  if (sha256(await readFile(file.path)) !== file.before) {
    throw new Error(`Production pricing source changed: ${file.path}`);
  }
  return { ...file, bytes: await reviewedFile(revision, file.path, file.after) };
}));
for (const file of replacements) await writeFile(file.path, file.bytes);
await writeFile("src/lib/content/business-systems-pricing.test.ts", await reviewedFile(
  revision, "src/lib/content/business-systems-pricing.test.ts",
  "daac8521cdb71859bf85b2920ec56136577666c704c782aea107bf379f040f18",
));
await writeFile("/tmp/pricing-plan-copy.mjs", await reviewedFile(
  revision, "scripts/pricing-plan-copy.mjs",
  "eeb03d38e0820cfc9808c171a091f9459a2563449c152f962114ee395accf25c",
));
run(process.execPath, ["/tmp/pricing-plan-copy.mjs"]);
console.log("Applied pricing-only fix; retained production Courses and client-access updates.");
run("npx", ["vitest", "run", "src/lib/content/business-systems-pricing.test.ts"]);
if (!process.argv.includes("--prepare-only")) {
  run("npm", ["run", "db:generate"]);
  run("npx", ["next", "build"]);
}
// Deliberately no migrate, seed, db execute, or npm run build.
