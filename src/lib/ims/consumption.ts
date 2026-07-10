import { prisma } from "@/lib/db";

export type ConsumptionRow = {
  itemId: string;
  code: string;
  name: string;
  uom: string;
  totalIssued: number;
  movementCount: number;
};

export async function getConsumptionReport(
  organizationId: string,
  from: Date,
  to: Date,
): Promise<ConsumptionRow[]> {
  const movements = await prisma.imsStockMovement.findMany({
    where: {
      organizationId,
      movementType: { in: ["ISSUE_TO_PRODUCTION", "FG_OUT", "WASTAGE", "GATE_PASS"] },
      createdAt: { gte: from, lte: to },
      quantity: { gt: 0 },
    },
    include: {
      item: { select: { id: true, code: true, name: true, uom: true } },
    },
  });

  const byItem = new Map<string, ConsumptionRow>();

  for (const movement of movements) {
    const issued = Math.abs(Number(movement.quantity));
    const existing = byItem.get(movement.itemId);
    if (existing) {
      existing.totalIssued += issued;
      existing.movementCount += 1;
    } else {
      byItem.set(movement.itemId, {
        itemId: movement.item.id,
        code: movement.item.code,
        name: movement.item.name,
        uom: movement.item.uom,
        totalIssued: issued,
        movementCount: 1,
      });
    }
  }

  return [...byItem.values()].sort((a, b) => b.totalIssued - a.totalIssued);
}
