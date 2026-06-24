export type ImsStockStatus = "red" | "orange" | "green" | "blue";

export const IMS_STOCK_STATUS_LABELS: Record<ImsStockStatus, string> = {
  red: "Below minimum",
  orange: "Approaching low",
  green: "Healthy",
  blue: "Above maximum",
};

export function computeStockStatus(params: {
  usableQty: number;
  minQty: number;
  reorderQty: number;
  maxQty: number;
}): ImsStockStatus {
  const { usableQty, minQty, reorderQty, maxQty } = params;

  if (usableQty < minQty) {
    return "red";
  }

  if (maxQty > 0 && usableQty > maxQty) {
    return "blue";
  }

  if (reorderQty > minQty && usableQty < reorderQty) {
    return "orange";
  }

  if (reorderQty > 0 && usableQty >= reorderQty) {
    return "green";
  }

  if (usableQty >= minQty) {
    return "green";
  }

  return "orange";
}

export function formatImsQty(value: number, uom?: string) {
  const formatted = value.toLocaleString("en-IN", {
    maximumFractionDigits: 4,
  });
  return uom ? `${formatted} ${uom}` : formatted;
}

export function formatImsCurrency(value: number) {
  return value.toLocaleString("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  });
}
