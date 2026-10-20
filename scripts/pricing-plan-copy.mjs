import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

const replacements = [
  [
    "- Starter ₹4,999/month: FMS, Checklists, Task Delegation, EM, MIS Score, PC Jobs.",
    "- Starter ₹4,999/month: FMS, Checklists, Task Management & Delegation, EM, MIS Score, PC Jobs.",
  ],
  [
    "- Enterprise ₹9,999/month: everything in Scale plus HRMS, IMS / Stock, Task Management, Reports.",
    "- Enterprise ₹9,999/month: everything in Scale plus HRMS, IMS / Stock, Field Executive Tracking, Conveyance Expenses and Payment Systems.\n- Task Management and Task Delegation are the same feature, included from Starter and inherited by higher plans. Reports are part of every included module, not an Enterprise-only upgrade. Conveyance means travel/conveyance expenses. Confirm field tracking, conveyance and payment setup requirements in the demo; do not invent technical capabilities or payment-processing charges.",
  ],
];

export function updatePlanGuidance(source) {
  let updated = source;
  for (const [before, after] of replacements) {
    if (updated.includes(after)) continue;
    if (updated.split(before).length !== 2) throw new Error("Pricing guidance changed; review production source before replacing");
    updated = updated.replace(before, after);
  }
  return updated;
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const path = "src/lib/site-assistant/knowledge.ts";
  const source = await readFile(path, "utf8");
  const updated = updatePlanGuidance(source);
  if (source !== updated) await writeFile(path, updated);
  console.log("Updated only task, reports and Enterprise pricing guidance; preserved other assistant knowledge.");
}
