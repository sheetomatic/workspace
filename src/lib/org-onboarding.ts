import type { OrgPlan, WorkspaceModule } from "@prisma/client";
import {
  allowedModulesForPlan,
  BCI_GROWTH_ALLOWED,
  BCI_STARTER_ALLOWED,
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
  allowedModules: WorkspaceModule[];
  maxMembers: number;
  maxFmsTemplates: number;
};

/** Default entitlements applied when a workspace moves ONBOARDING -> ACTIVE. */
export function client50OnboardingPreset(): ClientOnboardingPreset {
  return {
    plan: "ENTERPRISE",
    allowedModules: [...CLIENT_50_MODULES],
    maxMembers: CLIENT_50_LIMITS.maxMembers,
    maxFmsTemplates: CLIENT_50_LIMITS.maxFmsTemplates,
  };
}

export function planOnboardingPreset(plan: OrgPlan): ClientOnboardingPreset {
  const limits = limitsForPlan(plan);
  return {
    plan,
    allowedModules: allowedModulesForPlan(plan),
    maxMembers: limits.maxMembers,
    maxFmsTemplates: limits.maxFmsTemplates,
  };
}

/** BCI FMS only — no Tasks. Use when client buys the BCI bundle alone. */
export function bciStarterOnboardingPreset(): ClientOnboardingPreset {
  return planOnboardingPreset("BCI_STARTER");
}

/** Tasks / Executive Assistant only — no FMS. */
export function tasksAddonOnboardingPreset(): ClientOnboardingPreset {
  return planOnboardingPreset("TASKS_ADDON");
}

/** Client bought BCI Starter + Tasks add-on (common upsell). */
export function bciWithTasksOnboardingPreset(): ClientOnboardingPreset {
  const bci = planOnboardingPreset("BCI_STARTER");
  return {
    plan: "BCI_STARTER",
    allowedModules: mergeAllowedModules(bci.allowedModules, TASKS_ADDON_ALLOWED),
    maxMembers: bci.maxMembers,
    maxFmsTemplates: bci.maxFmsTemplates,
  };
}

export function organizationEntitlementsData(preset: ClientOnboardingPreset) {
  return {
    plan: preset.plan,
    allowedModules: preset.allowedModules,
    maxMembers: preset.maxMembers,
    maxFmsTemplates: preset.maxFmsTemplates,
  };
}
