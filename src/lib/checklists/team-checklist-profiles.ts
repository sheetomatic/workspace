import type { ChecklistTeam } from "@prisma/client";

export type TeamChecklistProfile = {
  title: string;
  description: string;
  focusAreas: string[];
  sampleActivities: Array<{
    activity: string;
    frequency: string;
    ownerRole: string;
  }>;
};

export const TEAM_CHECKLIST_PROFILES: Record<
  Exclude<ChecklistTeam, "GENERAL" | "QUALITY" | "STORE">,
  TeamChecklistProfile
> = {
  ACCOUNTS: {
    title: "Accounts Check List",
    description:
      "Finance discipline — GST, TDS, bank recon, collections, and month-end close tracked with clear ownership.",
    focusAreas: ["GST & compliance", "Receivables follow-up", "Bank reconciliation", "Vendor payments"],
    sampleActivities: [
      { activity: "Reconcile bank statement with books", frequency: "Monthly", ownerRole: "Accounts executive" },
      { activity: "Follow up overdue receivables", frequency: "Weekly", ownerRole: "Accounts / Sales" },
      { activity: "GST return readiness check", frequency: "Monthly", ownerRole: "Accounts head" },
      { activity: "Vendor payment run approved by owner", frequency: "Weekly", ownerRole: "Accounts head" },
    ],
  },
  HR: {
    title: "HR Check List",
    description:
      "People operations Process Checklists — onboarding, attendance, leave, and policy compliance.",
    focusAreas: ["Onboarding & KYC", "Attendance exceptions", "Leave balances", "Policy acknowledgement"],
    sampleActivities: [
      { activity: "Collect KYC, bank, and emergency contact", frequency: "Weekly", ownerRole: "HR executive" },
      { activity: "Issue ID card and system login", frequency: "Weekly", ownerRole: "HR / IT" },
      { activity: "Explain KRA/KPI and weekly review rhythm", frequency: "Weekly", ownerRole: "Department head" },
      { activity: "Attendance and field policy briefing", frequency: "Monthly", ownerRole: "HR" },
    ],
  },
  MAINTENANCE: {
    title: "Maintenance Check List (Machine)",
    description:
      "Plant and machine care — preventive rounds, breakdown escalation, and safety checks with photo proof.",
    focusAreas: ["PM schedules", "Breakdown response", "Safety signage", "HVAC / utilities"],
    sampleActivities: [
      { activity: "Fire extinguisher and safety signage check", frequency: "Weekly", ownerRole: "Maintenance supervisor" },
      { activity: "Generator / UPS test log", frequency: "Weekly", ownerRole: "Electrician" },
      { activity: "Compressed air / HVAC filter inspection", frequency: "Monthly", ownerRole: "Maintenance team" },
      { activity: "Escalate breakdowns blocking dispatch", frequency: "Daily", ownerRole: "Shift in-charge" },
    ],
  },
};

export function getTeamChecklistProfile(team: ChecklistTeam): TeamChecklistProfile | null {
  if (team in TEAM_CHECKLIST_PROFILES) {
    return TEAM_CHECKLIST_PROFILES[team as keyof typeof TEAM_CHECKLIST_PROFILES];
  }
  return null;
}
