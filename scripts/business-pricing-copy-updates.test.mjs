import { strict as assert } from "node:assert";
import { test } from "node:test";
import { updateMarketingCopy } from "./business-pricing-copy-updates.mjs";

test("brand edits preserve unrelated source and internal identifiers", () => {
  const source = 'const title = "BCI Suite";\nconst plan = "bci_starter";\n// newer production change';
  const result = updateMarketingCopy("src/app/site-content.ts", source);
  assert.equal(result, 'const title = "Business Systems Suite";\nconst plan = "bci_starter";\n// newer production change');
  assert.equal(updateMarketingCopy("src/app/site-content.ts", result), result);
});

test("only the superseded offer is removed from the separate product component", () => {
  const source = 'or {formatInr(plan.annualInr)}/year\n          <span> · 2 months free</span>\n{/* another product */}';
  assert.equal(updateMarketingCopy("src/components/marketing/wa-product-sections.tsx", source),
    'or {formatInr(plan.annualInr)}/year\n{/* another product */}');
});

test("site guide pricing is updated without replacing other knowledge", () => {
  const source = 'COURSES: existing courses stay\nPRICING (Workspace — /pricing):\n- old prices\n\nCONTACT / BUY:\n- existing contact flow';
  const result = updateMarketingCopy("src/lib/site-assistant/knowledge.ts", source);
  assert(result.startsWith('COURSES: existing courses stay\n'));
  assert(result.endsWith('CONTACT / BUY:\n- existing contact flow'));
  assert(result.includes('Starter ₹4,999/month'));
  assert(result.includes('Scale ₹6,999/month'));
  assert(result.includes('Enterprise ₹9,999/month'));
  assert(result.includes('Setup is included and handled by Sheetomatic. GST is extra.'));
  assert.equal(updateMarketingCopy("src/lib/site-assistant/knowledge.ts", result), result);
});

test("unexpected source structure and billing paths fail closed", () => {
  assert.throws(() => updateMarketingCopy("src/lib/site-assistant/knowledge.ts", "unexpected content"));
  assert.throws(() => updateMarketingCopy("src/lib/billing/catalog.ts", "BCI Suite"));
});
