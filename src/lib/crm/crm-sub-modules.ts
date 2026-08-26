/** Per-member CRM pipeline sub-module access. Empty = all (backward compatible). */

export type CrmSubModuleId =
  | "leads"
  | "nextTime"
  | "meetings"
  | "quotations"
  | "services"
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
    id: "nextTime",
    label: "Next Time",
    href: "/app/leads/next-time",
    description: "Parked leads to revisit later — kept out of the Leads list.",
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
    id: "services",
    label: "Service Master",
    href: "/app/leads/services",
    description: "Standard services for quotations — add, edit, or hide.",
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
    description: "Students, schedules, and the curriculum you teach.",
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
  if (enabled.length === 0) {
    return [...DEFAULT_ENABLED_CRM_SUB_MODULES];
  }
  const next = [...enabled];
  // Next Time is a parked slice of Leads — keep it with anyone who can see Leads.
  if (next.includes("leads") && !next.includes("nextTime")) {
    next.push("nextTime");
  }
  if (
    (next.includes("quotations") || next.includes("leads")) &&
    !next.includes("services")
  ) {
    next.push("services");
  }
  return next;
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

/** Apply a saved CRM module order; unknown ids stay at the end in current order. */
export function applyCrmModuleOrder<T extends { id: string }>(
  items: T[],
  order: readonly string[] | null | undefined,
): T[] {
  if (!order?.length) {
    return items;
  }
  const rank = new Map(order.map((id, index) => [id, index]));
  return [...items].sort((a, b) => {
    const aRank = rank.has(a.id) ? rank.get(a.id)! : order.length;
    const bRank = rank.has(b.id) ? rank.get(b.id)! : order.length;
    return aRank - bRank;
  });
}

export function moveCrmModuleId(
  ids: string[],
  id: string,
  direction: -1 | 1,
): string[] {
  const index = ids.indexOf(id);
  const nextIndex = index + direction;
  if (index < 0 || nextIndex < 0 || nextIndex >= ids.length) {
    return ids;
  }
  const next = [...ids];
  const swap = next[index];
  next[index] = next[nextIndex]!;
  next[nextIndex] = swap!;
  return next;
}

/** Move `fromId` into `toId`'s slot. */
export function reorderCrmModuleIds(
  ids: string[],
  fromId: string,
  toId: string,
): string[] {
  if (fromId === toId) {
    return ids;
  }
  const from = ids.indexOf(fromId);
  const to = ids.indexOf(toId);
  if (from < 0 || to < 0) {
    return ids;
  }
  const next = [...ids];
  const [moved] = next.splice(from, 1);
  if (!moved) {
    return ids;
  }
  next.splice(to, 0, moved);
  return next;
}

export function firstAllowedCrmHref(enabled: CrmSubModuleId[]): string {
  for (const mod of CRM_SUB_MODULES) {
    if (enabled.includes(mod.id)) {
      return mod.href;
    }
  }
  return "/app";
}
