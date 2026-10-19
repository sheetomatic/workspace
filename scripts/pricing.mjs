/** Build the existing production snapshot with only the reviewed pricing fix. */
import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import { spawnSync } from "node:child_process";

const revision = "ba5e4d7bae6fea1528ca27f43cd6a23736d43faf";
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
    after: "6a7a29c61e26f3e655bf8addacab24c2554a2a28db099e74a9ce6e5df148c7c3",
  },
  {
    path: "src/lib/content/business-systems-pricing.ts",
    before: "0ef6cf688133159862d85e9b196cf732f653cc5bd83e8cb4c3a7707014d31133",
    after: "e2a0f9a2eb3ebb9d0dce463622e010747054d485c8e7c30ef436bae0193421fa",
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
  "56b2b66586ea3aab1fb73b73fe449302be09546c78fa1a1ced90d5c0deb7dbae",
));
console.log("Applied pricing-only fix; retained production Courses and client-access updates.");
run("npx", ["vitest", "run", "src/lib/content/business-systems-pricing.test.ts"]);
run("npm", ["run", "db:generate"]);
run("npx", ["next", "build"]);
// Deliberately no migrate, seed, db execute, or npm run build.
