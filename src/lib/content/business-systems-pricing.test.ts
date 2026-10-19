import { describe, expect, it } from "vitest";
import {
  businessAddonsEnquiryHref,
  businessPlanEnquiryHref,
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
    expect(businessSystemPlans[0].features).toEqual(["FMS", "Checklists", "Task Delegation", "EM", "MIS Score", "PC Jobs"]);
    expect(businessSystemPlans[1].includesLabel).toBe("Everything in Starter, plus");
    expect(businessSystemPlans[1].features).toEqual(["CRM"]);
    expect(businessSystemPlans[2].includesLabel).toBe("Everything in Scale, plus");
    expect(businessSystemPlans[2].features).toEqual(["HRMS", "IMS / Stock", "Task Management", "Reports"]);
  });

  it("keeps the concise comparison consistent with the cards", () => {
    const matrix = businessSystemComparison.map((row) => [...row.included]);
    expect(matrix).toEqual([
      [true, true, true], [false, true, true],
      [false, false, true], [false, false, true], [false, false, true], [false, false, true],
    ]);
    expect(businessSystemComparison.slice(2).map((r) => r.feature)).toEqual(businessSystemPlans[2].features);
  });

  for (const plan of businessSystemPlans) {
    for (const intent of ["trial", "demo"] as const) {
      it(`passes ${plan.name} and its monthly price into the existing ${intent} enquiry`, () => {
        const url = new URL(businessPlanEnquiryHref(plan, intent));
        expect(url.origin).toBe("https://wa.me");
        expect(url.pathname).toBe(`/${whatsappPhone}`);
        const message = url.searchParams.get("text");
        expect(message).toContain(`${plan.name} plan (${formatBusinessPlanPrice(plan.monthlyPriceInr)}/month)`);
        expect(message).toContain(intent === "trial" ? "start a 3-day trial" : "book a demo");
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
