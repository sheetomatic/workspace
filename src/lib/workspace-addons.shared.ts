import type { WorkspaceModule } from "@prisma/client";
import {
  BCI_STARTER_ALLOWED,
  TASKS_ADDON_ALLOWED,
} from "@/lib/org-plan-presets";

export type WorkspaceAddonKey =
  | "bci_fms"
  | "tasks"
  | "crm"
  | "ims"
  | "hr"
  | "approvals"
  | "reports"
  | "legal";

export type WorkspaceAddonDefinition = {
  key: WorkspaceAddonKey;
  module: WorkspaceModule;
  label: string;
  shortLabel: string;
  description: string;
  /** Included in BCI FMS Starter - not sold separately. */
  isBciCore: boolean;
};

export const WORKSPACE_ADDON_CATALOG: WorkspaceAddonDefinition[] = [
  {
    key: "bci_fms",
    module: "FMS",
    label: "BCI FMS",
    shortLabel: "FMS",
    description: "Split flows, step ownership, and FMS setup.",
    isBciCore: true,
  },
  {
    key: "reports",
    module: "REPORTS",
    label: "Reports and EM",
    shortLabel: "Reports",
    description: "MIS dashboards and EM Ready scorecards.",
    isBciCore: true,
  },
  {
    key: "approvals",
    module: "APPROVALS",
    label: "Approvals",
    shortLabel: "Approvals",
    description: "Manager sign-off on FMS steps and requests.",
    isBciCore: true,
  },
  {
    key: "tasks",
    module: "TASKS",
    label: "Tasks / EA add-on",
    shortLabel: "Tasks",
    description: "Tasks delegation, PC checklists, and PMS scores.",
    isBciCore: false,
  },
  {
    key: "crm",
    module: "CRM",
    label: "CRM add-on",
    shortLabel: "CRM",
    description: "Leads Machine, pipeline, follow-ups, and quotations.",
    isBciCore: false,
  },
  {
    key: "ims",
    module: "IMS",
    label: "IMS / Stock add-on",
    shortLabel: "IMS / Stock",
    description: "Inventory, reorder alerts, and stock control.",
    isBciCore: false,
  },
  {
    key: "hr",
    module: "HR",
    label: "HRMS add-on",
    shortLabel: "HRMS",
    description: "Attendance, payroll, field staff, and hiring workflows.",
    isBciCore: false,
  },
  {
    key: "legal",
    module: "CASES",
    label: "Legal / Hingorani add-on",
    shortLabel: "Legal",
    description: "MACT case files, hearings, and document vault.",
    isBciCore: false,
  },
];

export const BCI_CORE_MODULES: WorkspaceModule[] = [...BCI_STARTER_ALLOWED];

export function addonCatalogByModule(module: WorkspaceModule) {
  return WORKSPACE_ADDON_CATALOG.find((item) => item.module === module);
}

export function isAddonEnabled(
  allowedModules: WorkspaceModule[],
  addon: WorkspaceAddonDefinition,
) {
  return allowedModules.includes(addon.module);
}

export function listEnabledAddons(allowedModules: WorkspaceModule[]) {
  return WORKSPACE_ADDON_CATALOG.filter((addon) =>
    isAddonEnabled(allowedModules, addon),
  );
}

export function listOptionalAddons(allowedModules: WorkspaceModule[]) {
  return WORKSPACE_ADDON_CATALOG.filter(
    (addon) => !addon.isBciCore && isAddonEnabled(allowedModules, addon),
  );
}

export function listPurchasableAddons() {
  return WORKSPACE_ADDON_CATALOG.filter((addon) => !addon.isBciCore);
}

export function parseAddonModulesFromForm(formData: FormData): WorkspaceModule[] {
  const selected = new Set<WorkspaceModule>();
  const bciCore = formData.get("bciCore") === "on";
  if (bciCore) {
    BCI_CORE_MODULES.forEach((module) => selected.add(module));
  }
  for (const addon of listPurchasableAddons()) {
    if (formData.get(`addon_${addon.key}`) === "on") {
      selected.add(addon.module);
    }
  }
  return [...selected];
}

/** Default demo entitlements: BCI core only (Tasks sold separately). */
export const DEFAULT_BCI_ORG_MODULES: WorkspaceModule[] = [...BCI_STARTER_ALLOWED];

/** Tasks-only workspace. */
export const DEFAULT_TASKS_ORG_MODULES: WorkspaceModule[] = [
  ...TASKS_ADDON_ALLOWED,
];
