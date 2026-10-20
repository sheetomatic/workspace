import { buildWhatsAppUrl } from "@/app/site-content";

/** Marketing copy only. Billing, quotations, and entitlements use their own catalogues. */
export const businessSystemPlans = [
  {
    id: "starter",
    name: "Starter",
    monthlyPriceInr: 4_999,
    recommended: false,
    includesLabel: "Business Systems Suite",
    fit: "FMS and Checklists for daily work. IMS / Stock is not included.",
    features: ["FMS", "Checklists", "Task Management & Delegation", "EM", "MIS Score", "PC Jobs"],
  },
  {
    id: "scale",
    name: "Scale",
    monthlyPriceInr: 6_999,
    recommended: true,
    includesLabel: "Everything in Starter, plus",
    fit: "FMS, Checklists and CRM. IMS / Stock is not included.",
    features: ["CRM"],
  },
  {
    id: "enterprise",
    name: "Enterprise",
    monthlyPriceInr: 9_999,
    recommended: false,
    includesLabel: "Everything in Scale, plus",
    fit: "FMS, IMS / Stock and Checklists together, plus field operations and payments.",
    features: ["HRMS", "IMS / Stock", "Field Executive Tracking", "Conveyance Expenses", "Payment Systems"],
  },
] as const;

export type BusinessSystemPlan = (typeof businessSystemPlans)[number];

/** Derive the comparison from the cards, including inherited features. */
export const businessModuleReportsNote = "Reports are included with every module in your selected plan.";

export const businessSystemComparison = [...businessSystemPlans.flatMap((plan, planIndex) =>
  plan.features.map((feature) => ({
    feature,
    included: businessSystemPlans.map((_, index) => index >= planIndex),
  })),
), { feature: "Reports for included modules", included: [true, true, true] }];

export const businessPricingFaqs = [
  {
    question: "Which plan includes FMS, IMS and Checklists together?",
    answer: "Enterprise includes all three. FMS (Flow Monitoring System) and Checklists are included in every plan. IMS (Inventory Management System) / Stock is included in Enterprise, not Starter or Scale. Scale adds CRM to Starter; Enterprise includes CRM too.",
  },
  {
    question: "What does setup included mean?",
    answer: "Sheetomatic handles setup for the modules included in your selected plan. Confirm the setup scope with our team before subscribing. Customization, integrations and additional professional services are scoped and quoted separately; they are not automatically included in the monthly subscription.",
  },
  {
    question: "How do I request the 3-day trial or a demo?",
    answer: "The buttons open WhatsApp with your selected plan. This sends an enquiry; it does not activate a trial or confirm a demo booking. Our team will confirm access, the trial start and end dates, applicable terms and any charges before you proceed. Demo timing is confirmed with you separately.",
  },
  {
    question: "Is a yearly commitment required?",
    answer: "No. These are monthly plans with no yearly commitment. Prices are in INR and GST is extra. Confirm billing, renewal and cancellation terms with our team before subscribing.",
  },
  {
    question: "Are add-ons and extra capacity included?",
    answer: "WhatsApp API and additional storage are optional, separately quoted add-ons. Confirm included users, storage, usage limits and any additional capacity charges for your selected plan before subscribing. Custom requirements are assessed separately.",
  },
  {
    question: "Are Task Delegation, Task Management and Reports separate upgrades?",
    answer: "Task Management and Task Delegation are the same feature, included from Starter and inherited by Scale and Enterprise. Reports are part of each included module, not a separate Enterprise-only upgrade.",
  },
  {
    question: "What does Enterprise add for field teams?",
    answer: "Alongside everything in Scale, Enterprise includes HRMS, IMS / Stock, Field Executive Tracking, Conveyance Expenses and Payment Systems. Discuss your field-team workflow, conveyance expense process and payment requirements during the demo to confirm the setup scope.",
  },
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
  const request = intent === "trial" ? "request a 3-day trial" : "request a demo";
  return buildWhatsAppUrl(
    `Hi Sheetomatic, I would like to ${request} for the ${plan.name} plan (${formatBusinessPlanPrice(plan.monthlyPriceInr)}/month, GST extra) in the Business Systems Suite. Please confirm the included modules, setup scope, access limits, applicable terms and any additional charges before we proceed.`,
  );
}

export const businessAddonsEnquiryHref = buildWhatsAppUrl(
  "Hi Sheetomatic, I would like to discuss optional add-ons for the Business Systems Suite. Please share availability, scope and pricing.",
);

/** Existing catalogue: module_whatsapp and emReadyStorageAddons in em-ready-plans.ts. */
export const businessSystemAddons = ["WhatsApp API", "Additional storage"] as const;
