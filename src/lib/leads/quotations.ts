import type { QuotationStatus } from "@prisma/client";
import { prisma } from "@/lib/db";

export async function nextQuotationNumber(organizationId: string) {
  const rows = await prisma.inboundLeadQuotation.findMany({
    where: { organizationId },
    select: { quotationNumber: true },
  });

  // Max numeric sequence across ALL org quotations — latest createdAt is not
  // reliable because revisions reuse the base sequence (SMQ:123-R2).
  let maxSeq = 0;
  for (const row of rows) {
    const match = row.quotationNumber
      ?.replace(/-R\d+$/i, "")
      .match(/SMQ:(\d+)/i);
    if (!match) {
      continue;
    }
    const seq = Number.parseInt(match[1], 10);
    if (Number.isFinite(seq) && seq > maxSeq) {
      maxSeq = seq;
    }
  }

  return `SMQ:${maxSeq > 0 ? maxSeq + 1 : 100120}`;
}

export function revisionQuotationNumber(baseNumber: string, revisionNumber: number) {
  const stripped = baseNumber.replace(/-R\d+$/i, "");
  return revisionNumber <= 1 ? stripped : `${stripped}-R${revisionNumber}`;
}

export function computeQuotationTotals(
  lines: Array<{ quantity: number; unitPrice: number }>,
  taxRate = 0,
) {
  const subtotal = lines.reduce(
    (sum, line) => sum + line.quantity * line.unitPrice,
    0,
  );
  const taxAmount = taxRate > 0 ? Math.round(subtotal * taxRate) / 100 : 0;
  return {
    subtotal,
    taxAmount,
    totalAmount: subtotal + taxAmount,
  };
}

const quotationPrintInclude = {
  lead: {
    select: {
      id: true,
      name: true,
      phone: true,
      email: true,
      company: true,
      address: true,
      zipCode: true,
      requirement: true,
    },
  },
  lines: { orderBy: { serviceCategory: "asc" as const } },
  organization: { select: { name: true, logoUrl: true } },
  createdBy: { select: { name: true, email: true } },
};

export async function getLeadQuotationForPrint(
  organizationId: string,
  quotationId: string,
) {
  return prisma.inboundLeadQuotation.findFirst({
    where: { id: quotationId, organizationId },
    include: quotationPrintInclude,
  });
}

export async function getLeadQuotationByShareToken(shareToken: string) {
  return prisma.inboundLeadQuotation.findFirst({
    where: { shareToken },
    include: quotationPrintInclude,
  });
}

export async function lockLatestLeadQuotation(
  organizationId: string,
  leadId: string,
  advanceAmount?: number,
) {
  const preLockStatuses: QuotationStatus[] = ["DRAFT", "SENT", "REVISED"];
  const unlockedWhere = {
    organizationId,
    leadId,
    status: { in: preLockStatuses },
    lockedAt: null,
  };

  // Prefer the latest SENT quotation (the one the client actually saw);
  // fall back to the latest unlocked quotation of any pre-lock status.
  const latest =
    (await prisma.inboundLeadQuotation.findFirst({
      where: { ...unlockedWhere, status: "SENT" },
      orderBy: { createdAt: "desc" },
    })) ??
    (await prisma.inboundLeadQuotation.findFirst({
      where: unlockedWhere,
      orderBy: { createdAt: "desc" },
    }));

  if (!latest) {
    return null;
  }

  return prisma.inboundLeadQuotation.update({
    where: { id: latest.id },
    data: {
      status: "LOCKED",
      lockedAt: new Date(),
      ...(advanceAmount != null && advanceAmount > 0
        ? { advanceRequired: advanceAmount }
        : {}),
    },
  });
}

export function buildQuotationPublicUrl(shareToken: string) {
  const base =
    process.env.NEXT_PUBLIC_SITE_URL?.trim().replace(/\/+$/, "") ||
    process.env.NEXTAUTH_URL?.trim().replace(/\/+$/, "") ||
    "https://sheetomatic.com";
  return `${base}/quotation/${shareToken}`;
}

export function buildQuotationShareMessage(params: {
  organizationName: string;
  clientName: string;
  quotationNumber: string;
  requestType: string;
  totalAmount: number;
  publicUrl: string;
  revisionNumber?: number;
}) {
  const orgName = params.organizationName.trim() || "our team";
  const docType = params.requestType === "INVOICE" ? "Invoice" : "Proposal";
  const revision =
    params.revisionNumber && params.revisionNumber > 1
      ? ` (Revision ${params.revisionNumber})`
      : "";
  return [
    `Hi ${params.clientName},`,
    "",
    `Please find your ${orgName} ${docType} ${params.quotationNumber}${revision}.`,
    `Total: ₹${params.totalAmount.toLocaleString("en-IN")}`,
    "",
    `View & download: ${params.publicUrl}`,
    "",
    "Reply here to confirm or request changes.",
    `— ${orgName}`,
  ].join("\n");
}
