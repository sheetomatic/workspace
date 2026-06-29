export type LeadCategoryId =
  | "CRM_AUTOMATION"
  | "FMS_ERP"
  | "CHATBOT_AI"
  | "TASKS_WORKFLOW"
  | "LEGAL_CASES"
  | "WEBSITE_MARKETING"
  | "GENERAL";

export const LEAD_CATEGORIES: Record<
  LeadCategoryId,
  { label: string; defaultPipeValue: number; keywords: string[] }
> = {
  CRM_AUTOMATION: {
    label: "CRM & Automation",
    defaultPipeValue: 85000,
    keywords: ["crm", "automation", "whatsapp", "google sheet", "lead management", "pipeline"],
  },
  FMS_ERP: {
    label: "FMS & ERP",
    defaultPipeValue: 150000,
    keywords: ["fms", "erp", "manufacturing", "production", "workflow", "shop floor"],
  },
  CHATBOT_AI: {
    label: "Chatbot & AI",
    defaultPipeValue: 65000,
    keywords: ["chatbot", "chat bot", "chatboat", "ai", "bot", "assistant", "automation bot"],
  },
  TASKS_WORKFLOW: {
    label: "Tasks & Checklists",
    defaultPipeValue: 45000,
    keywords: ["task", "checklist", "reminder", "approval", "delegation"],
  },
  LEGAL_CASES: {
    label: "Legal & Cases",
    defaultPipeValue: 120000,
    keywords: ["legal", "case", "court", "law firm", "litigation", "diary"],
  },
  WEBSITE_MARKETING: {
    label: "Website & Marketing",
    defaultPipeValue: 55000,
    keywords: ["website", "landing", "marketing", "seo", "ads", "campaign"],
  },
  GENERAL: {
    label: "General inquiry",
    defaultPipeValue: 40000,
    keywords: [],
  },
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

export function leadCategoryLabel(categoryId: string | null | undefined) {
  if (!categoryId) {
    return LEAD_CATEGORIES.GENERAL.label;
  }
  return (
    LEAD_CATEGORIES[categoryId as LeadCategoryId]?.label ?? categoryId.replaceAll("_", " ")
  );
}

export function defaultPipeValueForCategory(categoryId: string | null | undefined) {
  const id = (categoryId as LeadCategoryId) || "GENERAL";
  return LEAD_CATEGORIES[id]?.defaultPipeValue ?? LEAD_CATEGORIES.GENERAL.defaultPipeValue;
}

export function formatInr(value: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(value);
}
