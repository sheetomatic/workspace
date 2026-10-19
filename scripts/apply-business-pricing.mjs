/**
 * Apply reviewed marketing changes to the current production source snapshot.
 * Production has changes absent from Git; never replace that whole snapshot.
 * Courses files preserve the restoration applied during the previous build.
 */
import { createHash } from "node:crypto";
import { access, mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { pathToFileURL } from "node:url";

const revision = "a42bf9002766ca739621a6d963bfdf5f93656692";
const files = [
  {
    "path": "src/app/pricing/page.tsx",
    "sha256": "8bdccf4009e017073742d0ad44b418b3f950b73cbd22714fc330012eecc82aea",
    "newFile": false
  },
  {
    "path": "src/components/marketing/em-ready-pricing.tsx",
    "sha256": "404f0de15dc917643060558c271bdcf75b189e1e48fa15a78721534c8dd9cf3f",
    "newFile": false
  },
  {
    "path": "src/components/marketing/business-systems-pricing.css",
    "sha256": "25d29000c5f092c183c56abb0effccf77c1f877c90acf05b97121b5d97dc1729",
    "newFile": true
  },
  {
    "path": "src/lib/content/business-systems-pricing.ts",
    "sha256": "0ef6cf688133159862d85e9b196cf732f653cc5bd83e8cb4c3a7707014d31133",
    "newFile": true
  },
  {
    "path": "scripts/business-pricing-copy-updates.mjs",
    "sha256": "6b058164f123869b34e8be9e8d974d10d75cf16a4a65d719c0f24f36aac9a935",
    "newFile": true
  },
  {
    "path": "src/app/courses-content.ts",
    "sha256": "816bad0b3c5924f2cd959dd7a47e1caf37a872b43eebd21c30de4b662c7a235f",
    "newFile": false
  },
  {
    "path": "src/app/courses/page.tsx",
    "sha256": "efb2012771041e78401c9f275345fd96b46d407b87be41033e49bec492dfc22e",
    "newFile": false
  },
  {
    "path": "src/components/marketing/courses-page-content.tsx",
    "sha256": "dd9cb24c8361f83004b248b623e00da735709ac240e0babd5893c26742b92c80",
    "newFile": false
  },
  {
    "path": "src/components/marketing/courses-page.css",
    "sha256": "7475534c904c5fb74341e6e3c588c00c3feedf64d5c567fd6d85e45071685361",
    "newFile": false
  }
];

const pkg = JSON.parse(await readFile("package.json", "utf8"));
if (pkg.name !== "sheetomatic") throw new Error("Unexpected deployment project");

const replacements = await Promise.all(files.map(async ({path, sha256, newFile}) => {
  if (!newFile) await access(path);
  const response = await fetch(
    `https://raw.githubusercontent.com/sheetomatic/workspace/${revision}/${path}`,
    { redirect: "error", signal: AbortSignal.timeout(30_000) },
  );
  if (!response.ok) throw new Error(`Could not load reviewed file: ${path}`);
  const content = Buffer.from(await response.arrayBuffer());
  if (createHash("sha256").update(content).digest("hex") !== sha256) {
    throw new Error(`Checksum mismatch: ${path}`);
  }
  return {path, content};
}));

for (const {path, content} of replacements) {
  await mkdir(dirname(path), {recursive: true});
  await writeFile(path, content);
}
const { applyMarketingCopyUpdates } = await import(
  pathToFileURL(resolve("scripts/business-pricing-copy-updates.mjs")).href
);
await applyMarketingCopyUpdates();
console.log("Applied reviewed monthly pricing and preserved the Courses restoration.");
