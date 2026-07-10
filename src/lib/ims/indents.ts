import { Decimal } from "@prisma/client/runtime/library";
import type { ImsIndentStatus, Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";

function dec(value: number | string): Decimal {
  return new Decimal(value);
}

export async function nextIndentNumber(organizationId: string) {
  const year = new Date().getFullYear();
  const prefix = `IND-${year}-`;
  const latest = await prisma.imsIndent.findFirst({
    where: { organizationId, indentNumber: { startsWith: prefix } },
    orderBy: { indentNumber: "desc" },
    select: { indentNumber: true },
  });
  const lastSeq = latest?.indentNumber
    ? Number.parseInt(latest.indentNumber.slice(prefix.length), 10)
    : 0;
  const next = Number.isFinite(lastSeq) ? lastSeq + 1 : 1;
  return `${prefix}${String(next).padStart(4, "0")}`;
}

export async function listApprovedRequisitionsForIndent(organizationId: string) {
  return prisma.imsMaterialRequisition.findMany({
    where: { organizationId, status: "APPROVED" },
    orderBy: { createdAt: "desc" },
    include: {
      lines: {
        include: { item: { select: { id: true, code: true, name: true, uom: true } } },
        orderBy: { sortOrder: "asc" },
      },
    },
    take: 50,
  });
}

export async function listIndents(organizationId: string, status?: ImsIndentStatus) {
  return prisma.imsIndent.findMany({
    where: { organizationId, ...(status ? { status } : {}) },
    orderBy: { createdAt: "desc" },
    include: {
      vendor: { select: { id: true, name: true, code: true } },
      requisition: { select: { id: true, requisitionNumber: true } },
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

export type IndentLineInput = {
  itemId: string;
  quantity: number;
  rate?: number;
  notes?: string;
};

export async function createIndent(params: {
  organizationId: string;
  createdById: string;
  requisitionId?: string | null;
  vendorId?: string | null;
  siteName?: string;
  notes?: string;
  lines: IndentLineInput[];
  submitForApproval?: boolean;
}) {
  let lines = params.lines;

  if (params.requisitionId) {
    const req = await prisma.imsMaterialRequisition.findFirst({
      where: { id: params.requisitionId, organizationId: params.organizationId, status: "APPROVED" },
      include: { lines: true },
    });
    if (!req) {
      throw new Error("Approved material requisition not found.");
    }
    if (lines.length === 0) {
      lines = req.lines.map((line) => ({
        itemId: line.itemId,
        quantity: Number(line.quantityApproved ?? line.quantityRequested),
        notes: line.notes ?? undefined,
      }));
    }
  }

  if (lines.length === 0) {
    throw new Error("Add at least one item line.");
  }

  const indentNumber = await nextIndentNumber(params.organizationId);
  const status: ImsIndentStatus = params.submitForApproval ? "PENDING" : "DRAFT";

  return prisma.imsIndent.create({
    data: {
      organizationId: params.organizationId,
      indentNumber,
      status,
      requisitionId: params.requisitionId || null,
      vendorId: params.vendorId || null,
      siteName: params.siteName?.trim() || null,
      notes: params.notes?.trim() || null,
      createdById: params.createdById,
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
    include: { lines: { include: { item: true } } },
  });
}

export async function updateIndentStatus(params: {
  organizationId: string;
  indentId: string;
  status: ImsIndentStatus;
  actorUserId: string;
}) {
  const existing = await prisma.imsIndent.findFirst({
    where: { id: params.indentId, organizationId: params.organizationId },
  });
  if (!existing) {
    throw new Error("Indent not found.");
  }

  const patch: Prisma.ImsIndentUpdateInput = { status: params.status };

  if (params.status === "APPROVED") {
    patch.approvedBy = { connect: { id: params.actorUserId } };
    patch.approvedAt = new Date();
  }

  return prisma.imsIndent.update({ where: { id: existing.id }, data: patch });
}
