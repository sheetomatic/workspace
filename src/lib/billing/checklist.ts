export type OnboardingTaskDef = {
  key: string;
  label: string;
  sortOrder: number;
};

/** SaaS tenant go-live — not the dedicated-portal deploy SOP. */
export const CLIENT_ONBOARDING_TASKS: OnboardingTaskDef[] = [
  { key: "sale_locked", label: "Sale locked — plan, seats, and monthly rate", sortOrder: 10 },
  { key: "workspace_created", label: "Workspace created and owner can log in", sortOrder: 20 },
  { key: "modules_enabled", label: "Sold modules enabled", sortOrder: 30 },
  { key: "team_invited", label: "Team invited (active users on the plan)", sortOrder: 40 },
  { key: "billing_set", label: "Billing rate, GST, and renewal date set", sortOrder: 50 },
  { key: "first_invoice", label: "First invoice generated and sent", sortOrder: 60 },
  { key: "first_payment", label: "First payment collected", sortOrder: 70 },
  { key: "go_live", label: "Go-live smoke — owner login on tenant host", sortOrder: 80 },
  { key: "training_done", label: "Owner trained on EM / sold modules", sortOrder: 90 },
];

export function onboardingProgress(tasks: { completedAt: Date | null }[]) {
  const total = tasks.length;
  const done = tasks.filter((task) => task.completedAt).length;
  return {
    done,
    total,
    percent: total === 0 ? 0 : Math.round((done / total) * 100),
  };
}
