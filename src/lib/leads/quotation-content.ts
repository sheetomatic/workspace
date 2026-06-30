import type { QuotationStatus } from "@prisma/client";

/** Default terms appended to proposals / invoices (Sheetomatic standard). */
export const DEFAULT_QUOTATION_PAYMENT_TERMS =
  "50% advance to confirm the order. Balance on delivery / go-live. GST extra as applicable. Bank transfer or UPI accepted.";

export const DEFAULT_QUOTATION_TERMS = [
  "Quotation is valid for 15 days from the date of issue unless extended in writing.",
  "Scope covers only the line items listed. Additional work is billed separately.",
  "Client to provide timely access to Google accounts, sheets, and WhatsApp numbers required for setup.",
  "Sheetomatic is not responsible for third-party API outages (Google, Meta, WhatsApp providers).",
  "Training sessions are limited to agreed duration; extra sessions are chargeable.",
  "For WhatsApp API integrations, message credits and annual subscription renewals are as per selected plan.",
  "Confidentiality: both parties agree to keep business data private.",
  "Disputes are subject to jurisdiction in India.",
] as const;

export const QUOTATION_FOOTER_CONTACT =
  "For queries, reply on WhatsApp +91 96857 88980 or email sheetomatic@gmail.com";

export function formatQuotationTermsBlock(terms: readonly string[] = DEFAULT_QUOTATION_TERMS) {
  return terms.map((item, index) => `${index + 1}. ${item}`).join("\n");
}

export function quotationStatusLabel(status: QuotationStatus) {
  const labels: Record<QuotationStatus, string> = {
    DRAFT: "Draft",
    SENT: "Sent",
    REVISED: "Superseded",
    LOCKED: "Locked · Approved",
  };
  return labels[status];
}
