import { buildWhatsAppUrl } from "@/app/site-content";

/** Marketing copy only. Billing, quotations, and entitlements use their own catalogues. */
export const businessSystemPlans = [
  {
    id: "starter",
    name: "Starter",
    monthlyPriceInr: 4_999,
    recommended: false,
    includesLabel: "Business Systems Suite",
    features: ["FMS", "Checklists", "Task Delegation", "EM", "MIS Score", "PC Jobs"],
  },
  {
    id: "scale",
    name: "Scale",
    monthlyPriceInr: 6_999,
    recommended: true,
    includesLabel: "Everything in Starter, plus",
    features: ["CRM"],
  },
  {
    id: "enterprise",
    name: "Enterprise",
    monthlyPriceInr: 9_999,
    recommended: false,
    includesLabel: "Everything in Scale, plus",
    features: ["HRMS", "IMS / Stock", "Task Management", "Reports"],
  },
] as const;

export type BusinessSystemPlan = (typeof businessSystemPlans)[number];

export const businessSystemComparison = [
  { feature: "Business Systems Suite", included: [true, true, true] },
  { feature: "CRM", included: [false, true, true] },
  { feature: "HRMS", included: [false, false, true] },
  { feature: "IMS / Stock", included: [false, false, true] },
  { feature: "Task Management", included: [false, false, true] },
  { feature: "Reports", included: [false, false, true] },
] as const;

export const businessSystemBenefits = [
  "3-day trial available",
  "Setup handled by Sheetomatic — included",
  "Monthly plans with no yearly commitment",
] as const;

export function formatBusinessPlanPrice(amount: number): string {
  return `₹${new Intl.NumberFormat("en-IN").format(amount)}`;
}

export function businessPlanEnquiryHref(plan: BusinessSystemPlan, intent: "trial" | "demo"): string {
  const request = intent === "trial" ? "start a 3-day trial" : "book a demo";
  return buildWhatsAppUrl(
    `Hi Sheetomatic, I would like to ${request} for the ${plan.name} plan (${formatBusinessPlanPrice(plan.monthlyPriceInr)}/month) in the Business Systems Suite. Please share the details and next steps.`,
  );
}

export const businessAddonsEnquiryHref = buildWhatsAppUrl(
  "Hi Sheetomatic, I would like to discuss optional add-ons for the Business Systems Suite. Please share availability, scope and pricing.",
);

/** Existing catalogue: module_whatsapp and emReadyStorageAddons in em-ready-plans.ts. */
export const businessSystemAddons = ["WhatsApp API", "Additional storage"] as const;
