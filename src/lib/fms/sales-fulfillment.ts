/**
 * Dual surface for sales fulfillment (Zoho/SAP-style):
 * - Ops queues (Leads / Sales orders / IMS) = day-to-day ERP work
 * - FMS fulfillment = process templates that track status, owner, and time delay
 */

export type SalesFulfillmentFmsFlow =
  | "leads"
  | "sales-order"
  | "stock-check"
  | "purchase-order"
  | "dispatch"
  | "recruitment";

/** ERP-style order queues (work happens here). */
export const SALES_OPS_PO_QUEUE_PATH = "/app/sales-orders?status=PO_PENDING";
export const SALES_OPS_DISPATCH_QUEUE_PATH =
  "/app/sales-orders?status=DISPATCH_PENDING";

/** FMS process trackers (status / who / delay for each Order/Lead process). */
export const FMS_FULFILLMENT_BASE_PATH = "/app/fms/fulfillment";

export const SALES_FULFILLMENT_FMS_FLOWS: {
  id: SalesFulfillmentFmsFlow;
  presetId: string;
  label: string;
  description: string;
  /** Case-insensitive keywords matched against template names to scope the board. */
  matchKeywords: string[];
}[] = [
  {
    id: "leads",
    presetId: "sales-lead-to-closure",
    label: "Leads",
    description: "Track lead follow-up and closure delays",
    matchKeywords: ["lead", "inquiry"],
  },
  {
    id: "sales-order",
    presetId: "sales-order",
    label: "Sales order",
    description: "Track order entry and approval delays",
    matchKeywords: ["sales order"],
  },
  {
    id: "stock-check",
    presetId: "stock-check-fulfillment",
    label: "Stock check",
    description: "Track IMS fulfillment decision delays",
    matchKeywords: ["stock"],
  },
  {
    id: "purchase-order",
    presetId: "purchase-order",
    label: "Purchase order",
    description: "Track PO process bottlenecks through receive goods",
    matchKeywords: ["purchase"],
  },
  {
    id: "dispatch",
    presetId: "dispatch-to-delivery",
    label: "Dispatch",
    description: "Track pack → dispatch → delivery delays",
    matchKeywords: ["dispatch", "delivery"],
  },
  {
    id: "recruitment",
    presetId: "recruitment",
    label: "Recruitment",
    description: "Track hiring from resume sourcing to department handover",
    matchKeywords: ["recruit", "hiring"],
  },
];

export function fmsFulfillmentPath(flow?: SalesFulfillmentFmsFlow) {
  if (!flow) {
    return FMS_FULFILLMENT_BASE_PATH;
  }
  return `${FMS_FULFILLMENT_BASE_PATH}?flow=${flow}`;
}

export const FMS_FULFILLMENT_LEADS_PATH = fmsFulfillmentPath("leads");
export const FMS_FULFILLMENT_SALES_ORDER_PATH = fmsFulfillmentPath("sales-order");
export const FMS_FULFILLMENT_STOCK_CHECK_PATH = fmsFulfillmentPath("stock-check");
export const FMS_FULFILLMENT_PO_PATH = fmsFulfillmentPath("purchase-order");
export const FMS_FULFILLMENT_DISPATCH_PATH = fmsFulfillmentPath("dispatch");

export function resolveFulfillmentPresetId(
  flow: SalesFulfillmentFmsFlow | string,
): string | undefined {
  const match = SALES_FULFILLMENT_FMS_FLOWS.find((item) => item.id === flow);
  return match?.presetId;
}

export function resolveFulfillmentFlowMeta(flow: SalesFulfillmentFmsFlow | string) {
  return (
    SALES_FULFILLMENT_FMS_FLOWS.find((item) => item.id === flow) ??
    SALES_FULFILLMENT_FMS_FLOWS[0]
  );
}

export function isSalesFulfillmentFmsFlow(
  value: string | undefined,
): value is SalesFulfillmentFmsFlow {
  return SALES_FULFILLMENT_FMS_FLOWS.some((item) => item.id === value);
}
