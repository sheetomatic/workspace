import "server-only";

import { prisma } from "@/lib/db";

export async function nextSalesOrderNumber(organizationId: string) {
  const year = new Date().getFullYear();
  const prefix = `SO:${year}-`;

  const latest = await prisma.salesOrder.findFirst({
    where: {
      organizationId,
      orderNumber: { startsWith: prefix },
    },
    orderBy: { createdAt: "desc" },
    select: { orderNumber: true },
  });

  const match = latest?.orderNumber?.match(/SO:\d{4}-(\d+)/i);
  const seq = match ? Number.parseInt(match[1], 10) + 1 : 1;
  return `${prefix}${String(seq).padStart(5, "0")}`;
}
