import type { ImsVendorImportRow } from "@/lib/ims/ims-store";

export const VENDOR_IMPORT_COLUMNS = [
  "code",
  "name",
  "contactName",
  "email",
  "phone",
  "gstin",
  "address",
  "paymentTerms",
  "leadTimeDays",
  "isActive",
] as const;

export const VENDOR_IMPORT_TEMPLATE_HEADERS = [
  "code",
  "name",
  "contactName",
  "email",
  "phone",
  "gstin",
  "address",
  "paymentTerms",
  "leadTimeDays",
  "isActive",
];

export const VENDOR_IMPORT_TEMPLATE_SAMPLE = [
  "VEN-001",
  "Acme Steel Co",
  "Priya Sharma",
  "sales@acmesteel.example",
  "9876543210",
  "27ABCDE1234F1Z5",
  "12 Industrial Area, Pune",
  "Net 30",
  "7",
  "Yes",
];

export type ParsedVendorImportRow = {
  rowNumber: number;
  data: ImsVendorImportRow;
  raw: Record<string, string>;
  valid: boolean;
  errors: string[];
};

function pick(raw: Record<string, string>, keys: string[]): string {
  for (const key of keys) {
    const found = Object.keys(raw).find(
      (header) => header.trim().toLowerCase() === key.toLowerCase(),
    );
    if (found && raw[found] !== undefined && raw[found] !== null) {
      return String(raw[found]).trim();
    }
  }
  return "";
}

function parseBool(value: string): boolean {
  const v = value.toLowerCase();
  if (!v) {
    return true;
  }
  return ["true", "yes", "y", "1", "active"].includes(v);
}

const EMAIL_SHAPE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

export function normalizeVendorImportRow(
  raw: Record<string, string>,
  rowNumber: number,
): ParsedVendorImportRow {
  const errors: string[] = [];

  const code = pick(raw, ["code", "vendor code", "supplier code"]);
  const name = pick(raw, ["name", "vendor name", "supplier name"]);
  const contactName = pick(raw, ["contactname", "contact name", "contact"]);
  const email = pick(raw, ["email", "email address"]);
  const phone = pick(raw, ["phone", "mobile", "contact number"]);
  const gstin = pick(raw, ["gstin", "gst", "gst number"]);
  const address = pick(raw, ["address"]);
  const paymentTerms = pick(raw, ["paymentterms", "payment terms", "terms"]);
  const leadTimeRaw = pick(raw, ["leadtimedays", "lead time days", "lead time", "leadtime"]);
  const activeRaw = pick(raw, ["isactive", "active", "status"]);

  if (!code) {
    errors.push("Missing code");
  }
  if (!name) {
    errors.push("Missing name");
  }

  if (email && !EMAIL_SHAPE.test(email)) {
    errors.push(`Invalid email "${email}"`);
  }

  let leadTimeDays: number | null = null;
  if (leadTimeRaw) {
    const num = Number(leadTimeRaw.replace(/[, ]/g, ""));
    if (!Number.isFinite(num)) {
      errors.push("Invalid lead time (use a whole number of days)");
    } else if (num < 0) {
      errors.push("Lead time cannot be negative");
    } else {
      leadTimeDays = Math.round(num);
    }
  }

  const data: ImsVendorImportRow = {
    code,
    name,
    contactName,
    email,
    phone,
    gstin,
    address,
    paymentTerms,
    leadTimeDays,
    isActive: parseBool(activeRaw),
  };

  return {
    rowNumber,
    data,
    raw,
    valid: errors.length === 0,
    errors,
  };
}
