/**
 * Apply the reviewed Courses restoration to an existing deployment snapshot.
 * Production contains changes beyond the Git checkout; this bridge updates only
 * these four files. Normal builds from the restored source do not need this step.
 */
import { createHash } from "node:crypto";
import { access, writeFile } from "node:fs/promises";

const revision = "cb7ae1608c94d5ba9fc235e0c3cca386d92b5198";
const files = {
  "src/app/courses-content.ts":
    "816bad0b3c5924f2cd959dd7a47e1caf37a872b43eebd21c30de4b662c7a235f",
  "src/app/courses/page.tsx":
    "efb2012771041e78401c9f275345fd96b46d407b87be41033e49bec492dfc22e",
  "src/components/marketing/courses-page-content.tsx":
    "dd9cb24c8361f83004b248b623e00da735709ac240e0babd5893c26742b92c80",
  "src/components/marketing/courses-page.css":
    "7475534c904c5fb74341e6e3c588c00c3feedf64d5c567fd6d85e45071685361",
};

// Validate every download and destination before changing the build workspace.
const replacements = await Promise.all(
  Object.entries(files).map(async ([path, expectedHash]) => {
    await access(path);
    const response = await fetch(
      `https://raw.githubusercontent.com/sheetomatic/workspace/${revision}/${path}`,
      { redirect: "error", signal: AbortSignal.timeout(30_000) },
    );
    if (!response.ok) {
      throw new Error(`Could not load ${path}: HTTP ${response.status}`);
    }
    const content = Buffer.from(await response.arrayBuffer());
    const hash = createHash("sha256").update(content).digest("hex");
    if (hash !== expectedHash) {
      throw new Error(`Restoration checksum mismatch: ${path}`);
    }
    return { path, content };
  }),
);

for (const { path, content } of replacements) {
  await writeFile(path, content);
}

console.log(`Restored ${replacements.length} Courses files from ${revision}.`);
