import type { ChecklistFrequency } from "@prisma/client";

export const CHECKLIST_TEAM_LABELS: Record<string, string> = {
  ACCOUNTS: "Accounts",
  HR: "HR",
  MAINTENANCE: "Maintenance",
  QUALITY: "Quality",
  STORE: "Store",
  GENERAL: "General",
};

export const CHECKLIST_FREQUENCY_LABELS: Record<ChecklistFrequency, string> = {
  WEEKLY: "Weekly",
  FORTNIGHTLY: "Fortnightly",
  MONTHLY: "Monthly",
  QUARTERLY: "Quarterly",
  HALF_YEARLY: "Half-yearly",
  YEARLY: "Yearly",
};
