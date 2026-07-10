import { Decimal } from "@prisma/client/runtime/library";
import type { ImsPurchaseOrderStatus, Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";

function dec(value: number | string): Decimal {
  return new Decimal(value);
}

export async function nextPoNumber(organizationId: string) {
  const year = new Date().getFullYear();
  const prefix = `PO-${year}-`;
  const latest = await prisma.imsPurchaseOrder.findFirst({
    where: { organizationId, poNumber: { startsWith: prefix } },
    orderBy: { poNumber: "desc" },
    select: { poNumber: true },
  });
  const lastSeq = latest?.poNumber
    ? Number.parseInt(latest.poNumber.slice(prefix.length), 10)
    : 0;
  const next = Number.isFinite(lastSeq) ? lastSeq + 1 : 1;
  return `${prefix}${String(next).padStart(4, "0")}`;
}

export async function listApprovedIndentsForPo(organizationId: string) {
  return prisma.imsIndent.findMany({
    where: { organizationId, status: "APPROVED" },
    orderBy: { createdAt: "desc" },
    include: {
      vendor: { select: { id: true, name: true, code: true } },
      requisition: { select: { id: true, requisitionNumber: true } },
      lines: {
        include: { item: { select: { id: true, code: true, name: true, uom: true } } },
        orderBy: { sortOrder: "asc" },
      },
    },
    take: 50,
  });
}

export async function listPurchaseOrders(
  organizationId: string,
  status?: ImsPurchaseOrderStatus,
) {
  return prisma.imsPurchaseOrder.findMany({
    where: { organizationId, ...(status ? { status } : {}) },
    orderBy: { createdAt: "desc" },
    include: {
      vendor: { select: { id: true, name: true, code: true } },
      indent: { select: { id: true, indentNumber: true } },
      createdBy: { select: { name: true, email: true } },
      approvedBy: { select: { name: true, email: true } },
      lines: {
        include: { item: { select: { id: true, code: true, name: true, uom: true } } },
        orderBy: { sortOrder: "asc" },
      },
    },
    take: 100,
  });
}

export async function getPurchaseOrder(organizationId: string, purchaseOrderId: string) {
  return prisma.imsPurchaseOrder.findFirst({
    where: { id: purchaseOrderId, organizationId },
    include: {
      vendor: { select: { id: true, name: true, code: true } },
      indent: { select: { id: true, indentNumber: true } },
      lines: {
        include: { item: { select: { id: true, code: true, name: true, uom: true } } },
        orderBy: { sortOrder: "asc" },
      },
    },
  });
}

export type PurchaseOrderLineInput = {
  itemId: string;
  quantity: number;
  rate?: number;
  notes?: string;
};

export async function createPurchaseOrder(params: {
  organizationId: string;
  createdById: string;
  indentId?: string | null;
  vendorId?: string | null;
  siteName?: string;
  expectedDeliveryDate?: Date | null;
  notes?: string;
  lines: PurchaseOrderLineInput[];
  submitForApproval?: boolean;
}) {
  const resolved = await resolvePoLines({
    organizationId: params.organizationId,
    indentId: params.indentId,
    lines: params.lines,
  });

  if (resolved.lines.length === 0) {
    throw new Error("Add at least one item line.");
  }

  const poNumber = await nextPoNumber(params.organizationId);
  const status: ImsPurchaseOrderStatus = params.submitForApproval ? "PENDING" : "DRAFT";
  const vendorId = params.vendorId || resolved.vendorId || null;
  const siteName = params.siteName?.trim() || resolved.siteName || null;

  return prisma.imsPurchaseOrder.create({
    data: {
      organizationId: params.organizationId,
      poNumber,
      status,
      indentId: params.indentId || null,
      vendorId,
      siteName,
      expectedDeliveryDate: params.expectedDeliveryDate ?? null,
      notes: params.notes?.trim() || null,
      createdById: params.createdById,
      lines: {
        create: resolved.lines.map((line, index) => ({
          organizationId: params.organizationId,
          itemId: line.itemId,
          quantity: dec(line.quantity),
          rate: line.rate != null ? dec(line.rate) : null,
          notes: line.notes?.trim() || null,
          sortOrder: index,
        })),
      },
    },
    include: { lines: { include: { item: true } } },
  });
}

async function resolvePoLines(params: {
  organizationId: string;
  indentId?: string | null;
  lines: PurchaseOrderLineInput[];
}) {
  let lines = params.lines;

  if (params.indentId) {
    const indent = await prisma.imsIndent.findFirst({
      where: {
        id: params.indentId,
        organizationId: params.organizationId,
        status: "APPROVED",
      },
      include: { lines: true },
    });
    if (!indent) {
      throw new Error("Approved indent not found.");
    }
    if (lines.length === 0) {
      lines = indent.lines.map((line) => ({
        itemId: line.itemId,
        quantity: Number(line.quantity),
        rate: line.rate != null ? Number(line.rate) : undefined,
        notes: line.notes ?? undefined,
      }));
    }
    return { lines, vendorId: indent.vendorId, siteName: indent.siteName };
  }

  return { lines, vendorId: null as string | null, siteName: null as string | null };
}

export async function updatePurchaseOrder(params: {
  organizationId: string;
  purchaseOrderId: string;
  indentId?: string | null;
  siteName?: string;
  expectedDeliveryDate?: Date | null;
  notes?: string;
  lines: PurchaseOrderLineInput[];
  submitForApproval?: boolean;
}) {
  const existing = await prisma.imsPurchaseOrder.findFirst({
    where: {
      id: params.purchaseOrderId,
      organizationId: params.organizationId,
      status: "DRAFT",
    },
  });
  if (!existing) {
    throw new Error("Only draft purchase orders can be edited.");
  }

  const resolved = await resolvePoLines({
    organizationId: params.organizationId,
    indentId: params.indentId,
    lines: params.lines,
  });

  let lines = resolved.lines;
  if (lines.length === 0) {
    const existingLines = await prisma.imsPurchaseOrderLine.findMany({
      where: { purchaseOrderId: existing.id, organizationId: params.organizationId },
      orderBy: { sortOrder: "asc" },
    });
    lines = existingLines.map((line) => ({
      itemId: line.itemId,
      quantity: Number(line.quantity),
      rate: line.rate != null ? Number(line.rate) : undefined,
      notes: line.notes ?? undefined,
    }));
  }

  if (lines.length === 0) {
    throw new Error("Add at least one item line.");
  }

  const siteName = params.siteName?.trim() || resolved.siteName || existing.siteName;
  const vendorId = resolved.vendorId ?? existing.vendorId ?? null;

  const status: ImsPurchaseOrderStatus = params.submitForApproval ? "PENDING" : "DRAFT";

  await prisma.imsPurchaseOrderLine.deleteMany({
    where: { purchaseOrderId: existing.id, organizationId: params.organizationId },
  });

  return prisma.imsPurchaseOrder.update({
    where: { id: existing.id },
    data: {
      status,
      indentId: params.indentId || null,
      vendorId,
      siteName,
      expectedDeliveryDate: params.expectedDeliveryDate ?? null,
      notes: params.notes?.trim() || null,
      lines: {
        create: lines.map((line, index) => ({
          organizationId: params.organizationId,
          itemId: line.itemId,
          quantity: dec(line.quantity),
          rate: line.rate != null ? dec(line.rate) : null,
          notes: line.notes?.trim() || null,
          sortOrder: index,
        })),
      },
    },
    include: { lines: { include: { item: true } }, vendor: true, indent: true },
  });
}

export async function updatePurchaseOrderStatus(params: {
  organizationId: string;
  purchaseOrderId: string;
  status: ImsPurchaseOrderStatus;
  actorUserId: string;
}) {
  const existing = await prisma.imsPurchaseOrder.findFirst({
    where: { id: params.purchaseOrderId, organizationId: params.organizationId },
  });
  if (!existing) {
    throw new Error("Purchase order not found.");
  }

  const patch: Prisma.ImsPurchaseOrderUpdateInput = { status: params.status };

  if (params.status === "APPROVED") {
    patch.approvedBy = { connect: { id: params.actorUserId } };
    patch.approvedAt = new Date();
  }

  return prisma.imsPurchaseOrder.update({ where: { id: existing.id }, data: patch });
}
