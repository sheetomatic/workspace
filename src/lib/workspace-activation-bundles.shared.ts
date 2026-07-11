import type { WorkspaceModule } from "@prisma/client";

/** Super-admin activation bundle keys (form `activationBundle`). */
export const ACTIVATION_BUNDLE_KEYS = [
  "bci_starter",
  "tasks_addon",
  "bci_with_tasks",
  "bci_growth",
  "client_50",
] as const;

export type ActivationBundleKey = (typeof ACTIVATION_BUNDLE_KEYS)[number];

export type ActivationBundleOption = {
  value: ActivationBundleKey;
  label: string;
  description: string;
  modules: WorkspaceModule[];
};

export const ACTIVATION_BUNDLE_OPTIONS: ActivationBundleOption[] = [
  {
    value: "bci_starter",
    label: "BCI FMS only",
    description: "Split flows, EM Ready, Reports, Approvals. No Tasks.",
    modules: ["FMS", "REPORTS", "APPROVALS"],
  },
  {
    value: "tasks_addon",
    label: "Tasks / EA only",
    description: "Executive Assistant, PC, checklists. Sold separately.",
    modules: ["TASKS"],
  },
  {
    value: "bci_with_tasks",
    label: "BCI + Tasks",
    description: "FMS bundle plus Tasks add-on (common upsell).",
    modules: ["FMS", "REPORTS", "APPROVALS", "TASKS"],
  },
  {
    value: "bci_growth",
    label: "BCI Growth",
    description: "BCI FMS + CRM + IMS / Stock + HRMS. No Tasks unless added later.",
    modules: ["FMS", "REPORTS", "APPROVALS", "CRM", "IMS", "HR"],
  },
  {
    value: "client_50",
    label: "Full client (50 users)",
    description: "Growth modules + Tasks + Legal (HRMS sold separately). Enterprise rollout.",
    modules: ["FMS", "REPORTS", "APPROVALS", "CRM", "IMS", "TASKS", "CASES"],
  },
];

export const DEFAULT_ACTIVATION_BUNDLE: ActivationBundleKey = "bci_starter";

export function isActivationBundleKey(value: string): value is ActivationBundleKey {
  return (ACTIVATION_BUNDLE_KEYS as readonly string[]).includes(value);
}

export function activationBundleLabel(bundle: ActivationBundleKey): string {
  return ACTIVATION_BUNDLE_OPTIONS.find((o) => o.value === bundle)?.label ?? bundle;
}

export function formatAllowedModules(modules: WorkspaceModule[]): string {
  return modules.join(", ");
}
