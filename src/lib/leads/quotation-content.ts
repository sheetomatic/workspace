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

const SHEETOMATIC_ORG_NAME = "Sheetomatic";

export function defaultQuotationTerms(
  organizationName: string = SHEETOMATIC_ORG_NAME,
): readonly string[] {
  const orgName = organizationName.trim() || SHEETOMATIC_ORG_NAME;
  return [
    "Quotation is valid for 15 days from the date of issue unless extended in writing.",
    "Scope covers only the line items listed. Additional work is billed separately.",
    "Client to provide timely access to Google accounts, sheets, and WhatsApp numbers required for setup.",
    `${orgName} is not responsible for third-party API outages (Google, Meta, WhatsApp providers).`,
    "Training sessions are limited to agreed duration; extra sessions are chargeable.",
    "For WhatsApp API integrations, message credits and annual subscription renewals are as per selected plan.",
    "Confidentiality: both parties agree to keep business data private.",
    "Disputes are subject to jurisdiction in India.",
  ];
}

export function invoiceTerms(
  organizationName: string = SHEETOMATIC_ORG_NAME,
): readonly string[] {
  const orgName = organizationName.trim() || SHEETOMATIC_ORG_NAME;
  return [
    "Payment is due immediately upon receipt of this invoice unless otherwise agreed in writing.",
    "Scope covers only the line items listed. Additional work is billed separately.",
    "GST extra as applicable on all taxable line items.",
    "Client to provide timely access to accounts, data, and assets required for delivery.",
    `${orgName} is not responsible for third-party API outages (Google, Meta, WhatsApp providers).`,
    "Confidentiality: both parties agree to keep business data private.",
    "Disputes are subject to jurisdiction in India.",
  ];
}

export const DEFAULT_QUOTATION_TERMS: readonly string[] = defaultQuotationTerms();

export const INVOICE_TERMS: readonly string[] = invoiceTerms();

export function quotationTermsForRequestType(
  requestType: QuotationRequestType | string,
  organizationName: string = SHEETOMATIC_ORG_NAME,
) {
  return requestType === "INVOICE"
    ? invoiceTerms(organizationName)
    : defaultQuotationTerms(organizationName);
}

export const QUOTATION_FOOTER_CONTACT =
  "For queries, reply on WhatsApp +91 93291 03106 or email sheetomatic@gmail.com";

/**
 * Footer contact line. Sheetomatic's own phone/email only appear when the
 * document belongs to the primary Sheetomatic org; other tenants get a
 * generic line under their own name.
 */
export function quotationFooterContact(organizationName?: string | null) {
  const orgName = organizationName?.trim();
  if (!orgName || orgName === SHEETOMATIC_ORG_NAME) {
    return QUOTATION_FOOTER_CONTACT;
  }
  return `For queries, reply to ${orgName} on WhatsApp or email us.`;
}

export function formatQuotationTermsBlock(
  terms: readonly string[] = DEFAULT_QUOTATION_TERMS,
) {
  return terms.map((item, index) => `${index + 1}. ${item}`).join("\n");
}

/** Project timeline dates — e.g. "3 Jul 2026", rendered in IST. */
export function formatQuotationProjectDate(value: Date | string | null | undefined) {
  if (!value) {
    return "—";
  }
  const date = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) {
    return "—";
  }
  return date.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "Asia/Kolkata",
  });
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
