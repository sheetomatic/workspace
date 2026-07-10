import { Decimal } from "@prisma/client/runtime/library";
import { prisma } from "@/lib/db";
import { recordStockMovement } from "@/lib/ims/ims-store";

function dec(value: number | string): Decimal {
  return new Decimal(value);
}

export async function nextGatePassNumber(organizationId: string) {
  const year = new Date().getFullYear();
  const prefix = `GP-${year}-`;
  const latest = await prisma.imsGatePass.findFirst({
    where: { organizationId, passNumber: { startsWith: prefix } },
    orderBy: { passNumber: "desc" },
    select: { passNumber: true },
  });
  const lastSeq = latest?.passNumber
    ? Number.parseInt(latest.passNumber.slice(prefix.length), 10)
    : 0;
  const next = Number.isFinite(lastSeq) ? lastSeq + 1 : 1;
  return `${prefix}${String(next).padStart(4, "0")}`;
}

export async function listGatePasses(organizationId: string) {
  return prisma.imsGatePass.findMany({
    where: { organizationId },
    orderBy: { createdAt: "desc" },
    include: {
      createdBy: { select: { name: true, email: true } },
      issuedBy: { select: { name: true, email: true } },
      lines: {
        include: { item: { select: { code: true, name: true, uom: true } } },
        orderBy: { sortOrder: "asc" },
      },
    },
    take: 50,
  });
}

export type GatePassLineInput = {
  itemId: string;
  quantity: number;
  notes?: string;
};

export async function createGatePass(params: {
  organizationId: string;
  createdById: string;
  siteName?: string;
  partyName?: string;
  vehicleNo?: string;
  purpose?: string;
  notes?: string;
  lines: GatePassLineInput[];
}) {
  if (params.lines.length === 0) {
    throw new Error("Add at least one line.");
  }

  const passNumber = await nextGatePassNumber(params.organizationId);

  return prisma.imsGatePass.create({
    data: {
      organizationId: params.organizationId,
      passNumber,
      createdById: params.createdById,
      siteName: params.siteName?.trim() || null,
      partyName: params.partyName?.trim() || null,
      vehicleNo: params.vehicleNo?.trim() || null,
      purpose: params.purpose?.trim() || null,
      notes: params.notes?.trim() || null,
      lines: {
        create: params.lines.map((line, index) => ({
          organizationId: params.organizationId,
          itemId: line.itemId,
          quantity: dec(line.quantity),
          notes: line.notes?.trim() || null,
          sortOrder: index,
        })),
      },
    },
    include: { lines: true },
  });
}

export async function issueGatePass(params: {
  organizationId: string;
  gatePassId: string;
  userId: string;
}) {
  const pass = await prisma.imsGatePass.findFirst({
    where: { id: params.gatePassId, organizationId: params.organizationId, status: "DRAFT" },
    include: { lines: true },
  });
  if (!pass) {
    throw new Error("Draft gate pass not found.");
  }

  for (const line of pass.lines) {
    await recordStockMovement({
      organizationId: params.organizationId,
      userId: params.userId,
      itemId: line.itemId,
      movementType: "GATE_PASS",
      quantity: Number(line.quantity),
      reference: pass.passNumber,
      notes: pass.purpose ?? "Gate pass issue",
    });
  }

  return prisma.imsGatePass.update({
    where: { id: pass.id },
    data: {
      status: "ISSUED",
      issuedById: params.userId,
      issuedAt: new Date(),
    },
  });
}

export async function cancelGatePass(organizationId: string, gatePassId: string) {
  const pass = await prisma.imsGatePass.findFirst({
    where: { id: gatePassId, organizationId, status: "DRAFT" },
  });
  if (!pass) {
    throw new Error("Draft gate pass not found.");
  }
  return prisma.imsGatePass.update({
    where: { id: pass.id },
    data: { status: "CANCELLED" },
  });
}
