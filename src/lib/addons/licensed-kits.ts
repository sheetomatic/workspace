import { rupeesToPaise } from "@/lib/billing/money";
import type { PlanBillingPeriod } from "@prisma/client";

export type LicensedKitKey =
  | "workshop-job-card"
  | "clinic-visit-to-collection"
  | "jewellery-order-to-delivery";

export type LicensedKitKind = "fms_kit" | "module_addon";

export type LicensedKitDefinition = {
  key: LicensedKitKey | "ims-module" | "tasks-module";
  kind: LicensedKitKind;
  /** Native FMS workflow id. Empty for module add-ons already in /pricing. */
  presetId: string;
  name: string;
  shortName: string;
  icp: string;
  description: string;
  priceMonthlyInr: number;
  priceAnnualInr: number;
  /** Ready to install in this repo. */
  shippable: boolean;
  href: string;
};

export const LICENSED_KIT_CATALOG: LicensedKitDefinition[] = [
  {
    key: "workshop-job-card",
    kind: "fms_kit",
    presetId: "workshop-job-card",
    name: "Repair Workshop Job Card FMS",
    shortName: "Job Card",
    icp: "Electronic workshop / mobile & computer repair",
    description:
      "Device in, diagnose, estimate, repair, QC, collect, deliver. Native FMS with in-app job form — not a Google Form, not a Sheet.",
    priceMonthlyInr: 999,
    priceAnnualInr: 9990,
    shippable: true,
    href: "/addons#workshop-job-card",
  },
  {
    key: "clinic-visit-to-collection",
    kind: "fms_kit",
    presetId: "clinic-visit-to-collection",
    name: "Clinic Visit-to-Collection FMS",
    shortName: "Clinic visits",
    icp: "Doctors / clinics",
    description:
      "Appointment through consult, follow-up, bill, and collection. Next licensed kit after Job Card.",
    priceMonthlyInr: 999,
    priceAnnualInr: 9990,
    shippable: false,
    href: "/addons#clinic-visit-to-collection",
  },
  {
    key: "jewellery-order-to-delivery",
    kind: "fms_kit",
    presetId: "jewellery-order-to-delivery",
    name: "Jewellery Order-to-Delivery FMS",
    shortName: "Jewellery orders",
    icp: "Jewellery shops",
    description:
      "Order booking (weight, making, stone) through workshop, QC, delivery, and balance collection.",
    priceMonthlyInr: 1499,
    priceAnnualInr: 14990,
    shippable: false,
    href: "/addons#jewellery-order-to-delivery",
  },
  {
    key: "ims-module",
    kind: "module_addon",
    presetId: "",
    name: "IMS / Stock add-on",
    shortName: "IMS",
    icp: "Furniture, electronics, jewellery, manufacturing (not grocery)",
    description:
      "Inventory, reorder exceptions, stock in/out. Already on /pricing — enable IMS on the workspace.",
    priceMonthlyInr: 2999,
    priceAnnualInr: 29990,
    shippable: true,
    href: "/pricing",
  },
  {
    key: "tasks-module",
    kind: "module_addon",
    presetId: "",
    name: "Tasks Management add-on",
    shortName: "Tasks",
    icp: "Any ICP workspace that bought FMS-only",
    description:
      "Assignment, owners, due dates, scores. Already on /pricing as a module.",
    priceMonthlyInr: 2499,
    priceAnnualInr: 24990,
    shippable: true,
    href: "/pricing",
  },
];

export function listLicensedKits() {
  return LICENSED_KIT_CATALOG;
}

export function listShippableFmsKits() {
  return LICENSED_KIT_CATALOG.filter(
    (kit) => kit.kind === "fms_kit" && kit.shippable,
  );
}

export function getLicensedKit(key: string) {
  return LICENSED_KIT_CATALOG.find((kit) => kit.key === key) ?? null;
}

export function licensedKitKeyForPreset(presetId: string) {
  const kit = LICENSED_KIT_CATALOG.find(
    (row) => row.kind === "fms_kit" && row.presetId === presetId && row.shippable,
  );
  return kit?.key ?? null;
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

/** REQUESTED and ACTIVE kits appear on the workspace invoice. */
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
    if (!kit || kit.kind !== "fms_kit") continue;
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
