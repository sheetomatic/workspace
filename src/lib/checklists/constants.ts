import type { ChecklistFrequency, ChecklistTeam } from "@prisma/client";

export const CHECKLIST_DEPARTMENTS: ChecklistTeam[] = [
  "GENERAL",
  "ACCOUNTS",
  "HR",
  "MAINTENANCE",
  "QUALITY",
  "STORE",
];

export const CHECKLIST_TEAM_LABELS: Record<string, string> = {
  GENERAL: "General",
  ACCOUNTS: "Accounts",
  HR: "HR",
  MAINTENANCE: "Maintenance",
  QUALITY: "Quality",
  STORE: "Store",
};

/** Where a checklist of this department is actually listed. */
export function checklistBoardPath(team: string) {
  if (team === "ACCOUNTS") return "/app/checklists/accounts";
  if (team === "HR") return "/app/checklists/hr";
  if (team === "MAINTENANCE") return "/app/checklists/maintenance";
  return `/app/checklists?team=${encodeURIComponent(team)}`;
}

export const CHECKLIST_FREQUENCY_LABELS: Record<ChecklistFrequency, string> = {
  WEEKLY: "Weekly",
  FORTNIGHTLY: "Fortnightly",
  MONTHLY: "Monthly",
  QUARTERLY: "Quarterly",
  HALF_YEARLY: "Half-yearly",
  YEARLY: "Yearly",
};
