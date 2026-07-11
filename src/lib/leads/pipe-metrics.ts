import type { InboundLeadStatus } from "@prisma/client";
import { formatInr, leadCategoryLabel, resolveLeadCategoryId } from "@/lib/leads/categories";
import {
  OPEN_LEAD_STATUSES,
  resolveWinProbability,
} from "@/lib/leads/status-labels";

type LeadValueRow = {
  status: InboundLeadStatus;
  category: string | null;
  pipeValue: { toNumber(): number } | number | null;
  quotationValue: { toNumber(): number } | number | null;
  winProbability?: number | null;
};

function toNumber(value: LeadValueRow["pipeValue"]) {
  if (value == null) {
    return 0;
  }
  return typeof value === "number" ? value : value.toNumber();
}

export function resolveLeadMonetaryValue(lead: LeadValueRow) {
  return toNumber(lead.quotationValue);
}

export function computePipeMetrics(leads: LeadValueRow[]) {
  const openStatuses: InboundLeadStatus[] = OPEN_LEAD_STATUSES;

  let pipeCount = 0;
  let pipeValue = 0;
  let forecastValue = 0;
  let wonCount = 0;
  let wonValue = 0;
  let lostCount = 0;
  let invoiceCount = 0;
  let invoiceValue = 0;

  const byCategory = new Map<
    string,
    { count: number; value: number; wonCount: number; wonValue: number }
  >();

  for (const lead of leads) {
    const value = resolveLeadMonetaryValue(lead);
    const categoryKey = resolveLeadCategoryId(lead.category);
    const bucket = byCategory.get(categoryKey) ?? {
      count: 0,
      value: 0,
      wonCount: 0,
      wonValue: 0,
    };
    bucket.count += 1;
    bucket.value += value;
    byCategory.set(categoryKey, bucket);

    if (lead.status === "INVOICE") {
      invoiceCount += 1;
      invoiceValue += value;
    }

    if (openStatuses.includes(lead.status)) {
      pipeCount += 1;
      pipeValue += value;
      const probability = resolveWinProbability(lead.status, lead.winProbability);
      forecastValue += (value * probability) / 100;
    } else if (lead.status === "WON") {
      wonCount += 1;
      wonValue += value;
      bucket.wonCount += 1;
      bucket.wonValue += value;
      byCategory.set(categoryKey, bucket);
    } else if (lead.status === "LOST") {
      lostCount += 1;
    }
  }

  const conversionRate =
    leads.length > 0 ? Math.round((wonCount / leads.length) * 100) : 0;
  const conversionValueRate =
    pipeValue + wonValue > 0 ? Math.round((wonValue / (pipeValue + wonValue)) * 100) : 0;

  return {
    pipeCount,
    pipeValue,
    pipeValueLabel: formatInr(pipeValue),
    forecastValue,
    forecastValueLabel: formatInr(Math.round(forecastValue)),
    wonCount,
    wonValue,
    wonValueLabel: formatInr(wonValue),
    invoiceCount,
    invoiceValue,
    invoiceValueLabel: formatInr(invoiceValue),
    lostCount,
    conversionRate,
    conversionValueRate,
    totalValue: pipeValue + wonValue,
    totalValueLabel: formatInr(pipeValue + wonValue),
    byCategory: Array.from(byCategory.entries())
      .map(([category, stats]) => ({
        category,
        label: leadCategoryLabel(category),
        count: stats.count,
        value: stats.value,
        valueLabel: formatInr(stats.value),
        wonCount: stats.wonCount,
        wonValue: stats.wonValue,
        wonValueLabel: formatInr(stats.wonValue),
      }))
      .sort((a, b) => b.value - a.value),
  };
}
