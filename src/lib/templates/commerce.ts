import {
  GST_STATE_OPTIONS,
  normalizeGstBillParty,
  splitGstLine,
} from "@/lib/leads/gst-invoice";

export const TEMPLATE_PRICE_CAP_INR = 998;
export const TEMPLATE_GST_RATE = 18;
export const TEMPLATE_SAC = "997331";
export const MAX_CART_ITEMS = 20;

export function templatePriceInr(price: number) {
  if (!Number.isSafeInteger(price) || price <= 0)
    throw new Error("Invalid template price.");
  return Math.min(price, TEMPLATE_PRICE_CAP_INR);
}

export function cartProductIds(value: unknown): string[] {
  if (
    !Array.isArray(value) ||
    value.length < 1 ||
    value.length > MAX_CART_ITEMS ||
    value.some(
      (id) => typeof id !== "string" || !/^[a-zA-Z0-9_-]{1,100}$/.test(id),
    )
  ) {
    throw new Error("Choose between 1 and 20 templates.");
  }
  if (new Set(value).size !== value.length)
    throw new Error("Each template can be purchased once per cart.");
  return [...value].sort();
}

export type TemplateBuyer = {
  name: string;
  email: string;
  phone: string;
  billedTo: string;
  address: string;
  city: string;
  stateCode: string;
  pin: string;
  gstin: string | null;
};

export function parseTemplateBuyer(input: unknown): TemplateBuyer {
  if (!input || typeof input !== "object" || Array.isArray(input))
    throw new Error("Billing details are required.");
  const data = input as Record<string, unknown>;
  const field = (key: string, max: number) => {
    const value = data[key];
    if (typeof value !== "string" || value.length > max)
      throw new Error(`Check billing field: ${key}.`);
    return value.trim();
  };
  const name = field("name", 120);
  const email = field("email", 254).toLowerCase();
  const phone = field("phone", 25);
  if (
    name.length < 2 ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ||
    !/^\+?[0-9 ()-]{10,25}$/.test(phone)
  ) {
    throw new Error("Enter a valid name, email and phone number.");
  }
  const result = normalizeGstBillParty({
    billedTo: field("billedTo", 200) || name,
    address: field("address", 500),
    city: field("city", 80),
    stateCode: field("stateCode", 2),
    pin: field("pin", 6),
    gstin: field("gstin", 15),
  });
  if (!result.ok) throw new Error(result.message);
  const p = result.party;
  if (!p.billedTo || !p.address || !p.city || !p.stateCode || !p.pin)
    throw new Error("Complete the billing address, state and PIN code.");
  return {
    name,
    email,
    phone,
    billedTo: p.billedTo,
    address: p.address,
    city: p.city,
    stateCode: p.stateCode,
    pin: p.pin,
    gstin: p.gstin,
  };
}

export function cartTotals(
  pricesInr: number[],
  stateCode: string,
  sellerStateCode: string,
) {
  if (
    !GST_STATE_OPTIONS.some((s) => s.code === stateCode) ||
    !GST_STATE_OPTIONS.some((s) => s.code === sellerStateCode)
  )
    throw new Error("Invalid billing state.");
  const lines = pricesInr.map((price) =>
    splitGstLine({
      taxable: templatePriceInr(price),
      gstRate: TEMPLATE_GST_RATE,
      placeOfSupplyCode: stateCode,
      sellerStateCode,
    }),
  );
  const paise = (
    key:
      | "taxable"
      | "cgstAmount"
      | "sgstAmount"
      | "igstAmount"
      | "gstAmount"
      | "totalAmount",
  ) => lines.reduce((sum, l) => sum + Math.round(l[key] * 100), 0);
  return {
    lines,
    subtotalPaise: paise("taxable"),
    cgstPaise: paise("cgstAmount"),
    sgstPaise: paise("sgstAmount"),
    igstPaise: paise("igstAmount"),
    gstPaise: paise("gstAmount"),
    totalPaise: paise("totalAmount"),
  };
}

export function inr(paise: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(paise / 100);
}

export function financialYear(date: Date) {
  const india = new Date(date.getTime() + 330 * 60_000);
  const start = india.getUTCFullYear() - (india.getUTCMonth() < 3 ? 1 : 0);
  return `${String(start).slice(-2)}${String(start + 1).slice(-2)}`;
}

export function templateInvoiceNumber(year: string, sequence: number) {
  if (
    !/^\d{4}$/.test(year) ||
    !Number.isSafeInteger(sequence) ||
    sequence < 1 ||
    sequence > 99_999_999
  )
    throw new Error("Invoice sequence unavailable.");
  return `ST${year}/${String(sequence).padStart(8, "0")}`;
}
