import type { SalesOrderStatus } from "@prisma/client";

export const SALES_ORDER_STATUS_LABELS: Record<SalesOrderStatus, string> = {
  DRAFT: "Draft",
  CONFIRMED: "Confirmed",
  STOCK_CHECK: "Stock check",
  PO_PENDING: "PO pending",
  READY_TO_DISPATCH: "Ready to dispatch",
  IN_TRANSIT: "In transit",
  DELIVERED: "Delivered",
  CANCELLED: "Cancelled",
};

export function salesOrderStatusLabel(status: SalesOrderStatus) {
  return SALES_ORDER_STATUS_LABELS[status] ?? status;
}
