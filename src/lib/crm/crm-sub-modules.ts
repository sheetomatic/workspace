/** Per-member CRM pipeline sub-module access. Empty = all (backward compatible). */

export type CrmSubModuleId =
  | "leads"
  | "meetings"
  | "quotations"
  | "payments"
  | "projects"
  | "training"
  | "settings";

export type CrmSubModuleDef = {
  id: CrmSubModuleId;
  label: string;
  href: string;
  description: string;
  adminOnly?: boolean;
};

export const CRM_SUB_MODULES = [
  {
    id: "leads",
    label: "Leads",
    href: "/app/leads",
    description: "Lead pipeline, calling, and follow-ups.",
  },
  {
    id: "meetings",
    label: "Meetings",
    href: "/app/leads/meetings",
    description: "Scheduled demos and meeting outcomes.",
  },
  {
    id: "quotations",
    label: "Quotations",
    href: "/app/leads/quotations",
    description: "Proposals and invoices.",
  },
  {
    id: "payments",
    label: "Payments",
    href: "/app/leads/payments",
    description: "Payment tracking and confirmations.",
  },
  {
    id: "projects",
    label: "Projects",
    href: "/app/leads/projects",
    description: "Won deals and delivery projects.",
  },
  {
    id: "training",
    label: "Training",
    href: "/app/leads/training",
    description: "Training schedules and enrollments.",
  },
  {
    id: "settings",
    label: "Lead sources / settings",
    href: "/app/leads/settings",
    description: "Lead source connections and CRM settings.",
    adminOnly: true,
  },
] as const satisfies readonly CrmSubModuleDef[];

const CRM_SUB_MODULE_IDS = new Set<string>(
  CRM_SUB_MODULES.map((m) => m.id),
);

export const DEFAULT_ENABLED_CRM_SUB_MODULES: CrmSubModuleId[] =
  CRM_SUB_MODULES.map((m) => m.id);

export const CRM_SUB_MODULES_NONE = "__none__";

export function isKnownCrmSubModuleId(value: string): value is CrmSubModuleId {
  return CRM_SUB_MODULE_IDS.has(value);
}

export function persistEnabledCrmSubModules(checked: string[]): string[] {
  const enabled = checked.filter(isKnownCrmSubModuleId);
  return enabled.length > 0 ? enabled : [CRM_SUB_MODULES_NONE];
}

/**
 * Member CRM sub-modules. Empty/null = inherit all (backward compatible).
 * Sentinel-only = none.
 */
export function resolveMemberCrmSubModules(
  memberStored: string[] | null | undefined,
): CrmSubModuleId[] {
  if (!memberStored || memberStored.length === 0) {
    return [...DEFAULT_ENABLED_CRM_SUB_MODULES];
  }
  if (
    memberStored.includes(CRM_SUB_MODULES_NONE) &&
    !memberStored.some(isKnownCrmSubModuleId)
  ) {
    return [];
  }
  const enabled = memberStored.filter(isKnownCrmSubModuleId);
  return enabled.length > 0
    ? enabled
    : [...DEFAULT_ENABLED_CRM_SUB_MODULES];
}

export function isMemberCrmSubModuleEnabled(
  memberStored: string[] | null | undefined,
  id: CrmSubModuleId,
): boolean {
  return resolveMemberCrmSubModules(memberStored).includes(id);
}

/** Map `/app/leads/meetings` → `meetings`. Exact `/app/leads` → `leads`. */
export function crmSubModuleIdFromPath(pathname: string): CrmSubModuleId | null {
  const normalized = pathname.replace(/\/+$/, "") || "/";
  if (normalized === "/app/leads") {
    return "leads";
  }
  for (const mod of CRM_SUB_MODULES) {
    if (mod.id === "leads") continue;
    if (
      normalized === mod.href ||
      normalized.startsWith(`${mod.href}/`)
    ) {
      return mod.id;
    }
  }
  return null;
}

export function firstAllowedCrmHref(enabled: CrmSubModuleId[]): string {
  for (const mod of CRM_SUB_MODULES) {
    if (enabled.includes(mod.id)) {
      return mod.href;
    }
  }
  return "/app";
}
