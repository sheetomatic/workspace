import { strict as assert } from "node:assert";
import { test } from "node:test";
import { readFileSync } from "node:fs";
import { updatePlanGuidance } from "./pricing-plan-copy.mjs";

const previous = "Newer production content remains\n- Starter ₹4,999/month: FMS, Checklists, Task Delegation, EM, MIS Score, PC Jobs.\n- Scale ₹6,999/month: everything in Starter plus CRM.\n- Enterprise ₹9,999/month: everything in Scale plus HRMS, IMS / Stock, Task Management, Reports.\nUnrelated footer remains";

test("updates only the relevant pricing statements and preserves other content", () => {
  const updated = updatePlanGuidance(previous);
  assert(updated.startsWith("Newer production content remains\n"));
  assert(updated.endsWith("\nUnrelated footer remains"));
  assert(updated.includes("- Scale ₹6,999/month: everything in Starter plus CRM."));
  assert(updated.includes("Task Management & Delegation"));
  assert(updated.includes("Field Executive Tracking, Conveyance Expenses and Payment Systems"));
  assert(updated.includes("Reports are part of every included module"));
  assert(!updated.includes("IMS / Stock, Task Management, Reports"));
});

test("is idempotent and the tracked assistant knowledge is already up to date", () => {
  const updated = updatePlanGuidance(previous);
  assert.equal(updatePlanGuidance(updated), updated);
  const tracked = readFileSync(new URL("../src/lib/site-assistant/knowledge.ts", import.meta.url), "utf8");
  assert.equal(updatePlanGuidance(tracked), tracked);
});

test("unexpected or duplicated old source fails closed", () => {
  assert.throws(() => updatePlanGuidance("Different plans"));
  assert.throws(() => updatePlanGuidance(previous + previous));
});
