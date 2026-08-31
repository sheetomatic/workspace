import type { OrgPlan, WorkspaceModule, WorkspaceProduct } from "@prisma/client";
import {
  allowedModulesForPlan,
  BCI_GROWTH_ALLOWED,
  limitsForPlan,
  mergeAllowedModules,
  TASKS_ADDON_ALLOWED,
} from "@/lib/org-plan-presets";

/** Full client workspace (50 users, HR excluded). Includes BCI core + Tasks + Legal. */
export const CLIENT_50_MODULES: WorkspaceModule[] = mergeAllowedModules(
  BCI_GROWTH_ALLOWED,
  TASKS_ADDON_ALLOWED,
  ["CASES"],
).filter((module) => module !== "HR");

export const CLIENT_50_LIMITS = {
  maxMembers: 50,
  maxFmsTemplates: 15,
} as const;

export type ClientOnboardingPreset = {
  plan: OrgPlan;
  product: WorkspaceProduct;
  allowedModules: WorkspaceModule[];
  maxMembers: number;
  maxFmsTemplates: number;
};

/** Default entitlements applied when a workspace moves ONBOARDING -> ACTIVE. */
export function client50OnboardingPreset(): ClientOnboardingPreset {
  return {
    plan: "ENTERPRISE",
    product: "WORKSPACE",
    allowedModules: [...CLIENT_50_MODULES],
    maxMembers: CLIENT_50_LIMITS.maxMembers,
    maxFmsTemplates: CLIENT_50_LIMITS.maxFmsTemplates,
  };
}

export function planOnboardingPreset(plan: OrgPlan): ClientOnboardingPreset {
  const limits = limitsForPlan(plan);
  return {
    plan,
    product: plan === "BCI_GROWTH" || plan === "BCI_STARTER" ? "BCI" : "WORKSPACE",
    allowedModules: allowedModulesForPlan(plan),
    maxMembers: limits.maxMembers,
    maxFmsTemplates: limits.maxFmsTemplates,
  };
}

/** BCI FMS only — no Tasks. Use when client buys the BCI bundle alone. */
export function bciStarterOnboardingPreset(): ClientOnboardingPreset {
  return planOnboardingPreset("BCI_STARTER");
}

/** Tasks Management only — no FMS, EA, or PC. */
export function tasksAddonOnboardingPreset(): ClientOnboardingPreset {
  const preset = planOnboardingPreset("TASKS_ADDON");
  return { ...preset, product: "TASKS" };
}

/** HRMS only — attendance, payroll, field. Not BCI. */
export function hrmsOnboardingPreset(): ClientOnboardingPreset {
  return {
    plan: "ENTERPRISE",
    product: "HRMS",
    allowedModules: ["HR"],
    maxMembers: 25,
    maxFmsTemplates: 0,
  };
}

/** CRM / Leads Machine only. */
export function crmOnboardingPreset(): ClientOnboardingPreset {
  return {
    plan: "ENTERPRISE",
    product: "CRM",
    allowedModules: ["CRM"],
    maxMembers: 8,
    maxFmsTemplates: 0,
  };
}

/** Client bought BCI Starter + Tasks add-on (common upsell). */
export function bciWithTasksOnboardingPreset(): ClientOnboardingPreset {
  const bci = planOnboardingPreset("BCI_STARTER");
  return {
    plan: "BCI_STARTER",
    product: "BCI",
    allowedModules: mergeAllowedModules(bci.allowedModules, TASKS_ADDON_ALLOWED),
    maxMembers: bci.maxMembers,
    maxFmsTemplates: bci.maxFmsTemplates,
  };
}

export function organizationEntitlementsData(preset: ClientOnboardingPreset) {
  return {
    plan: preset.plan,
    product: preset.product,
    allowedModules: preset.allowedModules,
    maxMembers: preset.maxMembers,
    maxFmsTemplates: preset.maxFmsTemplates,
  };
}
