import type { OrgPlan, Role, WorkspaceModule } from "@prisma/client";
import {
  WORKSPACE_MODULES,
  defaultModulesForRole,
  resolveMemberModules,
} from "@/lib/workspace-modules";

/** BCI FMS core — split flows, EM Ready, approvals, MIS. Tasks sold separately. */
export const BCI_STARTER_ALLOWED: WorkspaceModule[] = [
  "FMS",
  "REPORTS",
  "APPROVALS",
];

export const BCI_GROWTH_ALLOWED: WorkspaceModule[] = [
  ...BCI_STARTER_ALLOWED,
  "IMS",
  "HR",
];

/** Executive Assistant / PC / checklists — standalone module anyone can buy. */
export const TASKS_ADDON_ALLOWED: WorkspaceModule[] = ["TASKS"];

export const BCI_STARTER_LIMITS = {
  maxMembers: 8,
  maxFmsTemplates: 3,
} as const;

export const BCI_GROWTH_LIMITS = {
  maxMembers: 20,
  maxFmsTemplates: 10,
} as const;

export const TASKS_ADDON_LIMITS = {
  maxMembers: 25,
  maxFmsTemplates: 0,
} as const;

/** Legacy orgs keep empty allowedModules until migrated - no tier clamping. */
export function resolveOrgAllowedModules(
  allowedModules: WorkspaceModule[] | null | undefined,
  options?: { isPrimary?: boolean },
): WorkspaceModule[] {
  if (options?.isPrimary) {
    return [...WORKSPACE_MODULES];
  }
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
    case "TASKS_ADDON":
      return [...TASKS_ADDON_ALLOWED];
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
    case "TASKS_ADDON":
      return { ...TASKS_ADDON_LIMITS };
    case "LEGAL_ADDON":
      return { maxMembers: 50, maxFmsTemplates: 0 };
    case "ENTERPRISE":
      return { maxMembers: 999, maxFmsTemplates: 999 };
    default:
      return { maxMembers: 999, maxFmsTemplates: 999 };
  }
}

/** Union module lists when a client buys BCI + Tasks (or other add-ons). */
export function mergeAllowedModules(
  ...moduleSets: WorkspaceModule[][]
): WorkspaceModule[] {
  return [...new Set(moduleSets.flat())];
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
  options?: { isPrimary?: boolean },
): WorkspaceModule[] {
  const orgAllowed = resolveOrgAllowedModules(orgAllowedModules, options);
  if (role === "OWNER") {
    return [...orgAllowed];
  }
  const resolved = resolveMemberModules(role, membershipModules);
  return clampModulesToOrg(resolved, orgAllowed);
}

export const ORG_PLAN_LABELS: Record<OrgPlan, string> = {
  BCI_STARTER: "BCI FMS Starter",
  BCI_GROWTH: "BCI FMS Growth",
  ENTERPRISE: "Enterprise",
  LEGAL_ADDON: "Legal add-on",
  TASKS_ADDON: "Executive Assistant (Tasks)",
};

/** Product packaging labels for sales / onboarding UI. */
export const MODULE_SKU_LABELS = {
  bciCore: "BCI FMS Bundle (FMS + Reports + Approvals)",
  tasksAddon: "Executive Assistant / Tasks add-on",
  bciGrowth: "BCI Growth (+ IMS + HR)",
} as const;
