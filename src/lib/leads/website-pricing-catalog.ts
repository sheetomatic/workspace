import {
  STANDARD_MODULE_LIST,
  emReadyImplementationFeeInr,
  emReadyModulePlans,
  emReadyPlans,
  emReadyStorageAddons,
  emReadyWorkspaceBuild,
} from "@/app/em-ready-plans";

export type WebsitePricingKind = "suite" | "module" | "addon";

export type WebsitePricingProduct = {
  id: string;
  kind: WebsitePricingKind;
  category: string;
  name: string;
  period: "monthly" | "annual" | "one_time";
  /** Prefilled base / package amount. */
  defaultAmount: number;
  defaultPerUserCost: number | null;
  defaultUsers: number | null;
};

const WEBSITE_ID_PREFIX = "web:";

export function isWebsitePricingCatalogId(id: string) {
  return id.startsWith(WEBSITE_ID_PREFIX);
}

export function listWebsitePricingProducts(): WebsitePricingProduct[] {
  const products: WebsitePricingProduct[] = [];

  for (const plan of emReadyPlans) {
    if (plan.priceMonthlyInr != null) {
      products.push({
        id: `${WEBSITE_ID_PREFIX}suite:${plan.id}:monthly`,
        kind: "suite",
        category: "EM Ready Suite",
        name: `${plan.name} (monthly)`,
        period: "monthly",
        defaultAmount: plan.priceMonthlyInr,
        defaultPerUserCost: plan.extraUserMonthlyInr,
        defaultUsers: plan.includedUsers,
      });
    }
    if (plan.priceAnnualInr != null) {
      products.push({
        id: `${WEBSITE_ID_PREFIX}suite:${plan.id}:annual`,
        kind: "suite",
        category: "EM Ready Suite",
        name: `${plan.name} (annual)`,
        period: "annual",
        defaultAmount: plan.priceAnnualInr,
        defaultPerUserCost:
          plan.extraUserMonthlyInr != null ? plan.extraUserMonthlyInr * 12 : null,
        defaultUsers: plan.includedUsers,
      });
    }
  }

  for (const plan of emReadyModulePlans) {
    products.push({
      id: `${WEBSITE_ID_PREFIX}module:${plan.id}:monthly`,
      kind: "module",
      category: "Website module",
      name: `${plan.name} (monthly)`,
      period: "monthly",
      defaultAmount: plan.priceMonthlyInr,
      defaultPerUserCost: plan.extraUserMonthlyInr,
      defaultUsers: plan.includedUsers,
    });
    products.push({
      id: `${WEBSITE_ID_PREFIX}module:${plan.id}:annual`,
      kind: "module",
      category: "Website module",
      name: `${plan.name} (annual)`,
      period: "annual",
      defaultAmount: plan.priceAnnualInr,
      defaultPerUserCost: plan.extraUserMonthlyInr * 12,
      defaultUsers: plan.includedUsers,
    });
  }

  products.push({
    id: `${WEBSITE_ID_PREFIX}addon:workspace_build`,
    kind: "addon",
    category: "Setup",
    name: emReadyWorkspaceBuild.label,
    period: "one_time",
    defaultAmount: emReadyWorkspaceBuild.oneTimeInr,
    defaultPerUserCost: null,
    defaultUsers: null,
  });
  products.push({
    id: `${WEBSITE_ID_PREFIX}addon:product_setup`,
    kind: "addon",
    category: "Setup",
    name: "Product setup (standalone module)",
    period: "one_time",
    defaultAmount: STANDARD_MODULE_LIST.productBuildInr,
    defaultPerUserCost: null,
    defaultUsers: null,
  });

  for (const addon of emReadyStorageAddons) {
    products.push({
      id: `${WEBSITE_ID_PREFIX}addon:${addon.id}`,
      kind: "addon",
      category: "Storage add-on",
      name: addon.label,
      period: "monthly",
      defaultAmount: addon.priceMonthlyInr,
      defaultPerUserCost: null,
      defaultUsers: null,
    });
  }

  products.push({
    id: `${WEBSITE_ID_PREFIX}addon:implementation_starter`,
    kind: "addon",
    category: "Implementation",
    name: "Implementation (Starter / Growth)",
    period: "one_time",
    defaultAmount: emReadyImplementationFeeInr.starterGrowth.min,
    defaultPerUserCost: null,
    defaultUsers: null,
  });
  products.push({
    id: `${WEBSITE_ID_PREFIX}addon:implementation_scale`,
    kind: "addon",
    category: "Implementation",
    name: "Implementation (Scale / Enterprise)",
    period: "one_time",
    defaultAmount: emReadyImplementationFeeInr.scaleEnterprise.min,
    defaultPerUserCost: null,
    defaultUsers: null,
  });

  return products;
}

export function findWebsitePricingProduct(id: string) {
  return listWebsitePricingProducts().find((item) => item.id === id) ?? null;
}

export function parseMoneyInput(value: string | undefined) {
  if (value == null || value.trim() === "") {
    return 0;
  }
  const amount = Number.parseFloat(value);
  return Number.isFinite(amount) && amount > 0 ? amount : 0;
}

export function parseCountInput(value: string | undefined) {
  if (value == null || value.trim() === "") {
    return 0;
  }
  const count = Number.parseInt(value, 10);
  return Number.isFinite(count) && count > 0 ? count : 0;
}

/** Line total = base + (per-user cost × users). Empty fields count as 0. */
export function computeWebsitePricingLineTotal(input: {
  amount?: string;
  perUserCost?: string;
  users?: string;
}) {
  const base = parseMoneyInput(input.amount);
  const perUser = parseMoneyInput(input.perUserCost);
  const users = parseCountInput(input.users);
  return base + perUser * users;
}

export function websitePricingLineDescription(
  name: string,
  users: number,
  perUserCost: number,
) {
  if (users > 0 && perUserCost > 0) {
    return `${name} · ${users} users @ ₹${perUserCost.toLocaleString("en-IN")}`;
  }
  if (users > 0) {
    return `${name} · ${users} users`;
  }
  return name;
}
