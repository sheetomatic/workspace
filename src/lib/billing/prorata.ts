import type { SubscriptionInvoiceKind } from "@prisma/client";
import {
  periodLengthDays,
  remainingDaysInclusive,
} from "@/lib/billing/dates";
import { applyGst } from "@/lib/billing/money";

export type InvoiceLineItem = {
  kind: "base" | "extra_users" | "prorata" | "addon" | "other";
  label: string;
  quantity: number;
  unitPaise: number;
  amountPaise: number;
};

export type QuoteAddonLine = {
  label: string;
  amountPaise: number;
};

export type QuoteInput = {
  monthlyRatePaise: number;
  extraUserMonthlyPaise: number;
  includedUsers: number;
  activeUsers: number;
  extraAddonPaise?: number;
  extraAddonLines?: QuoteAddonLine[];
  gstPercent: number;
  periodStart: Date;
  periodEnd: Date;
  asOf?: Date;
  prorate: boolean;
};

export type InvoiceQuote = {
  kind: SubscriptionInvoiceKind;
  lineItems: InvoiceLineItem[];
  subtotalPaise: number;
  extraPaise: number;
  gstPaise: number;
  totalPaise: number;
  fraction: number;
  extraUsers: number;
};

export function prorataFraction(
  periodStart: Date,
  periodEnd: Date,
  asOf: Date,
) {
  const total = periodLengthDays(periodStart, periodEnd);
  const remaining = remainingDaysInclusive(asOf, periodEnd);
  if (remaining >= total) return 1;
  return remaining / total;
}

export function extraUsers(activeUsers: number, includedUsers: number) {
  return Math.max(0, activeUsers - includedUsers);
}

export function buildInvoiceQuote(input: QuoteInput): InvoiceQuote {
  const asOf = input.asOf ?? input.periodStart;
  const fraction = input.prorate
    ? prorataFraction(input.periodStart, input.periodEnd, asOf)
    : 1;
  const extras = extraUsers(input.activeUsers, input.includedUsers);
  const scale = (amount: number) => Math.round(amount * fraction);

  const baseAmount = scale(input.monthlyRatePaise);
  const extraAmount = scale(input.extraUserMonthlyPaise * extras);
  const addonLines =
    input.extraAddonLines?.filter((line) => line.amountPaise > 0) ??
    (input.extraAddonPaise && input.extraAddonPaise > 0
      ? [{ label: "Add-on modules", amountPaise: input.extraAddonPaise }]
      : []);
  const addonAmount = scale(addonLines.reduce((sum, line) => sum + line.amountPaise, 0));

  const lineItems: InvoiceLineItem[] = [];
  if (baseAmount > 0 || input.monthlyRatePaise > 0) {
    lineItems.push({
      kind: input.prorate && fraction < 1 ? "prorata" : "base",
      label:
        input.prorate && fraction < 1
          ? `Workspace plan (prorata ${Math.round(fraction * 100)}%)`
          : "Workspace plan",
      quantity: 1,
      unitPaise: input.monthlyRatePaise,
      amountPaise: baseAmount,
    });
  }
  if (extras > 0 && input.extraUserMonthlyPaise > 0) {
    lineItems.push({
      kind: "extra_users",
      label: `Extra users beyond ${input.includedUsers} included`,
      quantity: extras,
      unitPaise: scale(input.extraUserMonthlyPaise),
      amountPaise: extraAmount,
    });
  }
  for (const line of addonLines) {
    const amount = scale(line.amountPaise);
    if (amount <= 0) continue;
    lineItems.push({
      kind: "addon",
      label:
        input.prorate && fraction < 1 ? `${line.label} (prorata)` : line.label,
      quantity: 1,
      unitPaise: line.amountPaise,
      amountPaise: amount,
    });
  }

  const extraPaise = extraAmount + addonAmount;
  const subtotalPaise = baseAmount;
  const taxable = subtotalPaise + extraPaise;
  const gst = applyGst(taxable, input.gstPercent);

  return {
    kind:
      extras > 0 || addonAmount > 0
        ? input.prorate && fraction < 1
          ? "PRORATA"
          : "EXTRA"
        : input.prorate && fraction < 1
          ? "PRORATA"
          : "CYCLE",
    lineItems,
    subtotalPaise,
    extraPaise,
    gstPaise: gst.gstPaise,
    totalPaise: gst.totalPaise,
    fraction,
    extraUsers: extras,
  };
}
