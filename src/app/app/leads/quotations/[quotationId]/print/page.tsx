import { notFound } from "next/navigation";
import { QuotationPrintToolbar } from "@/components/saas/quotation-print-toolbar";
import { QuotationPrintView } from "@/components/saas/quotation-print-view";
import { getLeadQuotationForPrint } from "@/lib/leads/quotations";
import { requireSession } from "@/lib/require-session";

type PageProps = {
  params: Promise<{ quotationId: string }>;
  searchParams: Promise<{ embed?: string }>;
};

function mapQuotationForView(quotation: NonNullable<Awaited<ReturnType<typeof getLeadQuotationForPrint>>>) {
  return {
    quotationNumber: quotation.quotationNumber,
    requestType: quotation.requestType,
    status: quotation.status,
    revisionNumber: quotation.revisionNumber,
    quotationDate: quotation.quotationDate.toISOString(),
    projectStartDate: quotation.projectStartDate?.toISOString() ?? null,
    endDate: quotation.endDate?.toISOString() ?? null,
    durationDays: quotation.durationDays,
    company: quotation.company,
    address: quotation.address,
    zipCode: quotation.zipCode,
    scopeNotes: quotation.scopeNotes,
    paymentTerms: quotation.paymentTerms,
    advanceRequired: quotation.advanceRequired
      ? Number(quotation.advanceRequired)
      : null,
    notes: quotation.notes,
    lockedAt: quotation.lockedAt?.toISOString() ?? null,
    subtotal: Number(quotation.subtotal),
    totalAmount: Number(quotation.totalAmount),
    lines: quotation.lines.map((line) => ({
      serviceCategory: line.serviceCategory,
      subCategory: line.subCategory,
      quantity: line.quantity,
      unitPrice: Number(line.unitPrice),
      lineTotal: Number(line.lineTotal),
    })),
    lead: quotation.lead,
  };
}

export default async function QuotationPrintPage({ params, searchParams }: PageProps) {
  const user = await requireSession(undefined, { module: "FMS" });
  const { quotationId } = await params;
  const { embed } = await searchParams;
  const isEmbed = embed === "1";

  const quotation = await getLeadQuotationForPrint(user.organizationId, quotationId);
  if (!quotation) {
    notFound();
  }

  return (
    <QuotationPrintView
      organizationName={quotation.organization.name}
      logoUrl={quotation.organization.logoUrl}
      quotation={mapQuotationForView(quotation)}
      toolbar={
        isEmbed ? null : (
          <QuotationPrintToolbar
            quotationId={quotation.id}
            isLocked={Boolean(quotation.lockedAt) || quotation.status === "LOCKED"}
          />
        )
      }
      embed={isEmbed}
    />
  );
}
