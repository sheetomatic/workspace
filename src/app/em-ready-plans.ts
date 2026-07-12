/**
 * EM Ready / Workspace pricing — live on /pricing.
 * See docs/EM-READY-PRICING-PLANS.md for full notes + cost analysis.
 * All amounts INR, excl. GST.
 *
 * Internal: seat add-on rates target ~75% margin at list; do not surface
 * margin language in customer-facing UI.
 */

export type EmReadyPlanId =
  | "em_ready_starter"
  | "em_ready_growth"
  | "em_ready_scale"
  | "em_ready_enterprise";

/** Self-serve enquire vs sales contact (50+ / enterprise). */
export type EmReadyPlanCta = "enquire" | "contact";

export type EmReadyPlan = {
  id: EmReadyPlanId;
  name: string;
  shortName: string;
  tagline: string;
  /** Live on marketing /pricing when true. */
  publicListing: boolean;
  /** Badge above the plan name (e.g. Starts here). */
  badge: string | null;
  cta: EmReadyPlanCta;
  priceMonthlyInr: number | null;
  priceAnnualInr: number | null;
  includedUsers: number;
  extraUserMonthlyInr: number | null;
  /** Volume seat price after a second band (Enterprise 251+). */
  extraUserVolumeMonthlyInr?: number | null;
  maxFmsTemplates: number;
  storageGb: number;
  /** Prefer object storage (S3/R2) for Scale+ — BYTEA is not viable at 100+. */
  storageBackend: "postgres_bytea" | "object_storage";
  modules: string[];
  highlights: string[];
  notIncluded: string[];
};

/** Pricing catalog status for marketing / ops. */
export const emReadyPlansStatus = "live" as const;

export const emReadyPlans: EmReadyPlan[] = [
  {
    id: "em_ready_starter",
    name: "EM Ready Starter",
    shortName: "Starter",
    tagline: "FMS + tasks + Monday EM for one-location MSMEs",
    publicListing: true,
    badge: "Starts here",
    cta: "enquire",
    priceMonthlyInr: 4999,
    priceAnnualInr: 49990,
    includedUsers: 8,
    extraUserMonthlyInr: 599,
    maxFmsTemplates: 3,
    storageGb: 10,
    storageBackend: "postgres_bytea",
    modules: ["FMS", "REPORTS", "APPROVALS", "TASKS", "EM Ready"],
    highlights: [
      "8 users included (minimum)",
      "Up to 3 split FMS templates",
      "10 GB proof / document storage",
      "Internal WhatsApp alerts (Meta fees separate)",
      "Fair-use AI task parse / voice",
    ],
    notIncluded: [
      "IMS / HR / Legal",
      "Customer WhatsApp AI chatbot",
      "Unlimited AI or storage",
    ],
  },
  {
    id: "em_ready_growth",
    name: "EM Ready Growth",
    shortName: "Growth",
    tagline: "Multi-dept ops — flows, store, and people",
    publicListing: true,
    badge: null,
    cta: "enquire",
    priceMonthlyInr: 9999,
    priceAnnualInr: 99990,
    includedUsers: 20,
    extraUserMonthlyInr: 499,
    maxFmsTemplates: 10,
    storageGb: 25,
    storageBackend: "postgres_bytea",
    modules: ["FMS", "REPORTS", "APPROVALS", "TASKS", "EM Ready", "IMS", "HR"],
    highlights: [
      "20 users included",
      "Up to 10 FMS templates",
      "IMS + HR included",
      "25 GB storage",
    ],
    notIncluded: ["Customer WhatsApp AI chatbot", "SSO / Enterprise SLA"],
  },
  {
    id: "em_ready_scale",
    name: "EM Ready Scale",
    shortName: "Scale",
    tagline: "Mid-market — 50 seats, object storage, more FMS",
    publicListing: true,
    badge: "Recommended",
    cta: "enquire",
    priceMonthlyInr: 24999,
    priceAnnualInr: 249990,
    includedUsers: 50,
    extraUserMonthlyInr: 399,
    maxFmsTemplates: 25,
    storageGb: 50,
    storageBackend: "object_storage",
    modules: ["FMS", "REPORTS", "APPROVALS", "TASKS", "EM Ready", "IMS", "HR"],
    highlights: [
      "50 users included",
      "Up to 25 FMS templates",
      "50 GB object storage",
      "Higher AI fair-use pool",
      "Priority support",
    ],
    notIncluded: ["Customer WhatsApp AI chatbot", "Dedicated SSO (Enterprise)"],
  },
  {
    id: "em_ready_enterprise",
    name: "EM Ready Enterprise",
    shortName: "Enterprise",
    tagline: "100+ users — volume seats, SLA, object storage",
    /** Not self-serve on /pricing — use Contact us band for 50+. */
    publicListing: false,
    badge: null,
    cta: "contact",
    priceMonthlyInr: 39999,
    priceAnnualInr: 399990,
    includedUsers: 100,
    extraUserMonthlyInr: 299,
    extraUserVolumeMonthlyInr: 249,
    maxFmsTemplates: 100,
    storageGb: 100,
    storageBackend: "object_storage",
    modules: ["All ops modules", "SSO path", "Audit exports"],
    highlights: [
      "100 users included (floor)",
      "₹299/seat to 250; ₹249/seat 251+",
      "100 GB object storage + ₹49/GB overage",
      "Named support / business-hours SLA",
      "Implementation scoped separately",
    ],
    notIncluded: ["Meta conversation fees", "Unlimited Whisper without AI pack"],
  },
];

/** Plans shown as cards on /pricing (Starter → Growth → Scale). */
export const emReadyPublicPlans = emReadyPlans.filter((p) => p.publicListing);

/** 50+ users — contact sales; do not list Enterprise list price as a buy button. */
export const emReadyContactOffer = {
  id: "em_ready_50_plus" as const,
  title: "50+ users",
  tagline: "Larger teams, multi-location, or custom SLA — we will scope a fit.",
  cta: "contact" as const,
  highlights: [
    "Custom user count and FMS volume",
    "Object storage and priority support",
    "Implementation scoped with your team",
  ],
};

export const emReadyPricingFootnotes = [
  "Prices in INR, exclusive of GST.",
  "Meta WhatsApp conversation / API fees are billed separately.",
  "Billing is monthly recurring; annual invoices available where listed.",
] as const;

export const emReadyStorageAddons = [
  { id: "storage_10", label: "+10 GB (BYTEA)", priceMonthlyInr: 1499, storageGb: 10 },
  { id: "storage_25", label: "+25 GB (BYTEA)", priceMonthlyInr: 3499, storageGb: 25 },
  { id: "storage_50", label: "+50 GB (BYTEA)", priceMonthlyInr: 5999, storageGb: 50 },
  {
    id: "obj_storage_50",
    label: "+50 GB object",
    priceMonthlyInr: 999,
    storageGb: 50,
  },
  {
    id: "obj_storage_100",
    label: "+100 GB object",
    priceMonthlyInr: 1799,
    storageGb: 100,
  },
] as const;

export const emReadyImplementationFeeInr = {
  starterGrowth: { min: 15000, max: 25000 },
  scaleEnterprise: { min: 50000, max: 150000 },
} as const;

export function formatInr(amount: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount);
}

export type EmReadyBillingPeriod = "monthly" | "annual";

/** Display price for a public plan card. */
export function getEmReadyDisplayPrice(
  plan: EmReadyPlan,
  period: EmReadyBillingPeriod,
): { amountLabel: string; periodLabel: string; annualNote: string | null } {
  if (period === "annual" && plan.priceAnnualInr != null) {
    const perMonth = Math.round(plan.priceAnnualInr / 12);
    return {
      amountLabel: formatInr(plan.priceAnnualInr),
      periodLabel: "/ year",
      annualNote: `${formatInr(perMonth)}/mo billed annually`,
    };
  }
  if (plan.priceMonthlyInr == null) {
    return {
      amountLabel: "Custom",
      periodLabel: "",
      annualNote: null,
    };
  }
  return {
    amountLabel: formatInr(plan.priceMonthlyInr),
    periodLabel: "/ month",
    annualNote:
      plan.priceAnnualInr != null
        ? `or ${formatInr(plan.priceAnnualInr)}/year`
        : null,
  };
}

export function hasEmReadyAnnualPricing(plans: EmReadyPlan[] = emReadyPublicPlans): boolean {
  return plans.some((p) => p.priceAnnualInr != null && p.priceAnnualInr > 0);
}

/** Quick quote helper for discussion / sales. */
export function quoteEmReadyMonthly(users: number): {
  planId: EmReadyPlanId;
  monthlyInr: number | null;
  note: string;
  cta: EmReadyPlanCta;
} {
  if (users <= 8) {
    return {
      planId: "em_ready_starter",
      monthlyInr: 4999,
      note: "Starter floor (8 users)",
      cta: "enquire",
    };
  }
  if (users <= 20) {
    return {
      planId: "em_ready_starter",
      monthlyInr: 4999 + (users - 8) * 599,
      note: "Starter + extra seats",
      cta: "enquire",
    };
  }
  if (users <= 50) {
    const growth = 9999 + Math.max(0, users - 20) * 499;
    return {
      planId: "em_ready_growth",
      monthlyInr: growth,
      note: "Growth + extra seats (consider Scale at 50)",
      cta: "enquire",
    };
  }
  // 50+ — do not auto-quote Enterprise list price for self-serve UI
  return {
    planId: "em_ready_enterprise",
    monthlyInr: null,
    note: "50+ users — contact sales for a scoped quote",
    cta: "contact",
  };
}
