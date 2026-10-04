import { parseGstin } from "@/lib/leads/gst-invoice";

/** Seller identity printed on Sheetomatic invoices / quotations. */

export type QuotationAccountDetails = {
  legalName: string;
  tradeName: string;
  addressLines: string[];
  pan: string;
  gstin: string;
  udyamNumber: string;
  accountType: string;
  accountHolder: string;
  bankName: string;
  branch: string;
  accountNumber: string;
  ifsc: string;
  upiId: string;
  qrImageSrc: string;
  authorisedSignatory: string;
};

export const SHEETOMATIC_QUOTATION_ACCOUNT: QuotationAccountDetails = {
  legalName: "Shyam Kumar Banjare",
  tradeName: "SHEETOMATIC TECHNOLOGIES",
  addressLines: [
    "Shop No 2 & 3, SH 16",
    "Near Dinesh Cycle Store, Kalmi, Sakti",
    "Chhattisgarh 495691",
  ],
  pan: "BPFPK7002F",
  gstin: "22BPFPK7002F1ZG",
  udyamNumber: "UDYAM-CG-06-0009880",
  accountType: "Current Account",
  accountHolder: "M/S SHEETOMATIC TECHNOLOGIES",
  bankName: "Bandhan Bank",
  branch: "Malkharoda",
  accountNumber: "2010007774842",
  ifsc: "BDBL0001551",
  upiId: "8076967912@ptyes",
  qrImageSrc: "/images/payments/paytm-qr-sheetomatic-technologies.jpg",
  authorisedSignatory: "Shyam Kumar Banjare",
};

export const UDYAM_CERTIFICATE_HREF =
  "/legal/udyam-registration-certificate.pdf";

/** Public GST REG-06. Absolute so a saved invoice PDF keeps a working link. */
export const GST_CERTIFICATE_HREF =
  "https://sheetomatic.com/legal/gst-registration-certificate.pdf";

export function isSheetomaticSellerOrg(org: {
  name?: string | null;
  isPrimary?: boolean;
}) {
  const name = org.name?.trim().toLowerCase() ?? "";
  return org.isPrimary === true || name.includes("sheetomatic");
}

export type StoredQuotationGst = {
  legalName: string;
  tradeName: string;
  gstin: string;
  pan: string;
  authorisedSignatory: string;
  addressLines: string[];
};

function textField(record: Record<string, unknown>, key: string) {
  const value = record[key];
  return typeof value === "string" ? value.trim() : "";
}

export function parseStoredQuotationGst(value: unknown): StoredQuotationGst | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const record = value as Record<string, unknown>;
  const addressLines = Array.isArray(record.addressLines)
    ? record.addressLines
        .filter((line): line is string => typeof line === "string")
        .map((line) => line.trim())
        .filter(Boolean)
        .slice(0, 6)
    : [];
  const stored: StoredQuotationGst = {
    legalName: textField(record, "legalName"),
    tradeName: textField(record, "tradeName"),
    gstin: textField(record, "gstin").toUpperCase(),
    pan: textField(record, "pan").toUpperCase(),
    authorisedSignatory: textField(record, "authorisedSignatory"),
    addressLines,
  };
  const hasAny =
    stored.legalName ||
    stored.tradeName ||
    stored.gstin ||
    stored.pan ||
    stored.authorisedSignatory ||
    addressLines.length > 0;
  return hasAny ? stored : null;
}

function blankSellerAccount(name: string): QuotationAccountDetails {
  return {
    legalName: name,
    tradeName: name,
    addressLines: [],
    pan: "",
    gstin: "",
    udyamNumber: "",
    accountType: "",
    accountHolder: "",
    bankName: "",
    branch: "",
    accountNumber: "",
    ifsc: "",
    upiId: "",
    qrImageSrc: "",
    authorisedSignatory: "",
  };
}

/** Saved GST fields override the Sheetomatic defaults. Other workspaces start blank. */
export function resolveQuotationAccount(org: {
  name?: string | null;
  isPrimary?: boolean;
  quotationAccount?: unknown;
}): QuotationAccountDetails | null {
  const stored = parseStoredQuotationGst(org.quotationAccount);
  const base = isSheetomaticSellerOrg(org)
    ? {
        ...SHEETOMATIC_QUOTATION_ACCOUNT,
        addressLines: [...SHEETOMATIC_QUOTATION_ACCOUNT.addressLines],
      }
    : null;
  if (!base && !stored) return null;

  const account = base ?? blankSellerAccount(org.name?.trim() || "Seller");
  if (stored?.legalName) account.legalName = stored.legalName;
  if (stored?.tradeName) account.tradeName = stored.tradeName;
  if (stored?.gstin) account.gstin = stored.gstin;
  if (stored?.pan) account.pan = stored.pan;
  else if (stored?.gstin && stored.gstin.length >= 12) account.pan = stored.gstin.slice(2, 12);
  if (stored?.authorisedSignatory) account.authorisedSignatory = stored.authorisedSignatory;
  if (stored?.addressLines.length) account.addressLines = stored.addressLines;
  if (!account.gstin && !account.legalName) return null;
  return account;
}

export function quotationAccountForOrganization(org: {
  name?: string | null;
  isPrimary?: boolean;
  quotationAccount?: unknown;
}): QuotationAccountDetails | null {
  return resolveQuotationAccount(org);
}

const PAN_PATTERN = /^[A-Z]{5}[0-9]{4}[A-Z]$/;

export function normalizeQuotationGstInput(input: {
  legalName?: string | null;
  tradeName?: string | null;
  gstin?: string | null;
  pan?: string | null;
  authorisedSignatory?: string | null;
  address?: string | null;
}) {
  const gstin = input.gstin?.trim().toUpperCase() ?? "";
  if (gstin) {
    const parsed = parseGstin(gstin);
    if (!parsed.ok) return parsed;
  }
  const pan = input.pan?.trim().toUpperCase() ?? "";
  if (pan && !PAN_PATTERN.test(pan)) {
    return { ok: false as const, message: "PAN must be 10 characters, like ABCDE1234F." };
  }
  const addressLines = (input.address ?? "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .slice(0, 6);
  const profile: StoredQuotationGst = {
    legalName: (input.legalName ?? "").trim().slice(0, 200),
    tradeName: (input.tradeName ?? "").trim().slice(0, 200),
    gstin,
    pan,
    authorisedSignatory: (input.authorisedSignatory ?? "").trim().slice(0, 120),
    addressLines,
  };
  if (!profile.legalName && !profile.tradeName && !profile.gstin) {
    return {
      ok: false as const,
      message: "Add a legal name, trade name, or GSTIN before saving.",
    };
  }
  return { ok: true as const, profile };
}
