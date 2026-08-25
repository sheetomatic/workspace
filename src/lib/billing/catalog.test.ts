import { describe, expect, it } from "vitest";
import { catalogRateForPlan, catalogRateForWorkspace } from "@/lib/billing/catalog";
import { rupeesToPaise } from "@/lib/billing/money";
import { isBillingPortalPath } from "@/lib/billing/access";

describe("billing catalog", () => {
  it("maps BCI Starter to EM Ready Starter list price", () => {
    const card = catalogRateForPlan("BCI_STARTER");
    expect(card.monthlyRatePaise).toBe(rupeesToPaise(4999));
    expect(card.includedUsers).toBe(8);
    expect(card.extraUserMonthlyPaise).toBe(rupeesToPaise(599));
    expect(card.gstPercent).toBe(18);
  });

  it("bills App Builder / Tasks / HRMS / CRM from the sold workspace, not Enterprise", () => {
    expect(
      catalogRateForWorkspace({
        plan: "ENTERPRISE",
        product: "APP_BUILDER",
        allowedModules: ["APP_BUILDER"],
      }).monthlyRatePaise,
    ).toBe(rupeesToPaise(2499));
    expect(
      catalogRateForWorkspace({
        plan: "TASKS_ADDON",
        product: "TASKS",
        allowedModules: ["TASKS"],
      }).monthlyRatePaise,
    ).toBe(rupeesToPaise(2499));
    expect(
      catalogRateForWorkspace({
        plan: "ENTERPRISE",
        product: "HRMS",
        allowedModules: ["HR"],
      }).monthlyRatePaise,
    ).toBe(rupeesToPaise(10_000));
    expect(
      catalogRateForWorkspace({
        plan: "ENTERPRISE",
        product: "CRM",
        allowedModules: ["CRM"],
      }).monthlyRatePaise,
    ).toBe(rupeesToPaise(2999));
  });

  it("allows billing routes while a workspace is on hold", () => {
    expect(isBillingPortalPath("/app/billing")).toBe(true);
    expect(isBillingPortalPath("/app/billing/invoices/abc")).toBe(true);
    expect(isBillingPortalPath("/app/tasks")).toBe(false);
  });
});
