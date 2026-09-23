/** GST bill math for Sheetomatic quotations and tax invoices. */

export const SELLER_GST_STATE_CODE = "22";
export const DEFAULT_HSN_SAC = "998314";
export const DEFAULT_GST_RATE = 18;

export const GST_RATES = [0, 5, 12, 18, 28] as const;

export const HSN_SAC_OPTIONS = [
  { code: "998313", label: "998313 — IT consulting and support" },
  { code: "998314", label: "998314 — IT design and development" },
  { code: "998315", label: "998315 — Hosting and IT infrastructure" },
  { code: "998316", label: "998316 — IT infrastructure and network management" },
  { code: "997331", label: "997331 — Software licensing" },
  { code: "998319", label: "998319 — Other IT services" },
  { code: "998399", label: "998399 — Other professional and technical services" },
] as const;

export const GST_STATE_OPTIONS = [
  { code: "01", label: "Jammu and Kashmir" },
  { code: "02", label: "Himachal Pradesh" },
  { code: "03", label: "Punjab" },
  { code: "04", label: "Chandigarh" },
  { code: "05", label: "Uttarakhand" },
  { code: "06", label: "Haryana" },
  { code: "07", label: "Delhi" },
  { code: "08", label: "Rajasthan" },
  { code: "09", label: "Uttar Pradesh" },
  { code: "10", label: "Bihar" },
  { code: "11", label: "Sikkim" },
  { code: "12", label: "Arunachal Pradesh" },
  { code: "13", label: "Nagaland" },
  { code: "14", label: "Manipur" },
  { code: "15", label: "Mizoram" },
  { code: "16", label: "Tripura" },
  { code: "17", label: "Meghalaya" },
  { code: "18", label: "Assam" },
  { code: "19", label: "West Bengal" },
  { code: "20", label: "Jharkhand" },
  { code: "21", label: "Odisha" },
  { code: "22", label: "Chhattisgarh" },
  { code: "23", label: "Madhya Pradesh" },
  { code: "24", label: "Gujarat" },
  { code: "26", label: "Dadra and Nagar Haveli and Daman and Diu" },
  { code: "27", label: "Maharashtra" },
  { code: "29", label: "Karnataka" },
  { code: "30", label: "Goa" },
  { code: "31", label: "Lakshadweep" },
  { code: "32", label: "Kerala" },
  { code: "33", label: "Tamil Nadu" },
  { code: "34", label: "Puducherry" },
  { code: "35", label: "Andaman and Nicobar Islands" },
  { code: "36", label: "Telangana" },
  { code: "37", label: "Andhra Pradesh" },
  { code: "38", label: "Ladakh" },
] as const;

const HSN_CODES = new Set<string>(HSN_SAC_OPTIONS.map((item) => item.code));
const STATE_CODES = new Set<string>(GST_STATE_OPTIONS.map((item) => item.code));
const RATE_SET = new Set<number>(GST_RATES);

export function roundInr(value: number) {
  return Math.round(value * 100) / 100;
}

export function parseHsnSac(value: string | null | undefined) {
  const code = value?.trim() ?? "";
  return HSN_CODES.has(code) ? code : DEFAULT_HSN_SAC;
}

export function parseGstRate(value: string | number | null | undefined) {
  const rate = typeof value === "number" ? value : Number.parseInt(String(value ?? ""), 10);
  return RATE_SET.has(rate) ? rate : DEFAULT_GST_RATE;
}

export function parsePlaceOfSupply(value: string | null | undefined) {
  const code = value?.trim() ?? "";
  return STATE_CODES.has(code) ? code : SELLER_GST_STATE_CODE;
}

export function placeOfSupplyLabel(code: string | null | undefined) {
  const parsed = parsePlaceOfSupply(code);
  const state = GST_STATE_OPTIONS.find((item) => item.code === parsed);
  return state ? `${state.label} - ${state.code}` : parsed;
}

export type GstLineSplit = {
  taxable: number;
  gstRate: number;
  cgstPercent: number;
  sgstPercent: number;
  igstPercent: number;
  cgstAmount: number;
  sgstAmount: number;
  igstAmount: number;
  gstAmount: number;
  totalAmount: number;
};

/** Same state as the seller: CGST + SGST. Any other place of supply: IGST. */
export function splitGstLine(input: {
  taxable: number;
  gstRate: number;
  placeOfSupplyCode?: string | null;
  sellerStateCode?: string;
}): GstLineSplit {
  const taxable = roundInr(Math.max(0, input.taxable));
  const gstRate = parseGstRate(input.gstRate);
  const place = parsePlaceOfSupply(input.placeOfSupplyCode);
  const seller = input.sellerStateCode?.trim() || SELLER_GST_STATE_CODE;
  const intra = place === seller;
  const gstAmount = roundInr((taxable * gstRate) / 100);
  const cgstAmount = intra ? roundInr(gstAmount / 2) : 0;
  const sgstAmount = intra ? roundInr(gstAmount - cgstAmount) : 0;
  return {
    taxable,
    gstRate,
    cgstPercent: intra ? gstRate / 2 : 0,
    sgstPercent: intra ? gstRate / 2 : 0,
    igstPercent: intra ? 0 : gstRate,
    cgstAmount,
    sgstAmount,
    igstAmount: intra ? 0 : gstAmount,
    gstAmount,
    totalAmount: roundInr(taxable + gstAmount),
  };
}
