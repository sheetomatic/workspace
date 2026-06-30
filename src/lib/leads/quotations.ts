import { prisma } from "@/lib/db";

export async function nextQuotationNumber(organizationId: string) {
  const latest = await prisma.inboundLeadQuotation.findFirst({
    where: { organizationId },
    orderBy: { createdAt: "desc" },
    select: { quotationNumber: true },
  });

  const match = latest?.quotationNumber?.match(/SMQ:(\d+)/i);
  const seq = match ? Number.parseInt(match[1], 10) + 1 : 100120;
  return `SMQ:${seq}`;
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

export async function getLeadQuotationForPrint(
  organizationId: string,
  quotationId: string,
) {
  return prisma.inboundLeadQuotation.findFirst({
    where: { id: quotationId, organizationId },
    include: {
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
      lines: { orderBy: { serviceCategory: "asc" } },
      organization: { select: { name: true, logoUrl: true } },
      createdBy: { select: { name: true, email: true } },
    },
  });
}
