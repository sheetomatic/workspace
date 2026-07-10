import { Decimal } from "@prisma/client/runtime/library";
import type { ImsPurchaseBillStatus } from "@prisma/client";
import { prisma } from "@/lib/db";

function dec(value: number | string): Decimal {
  return new Decimal(value);
}

export async function nextPurchaseBillNumber(organizationId: string) {
  const year = new Date().getFullYear();
  const prefix = `PB-${year}-`;
  const latest = await prisma.imsPurchaseBill.findFirst({
    where: { organizationId, billNumber: { startsWith: prefix } },
    orderBy: { billNumber: "desc" },
    select: { billNumber: true },
  });
  const lastSeq = latest?.billNumber
    ? Number.parseInt(latest.billNumber.slice(prefix.length), 10)
    : 0;
  const next = Number.isFinite(lastSeq) ? lastSeq + 1 : 1;
  return `${prefix}${String(next).padStart(4, "0")}`;
}

export async function listPurchaseBills(organizationId: string) {
  return prisma.imsPurchaseBill.findMany({
    where: { organizationId },
    orderBy: { billDate: "desc" },
    include: {
      vendor: { select: { id: true, name: true, code: true } },
      createdBy: { select: { name: true, email: true } },
    },
    take: 100,
  });
}

export async function createPurchaseBill(params: {
  organizationId: string;
  createdById: string;
  vendorId: string;
  billDate: Date;
  amount: number;
  grnReference?: string;
  invoiceNumber?: string;
  notes?: string;
  post?: boolean;
}) {
  const billNumber = await nextPurchaseBillNumber(params.organizationId);
  const status: ImsPurchaseBillStatus = params.post ? "POSTED" : "DRAFT";

  return prisma.imsPurchaseBill.create({
    data: {
      organizationId: params.organizationId,
      billNumber,
      status,
      vendorId: params.vendorId,
      billDate: params.billDate,
      amount: dec(params.amount),
      grnReference: params.grnReference?.trim() || null,
      invoiceNumber: params.invoiceNumber?.trim() || null,
      notes: params.notes?.trim() || null,
      createdById: params.createdById,
    },
    include: { vendor: true },
  });
}

export async function postPurchaseBill(organizationId: string, billId: string) {
  const bill = await prisma.imsPurchaseBill.findFirst({
    where: { id: billId, organizationId },
  });
  if (!bill) {
    throw new Error("Purchase bill not found.");
  }

  return prisma.imsPurchaseBill.update({
    where: { id: bill.id },
    data: { status: "POSTED" },
  });
}
