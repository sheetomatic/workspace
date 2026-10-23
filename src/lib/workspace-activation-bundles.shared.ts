import type { WorkspaceModule } from "@prisma/client";
import { BUSINESS_WORKSPACE_PLANS } from "@/lib/business-workspace-plans";

/** Super-admin activation bundle keys (form `activationBundle`). */
export const ACTIVATION_BUNDLE_KEYS = [
  "business_starter",
  "business_scale",
  "business_enterprise",
  "bci_starter",
  "tasks_addon",
  "hrms",
  "crm",
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
  group: "plan" | "product" | "bundle";
};

export const ACTIVATION_BUNDLE_OPTIONS: ActivationBundleOption[] = [
  ...BUSINESS_WORKSPACE_PLANS.map((plan) => ({
    value: plan.bundle,
    label: `${plan.label} — ₹${plan.monthlyInr.toLocaleString("en-IN")}/month`,
    description: "Setup included. GST extra. Monthly plans, no yearly commitment.",
    modules: [...plan.modules],
    group: "plan" as const,
  })),
  {
    value: "bci_starter",
    label: "BCI",
    description: "Own workspace — split FMS, EM Ready, Reports, Approvals. No Tasks.",
    modules: ["FMS", "REPORTS", "APPROVALS"],
    group: "product",
  },
  {
    value: "tasks_addon",
    label: "Tasks",
    description: "Own workspace — task assignment, owners, due dates, scores. Not EA. Not PC.",
    modules: ["TASKS"],
    group: "product",
  },
  {
    value: "hrms",
    label: "HRMS",
    description: "Own workspace — attendance, payroll, field staff, hiring.",
    modules: ["HR"],
    group: "product",
  },
  {
    value: "crm",
    label: "CRM",
    description: "Own workspace — Leads Machine, pipeline, follow-ups, quotations.",
    modules: ["CRM"],
    group: "product",
  },
  {
    value: "bci_with_tasks",
    label: "BCI + Tasks",
    description: "One workspace with FMS bundle plus Tasks. EA and PC stay separate.",
    modules: ["FMS", "REPORTS", "APPROVALS", "TASKS"],
    group: "bundle",
  },
  {
    value: "bci_growth",
    label: "BCI Growth",
    description: "One workspace — BCI FMS + CRM + IMS / Stock + HRMS.",
    modules: ["FMS", "REPORTS", "APPROVALS", "CRM", "IMS", "HR"],
    group: "bundle",
  },
  {
    value: "client_50",
    label: "Full client (50 users)",
    description: "One workspace — Growth + Tasks + Legal (HRMS sold separately).",
    modules: ["FMS", "REPORTS", "APPROVALS", "CRM", "IMS", "TASKS", "CASES"],
    group: "bundle",
  },
];

export const DEFAULT_ACTIVATION_BUNDLE: ActivationBundleKey = "business_starter";

export function isActivationBundleKey(value: string): value is ActivationBundleKey {
  return (ACTIVATION_BUNDLE_KEYS as readonly string[]).includes(value);
}

export function activationBundleLabel(bundle: ActivationBundleKey): string {
  return ACTIVATION_BUNDLE_OPTIONS.find((o) => o.value === bundle)?.label ?? bundle;
}

export function formatAllowedModules(modules: WorkspaceModule[]): string {
  return modules.join(", ");
}
