/** Reconstruct the verified production snapshot, then apply the reviewed hosted-checkout release. */
import { createHash } from "node:crypto";
import { readFile, writeFile, mkdir, access } from "node:fs/promises";
import { dirname } from "node:path";
import { spawnSync } from "node:child_process";
const revision = "9fe69dd47afe56883af6c637cf6d993452183de6";
const digest = bytes => createHash("sha256").update(bytes).digest("hex");
async function reviewed(path, expected) {
  const r = await fetch(`https://raw.githubusercontent.com/sheetomatic/workspace/${revision}/${path}`, { redirect: "error", signal: AbortSignal.timeout(30000) });
  if (!r.ok) throw new Error(`Cannot fetch reviewed source: ${path}`);
  const bytes = Buffer.from(await r.arrayBuffer());
  if (digest(bytes) !== expected) throw new Error(`Source checksum mismatch: ${path}`);
  return bytes;
}
function run(command, args) {
  const r = spawnSync(command, args, { stdio: "inherit" });
  if (r.status !== 0) throw new Error(`Release step failed: ${command}`);
}
async function exists(path) {
  try { await access(path); return true; } catch(e) { if (e.code === "ENOENT") return false; throw e; }
}
if (JSON.parse(await readFile("package.json", "utf8")).name !== "sheetomatic") throw new Error("Wrong project");
const manifest = JSON.parse(await reviewed("scripts/hosted-release-files.json", "e2898662423d1ac61e80704b16f266dadadaf0830bcee0f47e156964966aad66"));
const prepared = await Promise.all(manifest.map(async f => ({ ...f, bytes: await reviewed(f.path, f.sha256) })));
await writeFile("/tmp/preserve-template-shop.mjs", prepared.find(f => f.path === "scripts/shop.mjs").bytes);
run(process.execPath, ["/tmp/preserve-template-shop.mjs", "--prepare-only"]);
for (const f of prepared.filter(f => f.path.startsWith("src/"))) {
  if (f.before) {
    if (digest(await readFile(f.path)) !== f.before) throw new Error(`Live source changed: ${f.path}`);
  } else if (await exists(f.path)) throw new Error(`Unexpected existing file: ${f.path}`);
}
const schema = await readFile("prisma/schema.prisma", "utf8");
const modelPattern = /model TemplateCheckout \{[\s\S]*?\n\}/;
const originalModel = schema.match(modelPattern)?.[0];
if (!originalModel || digest(originalModel) !== "1b3045d2dcf4ab717d235ae60cc242b62a280d31f32b403350545eb5e31944ff") throw new Error("Checkout model changed since reviewed source");
const model = prepared.find(f => f.path === "prisma/schema.prisma").bytes.toString().match(modelPattern)?.[0];
if (!model) throw new Error("New checkout schema missing");
for (const f of prepared.filter(f => f.path.startsWith("prisma/migrations/"))) {
  if (await exists(f.path) && digest(await readFile(f.path)) !== f.sha256) throw new Error(`Migration file conflict: ${f.path}`);
}
for (const f of prepared.filter(f => f.path.startsWith("src/") || f.path.startsWith("prisma/migrations/") || f.path === "scripts/template-migrate.mjs")) {
  await mkdir(dirname(f.path), { recursive: true });
  await writeFile(f.path, f.bytes);
}
await writeFile("prisma/schema.prisma", schema.replace(modelPattern, model));
run("npm", ["run", "db:generate"]);
run(process.execPath, ["scripts/template-migrate.mjs"]); // Identity + pending migration checks, read only.
run("npx", ["vitest", "run", "src/lib/templates/commerce.test.ts", "src/lib/payments/razorpay-me.test.ts"]);
run("npx", ["next", "build"]);
// Only after the build succeeds: two reviewed, additive, transactionally tracked migrations.
run(process.execPath, ["scripts/template-migrate.mjs", "--apply"]);
console.log("Hosted template release built; Courses, pricing and existing tenant data preserved.");
