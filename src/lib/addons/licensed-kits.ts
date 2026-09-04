import { rupeesToPaise } from "@/lib/billing/money";
import type { PlanBillingPeriod } from "@prisma/client";

export const MOBILE_SHOP_KIT_KEY = "mobile-shop-ops";

export type LicensedKitKind = "shop_app" | "module_addon";

export type LicensedKitDefinition = {
  key: string;
  kind: LicensedKitKind;
  name: string;
  shortName: string;
  icp: string;
  description: string;
  priceMonthlyInr: number;
  priceAnnualInr: number;
  shippable: boolean;
  href: string;
  appHref?: string;
};

export const LICENSED_KIT_CATALOG: LicensedKitDefinition[] = [
  {
    key: MOBILE_SHOP_KIT_KEY,
    kind: "shop_app",
    name: "Mobile Shop app",
    shortName: "Mobile shop",
    icp: "Mobile shops — new phones, used/refurbished, repairs, accessories",
    description:
      "Shop-floor app: today’s numbers, stock in/out (IMEI or qty), repair job cards, accessory sell, new and used phone sale. Not a spreadsheet.",
    priceMonthlyInr: 999,
    priceAnnualInr: 9990,
    shippable: true,
    href: "/addons#mobile-shop-ops",
    appHref: "/app/mobile-shop",
  },
  {
    key: "ims-module",
    kind: "module_addon",
    name: "IMS / Stock module",
    shortName: "IMS",
    icp: "Optional extra if the shop wants full IMS besides the floor app",
    description: "Workspace IMS on /pricing. Not the first SKU.",
    priceMonthlyInr: 2999,
    priceAnnualInr: 29990,
    shippable: true,
    href: "/pricing",
  },
  {
    key: "tasks-module",
    kind: "module_addon",
    name: "Tasks Management",
    shortName: "Tasks",
    icp: "Optional extra for owner follow-ups beyond the shop floor",
    description: "Workspace Tasks module on /pricing. Not the first SKU.",
    priceMonthlyInr: 2499,
    priceAnnualInr: 24990,
    shippable: true,
    href: "/pricing",
  },
];

export function listLicensedKits() {
  return LICENSED_KIT_CATALOG;
}

export function listShippableShopKits() {
  return LICENSED_KIT_CATALOG.filter(
    (kit) => kit.kind === "shop_app" && kit.shippable,
  );
}

/** @deprecated Use listShippableShopKits — first SKU is the mobile shop app. */
export function listShippableFmsKits() {
  return listShippableShopKits();
}

export function getLicensedKit(key: string) {
  return LICENSED_KIT_CATALOG.find((kit) => kit.key === key) ?? null;
}

export function licensedKitKeyForPreset(_presetId: string) {
  return null;
}

export function kitCatalogRatePaise(
  kit: Pick<LicensedKitDefinition, "priceMonthlyInr" | "priceAnnualInr">,
  period: PlanBillingPeriod,
) {
  return rupeesToPaise(
    period === "ANNUAL" ? kit.priceAnnualInr : kit.priceMonthlyInr,
  );
}

export type LicensedKitBillingRow = {
  kitKey: string;
  status: "REQUESTED" | "ACTIVE" | "PAST_DUE" | "CANCELLED";
  billingPeriod: PlanBillingPeriod;
  ratePaise: number;
};

export function isKitInstallAllowed(
  status: LicensedKitBillingRow["status"] | null | undefined,
) {
  return status === "ACTIVE";
}

export function kitInvoiceLabel(name: string) {
  return `${name} license`;
}

export function kitInvoiceCharges(
  rows: LicensedKitBillingRow[],
  orgBillingPeriod: PlanBillingPeriod = "MONTHLY",
) {
  const charges: Array<{
    kitKey: string;
    label: string;
    amountPaise: number;
    ratePaise: number;
    billingPeriod: PlanBillingPeriod;
  }> = [];

  for (const row of rows) {
    if (row.status !== "REQUESTED" && row.status !== "ACTIVE") continue;
    const kit = getLicensedKit(row.kitKey);
    if (!kit || kit.kind === "module_addon") continue;
    const period = row.billingPeriod || orgBillingPeriod;
    const ratePaise =
      row.ratePaise > 0 ? row.ratePaise : kitCatalogRatePaise(kit, period);
    let amountPaise = ratePaise;
    if (period === "ANNUAL" && orgBillingPeriod === "MONTHLY") {
      amountPaise = Math.round(ratePaise / 12);
    } else if (period === "MONTHLY" && orgBillingPeriod === "ANNUAL") {
      amountPaise = ratePaise * 12;
    }
    if (amountPaise <= 0) continue;
    charges.push({
      kitKey: row.kitKey,
      label: kitInvoiceLabel(kit.name),
      amountPaise,
      ratePaise,
      billingPeriod: period,
    });
  }
  return charges;
}
