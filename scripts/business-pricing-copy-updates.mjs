import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

// Copy-only edits to existing files preserve production changes absent from Git.
export const marketingCopyPaths = [
  "src/app/site-content.ts",
  "src/app/layout.tsx",
  "src/app/page.tsx",
  "src/app/about/page.tsx",
  "src/app/page-content.ts",
  "src/app/video-content.ts",
  "src/components/marketing/bci-framework-section.tsx",
  "src/components/marketing/wa-product-sections.tsx",
  "src/lib/site-assistant/knowledge.ts",
];

export function updateMarketingCopy(path, source) {
  if (!marketingCopyPaths.includes(path)) throw new Error("Unapproved marketing path");
  if (path === "src/lib/site-assistant/knowledge.ts") {
    const pricingSection = /PRICING \(Workspace — \/pricing\):[\s\S]*?(?=\nCONTACT \/ BUY:)/;
    if (!pricingSection.test(source)) throw new Error("Site guide pricing section needs review");
    return source
      .replace("EM Ready owner operations platform for Indian SMEs (BCI/CEOITBOX-style language).", "Business Systems Suite for Indian SMEs.")
      .replace("- BCI vocabulary:", "- Module terminology:")
      .replaceAll("BCI Suite", "Business Systems Suite")
      .replace(pricingSection, `PRICING (Workspace — /pricing):
- Ready-to-use business systems. We handle the setup. Business Systems Suite is Sheetomatic's public product name.
- Monthly plans. No yearly commitment. Do not advertise annual offers or two months free for these plans.
- Starter ₹4,999/month: FMS, Checklists, Task Delegation, EM, MIS Score, PC Jobs.
- Scale ₹6,999/month: everything in Starter plus CRM. Recommended; do not call it Most Popular.
- Enterprise ₹9,999/month: everything in Scale plus HRMS, IMS / Stock, Task Management, Reports.
- A 3-day trial is available. Do not describe it as free or say no credit card is required. Trial details are confirmed on enquiry.
- Setup is included and handled by Sheetomatic. GST is extra. Optional customization and integrations are scoped and quoted separately. /terms/services applies to additional professional services, not subscription or trial terms. Do not invent subscription cancellation or refund terms.
- Trial and demo CTAs on /pricing open the existing WhatsApp enquiry with the selected plan and monthly price. Opening a link does not activate a trial or subscription.
- Optional add-ons in the existing catalogue: WhatsApp API and additional storage. These are not included in the listed subscriptions. Enquire for availability, scope and pricing; WhatsApp API details: /whatsapp-plans.
- The feature comparison on /pricing shows inclusions in the three plans. Do not invent user limits, unlimited usage, tax changes or support guarantees.
- Sheetomatic AI (WhatsApp chatbot) pricing is separate at /ai/pricing. Do not mix it with Business Systems Suite pricing.
`)
      .replace("partnerships with BCI, or JoyzAI claims.", "partnerships, or JoyzAI claims. Do not imply affiliation with or endorsement by BCI or Rahul Jain.");
  }
  if (path.endsWith("wa-product-sections.tsx")) {
    return source
      .replace(/^[ \t]*<span>\s*·\s*2 months free\s*<\/span>[ \t]*\r?\n/gm, "")
      .replace(/<span>\s*·\s*2 months free\s*<\/span>/g, "");
  }
  return source
    .replaceAll(" | BCI\"", "\"")
    .replaceAll("BCI Suite", "Business Systems Suite")
    .replace(/\bBCI\b/g, "Business Systems Suite")
    .replaceAll("Business Control & Intelligence", "Business Systems Suite")
    .replaceAll("Business Control &amp; Intelligence", "Business Systems Suite")
    .replaceAll("Business Control and Intelligence", "Business Systems Suite")
    .replaceAll("Business Systems Suite: Business Systems Suite", "Business Systems Suite")
    .replaceAll('"Business Systems Suite",\n    "Business Systems Suite",', '"Business Systems Suite",\n    "ready-to-use business software",')
    .replaceAll("See Suite vs module pricing on /pricing.", "See monthly plan pricing on /pricing.");
}

export async function applyMarketingCopyUpdates(root = process.cwd()) {
  const updates = await Promise.all(marketingCopyPaths.map(async (path) => {
    const absolutePath = resolve(root, path);
    const source = await readFile(absolutePath, "utf8");
    return { absolutePath, source, updated: updateMarketingCopy(path, source) };
  }));
  for (const { absolutePath, source, updated } of updates) {
    if (source !== updated) await writeFile(absolutePath, updated);
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  await applyMarketingCopyUpdates();
  console.log("Updated the approved public marketing copy.");
}
