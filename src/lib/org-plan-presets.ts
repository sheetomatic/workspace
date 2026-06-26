import type { OrgPlan, Role, WorkspaceModule } from "@prisma/client";
import {
  defaultModulesForRole,
  resolveMemberModules,
  WORKSPACE_MODULES,
} from "@/lib/workspace-modules";

export const BCI_STARTER_ALLOWED: WorkspaceModule[] = [
  "TASKS",
  "FMS",
  "REPORTS",
  "APPROVALS",
];

export const BCI_GROWTH_ALLOWED: WorkspaceModule[] = [
  ...BCI_STARTER_ALLOWED,
  "IMS",
  "HR",
];

export const BCI_STARTER_LIMITS = {
  maxMembers: 8,
  maxFmsTemplates: 3,
} as const;

export const BCI_GROWTH_LIMITS = {
  maxMembers: 20,
  maxFmsTemplates: 10,
} as const;

/** Legacy orgs keep empty allowedModules until migrated - no tier clamping. */
export function resolveOrgAllowedModules(
  allowedModules: WorkspaceModule[] | null | undefined,
): WorkspaceModule[] {
  if (!allowedModules || allowedModules.length === 0) {
    return [...WORKSPACE_MODULES];
  }
  return [...allowedModules];
}

export function isOrgTierEnforced(
  allowedModules: WorkspaceModule[] | null | undefined,
): boolean {
  return Boolean(allowedModules && allowedModules.length > 0);
}

export function allowedModulesForPlan(plan: OrgPlan): WorkspaceModule[] {
  switch (plan) {
    case "BCI_STARTER":
      return [...BCI_STARTER_ALLOWED];
    case "BCI_GROWTH":
      return [...BCI_GROWTH_ALLOWED];
    case "LEGAL_ADDON":
      return ["CASES", "TASKS"];
    case "ENTERPRISE":
      return [...WORKSPACE_MODULES];
    default:
      return [...WORKSPACE_MODULES];
  }
}

export function limitsForPlan(plan: OrgPlan) {
  switch (plan) {
    case "BCI_STARTER":
      return { ...BCI_STARTER_LIMITS };
    case "BCI_GROWTH":
      return { ...BCI_GROWTH_LIMITS };
    case "LEGAL_ADDON":
      return { maxMembers: 50, maxFmsTemplates: 0 };
    case "ENTERPRISE":
      return { maxMembers: 999, maxFmsTemplates: 999 };
    default:
      return { maxMembers: 999, maxFmsTemplates: 999 };
  }
}

/** Default member modules for a role, clamped to org tier. */
export function modulesForTierRole(plan: OrgPlan, role: Role): WorkspaceModule[] {
  const tierAllowed = new Set(allowedModulesForPlan(plan));
  return defaultModulesForRole(role).filter((module) => tierAllowed.has(module));
}

export function clampModulesToOrg(
  modules: WorkspaceModule[],
  orgAllowedModules: WorkspaceModule[] | null | undefined,
): WorkspaceModule[] {
  const allowed = new Set(resolveOrgAllowedModules(orgAllowedModules));
  return modules.filter((module) => allowed.has(module));
}

/** Intersect membership modules with org tier (legacy empty = all modules). */
export function effectiveMemberModules(
  role: Role,
  membershipModules: WorkspaceModule[] | null | undefined,
  orgAllowedModules: WorkspaceModule[] | null | undefined,
): WorkspaceModule[] {
  const resolved = resolveMemberModules(role, membershipModules);
  return clampModulesToOrg(resolved, orgAllowedModules);
}

export const ORG_PLAN_LABELS: Record<OrgPlan, string> = {
  BCI_STARTER: "BCI FMS Starter",
  BCI_GROWTH: "BCI FMS Growth",
  ENTERPRISE: "Enterprise",
  LEGAL_ADDON: "Legal add-on",
};
