export type LeadCategoryId =
  | "CUSTOM_SOFTWARE"
  | "TASKS_MANAGEMENT"
  | "WHATSAPP_API_OFFICIAL"
  | "WHATSAPP_API_UNOFFICIAL"
  | "GWS_DEVELOPMENT"
  | "TRAINING_GWS"
  | "FMS_BCI"
  | "IMS_INVENTORY"
  | "SHEETOMATIC_AI"
  | "HR_WORKFORCE"
  | "LEGAL_CASES"
  | "WEBSITE_MARKETING"
  | "MANAGED_SUPPORT"
  | "GENERAL";

export const LEAD_CATEGORIES: Record<
  LeadCategoryId,
  { label: string; defaultPipeValue: number; keywords: string[] }
> = {
  CUSTOM_SOFTWARE: {
    label: "Custom Software",
    defaultPipeValue: 150000,
    keywords: [
      "custom software",
      "custom module",
      "bespoke",
      "build for us",
      "integration",
      "workspace module",
      "erp",
      "software development",
    ],
  },
  TASKS_MANAGEMENT: {
    label: "Tasks Management",
    defaultPipeValue: 50000,
    keywords: [
      "task management",
      "tasks management",
      "task delegation",
      "checklist",
      "reminder",
      "approval",
      "assign task",
      "follow up",
      "executive assistant",
    ],
  },
  WHATSAPP_API_OFFICIAL: {
    label: "WhatsApp API (Official)",
    defaultPipeValue: 75000,
    keywords: [
      "official whatsapp",
      "whatsapp business api",
      "meta api",
      "waba",
      "cloud api",
      "verified whatsapp",
      "whatsapp official",
    ],
  },
  WHATSAPP_API_UNOFFICIAL: {
    label: "WhatsApp API (Unofficial)",
    defaultPipeValue: 25000,
    keywords: [
      "unofficial whatsapp",
      "whatsapp api plan",
      "wa api",
      "wa.sheetomatic",
      "bulk whatsapp",
      "whatsapp recharge",
      "whatsapp from sheet",
      "whatsapp unofficial",
    ],
  },
  GWS_DEVELOPMENT: {
    label: "GWS — Development",
    defaultPipeValue: 45000,
    keywords: [
      "google sheets",
      "google sheet",
      "appscript",
      "app script",
      "appsheet",
      "app sheet",
      "gws",
      "spreadsheet automation",
      "sheet development",
      "sheetomatic setup",
    ],
  },
  TRAINING_GWS: {
    label: "Training — GWS (Google Sheets / AppSheet)",
    defaultPipeValue: 15000,
    keywords: [
      "training",
      "course",
      "workshop",
      "learn google sheets",
      "appsheet training",
      "google sheets training",
      "coaching",
      "tutoring",
    ],
  },
  FMS_BCI: {
    label: "FMS / BCI (Operations)",
    defaultPipeValue: 150000,
    keywords: [
      "fms",
      "bci",
      "manufacturing",
      "production",
      "shop floor",
      "flow monitoring",
      "process coordinator",
      "executive meeting",
      "mis",
    ],
  },
  IMS_INVENTORY: {
    label: "IMS / Inventory",
    defaultPipeValue: 85000,
    keywords: [
      "ims",
      "inventory",
      "stock",
      "warehouse",
      "raw material",
      "finished goods",
      "reorder",
      "store",
    ],
  },
  SHEETOMATIC_AI: {
    label: "Sheetomatic AI",
    defaultPipeValue: 65000,
    keywords: [
      "sheetomatic ai",
      "chatbot",
      "chat bot",
      "chatboat",
      "ai bot",
      "ai assistant",
      "auto reply",
      "whatsapp ai",
    ],
  },
  HR_WORKFORCE: {
    label: "HR & Field Teams",
    defaultPipeValue: 60000,
    keywords: [
      "hr",
      "attendance",
      "leave",
      "payroll",
      "field executive",
      "geo check",
      "hiring",
      "workforce",
    ],
  },
  LEGAL_CASES: {
    label: "Legal & Cases",
    defaultPipeValue: 120000,
    keywords: ["legal", "case", "court", "law firm", "litigation", "diary", "hingorani"],
  },
  WEBSITE_MARKETING: {
    label: "Website & Marketing",
    defaultPipeValue: 55000,
    keywords: ["website", "landing", "marketing", "seo", "ads", "campaign", "branding"],
  },
  MANAGED_SUPPORT: {
    label: "Managed Support / AMC",
    defaultPipeValue: 48000,
    keywords: [
      "managed support",
      "amc",
      "annual maintenance",
      "retainer",
      "monthly support",
      "ongoing support",
    ],
  },
  GENERAL: {
    label: "General inquiry",
    defaultPipeValue: 40000,
    keywords: [],
  },
};

/** Previous category ids stored on older leads — mapped to the new taxonomy. */
export const LEGACY_LEAD_CATEGORY_MAP: Record<string, LeadCategoryId> = {
  CRM_AUTOMATION: "CUSTOM_SOFTWARE",
  FMS_ERP: "FMS_BCI",
  CHATBOT_AI: "SHEETOMATIC_AI",
  TASKS_WORKFLOW: "TASKS_MANAGEMENT",
  LEGAL_CASES: "LEGAL_CASES",
  WEBSITE_MARKETING: "WEBSITE_MARKETING",
};

export function categorizeLeadRequirement(
  requirement: string | null | undefined,
): LeadCategoryId {
  const text = (requirement ?? "").toLowerCase();
  if (!text.trim()) {
    return "GENERAL";
  }

  let best: LeadCategoryId = "GENERAL";
  let bestScore = 0;

  for (const [id, config] of Object.entries(LEAD_CATEGORIES) as Array<
    [LeadCategoryId, (typeof LEAD_CATEGORIES)[LeadCategoryId]]
  >) {
    if (id === "GENERAL") {
      continue;
    }
    const score = config.keywords.reduce(
      (sum, keyword) => (text.includes(keyword) ? sum + 1 : sum),
      0,
    );
    if (score > bestScore) {
      bestScore = score;
      best = id;
    }
  }

  return best;
}

export function migrateLegacyLeadCategory(
  categoryId: string | null | undefined,
): LeadCategoryId | null {
  if (!categoryId) {
    return null;
  }
  if (isLeadCategoryId(categoryId)) {
    return categoryId;
  }
  return LEGACY_LEAD_CATEGORY_MAP[categoryId] ?? null;
}

export function leadCategoryLabel(categoryId: string | null | undefined) {
  if (!categoryId) {
    return LEAD_CATEGORIES.GENERAL.label;
  }
  if (isLeadCategoryId(categoryId)) {
    return LEAD_CATEGORIES[categoryId].label;
  }
  const migrated = LEGACY_LEAD_CATEGORY_MAP[categoryId];
  if (migrated) {
    return LEAD_CATEGORIES[migrated].label;
  }
  return categoryId.replaceAll("_", " ");
}

export function isLeadCategoryId(value: string): value is LeadCategoryId {
  return value in LEAD_CATEGORIES;
}

export function listLeadCategoryOptions(): Array<{ id: LeadCategoryId; label: string }> {
  return (Object.keys(LEAD_CATEGORIES) as LeadCategoryId[]).map((id) => ({
    id,
    label: LEAD_CATEGORIES[id].label,
  }));
}

export function resolveLeadCategoryId(categoryId: string | null | undefined): LeadCategoryId {
  if (!categoryId) {
    return "GENERAL";
  }
  if (isLeadCategoryId(categoryId)) {
    return categoryId;
  }
  return LEGACY_LEAD_CATEGORY_MAP[categoryId] ?? "GENERAL";
}

export function defaultPipeValueForCategory(categoryId: string | null | undefined) {
  const id = resolveLeadCategoryId(categoryId);
  return LEAD_CATEGORIES[id]?.defaultPipeValue ?? LEAD_CATEGORIES.GENERAL.defaultPipeValue;
}

export function formatInr(value: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(value);
}
