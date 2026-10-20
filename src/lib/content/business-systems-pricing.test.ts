import { describe, expect, it } from "vitest";
import {
  businessAddonsEnquiryHref,
  businessPlanEnquiryHref,
  businessModuleReportsNote,
  businessPricingFaqs,
  businessSystemAddons,
  businessSystemBenefits,
  businessSystemComparison,
  businessSystemPlans,
  formatBusinessPlanPrice,
} from "./business-systems-pricing";
import { whatsappPhone } from "@/app/site-content";

describe("Business Systems Suite marketing pricing", () => {
  it("advertises exactly the three agreed monthly prices", () => {
    expect(businessSystemPlans.map((p) => [p.name, p.monthlyPriceInr])).toEqual([
      ["Starter", 4999], ["Scale", 6999], ["Enterprise", 9999],
    ]);
    expect(businessSystemPlans.filter((p) => p.recommended).map((p) => p.id)).toEqual(["scale"]);
  });

  it("preserves the requested inclusions and plan inheritance", () => {
    expect(businessSystemPlans[0].features).toEqual(["FMS", "Checklists", "Task Management & Delegation", "EM", "MIS Score", "PC Jobs"]);
    expect(businessSystemPlans[1].includesLabel).toBe("Everything in Starter, plus");
    expect(businessSystemPlans[1].features).toEqual(["CRM"]);
    expect(businessSystemPlans[2].includesLabel).toBe("Everything in Scale, plus");
    expect(businessSystemPlans[2].features).toEqual(["HRMS", "IMS / Stock", "Field Executive Tracking", "Conveyance Expenses", "Payment Systems"]);
  });

  it("compares every card feature with its inherited plan inclusions", () => {
    const features = businessSystemPlans.flatMap((plan) => [...plan.features]);
    expect(businessSystemComparison.map((row) => row.feature)).toEqual([...features, "Reports for included modules"]);
    expect(new Set(features).size).toBe(features.length);
    for (const [index] of businessSystemPlans.entries()) {
      const inherited = businessSystemPlans.slice(0, index + 1).flatMap((plan) => [...plan.features]);
      expect(businessSystemComparison.filter((row) => row.included[index]).map((row) => row.feature)).toEqual([...inherited, "Reports for included modules"]);
    }
    expect(businessSystemComparison.find((row) => row.feature === "IMS / Stock")?.included).toEqual([false, false, true]);
    expect(businessSystemComparison.find((row) => row.feature === "FMS")?.included).toEqual([true, true, true]);
    expect(businessSystemComparison.find((row) => row.feature === "Checklists")?.included).toEqual([true, true, true]);
  });

  it("includes one task feature and module reports in every plan", () => {
    const taskRows = businessSystemComparison.filter((row) => /task/i.test(row.feature));
    expect(taskRows).toEqual([{ feature: "Task Management & Delegation", included: [true, true, true] }]);
    expect(businessSystemComparison.find((row) => row.feature === "Reports for included modules")?.included).toEqual([true, true, true]);
    expect(businessModuleReportsNote).toBe("Reports are included with every module in your selected plan.");
    expect(businessSystemPlans.flatMap((plan) => [...plan.features])).not.toContain("Reports");
  });

  it("reserves the new field-team and payment features for Enterprise", () => {
    for (const feature of ["Field Executive Tracking", "Conveyance Expenses", "Payment Systems"]) {
      expect(businessSystemComparison.find((row) => row.feature === feature)?.included).toEqual([false, false, true]);
    }
  });

  it("makes stock exclusions and the full bundle explicit on the cards", () => {
    for (const plan of businessSystemPlans.slice(0, 2)) {
      expect(plan.fit).toContain("IMS / Stock is not included");
    }
    expect(businessSystemPlans[2].fit).toContain("FMS, IMS / Stock and Checklists together");
  });

  it("explains trial requests, scope and limits without inventing commercial promises", () => {
    const copy = businessPricingFaqs.map(({ answer }) => answer).join(" ");
    expect(copy).toContain("does not activate a trial or confirm a demo booking");
    expect(copy).toContain("start and end dates");
    expect(copy).toContain("scoped and quoted separately");
    expect(copy).toContain("GST is extra");
    expect(copy).toContain("included users, storage, usage limits");
    expect(copy).not.toMatch(/free trial|no credit card|unlimited|cancel anytime/i);
  });

  for (const plan of businessSystemPlans) {
    for (const intent of ["trial", "demo"] as const) {
      it(`passes ${plan.name} and its monthly price into the existing ${intent} enquiry`, () => {
        const url = new URL(businessPlanEnquiryHref(plan, intent));
        expect(url.origin).toBe("https://wa.me");
        expect(url.pathname).toBe(`/${whatsappPhone}`);
        const message = url.searchParams.get("text");
        expect(message).toContain(`${plan.name} plan (${formatBusinessPlanPrice(plan.monthlyPriceInr)}/month, GST extra)`);
        expect(message).toContain(intent === "trial" ? "request a 3-day trial" : "request a demo");
        expect(message).toContain("setup scope, access limits, applicable terms and any additional charges");
        expect(message).toContain("Business Systems Suite");
        expect(message).not.toMatch(/free|credit card|annual|yearly|unlimited/i);
      });
    }
  }

  it("uses the existing add-ons catalogue without publishing add-on prices", () => {
    expect(businessSystemAddons).toEqual(["WhatsApp API", "Additional storage"]);
    const url = new URL(businessAddonsEnquiryHref);
    expect(url.pathname).toBe(`/${whatsappPhone}`);
    expect(url.searchParams.get("text")).toContain("optional add-ons");
    expect(url.searchParams.get("text")).toContain("availability, scope and pricing");
  });

  it("states only confirmed common benefits", () => {
    expect(businessSystemBenefits).toEqual([
      "3-day trial available", "Setup handled by Sheetomatic — included", "Monthly plans with no yearly commitment",
    ]);
  });
});
