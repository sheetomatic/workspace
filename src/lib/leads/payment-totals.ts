import "server-only";

import { prisma } from "@/lib/db";
import { isLeadPaymentAdjustment } from "@/lib/leads/payment-summary";

export type LeadPaymentSplit = {
  collected: number;
  adjusted: number;
};

export function leadPaymentApplied(split: LeadPaymentSplit | undefined) {
  if (!split) return 0;
  return Math.round((split.collected + split.adjusted) * 100) / 100;
}

/** Cash collected and invoice adjustments per lead (never mixed). */
export async function getLeadPaymentTotalsByLeadIds(
  organizationId: string,
  leadIds: string[],
): Promise<Map<string, LeadPaymentSplit>> {
  const unique = [...new Set(leadIds.filter(Boolean))];
  const map = new Map<string, LeadPaymentSplit>();
  if (unique.length === 0) {
    return map;
  }

  const rows = await prisma.inboundLeadPayment.groupBy({
    by: ["leadId", "paymentType"],
    where: { organizationId, leadId: { in: unique } },
    _sum: { receivedAmount: true },
  });

  for (const row of rows) {
    const amount = Number(row._sum.receivedAmount ?? 0);
    const current = map.get(row.leadId) ?? { collected: 0, adjusted: 0 };
    if (isLeadPaymentAdjustment(row.paymentType)) {
      current.adjusted += amount;
    } else {
      current.collected += amount;
    }
    map.set(row.leadId, current);
  }
  return map;
}
