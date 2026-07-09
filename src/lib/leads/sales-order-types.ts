export type SalesOrderStatus =
  | "DRAFT"
  | "CONFIRMED"
  | "ADVANCE_PENDING"
  | "STOCK_CHECK"
  | "PO_PENDING"
  | "PO_IN_PROGRESS"
  | "DISPATCH_PENDING"
  | "DISPATCHED"
  | "DELIVERED"
  | "CANCELLED";

export type SalesOrderFmsRole = "STOCK_CHECK" | "PO" | "DISPATCH" | "OTHER";

export type SalesOrderFmsLink = {
  id: string;
  referenceLabel: string;
  templateName: string;
  status: string;
  role: SalesOrderFmsRole;
  currentStepName: string | null;
  ownerName: string | null;
  delayLabel: string | null;
  isDelayed: boolean;
  fmsHref: string;
  boardHref: string;
};

export type LeadSalesOrderData = {
  id: string;
  orderNumber: string;
  status: SalesOrderStatus;
  orderValue: string | number;
  advanceAmount: string | number;
  balanceAmount: string | number;
  quotationId: string | null;
  quotationNumber: string | null;
  dispatchShareToken: string | null;
  stockCheckFmsInstanceId: string | null;
  poFmsInstanceId: string | null;
  dispatchFmsInstanceId: string | null;
  fmsInstances: SalesOrderFmsLink[];
  createdAt: string;
  updatedAt: string;
};

export type SalesOrderListItem = LeadSalesOrderData & {
  lead: {
    id: string;
    name: string | null;
    phone: string | null;
    company: string | null;
  };
};

export type DispatchSlipLine = {
  description: string;
  quantity: number;
  unit: string | null;
};

export type DispatchSlipData = {
  slipNumber: string;
  orderNumber: string;
  dispatchDate: string;
  customerName: string;
  customerCompany: string | null;
  customerAddress: string | null;
  customerPhone: string | null;
  transportMode: string | null;
  lrNumber: string | null;
  boxes: number | null;
  weightKg: number | null;
  notes: string | null;
  lines: DispatchSlipLine[];
  organization: {
    name: string;
    logoUrl: string | null;
  };
};

export const SALES_ORDER_STATUS_LABELS: Record<SalesOrderStatus, string> = {
  DRAFT: "Draft",
  CONFIRMED: "Order confirmed",
  ADVANCE_PENDING: "Advance pending",
  STOCK_CHECK: "IMS stock check",
  PO_PENDING: "PO pending",
  PO_IN_PROGRESS: "PO in progress",
  DISPATCH_PENDING: "Dispatch pending",
  DISPATCHED: "Dispatched",
  DELIVERED: "Delivered",
  CANCELLED: "Cancelled",
};

export const ORDER_JOURNEY_STAGES = [
  { key: "lead", label: "Lead" },
  { key: "quote", label: "Quote" },
  { key: "advance", label: "Advance" },
  { key: "so", label: "SO" },
  { key: "stock", label: "IMS" },
  { key: "po", label: "PO" },
  { key: "dispatch", label: "Dispatch" },
  { key: "delivered", label: "Delivered" },
] as const;

export type OrderJourneyStageKey = (typeof ORDER_JOURNEY_STAGES)[number]["key"];

export function salesOrderStatusLabel(status: SalesOrderStatus) {
  return SALES_ORDER_STATUS_LABELS[status] ?? status;
}

export function resolveOrderJourneyStage(
  order: Pick<
    LeadSalesOrderData,
    | "status"
    | "quotationId"
    | "advanceAmount"
    | "stockCheckFmsInstanceId"
    | "poFmsInstanceId"
    | "dispatchFmsInstanceId"
  >,
): OrderJourneyStageKey {
  if (order.status === "DELIVERED") {
    return "delivered";
  }
  if (
    order.status === "DISPATCHED" ||
    order.dispatchFmsInstanceId ||
    order.status === "DISPATCH_PENDING"
  ) {
    return "dispatch";
  }
  if (
    order.poFmsInstanceId ||
    order.status === "PO_IN_PROGRESS" ||
    order.status === "PO_PENDING"
  ) {
    return "po";
  }
  if (order.stockCheckFmsInstanceId || order.status === "STOCK_CHECK") {
    return "stock";
  }
  if (order.status === "CONFIRMED") {
    return "so";
  }
  if (
    order.status !== "DRAFT" &&
    order.status !== "ADVANCE_PENDING" &&
    order.status !== "CANCELLED"
  ) {
    return "so";
  }
  const advance = Number(order.advanceAmount);
  if (Number.isFinite(advance) && advance > 0) {
    return "advance";
  }
  if (order.quotationId) {
    return "quote";
  }
  return "lead";
}
