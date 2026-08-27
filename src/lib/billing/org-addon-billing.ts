import type { PlanBillingPeriod, WorkspaceModule } from "@prisma/client";
import { periodMonths } from "@/lib/billing/catalog";

export type OrgAddonBillingRow = {
  module: WorkspaceModule;
  ratePaise: number;
  billingPeriod: PlanBillingPeriod;
};

/** Monthly equivalent for dashboard totals and prorata invoices. */
export function addonMonthlyEquivalentPaise(row: Pick<OrgAddonBillingRow, "ratePaise" | "billingPeriod">) {
  if (row.ratePaise <= 0) {
    return 0;
  }
  if (row.billingPeriod === "ANNUAL") {
    return Math.round(row.ratePaise / 12);
  }
  return row.ratePaise;
}

export function addonRateLabel(period: PlanBillingPeriod) {
  return period === "ANNUAL" ? "year" : "month";
}

export function addonInvoiceAmountPaise(
  row: Pick<OrgAddonBillingRow, "ratePaise" | "billingPeriod">,
  orgBillingPeriod: PlanBillingPeriod,
) {
  if (row.ratePaise <= 0) {
    return 0;
  }
  if (row.billingPeriod === orgBillingPeriod) {
    return row.ratePaise;
  }
  if (row.billingPeriod === "ANNUAL" && orgBillingPeriod === "MONTHLY") {
    return addonMonthlyEquivalentPaise(row);
  }
  if (row.billingPeriod === "MONTHLY" && orgBillingPeriod === "ANNUAL") {
    return row.ratePaise * periodMonths("ANNUAL");
  }
  return row.ratePaise;
}

export function resolveAddonBilling(
  module: WorkspaceModule,
  catalogRatePaise: number,
  overrides: OrgAddonBillingRow[] | undefined,
  defaultPeriod: PlanBillingPeriod = "MONTHLY",
): OrgAddonBillingRow {
  const hit = overrides?.find((row) => row.module === module);
  if (hit) {
    return hit;
  }
  return {
    module,
    ratePaise: catalogRatePaise,
    billingPeriod: defaultPeriod,
  };
}
