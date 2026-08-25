import type {
  OrgPlan,
  PlanBillingPeriod,
  WorkspaceModule,
  WorkspaceProduct,
} from "@prisma/client";
import {
  emReadyModulePlans,
  emReadyPlans,
} from "@/app/em-ready-plans";
import { rupeesToPaise } from "@/lib/billing/money";

export type BillingRateCard = {
  label: string;
  monthlyRatePaise: number;
  extraUserMonthlyPaise: number;
  includedUsers: number;
  gstPercent: number;
};

const DEFAULT_GST_PERCENT = 18;

function suiteCard(
  planId: (typeof emReadyPlans)[number]["id"],
  fallbackLabel: string,
): BillingRateCard {
  const plan = emReadyPlans.find((row) => row.id === planId);
  return {
    label: plan?.name ?? fallbackLabel,
    monthlyRatePaise: rupeesToPaise(plan?.priceMonthlyInr ?? 0),
    extraUserMonthlyPaise: rupeesToPaise(plan?.extraUserMonthlyInr ?? 0),
    includedUsers: plan?.includedUsers ?? 0,
    gstPercent: DEFAULT_GST_PERCENT,
  };
}

function moduleCard(
  moduleId: (typeof emReadyModulePlans)[number]["id"],
  fallbackLabel: string,
): BillingRateCard {
  const plan = emReadyModulePlans.find((row) => row.id === moduleId);
  return {
    label: plan?.name ?? fallbackLabel,
    monthlyRatePaise: rupeesToPaise(plan?.priceMonthlyInr ?? 0),
    extraUserMonthlyPaise: rupeesToPaise(plan?.extraUserMonthlyInr ?? 0),
    includedUsers: plan?.includedUsers ?? 0,
    gstPercent: DEFAULT_GST_PERCENT,
  };
}

export const SOLD_PRODUCT_LABELS: Record<WorkspaceProduct, string> = {
  BCI: "BCI",
  TASKS: "Tasks",
  HRMS: "HRMS",
  CRM: "CRM",
  APP_BUILDER: "App Builder",
  WORKSPACE: "Workspace suite",
};

export const SOLD_PRODUCT_ORDER: WorkspaceProduct[] = [
  "BCI",
  "TASKS",
  "HRMS",
  "CRM",
  "APP_BUILDER",
  "WORKSPACE",
];

/** Infer the sold SKU when older workspaces still say WORKSPACE. */
export function resolveSoldProduct(org: {
  product?: WorkspaceProduct | null;
  allowedModules?: WorkspaceModule[] | null;
}): WorkspaceProduct {
  if (org.product && org.product !== "WORKSPACE") {
    return org.product;
  }
  const mods = new Set(org.allowedModules ?? []);
  const sellable = (["FMS", "TASKS", "HR", "CRM", "APP_BUILDER"] as const).filter(
    (module) => mods.has(module),
  );
  if (sellable.length === 1) {
    switch (sellable[0]) {
      case "FMS":
        return "BCI";
      case "TASKS":
        return "TASKS";
      case "HR":
        return "HRMS";
      case "CRM":
        return "CRM";
      case "APP_BUILDER":
        return "APP_BUILDER";
    }
  }
  const onlyBciCore = [...mods].every((module) =>
    ["FMS", "REPORTS", "APPROVALS"].includes(module),
  );
  if (mods.has("FMS") && onlyBciCore) return "BCI";
  return org.product ?? "WORKSPACE";
}

export function catalogRateForWorkspace(org: {
  plan: OrgPlan;
  product?: WorkspaceProduct | null;
  allowedModules?: WorkspaceModule[] | null;
}): BillingRateCard {
  const sold = resolveSoldProduct(org);
  switch (sold) {
    case "APP_BUILDER":
      return {
        label: "App Builder",
        monthlyRatePaise: rupeesToPaise(2499),
        extraUserMonthlyPaise: rupeesToPaise(199),
        includedUsers: 25,
        gstPercent: DEFAULT_GST_PERCENT,
      };
    case "TASKS":
      return moduleCard("module_tasks", "Tasks");
    case "HRMS":
      return moduleCard("module_hr", "HRMS");
    case "CRM":
      return moduleCard("module_crm", "CRM");
    case "BCI":
      return catalogRateForPlan(
        org.plan === "BCI_GROWTH" ? "BCI_GROWTH" : "BCI_STARTER",
      );
    default:
      return catalogRateForPlan(org.plan);
  }
}

/** List rates from live /pricing. Ops can override per client. */
export function catalogRateForPlan(plan: OrgPlan): BillingRateCard {
  switch (plan) {
    case "BCI_STARTER":
      return suiteCard("em_ready_starter", "EM Ready Starter");
    case "BCI_GROWTH":
      return suiteCard("em_ready_growth", "EM Ready Growth");
    case "ENTERPRISE":
      return suiteCard("em_ready_scale", "EM Ready Scale");
    case "TASKS_ADDON":
      return moduleCard("module_tasks", "Tasks / EA");
    case "LEGAL_ADDON":
      return {
        label: "Legal add-on",
        monthlyRatePaise: 0,
        extraUserMonthlyPaise: 0,
        includedUsers: 50,
        gstPercent: DEFAULT_GST_PERCENT,
      };
    default:
      return {
        label: "Custom",
        monthlyRatePaise: 0,
        extraUserMonthlyPaise: 0,
        includedUsers: 0,
        gstPercent: DEFAULT_GST_PERCENT,
      };
  }
}

const ADDON_MODULE_RATES: Partial<Record<WorkspaceModule, number>> = {
  FMS: rupeesToPaise(
    emReadyModulePlans.find((row) => row.id === "module_fms")?.priceMonthlyInr ?? 2999,
  ),
  TASKS: rupeesToPaise(
    emReadyModulePlans.find((row) => row.id === "module_tasks")?.priceMonthlyInr ?? 2499,
  ),
  CRM: rupeesToPaise(
    emReadyModulePlans.find((row) => row.id === "module_crm")?.priceMonthlyInr ?? 2999,
  ),
  IMS: rupeesToPaise(
    emReadyModulePlans.find((row) => row.id === "module_ims")?.priceMonthlyInr ?? 2999,
  ),
  HR: rupeesToPaise(10_000),
  APP_BUILDER: rupeesToPaise(2499),
  SOCIAL: rupeesToPaise(2499),
  CASES: 0,
};

export type BillableAddon = {
  module: WorkspaceModule;
  label: string;
  amountPaise: number;
  grantModules: WorkspaceModule[];
};

const BILLABLE_ADDONS: BillableAddon[] = [
  { module: "FMS", label: "FMS Bundle", amountPaise: ADDON_MODULE_RATES.FMS ?? 0, grantModules: ["FMS", "REPORTS", "APPROVALS"] },
  { module: "TASKS", label: "Tasks Management", amountPaise: ADDON_MODULE_RATES.TASKS ?? 0, grantModules: ["TASKS"] },
  { module: "CRM", label: "CRM", amountPaise: ADDON_MODULE_RATES.CRM ?? 0, grantModules: ["CRM"] },
  { module: "IMS", label: "IMS / Stock", amountPaise: ADDON_MODULE_RATES.IMS ?? 0, grantModules: ["IMS"] },
  { module: "HR", label: "HRMS", amountPaise: ADDON_MODULE_RATES.HR ?? 0, grantModules: ["HR"] },
  { module: "APP_BUILDER", label: "App Builder", amountPaise: ADDON_MODULE_RATES.APP_BUILDER ?? 0, grantModules: ["APP_BUILDER"] },
  { module: "SOCIAL", label: "Social", amountPaise: ADDON_MODULE_RATES.SOCIAL ?? 0, grantModules: ["SOCIAL"] },
  { module: "CASES", label: "Legal", amountPaise: ADDON_MODULE_RATES.CASES ?? 0, grantModules: ["CASES"] },
];

export function listBillableAddons() {
  return BILLABLE_ADDONS;
}

export function billableAddonByModule(module: WorkspaceModule) {
  return BILLABLE_ADDONS.find((addon) => addon.module === module) ?? null;
}

export type WorkspaceAddonCharge = {
  module: WorkspaceModule;
  label: string;
  amountPaise: number;
};

export function workspaceAddonCharges(
  modules: WorkspaceModule[],
  plan: OrgPlan,
  product?: WorkspaceProduct | null,
): WorkspaceAddonCharge[] {
  const sold = resolveSoldProduct({ product, allowedModules: modules });
  const included = new Set(modulesIncludedInSoldSku(sold, plan));
  const charges: WorkspaceAddonCharge[] = [];
  for (const addon of BILLABLE_ADDONS) {
    if (!modules.includes(addon.module) || included.has(addon.module)) continue;
    charges.push({
      module: addon.module,
      label: addon.label,
      amountPaise: addon.amountPaise,
    });
  }
  return charges;
}

export function availableWorkspaceAddons(
  modules: WorkspaceModule[],
  plan: OrgPlan,
  product?: WorkspaceProduct | null,
) {
  const sold = resolveSoldProduct({ product, allowedModules: modules });
  const included = new Set(modulesIncludedInSoldSku(sold, plan));
  return BILLABLE_ADDONS.filter(
    (addon) => !modules.includes(addon.module) && !included.has(addon.module),
  );
}

export function extraAddonMonthlyPaise(
  modules: WorkspaceModule[],
  plan: OrgPlan,
  product?: WorkspaceProduct | null,
) {
  return workspaceAddonCharges(modules, plan, product).reduce(
    (sum, row) => sum + row.amountPaise,
    0,
  );
}

function modulesIncludedInSoldSku(
  sold: WorkspaceProduct,
  plan: OrgPlan,
): WorkspaceModule[] {
  switch (sold) {
    case "APP_BUILDER":
      return ["APP_BUILDER"];
    case "TASKS":
      return ["TASKS"];
    case "HRMS":
      return ["HR"];
    case "CRM":
      return ["CRM"];
    case "BCI":
      return plan === "BCI_GROWTH"
        ? ["FMS", "REPORTS", "APPROVALS", "CRM", "IMS", "HR"]
        : ["FMS", "REPORTS", "APPROVALS"];
    default:
      return modulesIncludedInPlan(plan);
  }
}

function modulesIncludedInPlan(plan: OrgPlan): WorkspaceModule[] {
  switch (plan) {
    case "BCI_STARTER":
      return ["FMS", "REPORTS", "APPROVALS", "TASKS"];
    case "BCI_GROWTH":
      return ["FMS", "REPORTS", "APPROVALS", "TASKS", "CRM", "IMS", "HR"];
    case "ENTERPRISE":
      return ["FMS", "REPORTS", "APPROVALS", "TASKS", "CRM", "IMS", "HR"];
    case "TASKS_ADDON":
      return ["TASKS"];
    case "LEGAL_ADDON":
      return ["CASES", "REPORTS"];
    default:
      return [];
  }
}

export function periodMonths(period: PlanBillingPeriod) {
  return period === "ANNUAL" ? 12 : 1;
}
