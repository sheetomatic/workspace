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
    tagline: "BCI Suite — FMS, EM, PC, MIS",
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
    modules: ["FMS", "EM", "PC", "MIS"],
    highlights: [
      "FMS, EM, PC, MIS",
      "8 users included",
      "Up to 3 FMS templates",
      "10 GB storage",
    ],
    notIncluded: ["Check Lists", "Tasks", "HRMS", "IMS", "CRM"],
  },
  {
    id: "em_ready_growth",
    name: "EM Ready Growth",
    shortName: "Growth",
    tagline: "Starter + Check Lists + Tasks",
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
    modules: ["FMS", "EM", "PC", "MIS", "Check Lists", "Tasks"],
    highlights: [
      "Everything in ₹4,999",
      "Check Lists",
      "Tasks",
      "20 users included",
      "Up to 10 FMS templates",
    ],
    notIncluded: ["HRMS", "IMS", "CRM"],
  },
  {
    id: "em_ready_scale",
    name: "EM Ready Scale",
    shortName: "Scale",
    tagline: "Starter + Growth + HRMS + IMS",
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
    modules: ["FMS", "EM", "PC", "MIS", "Check Lists", "Tasks", "HRMS", "IMS"],
    highlights: [
      "Everything in ₹4,999 and ₹9,999",
      "HRMS",
      "IMS",
      "50 users included",
      "Up to 25 FMS templates",
    ],
    notIncluded: ["CRM (buy as a module)"],
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

/**
 * Implementation is not a public list price — scope varies by business.
 * `oneTimeInr` is only a sales-catalog placeholder, not shown on /pricing.
 */
export const emReadyWorkspaceBuild = {
  oneTimeInr: 10_000,
  label: "Implementation",
  note:
    "Plan prices below are subscription only. Implementation is an additional cost, quoted business to business from how many FMS templates, Check Lists, task flows, IMS, HR, and other modules we map. Ask us for a number before you buy.",
  points: [
    "Quoted after we understand your business: FMS count, Check Lists, and who does the work",
    "More split FMS, process checklists, or locations usually means a larger implementation",
    "Customization, integrations, and extra flows are scoped separately — not a one-size fee",
  ],
} as const;

export const emReadyCustomApps = {
  label: "Google Workspace Apps & AppSheet",
  badge: "Build as you need",
  note:
    "Need a workflow the Suite does not cover? We also build on Google Workspace Apps and AppSheet — forms, Sheets, and custom apps for your business.",
  points: [
    "Google Workspace Apps for day-to-day ops on Gmail, Drive, Sheets, and Chat",
    "AppSheet apps when you need a tool built around your process",
    "Quoted to the build — ask us what you want made",
  ],
} as const;

/** Standard list pricing for WhatsApp Official API and HRMS. */
export const STANDARD_MODULE_LIST = {
  baseMonthlyInr: 10_000,
  baseAnnualInr: 99_990,
  perUserMonthlyInr: 300,
  /** Product setup when bought alone (waived if workspace build already paid). */
  productBuildInr: 5_000,
  whatsappMessagesIncluded: 2_000,
} as const;

export const emReadyPricingFootnotes = [
  "Prices in INR, exclusive of GST.",
  "Meta WhatsApp conversation charges beyond included message credits are billed separately.",
  "Billing is monthly recurring; annual invoices available where listed.",
  "Implementation is quoted per business from FMS, Check Lists, and related scope.",
  "Suite: ₹4,999 FMS + EM + PC + MIS. ₹9,999 adds Check Lists + Tasks. ₹24,999 adds HRMS + IMS.",
  "CRM is ₹2,499/mo for 8 users. HRMS: ₹10,000/mo base + ₹300 per user/mo.",
  "Google Workspace Apps and AppSheet builds are quoted separately.",
] as const;

/**
 * Individual modules (à la carte) — buy one or stack.
 * List prices are set so stacking 2+ modules typically costs more than the matching Suite tier.
 */
export type EmReadyModulePlanId =
  | "module_fms"
  | "module_tasks"
  | "module_crm"
  | "module_ims"
  | "module_hr"
  | "module_whatsapp";

export type EmReadyModulePlan = {
  id: EmReadyModulePlanId;
  name: string;
  shortName: string;
  tagline: string;
  badge: string | null;
  priceMonthlyInr: number;
  priceAnnualInr: number;
  includedUsers: number;
  extraUserMonthlyInr: number;
  /** One-time product setup (₹). Null = use workspace build only. */
  buildCostInr: number | null;
  /** Optional included message pack (WhatsApp Official API). */
  messagesIncluded?: number;
  includes: string[];
  highlights: string[];
  /** Product page / services deep link when available. */
  href: string;
};

export const emReadyModulePlans: EmReadyModulePlan[] = [
  {
    id: "module_fms",
    name: "FMS",
    shortName: "FMS",
    tagline: "FMS, EM, PC, MIS — same as ₹4,999 Suite",
    badge: "Core",
    priceMonthlyInr: 2999,
    priceAnnualInr: 29990,
    includedUsers: 8,
    extraUserMonthlyInr: 399,
    buildCostInr: null,
    includes: ["FMS", "EM", "PC", "MIS"],
    highlights: [
      "8 users included",
      "Up to 3 FMS templates",
    ],
    href: "/services/flow",
  },
  {
    id: "module_tasks",
    name: "Check Lists + Tasks",
    shortName: "Check Lists + Tasks",
    tagline: "Process Check Lists and task delegation — 8 users",
    badge: null,
    priceMonthlyInr: 2499,
    priceAnnualInr: 24990,
    includedUsers: 8,
    extraUserMonthlyInr: 349,
    buildCostInr: null,
    includes: ["Check Lists", "Tasks"],
    highlights: [
      "8 users included",
      "Added on ₹9,999 Suite",
    ],
    href: "/services/tasks",
  },
  {
    id: "module_crm",
    name: "CRM",
    shortName: "CRM",
    tagline: "Leads, follow-ups, quotations — 8 users",
    badge: null,
    priceMonthlyInr: 2499,
    priceAnnualInr: 24990,
    includedUsers: 8,
    extraUserMonthlyInr: 349,
    buildCostInr: null,
    includes: ["CRM", "Leads", "Quotations"],
    highlights: [
      "₹2,499/mo for 8 users",
      "Not included in Suite — buy as a module",
    ],
    href: "/products",
  },
  {
    id: "module_ims",
    name: "IMS",
    shortName: "IMS",
    tagline: "Stock in/out and reorder — 8 users",
    badge: null,
    priceMonthlyInr: 2999,
    priceAnnualInr: 29990,
    includedUsers: 8,
    extraUserMonthlyInr: 399,
    buildCostInr: null,
    includes: ["IMS", "Stock", "Reorder"],
    highlights: [
      "8 users included",
      "Included on ₹24,999 Suite",
    ],
    href: "/services/inventory",
  },
  {
    id: "module_hr",
    name: "HRMS",
    shortName: "HRMS",
    tagline: "Attendance, payroll, hiring — ₹10,000/mo + ₹300/user",
    badge: null,
    priceMonthlyInr: STANDARD_MODULE_LIST.baseMonthlyInr,
    priceAnnualInr: STANDARD_MODULE_LIST.baseAnnualInr,
    includedUsers: 1,
    extraUserMonthlyInr: STANDARD_MODULE_LIST.perUserMonthlyInr,
    buildCostInr: STANDARD_MODULE_LIST.productBuildInr,
    includes: ["HRMS", "Attendance", "Payroll"],
    highlights: [
      "₹10,000/mo base + ₹300 per user",
      "Included on ₹24,999 Suite",
    ],
    href: "/services",
  },
  {
    id: "module_whatsapp",
    name: "WhatsApp Official API",
    shortName: "WhatsApp API",
    tagline: "Official Meta API — 2,000 messages in the base plan",
    badge: null,
    priceMonthlyInr: STANDARD_MODULE_LIST.baseMonthlyInr,
    priceAnnualInr: STANDARD_MODULE_LIST.baseAnnualInr,
    includedUsers: 1,
    extraUserMonthlyInr: STANDARD_MODULE_LIST.perUserMonthlyInr,
    buildCostInr: STANDARD_MODULE_LIST.productBuildInr,
    messagesIncluded: STANDARD_MODULE_LIST.whatsappMessagesIncluded,
    includes: ["Official WhatsApp API", "2,000 messages"],
    highlights: [
      "₹10,000/mo base + ₹300 per user",
      "Add-on on every Suite",
    ],
    href: "/whatsapp-plans",
  },
];

/** Modules shown on /pricing. WhatsApp Official API lives on /whatsapp-plans. */
export const emReadyPublicModulePlans = emReadyModulePlans.filter(
  (plan) => plan.id !== "module_whatsapp",
);

export const emReadySheetsPitch = {
  kicker: "When Google Sheets can't keep up",
  title: "Your FMS should not crash the file",
  lead:
    "Split FMS, Check Lists, and MIS in Sheets get slow, then they hang. Sheetomatic runs the same BCI work as an app — live EM, no waiting on a tab to load.",
  points: [
    {
      title: "Sheets lag",
      text: "Too many FMS tabs, QUERY, IMPORTRANGE — the file takes a minute to open, or never finishes.",
    },
    {
      title: "Crash / try again",
      text: "Heavy checklists and proof photos push Sheets past what a spreadsheet can hold.",
    },
    {
      title: "Sheetomatic",
      text: "FMS, EM, PC, and MIS run in product. Owner opens EM and starts the review — no MIS hire compiling the week.",
    },
  ],
} as const;

/** Compare matrix — Suite tiers vs buying modules. */
export type EmReadyCompareRow = {
  feature: string;
  starter: string;
  growth: string;
  scale: string;
  modules: string;
};

export const emReadyCompareRows: EmReadyCompareRow[] = [
  {
    feature: "Price",
    starter: "₹4,999/mo",
    growth: "₹9,999/mo",
    scale: "₹24,999/mo",
    modules: "From ₹2,499/mo · HRMS ₹10,000",
  },
  {
    feature: "FMS, EM, PC, MIS",
    starter: "Included",
    growth: "Included",
    scale: "Included",
    modules: "FMS ₹2,999",
  },
  {
    feature: "Check Lists + Tasks",
    starter: "—",
    growth: "Included",
    scale: "Included",
    modules: "₹2,499 / 8 users",
  },
  {
    feature: "HRMS",
    starter: "—",
    growth: "—",
    scale: "Included",
    modules: "₹10,000 + ₹300/user",
  },
  {
    feature: "IMS",
    starter: "—",
    growth: "—",
    scale: "Included",
    modules: "IMS ₹2,999",
  },
  {
    feature: "CRM",
    starter: "Add-on",
    growth: "Add-on",
    scale: "Add-on",
    modules: "₹2,499 / 8 users",
  },
  {
    feature: "Users",
    starter: "8 included",
    growth: "20 included",
    scale: "50 included",
    modules: "8 users · HRMS per user",
  },
  {
    feature: "FMS templates",
    starter: "Up to 3",
    growth: "Up to 10",
    scale: "Up to 25",
    modules: "Up to 3 (FMS)",
  },
  {
    feature: "Implementation",
    starter: "Quoted",
    growth: "Quoted",
    scale: "Quoted",
    modules: "Quoted",
  },
];

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

export function getEmReadyModuleDisplayPrice(
  plan: EmReadyModulePlan,
  period: EmReadyBillingPeriod,
): { amountLabel: string; periodLabel: string; annualNote: string | null } {
  if (period === "annual") {
    const perMonth = Math.round(plan.priceAnnualInr / 12);
    return {
      amountLabel: formatInr(plan.priceAnnualInr),
      periodLabel: "/ year",
      annualNote: `${formatInr(perMonth)}/mo billed annually`,
    };
  }
  return {
    amountLabel: formatInr(plan.priceMonthlyInr),
    periodLabel: "/ month",
    annualNote: `or ${formatInr(plan.priceAnnualInr)}/year`,
  };
}

/** Rough stack total for Compare helper (monthly, base seats). */
export function sumSelectedModulesMonthly(
  moduleIds: EmReadyModulePlanId[],
): number {
  const map = new Map(emReadyModulePlans.map((m) => [m.id, m.priceMonthlyInr]));
  return moduleIds.reduce((sum, id) => sum + (map.get(id) ?? 0), 0);
}

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
