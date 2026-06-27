import type { OrgPlan, WorkspaceModule } from "@prisma/client";
import {
  allowedModulesForPlan,
  limitsForPlan,
} from "@/lib/org-plan-presets";

/** Standard BCI client workspace (50 users, HR excluded). */
export const CLIENT_50_MODULES: WorkspaceModule[] = [
  "TASKS",
  "FMS",
  "REPORTS",
  "APPROVALS",
  "IMS",
  "CASES",
];

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

/** Default entitlements applied when a workspace moves ONBOARDING ? ACTIVE. */
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

export function organizationEntitlementsData(preset: ClientOnboardingPreset) {
  return {
    plan: preset.plan,
    allowedModules: preset.allowedModules,
    maxMembers: preset.maxMembers,
    maxFmsTemplates: preset.maxFmsTemplates,
  };
}
