import { Decimal } from "@prisma/client/runtime/library";
import { prisma } from "@/lib/db";
import { getUsableQtyMap, recordStockMovement } from "@/lib/ims/ims-store";

function dec(value: number | string): Decimal {
  return new Decimal(value);
}

export async function nextStockCountNumber(organizationId: string) {
  const year = new Date().getFullYear();
  const prefix = `PSC-${year}-`;
  const latest = await prisma.imsPhysicalStockCount.findFirst({
    where: { organizationId, countNumber: { startsWith: prefix } },
    orderBy: { countNumber: "desc" },
    select: { countNumber: true },
  });
  const lastSeq = latest?.countNumber
    ? Number.parseInt(latest.countNumber.slice(prefix.length), 10)
    : 0;
  const next = Number.isFinite(lastSeq) ? lastSeq + 1 : 1;
  return `${prefix}${String(next).padStart(4, "0")}`;
}

export async function listPhysicalStockCounts(organizationId: string) {
  return prisma.imsPhysicalStockCount.findMany({
    where: { organizationId },
    orderBy: { countedAt: "desc" },
    include: {
      createdBy: { select: { name: true, email: true } },
      lines: {
        include: { item: { select: { code: true, name: true, uom: true } } },
        orderBy: { sortOrder: "asc" },
      },
    },
    take: 50,
  });
}

export type PhysicalCountLineInput = {
  itemId: string;
  physicalQty: number;
};

export async function createPhysicalStockCount(params: {
  organizationId: string;
  createdById: string;
  siteName?: string;
  notes?: string;
  lines: PhysicalCountLineInput[];
}) {
  if (params.lines.length === 0) {
    throw new Error("Add at least one counted line.");
  }

  const usableMap = await getUsableQtyMap(params.organizationId);
  const countNumber = await nextStockCountNumber(params.organizationId);

  return prisma.imsPhysicalStockCount.create({
    data: {
      organizationId: params.organizationId,
      countNumber,
      createdById: params.createdById,
      siteName: params.siteName?.trim() || null,
      notes: params.notes?.trim() || null,
      lines: {
        create: params.lines.map((line, index) => ({
          organizationId: params.organizationId,
          itemId: line.itemId,
          systemQty: dec(usableMap[line.itemId] ?? 0),
          physicalQty: dec(line.physicalQty),
          sortOrder: index,
        })),
      },
    },
    include: { lines: true },
  });
}

export async function postPhysicalStockCount(params: {
  organizationId: string;
  countId: string;
  userId: string;
}) {
  const count = await prisma.imsPhysicalStockCount.findFirst({
    where: { id: params.countId, organizationId: params.organizationId, status: "DRAFT" },
    include: { lines: true },
  });
  if (!count) {
    throw new Error("Draft stock count not found.");
  }

  for (const line of count.lines) {
    const variance = Number(line.physicalQty) - Number(line.systemQty);
    if (variance === 0) {
      continue;
    }
    await recordStockMovement({
      organizationId: params.organizationId,
      userId: params.userId,
      itemId: line.itemId,
      movementType: "ADJUSTMENT",
      quantity: variance,
      reference: count.countNumber,
      notes: "Physical stock count variance",
    });
  }

  return prisma.imsPhysicalStockCount.update({
    where: { id: count.id },
    data: { status: "POSTED", postedAt: new Date() },
  });
}
