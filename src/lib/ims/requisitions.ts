import { Decimal } from "@prisma/client/runtime/library";
import type { ImsRequisitionStatus, Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";

function dec(value: number | string): Decimal {
  return new Decimal(value);
}

export async function nextRequisitionNumber(organizationId: string) {
  const year = new Date().getFullYear();
  const prefix = `MR-${year}-`;
  const latest = await prisma.imsMaterialRequisition.findFirst({
    where: {
      organizationId,
      requisitionNumber: { startsWith: prefix },
    },
    orderBy: { requisitionNumber: "desc" },
    select: { requisitionNumber: true },
  });

  const lastSeq = latest?.requisitionNumber
    ? Number.parseInt(latest.requisitionNumber.slice(prefix.length), 10)
    : 0;
  const next = Number.isFinite(lastSeq) ? lastSeq + 1 : 1;
  return `${prefix}${String(next).padStart(4, "0")}`;
}

export async function listImsItemGroups(organizationId: string) {
  return prisma.imsItemGroup.findMany({
    where: { organizationId, isActive: true },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    include: {
      _count: { select: { items: true } },
    },
  });
}

export async function createImsItemGroup(params: {
  organizationId: string;
  name: string;
  parentId?: string | null;
}) {
  const name = params.name.trim();
  if (!name) {
    throw new Error("Group name is required.");
  }

  return prisma.imsItemGroup.create({
    data: {
      organizationId: params.organizationId,
      name,
      parentId: params.parentId || null,
    },
  });
}

export async function listMaterialRequisitions(
  organizationId: string,
  status?: ImsRequisitionStatus,
) {
  return prisma.imsMaterialRequisition.findMany({
    where: {
      organizationId,
      ...(status ? { status } : {}),
    },
    orderBy: { createdAt: "desc" },
    include: {
      requestedBy: { select: { id: true, name: true, email: true } },
      approvedBy: { select: { id: true, name: true, email: true } },
      lines: {
        include: {
          item: { select: { id: true, code: true, name: true, uom: true } },
        },
        orderBy: { sortOrder: "asc" },
      },
    },
    take: 100,
  });
}

export async function getMaterialRequisition(
  organizationId: string,
  id: string,
) {
  return prisma.imsMaterialRequisition.findFirst({
    where: { id, organizationId },
    include: {
      requestedBy: { select: { id: true, name: true, email: true } },
      approvedBy: { select: { id: true, name: true, email: true } },
      lines: {
        include: {
          item: { select: { id: true, code: true, name: true, uom: true } },
        },
        orderBy: { sortOrder: "asc" },
      },
    },
  });
}

export type RequisitionLineInput = {
  itemId: string;
  quantityRequested: number;
  notes?: string;
};

export async function createMaterialRequisition(params: {
  organizationId: string;
  requestedById: string;
  siteName?: string;
  department?: string;
  purpose?: string;
  notes?: string;
  lines: RequisitionLineInput[];
  submitForApproval?: boolean;
}) {
  if (params.lines.length === 0) {
    throw new Error("Add at least one item line.");
  }

  const requisitionNumber = await nextRequisitionNumber(params.organizationId);
  const status: ImsRequisitionStatus = params.submitForApproval ? "PENDING" : "DRAFT";

  return prisma.imsMaterialRequisition.create({
    data: {
      organizationId: params.organizationId,
      requisitionNumber,
      status,
      siteName: params.siteName?.trim() || null,
      department: params.department?.trim() || null,
      purpose: params.purpose?.trim() || null,
      notes: params.notes?.trim() || null,
      requestedById: params.requestedById,
      lines: {
        create: params.lines.map((line, index) => ({
          organizationId: params.organizationId,
          itemId: line.itemId,
          quantityRequested: dec(line.quantityRequested),
          notes: line.notes?.trim() || null,
          sortOrder: index,
        })),
      },
    },
    include: {
      lines: { include: { item: true } },
    },
  });
}

export async function updateRequisitionStatus(params: {
  organizationId: string;
  requisitionId: string;
  status: ImsRequisitionStatus;
  actorUserId: string;
  rejectedReason?: string;
}) {
  const existing = await prisma.imsMaterialRequisition.findFirst({
    where: { id: params.requisitionId, organizationId: params.organizationId },
    include: { lines: true },
  });
  if (!existing) {
    throw new Error("Requisition not found.");
  }

  const patch: Prisma.ImsMaterialRequisitionUpdateInput = {
    status: params.status,
  };

  if (params.status === "APPROVED") {
    patch.approvedBy = { connect: { id: params.actorUserId } };
    patch.approvedAt = new Date();
    patch.rejectedReason = null;
    await prisma.$transaction(async (tx) => {
      for (const line of existing.lines) {
        await tx.imsMaterialRequisitionLine.update({
          where: { id: line.id },
          data: {
            quantityApproved: line.quantityApproved ?? line.quantityRequested,
          },
        });
      }
    });
  }

  if (params.status === "REJECTED") {
    patch.rejectedReason = params.rejectedReason?.trim() || "Rejected";
    patch.approvedBy = { disconnect: true };
    patch.approvedAt = null;
  }

  return prisma.imsMaterialRequisition.update({
    where: { id: existing.id },
    data: patch,
  });
}

export async function getStockRegisterRows(organizationId: string) {
  const items = await prisma.imsItem.findMany({
    where: { organizationId, isActive: true },
    orderBy: [{ code: "asc" }],
    include: {
      balances: true,
      group: { select: { name: true } },
    },
  });

  return items.map((item) => {
    const usable = item.balances
      .filter((b) => b.bucket === "USABLE")
      .reduce((sum, b) => sum + Number(b.quantity), 0);
    const qcPending = item.balances
      .filter((b) => b.bucket === "QC_PENDING")
      .reduce((sum, b) => sum + Number(b.quantity), 0);
    return {
      id: item.id,
      code: item.code,
      name: item.name,
      uom: item.uom,
      groupName: item.group?.name ?? null,
      usableQty: usable,
      qcPendingQty: qcPending,
      totalQty: usable + qcPending,
      unitCost: Number(item.unitCost),
      value: usable * Number(item.unitCost),
    };
  });
}
