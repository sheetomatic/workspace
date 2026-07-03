import type { QuotationRequestType, QuotationStatus } from "@prisma/client";

/** Default payment terms for proposals. */
export const DEFAULT_QUOTATION_PAYMENT_TERMS =
  "50% advance to confirm the order. Balance on delivery / go-live. GST extra as applicable. Bank transfer or UPI accepted.";

/** Invoices are due immediately on receipt. */
export const INVOICE_PAYMENT_TERMS =
  "Payment is due immediately on receipt of this invoice. GST extra as applicable. Bank transfer or UPI accepted.";

export function paymentTermsForRequestType(requestType: QuotationRequestType | string) {
  return requestType === "INVOICE"
    ? INVOICE_PAYMENT_TERMS
    : DEFAULT_QUOTATION_PAYMENT_TERMS;
}

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

export const INVOICE_TERMS = [
  "Payment is due immediately upon receipt of this invoice unless otherwise agreed in writing.",
  "Scope covers only the line items listed. Additional work is billed separately.",
  "GST extra as applicable on all taxable line items.",
  "Client to provide timely access to accounts, data, and assets required for delivery.",
  "Sheetomatic is not responsible for third-party API outages (Google, Meta, WhatsApp providers).",
  "Confidentiality: both parties agree to keep business data private.",
  "Disputes are subject to jurisdiction in India.",
] as const;

export function quotationTermsForRequestType(requestType: QuotationRequestType | string) {
  return requestType === "INVOICE" ? INVOICE_TERMS : DEFAULT_QUOTATION_TERMS;
}

export const QUOTATION_FOOTER_CONTACT =
  "For queries, reply on WhatsApp +91 96857 88980 or email sheetomatic@gmail.com";

export function formatQuotationTermsBlock(
  terms: readonly string[] = DEFAULT_QUOTATION_TERMS,
) {
  return terms.map((item, index) => `${index + 1}. ${item}`).join("\n");
}

/** Project timeline dates — e.g. 3/7/2026 (no leading zeros). */
export function formatQuotationProjectDate(value: Date | string | null | undefined) {
  if (!value) {
    return "—";
  }
  const date = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) {
    return "—";
  }
  return `${date.getDate()}/${date.getMonth() + 1}/${date.getFullYear()}`;
}

export function isoDateInputValue(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function computeQuotationEndDate(
  start: Date,
  durationDays: number,
): Date | null {
  if (!Number.isFinite(durationDays) || durationDays < 0) {
    return null;
  }
  const end = new Date(start);
  end.setDate(end.getDate() + durationDays);
  return end;
}

export function parseQuotationStartDate(value: string | undefined, fallback = new Date()) {
  if (!value?.trim()) {
    return fallback;
  }
  const parsed = new Date(`${value.trim()}T12:00:00`);
  return Number.isNaN(parsed.getTime()) ? fallback : parsed;
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
