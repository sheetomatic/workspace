import Link from "next/link";
import { notFound } from "next/navigation";
import { QuotationPrintToolbar } from "@/components/saas/quotation-print-toolbar";
import { QuotationPrintView } from "@/components/saas/quotation-print-view";
import { formatInr } from "@/lib/leads/categories";
import { getLeadQuotationForPrint } from "@/lib/leads/quotations";
import { requireSession } from "@/lib/require-session";

type PageProps = {
  params: Promise<{ quotationId: string }>;
};

export default async function QuotationPrintPage({ params }: PageProps) {
  const user = await requireSession(undefined, { module: "FMS" });
  const { quotationId } = await params;

  const quotation = await getLeadQuotationForPrint(user.organizationId, quotationId);
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
        quotationDate: quotation.quotationDate.toISOString(),
        projectStartDate: quotation.projectStartDate?.toISOString() ?? null,
        endDate: quotation.endDate?.toISOString() ?? null,
        durationDays: quotation.durationDays,
        company: quotation.company,
        address: quotation.address,
        zipCode: quotation.zipCode,
        notes: quotation.notes,
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
      toolbar={<QuotationPrintToolbar />}
      formatInr={formatInr}
    />
  );
}
