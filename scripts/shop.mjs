/** Preserve the verified live snapshot and add the gated template storefront. No DB writes. */
import { createHash } from "node:crypto";
import { readFile, writeFile, mkdir, access } from "node:fs/promises";
import { dirname } from "node:path";
import { spawnSync } from "node:child_process";

const revision = "4cdd1b6e4ffe51aefcb0c2b7cff9e1075cf36376";
const digest = bytes => createHash("sha256").update(bytes).digest("hex");
async function reviewedAt(sourceRevision, path, expected) {
  const r = await fetch(`https://raw.githubusercontent.com/sheetomatic/workspace/${sourceRevision}/${path}`, { redirect: "error", signal: AbortSignal.timeout(30000) });
  if (!r.ok) throw new Error(`Cannot fetch reviewed source: ${path}`);
  const bytes = Buffer.from(await r.arrayBuffer());
  if (digest(bytes) !== expected) throw new Error(`Source checksum mismatch: ${path}`);
  return bytes;
}
const reviewed = (path, expected) => reviewedAt(revision, path, expected);
function run(command, args) {
  const r = spawnSync(command, args, { stdio: "inherit" });
  if (r.status !== 0) throw new Error(`Release step failed: ${command}`);
}
if (JSON.parse(await readFile("package.json", "utf8")).name !== "sheetomatic") throw new Error("Wrong project");
if (process.env.TEMPLATE_CHECKOUT_ENABLED === "true") throw new Error("This rollout requires checkout disabled until migration and real gateway tests are verified");
const manifest = JSON.parse(await reviewed("scripts/template-release-files.json", "0aa97f9294424d752b051da0213a198cd6fb62b4f046d15893b048b627a874d1"));
const prepared = await Promise.all(manifest.map(async f => ({ ...f, bytes: await reviewed(f.path, f.sha256) })));
await writeFile("/tmp/preserve-pricing.mjs", prepared.find(f => f.path === "scripts/pricing.mjs").bytes);
run(process.execPath, ["/tmp/preserve-pricing.mjs", "--prepare-only"]);

for (const f of prepared.filter(f => f.path.startsWith("src/"))) {
  if (f.before) {
    if (digest(await readFile(f.path)) !== f.before) throw new Error(`Live source changed: ${f.path}`);
  } else {
    let exists = true;
    try { await access(f.path); } catch (e) { if (e.code === "ENOENT") exists = false; else throw e; }
    if (exists) throw new Error(`Unexpected existing file: ${f.path}`);
  }
}
const schema = await readFile("prisma/schema.prisma", "utf8");
const addition = prepared.find(f => f.path === "prisma/schema.prisma").bytes.toString();
const models = ["TemplateCheckout", "TemplateInvoiceCounter"].map(name => {
  if (schema.includes(`model ${name} {`)) throw new Error(`Existing schema model: ${name}`);
  const model = addition.match(new RegExp(`model ${name} \\{[\\s\\S]*?\\n\\}`))?.[0];
  if (!model) throw new Error(`Reviewed schema model missing: ${name}`);
  return model;
});
for (const f of prepared.filter(f => f.path.startsWith("src/"))) {
  await mkdir(dirname(f.path), { recursive: true });
  await writeFile(f.path, f.bytes);
}
await writeFile("prisma/schema.prisma", `${schema}\n\n${models.join("\n\n")}\n`);

// Optional, checksum-gated legal-page overlay. The deployment command supplies
// the reviewed commit; ordinary template releases retain their previous scope.
const privacyRevision = process.env.PRIVACY_RELEASE_REVISION?.trim();
if (privacyRevision) {
  const privacyPath = "src/app/privacy/page.tsx";
  let privacyExists = true;
  try { await access(privacyPath); } catch (e) { if (e.code === "ENOENT") privacyExists = false; else throw e; }
  if (privacyExists) throw new Error(`Unexpected existing file: ${privacyPath}`);
  const privacyPage = await reviewedAt(
    privacyRevision,
    privacyPath,
    "d5cf3eb793bb4ef5b64d68e7f3e933a554d69349c75304ad3a1c5c4877d7d1a3",
  );
  await mkdir(dirname(privacyPath), { recursive: true });
  await writeFile(privacyPath, privacyPage);

  const legalNavBefore = `          <nav aria-label="Legal" className="site-footer-legal-links">\n            <Link href="/terms">Terms &amp; Conditions</Link>\n          </nav>`;
  const legalNavAfter = `          <nav aria-label="Legal" className="site-footer-legal-links">\n            <Link href="/privacy">Privacy Policy</Link>\n            <Link href="/terms">Terms &amp; Conditions</Link>\n          </nav>`;
  for (const path of [
    "src/app/components.tsx",
    "src/components/marketing/ai-site-chrome.tsx",
  ]) {
    const source = await readFile(path, "utf8");
    const occurrences = source.split(legalNavBefore).length - 1;
    if (occurrences !== 1) throw new Error(`Unexpected legal nav source: ${path}`);
    await writeFile(path, source.replace(legalNavBefore, legalNavAfter));
  }
}
run("npm", ["run", "db:generate"]);
run("npx", ["vitest", "run", "src/lib/templates/commerce.test.ts"]);
run("npx", ["next", "build"]);
// No migrations, seeding, credential changes, gateway writes or customer messages.
