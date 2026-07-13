/** Org-level HR sub-module catalog and enable/disable helpers. EA/PC stay under TASKS — not listed here. */

export type HrSubModuleId =
  | "attendance"
  | "leave"
  | "employees"
  | "payroll"
  | "holidays"
  | "field"
  | "hiring";

export type HrSubModuleDef = {
  id: HrSubModuleId;
  label: string;
  href: string;
  description: string;
  adminOnly?: boolean;
};

export const HR_SUB_MODULES = [
  {
    id: "attendance",
    label: "Attendance",
    href: "/app/hr/attendance",
    description: "Geo check-in, daily punches, and month calendar.",
  },
  {
    id: "leave",
    label: "Leave",
    href: "/app/hr/leave",
    description: "Leave apply, balances, OD/WFH, and approvals.",
  },
  {
    id: "employees",
    label: "Employees",
    href: "/app/hr/employees",
    description: "Employee profiles, salary components, and documents.",
  },
  {
    id: "payroll",
    label: "Payroll & salary slips",
    href: "/app/hr/payroll",
    description: "Payroll runs and salary slips from attendance.",
  },
  {
    id: "holidays",
    label: "Holidays",
    href: "/app/hr/holidays",
    description: "Org holiday calendar for attendance and leave.",
    adminOnly: true,
  },
  {
    id: "field",
    label: "Field tracking",
    href: "/app/hr/field",
    description: "Field visits, geo punches, and live trail.",
  },
  {
    id: "hiring",
    label: "Hiring",
    href: "/app/hr/hiring",
    description: "Job openings, candidates, and hiring docs.",
  },
] as const satisfies readonly HrSubModuleDef[];

const HR_SUB_MODULE_IDS = new Set<string>(
  HR_SUB_MODULES.map((m) => m.id),
);

/** All known sub-modules — empty/null DB array means “use defaults” for backward compat. */
export const DEFAULT_ENABLED_HR_SUB_MODULES: HrSubModuleId[] =
  HR_SUB_MODULES.map((m) => m.id);

/**
 * Sentinel written when admin explicitly saves with zero checkboxes.
 * Distinguishes “never configured” (`[]`) from “all disabled”.
 */
export const HR_SUB_MODULES_NONE = "__none__";

export function isKnownHrSubModuleId(value: string): value is HrSubModuleId {
  return HR_SUB_MODULE_IDS.has(value);
}

/** Persist form checkbox values (empty → sentinel so resolve does not treat as defaults). */
export function persistEnabledHrSubModules(
  checked: string[],
): string[] {
  const enabled = checked.filter(isKnownHrSubModuleId);
  return enabled.length > 0 ? enabled : [HR_SUB_MODULES_NONE];
}

export function resolveEnabledHrSubModules(
  stored: string[] | null | undefined,
): HrSubModuleId[] {
  if (!stored || stored.length === 0) {
    return [...DEFAULT_ENABLED_HR_SUB_MODULES];
  }
  if (stored.includes(HR_SUB_MODULES_NONE) && !stored.some(isKnownHrSubModuleId)) {
    return [];
  }
  const enabled = stored.filter(isKnownHrSubModuleId);
  return enabled.length > 0 ? enabled : [...DEFAULT_ENABLED_HR_SUB_MODULES];
}

export function isHrSubModuleEnabled(
  stored: string[] | null | undefined,
  id: HrSubModuleId,
): boolean {
  return resolveEnabledHrSubModules(stored).includes(id);
}

/** Map `/app/hr/attendance` → `attendance`. Overview `/app/hr` → null (always allowed). */
export function hrSubModuleIdFromPath(pathname: string): HrSubModuleId | null {
  const normalized = pathname.replace(/\/+$/, "") || "/";
  if (normalized === "/app/hr") {
    return null;
  }
  for (const mod of HR_SUB_MODULES) {
    if (
      normalized === mod.href ||
      normalized.startsWith(`${mod.href}/`)
    ) {
      return mod.id;
    }
  }
  return null;
}

/** Returns true when enabled; false when disabled (caller should redirect). */
export function requireHrSubModule(
  stored: string[] | null | undefined,
  id: HrSubModuleId,
): boolean {
  return isHrSubModuleEnabled(stored, id);
}
