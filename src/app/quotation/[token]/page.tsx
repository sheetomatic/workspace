import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { QuotationPrintToolbar } from "@/components/saas/quotation-print-toolbar";
import { QuotationPrintView } from "@/components/saas/quotation-print-view";
import { getLeadQuotationByShareToken } from "@/lib/leads/quotations";

type PageProps = {
  params: Promise<{ token: string }>;
};

// Tokenized public documents must never be indexed by search engines.
export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default async function PublicQuotationPage({ params }: PageProps) {
  const { token } = await params;
  const quotation = await getLeadQuotationByShareToken(token);
  if (!quotation) {
    notFound();
  }

  return (
    <QuotationPrintView
      organizationName={quotation.organization.name}
      logoUrl={quotation.organization.logoUrl}
      quotation={{
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
      }}
      toolbar={<QuotationPrintToolbar publicView />}
    />
  );
}
