export const STOCK_IN_REASONS = [
  { value: "PURCHASE", label: "Purchase", hi: "खरीद" },
  { value: "CUSTOMER_RETURN", label: "Customer return", hi: "वापसी" },
  { value: "TRANSFER_IN", label: "Transfer in", hi: "ट्रांसफर इन" },
] as const;

export const STOCK_OUT_SALE_LINKS = [
  {
    href: "/app/mobile-shop/sales",
    label: "New sale",
    hi: "नया सेल",
    reason: "SALE",
  },
  {
    href: "/app/mobile-shop/sales?type=used",
    label: "Used phone sale",
    hi: "पुराना सेल",
    reason: "USED_SALE",
  },
  {
    href: "/app/mobile-shop/accessories",
    label: "Accessory sale",
    hi: "एक्सेसरी सेल",
    reason: "ACCESSORY_SALE",
  },
] as const;

export const STOCK_OUT_FORM_REASONS = [
  { value: "PART_USED", label: "Repair part used", hi: "पार्ट यूज" },
  { value: "RETURN_TO_SUPPLIER", label: "Return to supplier", hi: "सप्लायर वापसी" },
] as const;

export type StockInReason = (typeof STOCK_IN_REASONS)[number]["value"];
export type StockOutReason =
  | (typeof STOCK_OUT_SALE_LINKS)[number]["reason"]
  | (typeof STOCK_OUT_FORM_REASONS)[number]["value"];

export function isStockInReason(value: string): value is StockInReason {
  return STOCK_IN_REASONS.some((reason) => reason.value === value);
}

export function movementKindForOutReason(
  reason: string,
): "SALE" | "PART_TO_REPAIR" | "STOCK_OUT" {
  if (reason === "SALE" || reason === "USED_SALE" || reason === "ACCESSORY_SALE") {
    return "SALE";
  }
  if (reason === "PART_USED") return "PART_TO_REPAIR";
  return "STOCK_OUT";
}

export function reasonLabel(reason: string) {
  const hit =
    STOCK_IN_REASONS.find((row) => row.value === reason) ??
    STOCK_OUT_FORM_REASONS.find((row) => row.value === reason) ??
    STOCK_OUT_SALE_LINKS.find((row) => row.reason === reason);
  return hit?.label ?? reason;
}
