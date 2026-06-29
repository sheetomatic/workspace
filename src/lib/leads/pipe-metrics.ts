import type { InboundLeadStatus } from "@prisma/client";
import {
  defaultPipeValueForCategory,
  formatInr,
  leadCategoryLabel,
} from "@/lib/leads/categories";

type LeadValueRow = {
  status: InboundLeadStatus;
  category: string | null;
  pipeValue: { toNumber(): number } | number | null;
  quotationValue: { toNumber(): number } | number | null;
};

function toNumber(value: LeadValueRow["pipeValue"]) {
  if (value == null) {
    return 0;
  }
  return typeof value === "number" ? value : value.toNumber();
}

export function resolveLeadMonetaryValue(lead: LeadValueRow) {
  const quotation = toNumber(lead.quotationValue);
  if (quotation > 0) {
    return quotation;
  }
  const pipe = toNumber(lead.pipeValue);
  if (pipe > 0) {
    return pipe;
  }
  return defaultPipeValueForCategory(lead.category);
}

export function computePipeMetrics(leads: LeadValueRow[]) {
  const openStatuses: InboundLeadStatus[] = [
    "NEW",
    "CONTACTED",
    "FOLLOW_UP",
    "QUALIFIED",
  ];

  let pipeCount = 0;
  let pipeValue = 0;
  let wonCount = 0;
  let wonValue = 0;
  let lostCount = 0;

  const byCategory = new Map<
    string,
    { count: number; value: number; wonCount: number; wonValue: number }
  >();

  for (const lead of leads) {
    const value = resolveLeadMonetaryValue(lead);
    const categoryKey = lead.category ?? "GENERAL";
    const bucket = byCategory.get(categoryKey) ?? {
      count: 0,
      value: 0,
      wonCount: 0,
      wonValue: 0,
    };
    bucket.count += 1;
    bucket.value += value;
    byCategory.set(categoryKey, bucket);

    if (openStatuses.includes(lead.status)) {
      pipeCount += 1;
      pipeValue += value;
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
    wonCount,
    wonValue,
    wonValueLabel: formatInr(wonValue),
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
