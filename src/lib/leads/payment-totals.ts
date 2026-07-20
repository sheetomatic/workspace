import "server-only";

import { prisma } from "@/lib/db";

/** Sum of recorded payments per lead (for Projects / list badges). */
export async function getLeadPaymentTotalsByLeadIds(
  organizationId: string,
  leadIds: string[],
): Promise<Map<string, number>> {
  const unique = [...new Set(leadIds.filter(Boolean))];
  const map = new Map<string, number>();
  if (unique.length === 0) {
    return map;
  }

  const rows = await prisma.inboundLeadPayment.groupBy({
    by: ["leadId"],
    where: { organizationId, leadId: { in: unique } },
    _sum: { receivedAmount: true },
  });

  for (const row of rows) {
    map.set(row.leadId, Number(row._sum.receivedAmount ?? 0));
  }
  return map;
}
